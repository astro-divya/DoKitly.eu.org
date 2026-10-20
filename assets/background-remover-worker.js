/* Build 43: selectable pinned ONNX models. Fast remains the unchanged default. */
'use strict';
const ORT_URL='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/ort.min.js';
const ORT_WASM='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
const MODELS=Object.freeze({
 fast:{name:'U2NetP Fast',local:'./models/u2netp.onnx',url:'https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx',size:4574861,sha:'309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8'},
 detail:{name:'Silueta Detail',local:'./models/silueta.onnx',url:'https://huggingface.co/fofr/comfyui/resolve/469142cd21eb17d0dfe5c912e73b2e233262339c/rembg/silueta.onnx',size:44173029,sha:'75da6c8d2f8096ec743d071951be73b4a8bc7b3e51d9a6625d63644f90ffeedb'}
});
let sessionPromise=null,sessionModel=null,sessionInstance=null;
const send=(message,progress)=>postMessage({type:'progress',message,progress});
// Allocate exactly one weight buffer. Keeping 44 MB of stream chunks *and*
// another 44 MB joined copy caused needless peak memory pressure on mobile.
async function fetchWeights(url,model){
 const r=await fetch(url,{mode:'cors',cache:'force-cache'});
 if(!r.ok)throw Error('Model HTTP '+r.status);
 if(!r.body||!r.body.getReader){
  const buf=await r.arrayBuffer();return verifyBytes(buf,model);
 }
 const reader=r.body.getReader(),size=model.size;
 const all=new Uint8Array(size);let total=0,complete=false;
 try{
  while(true){const {done,value}=await reader.read();if(done){complete=true;break;}
   if(!value?.byteLength)continue;
   if(total+value.byteLength>size)throw Error('Unexpected model size');
   all.set(value,total);total+=value.byteLength;
   const fraction=total/size;
   send('Downloading '+model.name+' model ('+(total/1048576).toFixed(1)+' MiB)…',Math.min(29,7+Math.floor(fraction*22)));
  }
 }finally{
  if(!complete)try{await reader.cancel()}catch(_){}
  reader.releaseLock();
 }
 if(total!==size)throw Error('Incomplete model download');
 return verifyBytes(all.buffer,model);
}
async function verifyBytes(buffer,model){
 const size=buffer.byteLength;
 if(size!==model.size)throw Error('Incomplete model download');
 send('Verifying '+model.name+' model…',30);
 const digest=await crypto.subtle.digest('SHA-256',buffer);
 const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==model.sha)throw Error('Model checksum mismatch');
 return buffer;
}
async function modelBytes(model){
 send('Loading '+model.name+' background model…',7);
 try{return await fetchWeights(new URL(model.local,self.location.href).href,model)}
 catch(_localError){return fetchWeights(model.url,model)}
}
async function getSession(key){
 if(sessionInstance&&sessionModel===key)return sessionInstance;
 if(sessionPromise&&sessionModel===key)return sessionPromise;
 const model=MODELS[key];if(!model)throw Error('Unsupported background model');
 // Single active inference request per worker, so release the previous model
 // before loading the next one. This avoids retaining both weights on mobile.
 if(sessionInstance){try{await sessionInstance.release?.()}catch(_){}sessionInstance=null}
 sessionModel=key;
 sessionPromise=(async()=>{
  if(!self.ort){send('Starting browser AI runtime…',4);importScripts(ORT_URL);ort.env.wasm.wasmPaths=ORT_WASM;ort.env.wasm.numThreads=1}
  const weights=await modelBytes(model);send('Preparing '+model.name+' AI…',35);
  const instance=await ort.InferenceSession.create(weights,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  sessionInstance=instance;return instance;
 })().catch(e=>{sessionPromise=null;sessionInstance=null;throw e});
 return sessionPromise;
}
async function preprocess(blob){
 const bmp=await createImageBitmap(blob),size=320,canvas=new OffscreenCanvas(size,size),ctx=canvas.getContext('2d',{willReadFrequently:true});
 try{ctx.drawImage(bmp,0,0,size,size)}finally{bmp.close?.()}
 const rgba=ctx.getImageData(0,0,size,size).data,plane=size*size,arr=new Float32Array(plane*3);
 let peak=0;for(let i=0;i<rgba.length;i+=4)peak=Math.max(peak,rgba[i],rgba[i+1],rgba[i+2]);const inv=peak?1/peak:0;
 const means=[.485,.456,.406],stds=[.229,.224,.225];
 for(let i=0,p=0;i<rgba.length;i+=4,p++)for(let c=0;c<3;c++)arr[c*plane+p]=(rgba[i+c]*inv-means[c])/stds[c];
 canvas.width=canvas.height=1;
 return new ort.Tensor('float32',arr,[1,3,size,size]);
}
self.onmessage=async e=>{
 try{
  const choice=e.data?.model||'fast';if(!Object.hasOwn(MODELS,choice))throw Error('Unsupported background model');
  const session=await getSession(choice);send('Preparing image…',42);
  // Each run owns its input tensor and the output tensors returned by ORT.
  // Release them even if inference, normalization or output validation fails.
  let inputTensor=null,outputs=null;
  try{
   inputTensor=await preprocess(e.data.blob);send('Removing background with '+MODELS[choice].name+'…',55);
   outputs=await session.run({[session.inputNames[0]]:inputTensor},[session.outputNames[0]]);
   const raw=outputs[session.outputNames[0]]?.data;if(!raw||raw.length<320*320)throw Error('Invalid background mask');
   let low=Infinity,high=-Infinity;for(let i=0;i<320*320;i++){const v=raw[i];if(Number.isFinite(v)){low=Math.min(low,v);high=Math.max(high,v)}}
   if(!Number.isFinite(low)||high-low<1e-6)throw Error('AI mask contains no usable foreground');
   const alpha=new Uint8Array(320*320),span=high-low;
   for(let i=0;i<alpha.length;i++){let a=Math.max(0,Math.min(1,(raw[i]-low)/span));a=Math.max(0,Math.min(1,(a-.035)/.93));alpha[i]=Math.round(a*255)}
   send('Refining edges…',90);postMessage({type:'result',width:320,height:320,buffer:alpha.buffer,engine:MODELS[choice].name},[alpha.buffer]);
  }finally{
   if(outputs)for(const value of Object.values(outputs)){try{value?.dispose?.()}catch(_){}}
   try{inputTensor?.dispose?.()}catch(_){}
  }
 }catch(err){postMessage({type:'error',message:err?.message||String(err)})}
};
