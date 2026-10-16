/* Build 41: focused functional modes for legacy alias URLs. No tool engines overridden. */
(function(){'use strict';
const $=id=>document.getElementById(id);const page=location.pathname.split('/').pop();const qs=new URLSearchParams(location.search);
function mount(before,inner,id){if(!before||$(id))return null;const sec=document.createElement('section');sec.className='dk41-alias-tool';sec.id=id;sec.innerHTML=inner;before.parentNode.insertBefore(sec,before);return sec;}
function note(target,msg){if(target)target.textContent=msg;}
if(page==='advanced-math-solver.html'){
 const t=document.querySelector('.math-hub')||document.querySelector('.dk40-guide');
 const sec=mount(t,`<h2>Scientific calculator</h2><p>Evaluate basic scientific expressions privately. Use explicit multiplication (for example, <code>2*pi</code>). For symbolic equations or calculus, choose a specialist solver below.</p><label for="dk41-math-expression">Expression</label><div class="dk41-alias-input-row"><input id="dk41-math-expression" autocomplete="off" spellcheck="false" value="sin(pi/6)+sqrt(16)" placeholder="e.g. sqrt(81)+2^3"/><button id="dk41-math-run" type="button">Calculate</button></div><div class="dk41-alias-input-row"><label><input id="dk41-math-degrees" type="checkbox"/> Use degrees for trigonometry</label></div><output id="dk41-math-result" aria-live="polite">Select Calculate.</output><p class="dk41-alias-small">Supports + − × ÷ ^, parentheses, pi, e, sin, cos, tan, asin, acos, atan, sqrt, abs, log (base 10), ln and exp. Trigonometric angle unit is set above. Does not support symbolic algebra.</p>`,'scientific-calculator');
 if(sec){
  const expr=$('dk41-math-expression'),deg=$('dk41-math-degrees');
  function calc(input){let pos=0;const t=input.replace(/\s+/g,'').replace(/[−–]/g,'-').replace(/×/g,'*').replace(/÷/g,'/');if(t.length>240)throw Error('Expression is too long');const fail=()=>{throw Error('Check expression near '+(t.slice(pos,pos+12)||'the end'));};
   const peek=()=>t[pos];const take=c=>{if(t[pos]===c){pos++;return true}return false};
   function primary(){if(take('(')){const v=sum();if(!take(')'))fail();return v}if(pos>=t.length)fail();const n=/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(t.slice(pos));if(n){pos+=n[0].length;return Number(n[0])}const name=/^[a-z]+/.exec(t.slice(pos));if(!name)fail();pos+=name[0].length;const fn=name[0];if(fn==='pi')return Math.PI;if(fn==='e')return Math.E;if(!take('('))fail();const a=sum();if(!take(')'))fail();const r=deg.checked?Math.PI/180:1;const fs={sin:x=>Math.sin(x*r),cos:x=>Math.cos(x*r),tan:x=>Math.tan(x*r),asin:x=>Math.asin(x)/r,acos:x=>Math.acos(x)/r,atan:x=>Math.atan(x)/r,sqrt:Math.sqrt,abs:Math.abs,log:Math.log10,ln:Math.log,exp:Math.exp};if(!Object.prototype.hasOwnProperty.call(fs,fn))throw Error('Unsupported function '+fn);return fs[fn](a)}
   function power(){let a=primary();if(take('^'))a=Math.pow(a,unary());return a}
   function unary(){if(take('+'))return unary();if(take('-'))return -unary();return power()}
   function product(){let a=unary();while(true){if(take('*'))a*=unary();else if(take('/'))a/=unary();else break}return a}
   function sum(){let a=product();while(true){if(take('+'))a+=product();else if(take('-'))a-=product();else break}return a}
   const val=sum();if(pos!==t.length)fail();if(!Number.isFinite(val))throw Error('Result is undefined or outside numeric range');return Math.abs(val)<1e-13?0:val;
  }
  function run(){try{const v=calc(expr.value.trim());note($('dk41-math-result'), 'Result: '+Number(v.toPrecision(14)).toString())}catch(e){note($('dk41-math-result'),'Cannot calculate: '+e.message)}}
  $('dk41-math-run').addEventListener('click',run);expr.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
  if(qs.get('mode')==='scientific'){sec.scrollIntoView({block:'start'});expr.focus({preventScroll:true})}
 }
}
if(page==='world-quiz.html'){
 const before=document.querySelector('.dk40-guide');
 const sec=mount(before,`<h2>Flashcard maker &amp; revision</h2><p>Study your own questions with front/back cards. Write one card per line as <code>Question | Answer</code>, then flip to reveal each answer. Nothing is uploaded.</p><label for="dk41-flash-input">Your flashcards (question | answer)</label><textarea id="dk41-flash-input" rows="5">What is H₂O? | Water\nCapital of India? | New Delhi\nWhat is 8 × 7? | 56</textarea><div class="dk41-alias-input-row"><button id="dk41-flash-load" type="button">Load cards</button><button id="dk41-flash-shuffle" type="button">Shuffle</button></div><button class="dk41-flash-card" type="button" id="dk41-flash-card" aria-label="Flip card"><span id="dk41-flash-side">FRONT</span><strong id="dk41-flash-text">Choose Load cards.</strong><small>Click to flip</small></button><div class="dk41-alias-input-row"><button id="dk41-flash-prev" type="button">← Previous</button><span id="dk41-flash-count" aria-live="polite">0 cards</span><button id="dk41-flash-next" type="button">Next →</button></div><p class="dk41-alias-small" id="dk41-flash-status" aria-live="polite">Use the separator | between each question and answer.</p>`,'flashcards');
 if(sec){let cards=[],index=0,back=false;const render=()=>{if(!cards.length){note($('dk41-flash-text'),'Enter cards above to start');return}note($('dk41-flash-side'),back?'ANSWER':'QUESTION');note($('dk41-flash-text'),cards[index][back?1:0]);note($('dk41-flash-count'),(index+1)+' of '+cards.length+' cards')};
 $('dk41-flash-load').addEventListener('click',()=>{const lines=$('dk41-flash-input').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);cards=lines.map(s=>s.split(/\s*\|\s*/)).filter(a=>a.length===2&&a.every(Boolean)).slice(0,250);index=0;back=false;render();note($('dk41-flash-status'),cards.length+' valid cards loaded locally. Blank or incomplete rows skipped.')});
 $('dk41-flash-card').addEventListener('click',()=>{if(!cards.length)return;back=!back;render()});$('dk41-flash-next').addEventListener('click',()=>{if(cards.length){index=(index+1)%cards.length;back=false;render()}});$('dk41-flash-prev').addEventListener('click',()=>{if(cards.length){index=(index-1+cards.length)%cards.length;back=false;render()}});
 $('dk41-flash-shuffle').addEventListener('click',()=>{for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}index=0;back=false;render()});$('dk41-flash-load').click();if(qs.get('mode')==='flashcards')sec.scrollIntoView({block:'start'});
 }
}
if(page==='caption-extractor.html'){
 const before=document.querySelector('.dk40-guide');
 const sec=mount(before,`<h2>Link scanner &amp; URL extractor</h2><p>Extract links from pasted captions or notes, remove duplicates and flag obvious URL-format concerns. This is a local text check, <strong>not</strong> a malware scan, live reputation lookup or safety guarantee.</p><label for="dk41-link-text">Paste caption or text containing URLs</label><textarea rows="5" id="dk41-link-text" placeholder="Example: Visit https://example.com and http://example.org"></textarea><div class="dk41-alias-input-row"><button type="button" id="dk41-links-run">Extract links</button><button type="button" id="dk41-links-copy">Copy links</button></div><p id="dk41-links-status" aria-live="polite">No links scanned yet.</p><ul id="dk41-links-list" class="dk41-link-list"></ul>`,'link-scanner');
 if(sec){let urls=[];$('dk41-links-run').addEventListener('click',()=>{const src=$('dk41-link-text').value;urls=[...new Set((src.match(/https?:\/\/[^\s<>"'`]+/gi)||[]).map(x=>x.replace(/[),.;!?]+$/g,'')))].slice(0,500);const list=$('dk41-links-list');list.replaceChildren();urls.forEach(u=>{const li=document.createElement('li');let msg='';try{const url=new URL(u);const warning=[];if(url.protocol!=='https:')warning.push('Not HTTPS');if(url.username||url.password)warning.push('URL contains credentials');if(/(^|\.)xn--/.test(url.hostname))warning.push('Punycode domain — verify spelling');msg=url.hostname+' — '+(warning.join('; ')||'Format parsed; safety unverified')}catch{msg='Invalid URL format'}li.textContent=u+'  •  '+msg;list.append(li)});note($('dk41-links-status'),urls.length+' distinct HTTP(S) links found. No links opened or checked against the internet.')});$('dk41-links-copy').addEventListener('click',async()=>{try{if(!urls.length)throw Error('Scan first');await navigator.clipboard.writeText(urls.join('\n'));note($('dk41-links-status'),'Copied '+urls.length+' links')}catch{note($('dk41-links-status'),'Copy unavailable; select links manually')}});if(qs.get('mode')==='links')sec.scrollIntoView({block:'start'});}
}
if(page==='barcode-studio.html'){
 const mode=qs.get('mode');if(mode==='decode'||mode==='generate'){const btn=document.querySelector('[data-bmode="'+mode+'"]');if(btn){btn.click();document.querySelector('.mode-tabs')?.scrollIntoView({block:'nearest'})}}
}
if(page==='image-filter.html'){
 const mode=qs.get('mode');if(mode==='blur'||mode==='grayscale'){
 const el=document.querySelector('[data-adj="'+mode+'"]');if(el){el.value=mode==='blur'?'5':'100';el.dispatchEvent(new Event('input',{bubbles:true}));const msg=document.createElement('p');msg.className='dk41-mode-notice';msg.textContent=(mode==='blur'?'Blur':'Grayscale')+' mode preselected. Upload an image to preview and fine-tune the effect.';const t=$('toolRoot');t?.prepend(msg)}
 }
}

if(page==='caption-generator.html'){
 const before=document.querySelector('.dk40-guide');
 const sec=mount(before,`<h2>Caption counter</h2><p>Count characters, words and hashtags before posting. Results update as you type and never leave this device.</p><label for="dk41-caption-input">Your caption</label><textarea id="dk41-caption-input" rows="6" placeholder="Write or paste your caption"></textarea><output id="dk41-caption-count" aria-live="polite">0 characters · 0 words · 0 hashtags · 0 lines</output>`,'caption-counter');
 if(sec){const t=$('dk41-caption-input');const count=()=>{const v=t.value;const chars=[...v].length, words=v.trim()?v.trim().split(/\s+/u).length:0,hashtags=(v.match(/(^|\s)#[\p{L}\p{N}_]+/gu)||[]).length,lines=v.length?v.split(/\r?\n/).length:0;note($('dk41-caption-count'),chars+' characters · '+words+' words · '+hashtags+' hashtags · '+lines+' lines')};t.addEventListener('input',count);count();if(qs.get('mode')==='counter'){sec.scrollIntoView({block:'start'});t.focus({preventScroll:true})}}
}
if(page==='image-resize.html'){
 const before=document.querySelector('.dk40-guide');
 const sec=mount(before,`<h2>Print size calculator</h2><p>Estimate how large a raster image prints at a selected DPI. The calculation does not change the image or its embedded DPI metadata.</p><div class="dk41-alias-input-row"><label>Width (px) <input type="number" min="1" max="100000" id="dk41-print-w" value="2400"/></label><label>Height (px) <input type="number" min="1" max="100000" id="dk41-print-h" value="3000"/></label><label>Print DPI <input type="number" min="1" max="2400" id="dk41-print-dpi" value="300"/></label></div><output id="dk41-print-result">Choose dimensions and DPI.</output>`,'print-size');
 if(sec){const calc=()=>{const w=Number($('dk41-print-w').value),h=Number($('dk41-print-h').value),dpi=Number($('dk41-print-dpi').value);if(![w,h,dpi].every(x=>Number.isFinite(x)&&x>0)){note($('dk41-print-result'),'Enter positive pixel dimensions and DPI.');return}note($('dk41-print-result'),(w/dpi).toFixed(2)+' × '+(h/dpi).toFixed(2)+' inches  /  '+(w/dpi*2.54).toFixed(2)+' × '+(h/dpi*2.54).toFixed(2)+' cm')};['dk41-print-w','dk41-print-h','dk41-print-dpi'].forEach(x=>$(x).addEventListener('input',calc));calc();if(qs.get('mode')==='print')sec.scrollIntoView({block:'start'});if(qs.get('mode')==='percent'){const t=$('resizePercent');t?.focus()}}
}
if(page==='image-base64.html'&&qs.get('mode')==='decode'){
 document.querySelector('[data-mode="decode"]')?.click();
}
if(page==='caption-extractor.html'&&qs.get('mode')==='hashtags'){
 $('exText')?.focus();
}
})();
