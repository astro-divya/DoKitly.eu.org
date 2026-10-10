/* DoKitly Build 37 — BiRefNet_lite browser background removal */
(()=>{'use strict';
let runtimePromise=null, enginePromise=null;
const MODEL='onnx-community/BiRefNet_lite-ONNX';
async function runtime(){
 if(!runtimePromise)runtimePromise=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
 return runtimePromise;
}
async function engine(onProgress){
 if(!enginePromise)enginePromise=(async()=>{
  const {AutoModel,AutoProcessor}=await runtime();
  onProgress?.('Loading BiRefNet Lite model… first use downloads the model once and the browser can cache it.');
  const [model,processor]=await Promise.all([
   AutoModel.from_pretrained(MODEL,{dtype:'fp32',progress_callback:p=>{if(p?.status==='progress'&&Number.isFinite(p.progress))onProgress?.(`Loading BiRefNet Lite… ${Math.round(p.progress)}%`);}}),
   AutoProcessor.from_pretrained(MODEL)
  ]);
  return {model,processor};
 })().catch(e=>{enginePromise=null;throw e});
 return enginePromise;
}
async function sourceToBlob(source){
 if(source instanceof Blob)return source;
 const c=document.createElement('canvas');c.width=source.naturalWidth||source.width;c.height=source.naturalHeight||source.height;
 c.getContext('2d').drawImage(source,0,0,c.width,c.height);
 return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('Could not prepare image for AI processing.')),'image/png'));
}
async function remove(source,onProgress){
 const {model,processor}=await engine(onProgress),{RawImage}=await runtime();
 onProgress?.('Analyzing foreground edges…');
 const blob=await sourceToBlob(source),url=URL.createObjectURL(blob);
 try{
  const image=await RawImage.fromURL(url),{pixel_values}=await processor(image);
  const output=await model({input_image:pixel_values});
  const tensor=output.output_image?.[0]||output[Object.keys(output).find(k=>output[k]?.[0]?.sigmoid)]?.[0];
  if(!tensor?.sigmoid)throw Error('BiRefNet returned an unsupported mask.');
  const mask=await RawImage.fromTensor(tensor.sigmoid().mul(255).to('uint8')).resize(image.width,image.height);
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image.toCanvas(),0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height),m=mask.data;
  if(!m||m.length<canvas.width*canvas.height)throw Error('BiRefNet mask was incomplete.');
  for(let p=0,i=3;p<canvas.width*canvas.height;p++,i+=4){let a=m[p]/255;a=Math.max(0,Math.min(1,(a-.018)/.964));a=a*a*(3-2*a);data.data[i]=Math.round(a*255)}
  ctx.putImageData(data,0,0);onProgress?.('Refining transparent edges…');return canvas;
 } finally {URL.revokeObjectURL(url)}
}
window.DoKitlyBackgroundAI={remove,model:MODEL,version:'birefnet-lite-b37'};
})();
