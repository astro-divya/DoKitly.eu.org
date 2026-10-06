/* DoKitly Build 36 — local Mozilla PDF.js runtime bridge */
(() => {
  'use strict';

  const script = document.currentScript;
  const scriptUrl = script && script.src
    ? script.src
    : new URL('/assets/pdfjs-bootstrap.js', location.origin).href;

  const baseUrl = new URL('./pdfjs/', scriptUrl).href;
  const moduleUrl = new URL('pdf.mjs', baseUrl).href;
  const workerUrl = new URL('pdf.worker.mjs', baseUrl).href;
  const cMapUrl = new URL('cmaps/', baseUrl).href;
  const standardFontDataUrl = new URL('standard_fonts/', baseUrl).href;
  const wasmUrl = new URL('wasm/', baseUrl).href;

  let runtimePromise = null;

  function loadPDFJS() {
    if (!runtimePromise) {
      runtimePromise = import(moduleUrl).then((pdfjs) => {
        if (!pdfjs || typeof pdfjs.getDocument !== 'function') {
          throw new Error('Mozilla PDF.js did not load correctly.');
        }

        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const runtime = Object.create(null);

        Object.defineProperties(
          runtime,
          Object.getOwnPropertyDescriptors(pdfjs)
        );

        Object.defineProperty(runtime, 'getDocument', {
          configurable: true,
          enumerable: true,
          writable: false,

          value(source) {
            let options;

            if (
              source instanceof ArrayBuffer ||
              ArrayBuffer.isView(source) ||
              typeof source === 'string' ||
              source instanceof URL
            ) {
              options = { data: source };

              if (
                typeof source === 'string' ||
                source instanceof URL
              ) {
                options = { url: source.toString() };
              }
            } else {
              options = { ...(source || {}) };
            }

            if (options.cMapUrl == null) {
              options.cMapUrl = cMapUrl;
            }

            if (options.cMapPacked == null) {
              options.cMapPacked = true;
            }

            if (options.standardFontDataUrl == null) {
              options.standardFontDataUrl = standardFontDataUrl;
            }

            if (options.wasmUrl == null) {
              options.wasmUrl = wasmUrl;
            }

            return pdfjs.getDocument(options);
          }
        });

        window.pdfjsLib = runtime;
        window.DoKitlyPDFJS = Promise.resolve(runtime);

        return runtime;
      }).catch((error) => {
        runtimePromise = null;
        console.error(
          '[DoKitly PDF.js] Runtime load failed:',
          error
        );
        throw error;
      });
    }

    return runtimePromise;
  }

  window.DoKitlyGetPDFJS = loadPDFJS;

  /* Compatibility for code waiting on DoKitlyPDFJS */
  window.DoKitlyPDFJS = loadPDFJS();
})();
