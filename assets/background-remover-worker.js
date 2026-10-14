/* BUILD 37 — U2NetP (4.36 MiB), 320px general-purpose segmentation. */
'use strict';
const ORT_URL='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/ort.min.js';
const ORT_WASM='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
const MODEL_URL='https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx';
const MODEL_LOCAL=new URL('./models/u2netp.onnx',self.location.href).href;
const MODEL_SIZE=4574861;
const MODEL_SHA='309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
let sessionPromise=null;
const send=(message,progress)=>postMessage({type:'progress',message,progress});
async function fetchWeights(url){
 const r=await fetch(url,{mode:'cors',cache:'force-cache'});
 if(!r.ok)throw Error('Model HTTP '+r.status);
 const b=await r.arrayBuffer();if(b.byteLength!==MODEL_SIZE)throw Error('Incomplete model download');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==MODEL_SHA)throw Error('Model checksum mismatch');return b;
}
async function modelBytes(){
 send('Loading compact background AI (4.4 MB)…',7);
 try{return await fetchWeights(MODEL_LOCAL)}catch(e){return await fetchWeights(MODEL_URL)}
}
async function getSession(){
 if(!sessionPromise)sessionPromise=(async()=>{
  if(!self.ort){send('Starting fast AI runtime…',4);importScripts(ORT_URL);ort.env.wasm.wasmPaths=ORT_WASM;ort.env.wasm.numThreads=1;}
  const weights=await modelBytes();send('Preparing background AI…',35);
  return ort.InferenceSession.create(weights,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 })().catch(e=>{sessionPromise=null;throw e});
 return sessionPromise;
}
async function preprocess(blob){
 const bmp=await createImageBitmap(blob),size=320,canvas=new OffscreenCanvas(size,size),ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(bmp,0,0,size,size);bmp.close?.();
 const rgba=ctx.getImageData(0,0,size,size).data,plane=size*size,arr=new Float32Array(plane*3);
 let peak=0;for(let i=0;i<rgba.length;i+=4)peak=Math.max(peak,rgba[i],rgba[i+1],rgba[i+2]);const inv=peak?1/peak:0;
 const means=[.485,.456,.406],stds=[.229,.224,.225];
 for(let i=0,p=0;i<rgba.length;i+=4,p++)for(let c=0;c<3;c++)arr[c*plane+p]=(rgba[i+c]*inv-means[c])/stds[c];
 return new ort.Tensor('float32',arr,[1,3,size,size]);
}
self.onmessage=async e=>{
 try{
  const session=await getSession();send('Preparing image…',42);
  const tensor=await preprocess(e.data.blob);send('Removing background…',55);
  const result=await session.run({[session.inputNames[0]]:tensor},[session.outputNames[0]]);
  const raw=result[session.outputNames[0]]?.data;if(!raw||raw.length<320*320)throw Error('Invalid background mask');
  let low=Infinity,high=-Infinity;for(let i=0;i<320*320;i++){const v=raw[i];if(Number.isFinite(v)){low=Math.min(low,v);high=Math.max(high,v)}}
  if(!Number.isFinite(low)||high-low<1e-6)throw Error('AI mask contains no usable foreground');
  const alpha=new Uint8Array(320*320),span=high-low;
  for(let i=0;i<alpha.length;i++){let a=Math.max(0,Math.min(1,(raw[i]-low)/span));a=Math.max(0,Math.min(1,(a-.035)/.93));alpha[i]=Math.round(a*255)}
  send('Refining edges…',90);postMessage({type:'result',width:320,height:320,buffer:alpha.buffer,engine:'U2NetP Fast'},[alpha.buffer]);
 }catch(err){postMessage({type:'error',message:err?.message||String(err)})}
};
