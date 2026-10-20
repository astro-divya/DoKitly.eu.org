/* DoKitly Build 43: load optional conversion libraries only upon user action.
   Remote libraries do not receive uploaded files. Never treat timeout as successful conversion. */
(function(){
  'use strict';
  const pending=new Map();
  function request(src,timeoutMs){return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';
    let done=false;
    const timer=setTimeout(()=>finish(new Error('Library request timed out')),timeoutMs);
    function finish(error){if(done)return;done=true;clearTimeout(timer);script.onload=null;script.onerror=null;
      if(error){script.remove();reject(error);}else resolve();}
    script.onload=()=>finish(null);
    script.onerror=()=>finish(new Error('Library request unavailable'));
    document.head.appendChild(script);
  });}
  window.DoKitlyEnsureOptionalEngine=function(key,check,sources,timeoutMs=6500){
    if(typeof check!=='function'||!Array.isArray(sources)||!sources.length){return Promise.reject(new Error('Invalid optional engine configuration'));}
    if(check())return Promise.resolve();
    if(pending.has(key))return pending.get(key);
    const job=(async()=>{let lastError;for(const src of sources){
      try{await request(src,timeoutMs);if(check())return;}catch(error){lastError=error;}
    }throw new Error('Required processing library unavailable. Check your connection and try again.'+(lastError?' ('+lastError.message+')':''));})();
    pending.set(key,job);
    return job.finally(()=>pending.delete(key));
  };
})();
