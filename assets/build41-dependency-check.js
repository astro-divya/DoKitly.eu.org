/* Step 4 vendor diagnostic: confirms required APIs; never creates fake output. */
(()=>{'use strict';
 const specs=[
  ['pdf-lib','PDF library',()=>!!(window.PDFLib&&window.PDFLib.PDFDocument&&typeof window.PDFLib.PDFDocument.create==='function')],
  ['jspdf','PDF export library',()=>!!(window.jspdf&&typeof window.jspdf.jsPDF==='function')],
  ['docx','Word export library',()=>!!(window.docx&&typeof window.docx.Document==='function'&&window.docx.Packer&&typeof window.docx.Packer.toBlob==='function')],
  ['nerdamer','Mathematics library',()=>!!(typeof window.nerdamer==='function'&&typeof window.nerdamer.solveEquations==='function')],
  ['jszip','ZIP library',()=>!!window.JSZip]
 ];
 const wanted=new Set([...document.querySelectorAll('script[data-dk-vendor]')].map(s=>s.dataset.dkVendor));
 if([...document.querySelectorAll('script[src]')].some(s=>/jszip/i.test(s.src)))wanted.add('jszip');
 function notice(names){const parent=document.getElementById('toolRoot')||document.querySelector('main');if(!parent)return;
  let n=document.getElementById('dk41-dependency-warning');if(!n){n=document.createElement('div');n.id='dk41-dependency-warning';n.className='dk41-dependency-warning';n.setAttribute('role','alert');parent.prepend(n)}
  n.textContent='Some processing libraries could not load ('+names.join(', ')+'). This operation may be unavailable while external resources are blocked. Check your connection and reload; no output is being claimed.';
 }
 addEventListener('load',()=>setTimeout(()=>{const missing=specs.filter(([key])=>wanted.has(key)).filter(([,label,ok])=>{try{return !ok()}catch(_){return true}}).map(([,label])=>label);if(missing.length)notice(missing)},500),{once:true});
 if(window.DoKitlyPDFReady&&typeof window.DoKitlyPDFReady.catch==='function')window.DoKitlyPDFReady.catch(()=>notice(['PDF.js module or Worker']));
})();
