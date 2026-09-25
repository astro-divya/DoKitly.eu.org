(()=>{
'use strict';
const MEASUREMENT_ID='G-80KFT4220E';
const PATH=location.pathname || '/';
const CATEGORY_LABELS={
  'pdf-tools':'PDF & Document','image-tools':'Image','text-tools':'Text','calculator-tools':'Calculators',
  'converter-tools':'Converters','finance-tools':'Finance','developer-tools':'Developer','seo-tools':'Website & SEO',
  'student-tools':'Student','creator-tools':'Creator','design-tools':'Color & Design','date-time-tools':'Date & Time',
  'everyday-tools':'Everyday','privacy-tools':'Privacy'
};
const firstSeg=PATH.split('/').filter(Boolean)[0]||'';
const clean=(v,max=100)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
function toolName(){
  const explicit=document.body?.dataset?.toolName||document.body?.dataset?.tool;
  if(explicit)return clean(explicit.replace(/[-_]+/g,' '));
  const h=document.querySelector('.dk-hero-text h1,.tool-page-head h1,.it-title h1,.workspace-title h1,main h1');
  return clean(h?.textContent||document.title.split(/[—|]/)[0]||'DoKitly');
}
function toolCategory(){return CATEGORY_LABELS[firstSeg]||clean(firstSeg.replace(/-tools$/,'').replace(/-/g,' '))||'General';}
function common(extra={}){return {tool_name:toolName(),tool_category:toolCategory(),source_page:PATH,...extra};}
function sanitize(params={}){
  const blocked=/file_?name|filename|file_?content|content|payload|text|value|blob|data_url|object_url/i;
  const out={};
  Object.entries(params).forEach(([k,v])=>{
    if(blocked.test(k)||v===undefined||v===null)return;
    if(typeof v==='string')out[k]=clean(v,120);
    else if(typeof v==='number'||typeof v==='boolean')out[k]=v;
  });
  return out;
}
function send(name,params={}){
  if(typeof window.gtag!=='function')return;
  try{window.gtag('event',name,sanitize(common(params)));}catch(_){ }
}
const recent=new Map();
function once(name,key='',ms=700){const k=name+'|'+key,n=Date.now(),last=recent.get(k)||0;if(n-last<ms)return false;recent.set(k,n);return true;}
function mimeSummary(files){
  const types=[...new Set(files.map(f=>clean(f.type,60)).filter(Boolean))];
  if(!types.length)return 'unknown';
  return types.length===1?types[0]:'multiple';
}
let cycle=0,pending=false;
function started(extra={}){cycle++;pending=true;send('tool_process_started',extra);}
function completed(extra={}){if(!pending&&extra.force!==true)return;pending=false;send('tool_process_completed',{success:true,...extra});}
function failed(extra={}){if(!pending&&extra.force!==true)return;pending=false;send('tool_process_failed',{success:false,...extra});}
function download(extra={}){if(once('download_clicked',PATH,900))send('download_clicked',extra);}
function reset(kind='reset_tool',extra={}){pending=false;send(kind,extra);}
window.DoKitlyAnalytics={
  measurementId:MEASUREMENT_ID,
  track:send,
  trackProcessStarted:started,
  trackProcessCompleted:completed,
  trackProcessFailed:failed,
  trackDownload:download,
  trackReset:(extra={})=>reset('reset_tool',extra),
  trackNewFile:(extra={})=>reset('new_file_clicked',extra)
};
function isToolPage(){return /-tools\//.test(PATH)&&!/\/index\.html?$/.test(PATH)&&!document.querySelector('meta[name="robots"][content*="noindex" i]');}
function buttonText(el){return clean([el.id,el.getAttribute('aria-label'),el.getAttribute('title'),el.textContent].filter(Boolean).join(' '),180).toLowerCase();}
function visible(el){return !!(el&&el.isConnected&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&!el.hidden);}
function processTrigger(el){
  if(el?.dataset?.analyticsNoProcess==='true'||el?.id==='ttPrimary')return false;
  const t=buttonText(el);
  if(/download|save|export|copy|new passage|new file|reset|restart|clear|pause|resume|focus|back|close|cancel/.test(t))return false;
  return /process|convert|compress|merge|split|resize|crop|rotate|generate|analy[sz]e|calculate|solve|apply|create|scan|decode|encode|extract|protect|unlock|watermark|grayscale|sharpen|blur|filter|render|remove|add page|run|check/.test(t);
}
document.addEventListener('DOMContentLoaded',()=>{
  if(isToolPage())send('tool_open');
});
document.addEventListener('change',e=>{
  const inp=e.target?.closest?.('input[type="file"]');
  if(!inp)return;
  const files=[...(inp.files||[])];
  if(!files.length)return;
  send('file_selected',{file_type:mimeSummary(files),number_of_files:files.length});
},true);
document.addEventListener('click',e=>{
  const el=e.target?.closest?.('a,button,input[type="button"],input[type="submit"]');
  if(!el)return;
  const t=buttonText(el);
  const href=(el.getAttribute?.('href')||'');
  if(el.matches?.('[download],#downloadBtn,[data-download]')||/\bdownload\b/.test(t)){
    download();
  }
  if(el.matches?.('.dk-related-card,[data-related-tool]')||el.closest?.('.dk-related-grid,.related-tools,.related-grid')){
    let target='';try{target=new URL(href,location.href).pathname}catch(_){ }
    send('related_tool_clicked',{target_page:target||undefined});
  }
  if(/new file|another file|process another/.test(t))reset('new_file_clicked');
  else if(/\breset\b|\brestart\b|\bclear all\b/.test(t))reset('reset_tool');
  if(processTrigger(el))started();
},true);
// Future/current tools can dispatch these events without duplicating GA logic.
window.addEventListener('dokitly:process-started',e=>started(e.detail||{}));
window.addEventListener('dokitly:process-completed',e=>completed(e.detail||{}));
window.addEventListener('dokitly:process-failed',e=>failed(e.detail||{}));
window.addEventListener('dokitly:download-clicked',e=>download(e.detail||{}));
window.addEventListener('dokitly:new-file',e=>reset('new_file_clicked',e.detail||{}));
window.addEventListener('dokitly:reset-tool',e=>reset('reset_tool',e.detail||{}));
// Best-effort completion/failure detection without reading or sending result content.
const observer=new MutationObserver(muts=>{
  if(!pending)return;
  for(const m of muts){
    const nodes=[m.target,...(m.addedNodes||[])].filter(n=>n?.nodeType===1);
    for(const n of nodes){
      const dl=n.matches?.('a[download]')?n:n.querySelector?.('a[download]');
      if(dl&&visible(dl)&&!dl.disabled){completed();return;}
      const err=n.matches?.('.error,.err,.alert-error,[data-status="error"]')?n:n.querySelector?.('.error,.err,.alert-error,[data-status="error"]');
      if(err&&visible(err)){failed();return;}
      const ok=n.matches?.('[data-status="success"],.success-message,.result.success')?n:n.querySelector?.('[data-status="success"],.success-message,.result.success');
      if(ok&&visible(ok)){completed();return;}
    }
  }
});
if(document.documentElement)observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','href','class','data-status']});
})();
