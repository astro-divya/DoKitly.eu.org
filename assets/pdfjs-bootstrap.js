(function(){
'use strict';
if(window.DoKitlyPDFReady)return;
if(typeof Promise.try!=='function')Promise.try=function(fn){var args=[].slice.call(arguments,1);return Promise.resolve().then(function(){return fn.apply(null,args);});};
var base=(document.currentScript&&document.currentScript.src)||new URL('assets/pdfjs-bootstrap.js',document.baseURI).href;
var moduleUrl=new URL('./pdfjs/pdf.mjs',base).href;
var workerUrl=new URL('./pdfjs/pdf.worker.mjs',base).href;
window.DoKitlyPDFReady=import(moduleUrl).then(function(pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc=workerUrl;
  window.pdfjsLib=pdfjsLib;
  window.dispatchEvent(new CustomEvent('dokitly:pdfjs-ready',{detail:{version:pdfjsLib.version}}));
  return pdfjsLib;
});
window.DoKitlyGetPDFJS=function(){return window.DoKitlyPDFReady;};
})();
