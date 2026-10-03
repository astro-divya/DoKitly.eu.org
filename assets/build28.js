(()=>{'use strict';
const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
ready(()=>{
  // All Tools: category strip must behave like navigation, never a dead decorative strip.
  document.querySelectorAll('.category-jumps').forEach(strip=>{
    strip.setAttribute('tabindex','0');
    const links=[...strip.querySelectorAll('a[href^="#"]')];
    links.forEach(a=>a.addEventListener('click',e=>{
      const id=a.getAttribute('href').slice(1),target=document.getElementById(id);if(!target)return;
      e.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      links.forEach(x=>x.classList.toggle('is-active',x===a));
      try{history.replaceState(null,'','#'+id)}catch{}
    }));
    const sections=links.map(a=>document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    if('IntersectionObserver' in window&&sections.length){
      const obs=new IntersectionObserver(entries=>{const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;const a=links.find(x=>x.getAttribute('href')==='#'+visible.target.id);if(!a)return;links.forEach(x=>x.classList.toggle('is-active',x===a));a.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});},{rootMargin:'-18% 0px -62% 0px',threshold:[.01,.15,.35]});sections.forEach(s=>obs.observe(s));
    }
    strip.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();strip.scrollBy({left:e.key==='ArrowRight'?220:-220,behavior:'smooth'})});
  });

  // Home popular launcher: wheel translates naturally into horizontal movement.
  document.querySelectorAll('.hero-popular-links').forEach(row=>row.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&row.scrollWidth>row.clientWidth){row.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false}));

  // Touch devices use direct taps only; old hover menus must never intercept them.
  if(matchMedia('(hover:none),(pointer:coarse)').matches){
    document.querySelectorAll('.image-hover-menu,.category-hover-menu,.pdf-hover-menu').forEach(el=>{el.hidden=true;el.style.display='none';el.style.pointerEvents='none'});
  }
});
})();
