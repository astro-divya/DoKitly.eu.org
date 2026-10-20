(()=>{'use strict';const $=s=>document.querySelector(s),els={file:$('#file'),drop:$('#dropZone'),lang:$('#lang'),run:$('#run'),reset:$('#reset'),status:$('#status'),out:$('#out'),preview:$('#preview'),meta:$('#fileMeta'),page:$('#pageMeta'),copy:$('#copy'),txt:$('#download'),word:$('#downloadWord'),prev:$('#pagePrev'),next:$('#pageNext'),pageNow:$('#pageNow'),zin:$('#ocrZoomIn'),zout:$('#ocrZoomOut'),fit:$('#ocrFit')};let current=null,busy=false,pages=[],pageIndex=0,scale=1,tx=0,ty=0,drag=false,start=null,selectionEpoch=0,viewEpoch=0,pdfSession=null,previewCanvas=null,ocrCheckpoint=null;
const setStatus=t=>{if(els.status)els.status.textContent=t};const setReady=v=>{els.run.disabled=!v||busy;els.reset.disabled=!v||busy};const human=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
async function loadScript(src,test){if(test())return;await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(Error('Required OCR component could not load. Check your connection and try again.'));document.head.appendChild(s)})}
let tessPromise=null,tessWorkers=new Map();
async function loadTesseract(){
 if(!tessPromise)tessPromise=(async()=>{await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',()=>!!window.Tesseract);if(!window.Tesseract?.createWorker)throw Error('Browser OCR runtime could not load.');return window.Tesseract})().catch(e=>{tessPromise=null;throw e});
 return tessPromise;
}
function ocrLang(){const v=els.lang?.value||'auto';return v==='eng'?'eng':v==='hin'?'hin':'eng+hin'}
async function tessWorker(lang){
 if(tessWorkers.has(lang))return tessWorkers.get(lang);
 const T=await loadTesseract();setStatus(`Loading ${lang==='eng'?'English':lang==='hin'?'Hindi':'English + Hindi'} OCR language data…`);
 const worker=await T.createWorker(lang,1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger:m=>{if(m?.status){const pct=Number.isFinite(m.progress)?` ${Math.round(m.progress*100)}%`:'';setStatus(`${m.status}${pct}`)}}});
 await worker.setParameters({preserve_interword_spaces:'1'});tessWorkers.set(lang,worker);return worker;
}
function tesseractText(data){return String(data?.text||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
async function loadJSZip(){await loadScript('../assets/vendor/jszip-3.10.1.min.js',()=>!!window.JSZip)}
async function imageCanvas(file){const b=await createImageBitmap(file),c=document.createElement('canvas');c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(b,0,0);b.close();return c}
function releaseCanvas(c){if(c?.width){c.width=1;c.height=1}}
function releasePages(list){for(const c of list)if(c?.getContext)releaseCanvas(c)}
function closePdf(){const old=pdfSession;pdfSession=null;if(old?.task)old.task.destroy().catch(()=>{});}
async function openPdf(file,isStale=()=>false){
 const pdfjsLib=await window.DoKitlyGetPDFJS();if(!pdfjsLib)throw Error('PDF reader could not load.');
 if(isStale())return null;
 const data=await file.arrayBuffer();if(isStale())return null;
 const task=pdfjsLib.getDocument({data});
 try{
  const doc=await task.promise;
  if(isStale()){await task.destroy();return null}
  return {task,doc};
 }catch(e){try{await task.destroy()}catch(_){}throw e}
}
async function pdfPageCanvas(session,index){
 if(!session)throw Error('PDF reader is no longer available.');
 const pg=await session.doc.getPage(index),base=pg.getViewport({scale:1}),factor=Math.min(3,2200/base.width),vp=pg.getViewport({scale:factor}),c=document.createElement('canvas');
 c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
 try{
  const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
  await pg.render({canvasContext:x,viewport:vp}).promise;
  return c;
 }catch(e){releaseCanvas(c);throw e}
 finally{try{pg.cleanup?.()}catch(_){}}
}
function preprocess(src){const max=2400,s=Math.min(1,max/Math.max(src.width,src.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*s));c.height=Math.max(1,Math.round(src.height*s));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0,c.width,c.height);const im=x.getImageData(0,0,c.width,c.height),d=im.data;let sum=0,sum2=0,n=d.length/4;for(let i=0;i<d.length;i+=4){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2];sum+=y;sum2+=y*y}const mean=sum/n,sd=Math.sqrt(Math.max(1,sum2/n-mean*mean)),gain=Math.max(1,Math.min(1.8,58/sd));for(let i=0;i<d.length;i+=4){let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];y=(y-mean)*gain+mean;y=y<245?Math.max(0,Math.min(255,(y-128)*1.08+128)):255;d[i]=d[i+1]=d[i+2]=Math.round(y);d[i+3]=255}x.putImageData(im,0,0);return c}
async function renderPage(){
 const view=++viewEpoch,epoch=selectionEpoch,index=pageIndex,entry=pages[index],session=pdfSession;
 if(!pages.length){els.preview.innerHTML='<div class="empty">Your document preview appears here.</div>';return}
 if(els.pageNow)els.pageNow.textContent=`${index+1} / ${pages.length}`;
 if(els.prev)els.prev.disabled=index===0;
 if(els.next)els.next.disabled=index===pages.length-1;
 if(entry?.pdfIndex){els.preview.innerHTML='<div class="empty">Rendering page…</div>'}
 try{
  const canvas=entry?.pdfIndex?await pdfPageCanvas(session,entry.pdfIndex):entry;
  if(view!==viewEpoch||epoch!==selectionEpoch){if(entry?.pdfIndex)releaseCanvas(canvas);return}
  if(previewCanvas&&previewCanvas!==canvas)releaseCanvas(previewCanvas);
  previewCanvas=canvas;
  els.preview.innerHTML='';const wrap=document.createElement('div');wrap.className='dk34-pages';const box=document.createElement('div');box.className='dk33-page';box.appendChild(canvas);wrap.appendChild(box);els.preview.appendChild(wrap);
  scale=1;tx=ty=0;fit();
 }catch(e){
  if(view!==viewEpoch||epoch!==selectionEpoch)return;
  els.preview.innerHTML='<div class="empty">Could not render this page.</div>';
  setStatus('Could not render page: '+(e.message||'PDF error'));
  if(index===0)setReady(false);
  throw e;
 }
}
function applyTransform(){const w=els.preview.querySelector('.dk34-pages');if(w)w.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`}
function fit(){
 const canvas=els.preview.querySelector('.dk33-page canvas');
 if(canvas){
  const aw=Math.max(1,els.preview.clientWidth-20),ah=Math.max(1,els.preview.clientHeight-20);
  const r=Math.min(aw/canvas.width,ah/canvas.height,1);
  canvas.style.maxWidth='none';canvas.style.maxHeight='none';
  canvas.style.width=Math.max(1,Math.round(canvas.width*r))+'px';
  canvas.style.height=Math.max(1,Math.round(canvas.height*r))+'px';
 }
 scale=1;tx=ty=0;applyTransform();
}
async function choose(file){
 if(!file)return;
 if(busy){if(els.file)els.file.value='';setStatus('Finish the current extraction before choosing another file.');return}
 if(!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)){setStatus('Use JPG, PNG, WebP or PDF.');return}
 const epoch=++selectionEpoch;viewEpoch++;ocrCheckpoint=null;
 current=file;releasePages(pages);pages=[];if(previewCanvas){releaseCanvas(previewCanvas);previewCanvas=null}closePdf();pageIndex=0;
 els.preview.innerHTML='<div class="empty">Your document preview appears here.</div>';setReady(false);els.reset.disabled=false;
 els.out.value='';els.copy.disabled=els.txt.disabled=els.word.disabled=true;els.page.textContent='';
 els.meta.textContent=file.name+' • '+human(file.size);setStatus('Preparing document preview…');
 try{
  if(file.type==='application/pdf'){
   const session=await openPdf(file,()=>epoch!==selectionEpoch);
   if(epoch!==selectionEpoch||!session)return;
   pdfSession=session;
   pages=Array.from({length:session.doc.numPages},(_,i)=>({pdfIndex:i+1}));
  }else{
   const image=await imageCanvas(file);
   if(epoch!==selectionEpoch){releaseCanvas(image);return}
   pages=[image];
  }
  if(!pages.length)throw Error('No pages found.');
  pageIndex=0;await renderPage();
  if(epoch!==selectionEpoch)return;
  setReady(true);setStatus('Ready to extract text.');
 }catch(e){if(epoch!==selectionEpoch)return;current=null;viewEpoch++;releasePages(pages);pages=[];if(previewCanvas){releaseCanvas(previewCanvas);previewCanvas=null}closePdf();setReady(false);els.reset.disabled=false;setStatus(e.message||'Could not open this file.')}
}
function rotateCanvas(src,deg){if(!deg)return src;const rad=deg*Math.PI/180,c=document.createElement('canvas'),swap=Math.abs(deg)%180===90;c.width=swap?src.height:src.width;c.height=swap?src.width:src.height;const x=c.getContext('2d');x.translate(c.width/2,c.height/2);x.rotate(rad);x.drawImage(src,-src.width/2,-src.height/2);return c}
function ocrScore(data){const text=tesseractText(data),chars=text.replace(/\s/g,'').length,conf=Number(data?.confidence||0);return conf+Math.min(35,chars/10)}
async function recognizeCanvas(c,lang,page,total){
 const prep=preprocess(c);
 try{
  const worker=await tessWorker(lang);setStatus(`Page ${page}/${total} • recognizing text…`);
  let r=await worker.recognize(prep),best=r.data,bestDeg=0,bestQ=ocrScore(best);
  if(prep.width>prep.height*1.12){for(const deg of [90,270]){
   setStatus(`Page ${page}/${total} • checking ${deg}° orientation…`);
   const rotated=rotateCanvas(prep,deg);
   try{const rr=await worker.recognize(rotated),q=ocrScore(rr.data);if(q>bestQ+4){best=rr.data;bestQ=q;bestDeg=deg}}
   finally{rotated.width=rotated.height=1}
  }}
  if(bestDeg)setStatus(`Page ${page}/${total} • auto-rotated ${bestDeg}° for OCR.`);
  return tesseractText(best);
 }finally{prep.width=prep.height=1}
}
function langCode(){return ocrLang()}
function showOcrText(state,partial,allowExport=false){
 const texts=state.texts.slice(0,state.next);
 els.out.value=texts.map((value,i)=>state.total>1?`--- Page ${i+1} ---\n${value}`:value).join('\n\n');
 els.page.textContent=partial?`${state.next} / ${state.total} pages (partial)`:state.total>1?state.total+' pages':'';
 const readable=texts.some(value=>!!value.trim());
 els.copy.disabled=els.txt.disabled=els.word.disabled=!readable||!allowExport;
 return readable;
}
async function run(){
 if(!current||busy)return;
 const file=current,lang=langCode(),total=pages.length;
 const resume=ocrCheckpoint?.file===file&&ocrCheckpoint.lang===lang&&ocrCheckpoint.total===total;
 const state=resume?ocrCheckpoint:{file,lang,total,next:0,texts:[]};
 ocrCheckpoint=state;
 busy=true;setReady(false);els.copy.disabled=els.txt.disabled=els.word.disabled=true;
 if(!resume){els.out.value='';els.page.textContent='';}
 try{
  const session=pdfSession;
  for(let i=state.next;i<total;i++){
   const entry=pages[i],temp=!!entry?.pdfIndex,c=temp?await pdfPageCanvas(session,entry.pdfIndex):entry;
   try{state.texts[i]=await recognizeCanvas(c,lang,i+1,total);state.next=i+1;showOcrText(state,true)}
   finally{if(temp)releaseCanvas(c)}
  }
  const ok=showOcrText(state,false,true);
  ocrCheckpoint=null;
  setStatus(ok?'Text extracted. Review and edit it before downloading.':'OCR completed but no readable text was detected.');
 }catch(e){
  const page=state.next+1;
  const message=e?.message||'OCR failed';
  if(state.next){showOcrText(state,true,true);setStatus(`OCR stopped at page ${page}/${total}: ${message}. ${state.next} pages preserved; choose Extract Text to resume.`)}
  else{setStatus(`OCR stopped at page ${page}/${total}: ${message}. Choose Extract Text to retry.`)}
 }
 finally{busy=false;setReady(!!current)}
}
function reset(){
 if(busy)return;selectionEpoch++;viewEpoch++;current=null;ocrCheckpoint=null;releasePages(pages);pages=[];
 if(previewCanvas){releaseCanvas(previewCanvas);previewCanvas=null}closePdf();pageIndex=0;
 els.file.value='';els.out.value='';els.preview.innerHTML='<div class="empty">Your document preview appears here.</div>';
 els.meta.textContent='Waiting';els.page.textContent='';if(els.pageNow)els.pageNow.textContent='0 / 0';
 els.copy.disabled=els.txt.disabled=els.word.disabled=true;setReady(false);setStatus('Choose an image or scanned PDF.');
}
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');async function wordBlob(){await loadJSZip();const paras=els.out.value.split(/\n/).map(line=>`<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Nirmala UI"/></w:rPr><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join('');const zip=new JSZip();zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');zip.folder('_rels').file('.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');zip.folder('word').file('document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr/></w:body></w:document>`);return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
function save(blob,name){if(window.DoKitlyDownload?.routeBlob)return window.DoKitlyDownload.routeBlob(blob,{filename:name,mimeType:blob.type,tool:'ocr-studio'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
els.drop.addEventListener('click',e=>{if(e.target.closest('button'))return;els.file.click()});els.drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();els.file.click()}});els.file.addEventListener('change',()=>choose(els.file.files?.[0]));['dragenter','dragover'].forEach(n=>els.drop.addEventListener(n,e=>{e.preventDefault();els.drop.classList.add('is-drag')}));['dragleave','drop'].forEach(n=>els.drop.addEventListener(n,e=>{e.preventDefault();els.drop.classList.remove('is-drag')}));els.drop.addEventListener('drop',e=>choose(e.dataTransfer.files?.[0]));els.run.addEventListener('click',run);els.reset.addEventListener('click',reset);els.copy.addEventListener('click',async()=>{await navigator.clipboard.writeText(els.out.value);setStatus('Copied to clipboard.')});els.txt.addEventListener('click',()=>save(new Blob([els.out.value],{type:'text/plain;charset=utf-8'}),'DoKitly_OCR_Text.txt'));els.word.addEventListener('click',async()=>save(await wordBlob(),'DoKitly_OCR_Text.docx'));els.prev?.addEventListener('click',()=>{if(pageIndex>0){pageIndex--;renderPage().catch(()=>{})}});els.next?.addEventListener('click',()=>{if(pageIndex<pages.length-1){pageIndex++;renderPage().catch(()=>{})}});els.zin?.addEventListener('click',()=>{scale=Math.min(4,scale+.25);applyTransform()});els.zout?.addEventListener('click',()=>{scale=Math.max(.5,scale-.25);if(scale<=1)tx=ty=0;applyTransform()});els.fit?.addEventListener('click',fit);els.preview.addEventListener('pointerdown',e=>{if(scale<=1)return;drag=true;start={x:e.clientX,y:e.clientY,tx,ty};els.preview.setPointerCapture?.(e.pointerId)});els.preview.addEventListener('pointermove',e=>{if(!drag)return;tx=start.tx+e.clientX-start.x;ty=start.ty+e.clientY-start.y;applyTransform()});els.preview.addEventListener('pointerup',()=>drag=false);els.preview.addEventListener('pointercancel',()=>drag=false);window.addEventListener('resize',()=>{if(scale===1)fit()},{passive:true});
window.addEventListener('pagehide',()=>{closePdf();releasePages(pages);if(previewCanvas)releaseCanvas(previewCanvas);for(const w of tessWorkers.values())w.terminate?.();tessWorkers.clear();});
})();
