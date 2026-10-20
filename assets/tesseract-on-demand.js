/* DoKitly Build43: optional OCR library is requested only for scanned PDFs.
   Digital PDF conversion and initial page readiness never wait for an external OCR CDN. */
(function(){
  'use strict';
  if(window.DoKitlyLoadTesseract)return;
  var pending=null;
  var sources=[
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'
  ];
  function loadScript(src){return new Promise(function(resolve,reject){
    if(window.Tesseract && typeof window.Tesseract.createWorker==='function')return resolve(window.Tesseract);
    var el=document.createElement('script');el.src=src;el.async=true;el.crossOrigin='anonymous';
    var done=false;
    var timer=setTimeout(function(){end(Error('OCR library request timed out'));},9000);
    function end(err){if(done)return;done=true;clearTimeout(timer);el.onload=el.onerror=null;
      if(err){el.remove();reject(err);}else if(window.Tesseract && typeof window.Tesseract.createWorker==='function')resolve(window.Tesseract);
      else reject(Error('OCR library did not initialize'));
    }
    el.onload=function(){end(null);};el.onerror=function(){end(Error('OCR library unavailable'));};
    document.head.appendChild(el);
  });}
  window.DoKitlyLoadTesseract=function(){
    if(window.Tesseract && typeof window.Tesseract.createWorker==='function')return Promise.resolve(window.Tesseract);
    if(pending)return pending;
    pending=loadScript(sources[0]).catch(function(){return loadScript(sources[1]);}).catch(function(e){
      pending=null;throw e;
    });
    return pending;
  };
})();
