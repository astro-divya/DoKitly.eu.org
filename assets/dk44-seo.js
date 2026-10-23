/* Shared progressive editorial animations: repeat on each viewport entry, no invisible JS-only content. */
(()=>{
 const sections=[...document.querySelectorAll('.dk44-seo')];if(!sections.length)return;
 const targets=sections.flatMap(s=>[...s.querySelectorAll('.reveal,.chart')]);
 if(!('IntersectionObserver' in window)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){targets.forEach(el=>el.classList.add('dk44-reveal','dk44-visible'));return;}
 const io=new IntersectionObserver(entries=>{
  for(const e of entries){
   if(e.isIntersecting){e.target.classList.add('dk44-visible');e.target.classList.remove('dk44-await');}
   else if(e.boundingClientRect.bottom < -24 || e.boundingClientRect.top > window.innerHeight+24){e.target.classList.remove('dk44-visible');e.target.classList.add('dk44-await');}
  }
 },{rootMargin:'0px 0px 35px 0px',threshold:.04});
 for(const el of targets){
  el.classList.add('dk44-reveal');
  if(el.getBoundingClientRect().top>window.innerHeight+32)el.classList.add('dk44-await');
  else el.classList.add('dk44-visible');
  io.observe(el);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){for(const el of targets)if(el.getBoundingClientRect().top<innerHeight && el.getBoundingClientRect().bottom>0){el.classList.add('dk44-visible');el.classList.remove('dk44-await');}}});
})();