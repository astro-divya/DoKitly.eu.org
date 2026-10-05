(()=>{'use strict';
const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
ready(()=>{
  /* Apply saved theme on every page. Homepage keeps its existing toggle listener; other pages get one. */
  const wantsDark=localStorage.getItem('dokitly-theme')==='dark';
  if(wantsDark)document.body.classList.add('dark');
  const nav=document.querySelector('.site-header nav,.it-nav');
  if(nav&&!nav.querySelector('#theme,.dk-theme-btn')){
    const b=document.createElement('button');b.type='button';b.className='dk-theme-btn';b.id='dkTheme29';b.title='Toggle theme';b.setAttribute('aria-label','Toggle dark mode');b.textContent='◐';nav.appendChild(b);
    b.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('dokitly-theme',document.body.classList.contains('dark')?'dark':'light')});
  }

  /* All Tools: real navigation, active state, wheel, drag, touch and keyboard. */
  document.querySelectorAll('.category-jumps[data-legacy-rail]:not([data-b30-rail])').forEach(strip=>{
    strip.setAttribute('tabindex','0');
    const links=[...strip.querySelectorAll('a[href^="#"]')];
    const activate=a=>{links.forEach(x=>x.classList.toggle('is-active',x===a));a?.scrollIntoView({block:'nearest',inline:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
    links.forEach(a=>a.addEventListener('click',e=>{
      const id=a.getAttribute('href').slice(1),target=document.getElementById(id);if(!target)return;
      e.preventDefault();activate(a);target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});try{history.replaceState(null,'','#'+id)}catch{}
    }));
    const sections=links.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
    if('IntersectionObserver'in window&&sections.length){
      const io=new IntersectionObserver(entries=>{const hit=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!hit)return;activate(links.find(a=>a.hash==='#'+hit.target.id))},{rootMargin:'-20% 0px -66% 0px',threshold:[.01,.15,.35]});
      sections.forEach(s=>io.observe(s));
    }
    /* build26 owns wheel + pointer-drag mechanics; Build29 owns real click navigation/active state. */
    strip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();if(e.key==='Home')strip.scrollTo({left:0,behavior:'smooth'});else if(e.key==='End')strip.scrollTo({left:strip.scrollWidth,behavior:'smooth'});else strip.scrollBy({left:e.key==='ArrowRight'?220:-220,behavior:'smooth'})});
  });

  /* Popular launcher behaves like a compact horizontal rail. */
  document.querySelectorAll('.hero-popular-links').forEach(row=>{
    row.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&row.scrollWidth>row.clientWidth){row.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
  });

  /* On touch/mobile no hover menu may intercept the first tap. */
  if(matchMedia('(hover:none),(pointer:coarse)').matches){document.querySelectorAll('.image-hover-menu,.category-hover-menu,.pdf-hover-menu').forEach(el=>{el.hidden=true;el.style.display='none';el.style.pointerEvents='none'})}

  /* Feedback must never surface backend/storage diagnostics in the download experience. */
  const delivery=document.getElementById('feedbackDelivery');if(delivery)delivery.textContent='';
});
})();
