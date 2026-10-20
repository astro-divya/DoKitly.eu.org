/* Build 43 — U2NetP default with opt-in Silueta ONNX in a dedicated worker. */
(()=>{'use strict';
const workerURL=new URL('./background-remover-worker.js?v=43-detail3',document.currentScript.src);let active=null;let worker=null;let pendingAbort=null;
function refineMask(canvas){
 const x=canvas.getContext('2d',{willReadFrequently:true}),im=x.getImageData(0,0,canvas.width,canvas.height),d=im.data,a=new Uint8Array(canvas.width*canvas.height);for(let i=0;i<a.length;i++)a[i]=d[i*4+3];
 for(let y=0;y<canvas.height;y++)for(let xx=0;xx<canvas.width;xx++){const i=y*canvas.width+xx,v=a[i];let n=0,sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const px=xx+dx,py=y+dy;if(px>=0&&py>=0&&px<canvas.width&&py<canvas.height){sum+=a[py*canvas.width+px];n++;}}let s=sum/n;let out=v<=12?0:v>=244?255:Math.round(v*.72+s*.28);d[i*4]=d[i*4+1]=d[i*4+2]=255;d[i*4+3]=out;}
 x.putImageData(im,0,0);return canvas;
}
async function remove(source,onProgress,options={}){
 const model=options.model==='detail'?'detail':'fast';
 if(!source?.width||!source?.height)throw Error('Invalid image.');
 if(active)throw Error('Background removal is already running.');
 const w=worker||(worker=new Worker(workerURL));active=w;
 try{
  const input=document.createElement('canvas'),max=2048,scale=Math.min(1,max/Math.max(source.width,source.height));
  input.width=Math.max(1,Math.round(source.width*scale));input.height=Math.max(1,Math.round(source.height*scale));
  input.getContext('2d').drawImage(source,0,0,input.width,input.height);
  const blob=await new Promise((ok,fail)=>input.toBlob(b=>b?ok(b):fail(Error('Image preparation failed.')),'image/jpeg',.94));
  input.width=input.height=1;
  if(active!==w)throw Error('Background removal cancelled.');
  const result=await new Promise((ok,fail)=>{
   let settled=false;
   // First use may include downloading weights, WASM initialization and CPU inference.
   // Allow slow devices to finish while still bounding stalled or endlessly active runs.
   const IDLE_LIMIT_MS=180000, TOTAL_LIMIT_MS=360000;
   let idleTimer=null, hardTimer=null;
   const finish=(error,value)=>{
    if(settled)return;settled=true;clearTimeout(idleTimer);clearTimeout(hardTimer);
    if(pendingAbort===abort)pendingAbort=null;
    if(error&&active===w){w.terminate();if(worker===w)worker=null;active=null;}
    error?fail(error):ok(value);
   };
   const abort=()=>finish(Error('Background removal cancelled.'));
   const armIdle=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(
    ()=>finish(Error('Background AI made no progress for 3 minutes on this device.')),IDLE_LIMIT_MS);};
   hardTimer=setTimeout(()=>finish(Error('Background AI exceeded the 6-minute safety limit on this device.')),TOTAL_LIMIT_MS);
   armIdle();
   pendingAbort=abort;
   w.onmessage=e=>{const d=e.data||{};if(settled)return;
    if(d.type==='progress'){armIdle();try{onProgress?.(d.message,d.progress)}catch(_){}return}
    d.type==='result'?finish(null,d):finish(Error(d.message||'Background AI failed.'));
   };
   w.onerror=e=>finish(Error(e.message||'Background AI worker failed.'));
   w.onmessageerror=()=>finish(Error('Background AI worker returned an unreadable message.'));
   try{w.postMessage({blob,model})}catch(e){finish(e)}
  });
  if(active!==w)throw Error('Background removal cancelled.');
  const alpha=new Uint8ClampedArray(result.buffer),mask=document.createElement('canvas');mask.width=result.width;mask.height=result.height;
  const mx=mask.getContext('2d'),mi=mx.createImageData(mask.width,mask.height);
  for(let i=0;i<alpha.length;i++){mi.data[i*4]=mi.data[i*4+1]=mi.data[i*4+2]=255;mi.data[i*4+3]=alpha[i]}
  mx.putImageData(mi,0,0);refineMask(mask);
  onProgress?.('Reconstructing clean transparent PNG…',94);
  const out=document.createElement('canvas');out.width=source.width;out.height=source.height;
  const x=out.getContext('2d');x.drawImage(source,0,0);
  x.globalCompositeOperation='destination-in';x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
  x.drawImage(mask,0,0,out.width,out.height);x.globalCompositeOperation='source-over';mask.width=mask.height=1;
  if(active!==w)throw Error('Background removal cancelled.');
  return out;
 }finally{if(active===w)active=null;}
}
window.DoKitlyBackgroundAI={remove,cancel(){const w=active;if(!w)return;active=null;if(worker===w)worker=null;w.terminate();pendingAbort?.();pendingAbort=null},version:'build43-u2netp-silueta-selector-r2'};
})();
