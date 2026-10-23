/* Category guides: progressive reveal, repeatable when a section comes back into view. */
(()=>{const guides=[...document.querySelectorAll('.dk-next-category-guide')];if(!guides.length)return;
const sections=guides.flatMap(g=>[...g.querySelectorAll(':scope > h2, :scope > p, .dk-next-guide-part, .dk-next-tool-choices, .dk-next-guide-faq')]);
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if(!('IntersectionObserver' in window)||reduce)return;
const observer=new IntersectionObserver(entries=>{for(const e of entries){
if(e.isIntersecting){e.target.classList.add('dk-next-visible');e.target.classList.remove('dk-next-await')}
else if(e.boundingClientRect.bottom < -30 || e.boundingClientRect.top > innerHeight+30){e.target.classList.add('dk-next-await');e.target.classList.remove('dk-next-visible')}
}},{rootMargin:'0px 0px 32px 0px',threshold:.04});
for(const el of sections){el.classList.add('dk-next-reveal');if(el.getBoundingClientRect().top>innerHeight+30)el.classList.add('dk-next-await');else el.classList.add('dk-next-visible');observer.observe(el)}
})();