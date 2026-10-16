/* DoKitly Build 42: cached fallback for PINNED external browser libraries.
   First online fetch is still needed to populate the browser's cache.
   SW only intercepts these exact library URLs; it does not touch files, downloads or ads. */
const CACHE='dokitly-verified-cdn-v42';
const URLS=[
'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
'https://unpkg.com/docx@8.5.0/build/index.umd.js',
'https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js'
];
const WHITELIST=new Set(URLS);
self.addEventListener('install',event=>{
 self.skipWaiting();
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(URLS.map(async url=>{
   try{
    const request=new Request(url,{mode:'no-cors',credentials:'omit'});
    const response=await fetch(request);
    if(response && (response.ok||response.type==='opaque'))await cache.put(request,response.clone());
   }catch(_e){}
  }));
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('dokitly-verified-cdn-') && k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(!WHITELIST.has(request.url)||request.method!=='GET')return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  try{
   const response=await fetch(request);
   if(response && (response.ok||response.type==='opaque')){
    await cache.put(request,response.clone());
   }
   return response;
  }catch(error){
   // Browser will surface a truthful library failure. No fake processing outputs.
   throw error;
  }
 })());
});
