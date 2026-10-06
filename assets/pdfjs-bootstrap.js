/* DoKitly Build 36 — local Mozilla PDF.js runtime bridge */
(() => {
  'use strict';

  const currentScript = document.currentScript;
  const scriptUrl = currentScript?.src ||
    new URL('/assets/pdfjs-bootstrap.js', location.origin).href;

  const baseUrl = new URL('./pdfjs/', scriptUrl).href;
  const moduleUrl = new URL('pdf.mjs', baseUrl).href;
  const workerUrl = new URL('pdf.worker.mjs', baseUrl).href;

  let runtimePromise = null;

  async function loadPDFJS() {
    if (!runtimePromise) {
      runtimePromise = import(moduleUrl)
        .then((pdfjs) => {
          if (!pdfjs || typeof pdfjs.getDocument !== 'function') {
            throw new Error('Mozilla PDF.js did not load correctly.');
          }

          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

          /* Use the real PDF.js module directly.
             Do not clone/redefine module properties. */
          window.pdfjsLib = pdfjs;

          return pdfjs;
        })
        .catch((error) => {
          runtimePromise = null;
          console.error('[DoKitly PDF.js] Runtime load failed:', error);
          throw error;
        });
    }

    return runtimePromise;
  }

  window.DoKitlyGetPDFJS = loadPDFJS;
  window.DoKitlyPDFJS = loadPDFJS();
})();
