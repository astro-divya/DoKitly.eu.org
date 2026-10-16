/* A successful first online load warms a cache of four version-pinned third-party libraries.
   It is a warm-cache fallback, NOT a bundled first-visit/offline replacement. */
(function(){'use strict';
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 window.addEventListener('load',function(){
  navigator.serviceWorker.register('/dk42-vendor-sw.js',{scope:'/',updateViaCache:'none'}).catch(function(){
   // Browsers without SW support continue to use the original CDN script tags.
  });
 },{once:true});
})();
