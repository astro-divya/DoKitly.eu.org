(()=>{
  const script=document.currentScript;
  const root=new URL('../',script?.src||location.href);
  const href=p=>new URL(p,root).href;
  const cleanPath=p=>{try{return new URL(p,location.href).pathname.replace(/\/+$/,'')}catch{return''}};
  const current=cleanPath(location.href);
  const siteRootPath=cleanPath(root.href);
  const homePath=cleanPath(href(''));

  function navLink(label,path){
    const a=document.createElement('a');
    a.className='dk-nav-link';a.textContent=label;a.href=href(path);
    const target=cleanPath(a.href);
    if((path===''&&(current===siteRootPath||current===homePath))||current===target)a.setAttribute('aria-current','page');
    return a;
  }

  function setupNav(){
    const nav=document.querySelector('.site-header nav,.it-nav');
    if(!nav)return;
    const theme=nav.querySelector('#theme');
    nav.innerHTML='';
    nav.append(navLink('Home',''),navLink('Categories','all-tools.html'),navLink("What’s New",'whats-new.html'));
    if(theme)nav.append(theme);
  }

  const footerLinks=[
    ['About','about.html'],['Report a Bug','report-bug.html'],['Blog','blog.html'],['Suggest a Tool','suggest-tool.html'],['FAQ','faq.html'],['Disclaimer','disclaimer.html'],['Contact','contact.html'],['Privacy','privacy.html'],['Terms','terms.html']
  ];
  function setupFooter(){
    document.querySelectorAll('body>footer').forEach(f=>f.remove());
    const f=document.createElement('footer');f.className='dk-footer';
    const links=footerLinks.map(([t,p])=>`<a href="${href(p)}">${t}</a>`).join('');
    f.innerHTML=`<div class="dk-footer-inner"><div class="dk-footer-top"><div class="dk-footer-brand"><img src="${href('assets/icon.png?v=2')}" alt=""><div><b>DoKitly</b><small>Useful digital tools, without the clutter.</small></div></div><nav class="dk-footer-links" aria-label="Footer navigation">${links}</nav></div><div class="dk-footer-bottom"><span>© ${new Date().getFullYear()} DoKitly</span><span>Browser-first where practical • No fake results</span></div></div>`;
    document.body.appendChild(f);
  }

  const quickCatalog=[
    {label:'PDF Editor',path:'pdf-tools/pdf-editor.html'},
    {label:'PDF to Word',path:'pdf-tools/pdf-to-word.html'},
    {label:'Image Compressor',path:'image-tools/image-compress.html'},
    {label:'Text Studio',path:'text-tools/text-studio.html'},
    {label:'Universal Converter',path:'converter-tools/unit.html'},
    {label:'World Quiz',path:'student-tools/world-quiz.html'},
    {label:'Typing Test',path:'student-tools/typing-test.html'},
    {label:'Hindi InScript Tutor',path:'student-tools/hindi-typing-tutor.html'},
    {label:'Website Analyzer',path:'seo-tools/website-analyzer.html'},
    {label:'QR Studio',path:'developer-tools/qr-studio.html'},
    {label:'Barcode Studio',path:'developer-tools/barcode-studio.html'},
    {label:'Advanced Math',path:'calculator-tools/advanced-math-solver.html'},
    {label:'Date & Time',path:'date-time-tools/date-calculator.html'},
    {label:'Randomizer',path:'everyday-tools/randomizer.html'},
    {label:'Password Generator',path:'everyday-tools/password-generator.html'},
    {label:'Caption Generator',path:'creator-tools/caption-generator.html'},
    {label:'Hashtag Generator',path:'creator-tools/hashtag-generator.html'}
  ];
  const quickDefaults=['pdf-tools/pdf-editor.html','pdf-tools/pdf-to-word.html','image-tools/image-compress.html','text-tools/text-studio.html','converter-tools/unit.html'];
  const quickKey='dokitly.quickShortcuts.v1';
  function loadQuick(){
    try{const a=JSON.parse(localStorage.getItem(quickKey)||'null');if(Array.isArray(a)&&a.length)return a.filter(p=>quickCatalog.some(x=>x.path===p)).slice(0,8)}catch{}
    return [...quickDefaults];
  }
  function saveQuick(a){try{localStorage.setItem(quickKey,JSON.stringify(a.slice(0,8)))}catch{}}
  function setupQuickShortcuts(){
    const box=document.querySelector('.hero-chips'); if(!box)return;
    box.id='quickShortcuts';
    let selected=loadQuick();
    const render=()=>{box.innerHTML='';selected.forEach(path=>{const item=quickCatalog.find(x=>x.path===path);if(!item)return;const a=document.createElement('a');a.href=href(item.path);a.textContent=item.label;box.appendChild(a)})};
    render();
    const edit=document.createElement('button');edit.type='button';edit.className='dk-shortcut-edit';edit.textContent='✎ Edit shortcuts';edit.setAttribute('aria-haspopup','dialog');box.insertAdjacentElement('afterend',edit);
    const dlg=document.createElement('dialog');dlg.className='dk-shortcut-dialog';dlg.innerHTML=`<div class="dk-shortcut-head"><h2>Edit quick shortcuts</h2><p>Choose up to 8 tools. Your choices stay in this browser.</p></div><div class="dk-shortcut-list"></div><div class="dk-shortcut-actions"><button type="button" class="dk-mini-btn" data-reset>Reset default</button><div><button type="button" class="dk-mini-btn" data-close>Cancel</button><button type="button" class="dk-mini-btn primary" data-save>Save shortcuts</button></div></div>`;document.body.appendChild(dlg);
    let draft=[];
    const list=dlg.querySelector('.dk-shortcut-list');
    function drawList(){
      list.innerHTML='';
      const ordered=[...draft,...quickCatalog.map(x=>x.path).filter(p=>!draft.includes(p))];
      ordered.forEach(path=>{const item=quickCatalog.find(x=>x.path===path);const isOn=draft.includes(path);const idx=draft.indexOf(path);const row=document.createElement('div');row.className='dk-shortcut-row';row.innerHTML=`<input type="checkbox" ${isOn?'checked':''} aria-label="${item.label}"><label>${item.label}</label><div class="dk-shortcut-move"><button type="button" title="Move up" ${!isOn||idx<=0?'disabled':''}>↑</button><button type="button" title="Move down" ${!isOn||idx<0||idx>=draft.length-1?'disabled':''}>↓</button></div>`;
        const cb=row.querySelector('input');const [up,down]=row.querySelectorAll('button');
        cb.addEventListener('change',()=>{if(cb.checked){if(draft.length>=8){cb.checked=false;alert('You can keep up to 8 shortcuts.');return}draft.push(path)}else draft=draft.filter(p=>p!==path);drawList()});
        up.addEventListener('click',()=>{const i=draft.indexOf(path);if(i>0){[draft[i-1],draft[i]]=[draft[i],draft[i-1]];drawList()}});
        down.addEventListener('click',()=>{const i=draft.indexOf(path);if(i>=0&&i<draft.length-1){[draft[i+1],draft[i]]=[draft[i],draft[i+1]];drawList()}});
        list.appendChild(row);
      });
    }
    edit.addEventListener('click',()=>{draft=[...selected];drawList();if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')});
    dlg.querySelector('[data-close]').addEventListener('click',()=>dlg.close?dlg.close():dlg.removeAttribute('open'));
    dlg.querySelector('[data-reset]').addEventListener('click',()=>{draft=[...quickDefaults];drawList()});
    dlg.querySelector('[data-save]').addEventListener('click',()=>{selected=draft.length?draft:[...quickDefaults];saveQuick(selected);render();dlg.close?dlg.close():dlg.removeAttribute('open')});
    dlg.addEventListener('click',e=>{if(e.target===dlg){const r=dlg.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dlg.close()}});
  }

  function setupCategoryJumps(){
    const nav=document.querySelector('.category-jumps');if(!nav)return;nav.classList.add('dk-sticky-jumps');
    const links=[...nav.querySelectorAll('a[href^="#"]')];const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);if(!sections.length)return;
    const set=id=>links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+id));
    const io=new IntersectionObserver(entries=>{const hit=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(hit)set(hit.target.id)},{rootMargin:'-20% 0px -65% 0px',threshold:[0,.01,.2]});sections.forEach(s=>io.observe(s));
    links.forEach(a=>a.addEventListener('click',()=>set(a.hash.slice(1))));
  }

  setupNav();
  setupQuickShortcuts();
  setupCategoryJumps();
  setupFooter();
})();
