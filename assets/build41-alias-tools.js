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
if(page==='barcode-studio.html'){
 const mode=qs.get('mode');if(mode==='decode'||mode==='generate'){const btn=document.querySelector('[data-bmode="'+mode+'"]');if(btn){btn.click();document.querySelector('.mode-tabs')?.scrollIntoView({block:'nearest'})}}
}
if(page==='image-filter.html'){
 const mode=qs.get('mode');if(mode==='blur'||mode==='grayscale'){
 const el=document.querySelector('[data-adj="'+mode+'"]');if(el){el.value=mode==='blur'?'5':'100';el.dispatchEvent(new Event('input',{bubbles:true}));const msg=document.createElement('p');msg.className='dk41-mode-notice';msg.textContent=(mode==='blur'?'Blur':'Grayscale')+' mode preselected. Upload an image to preview and fine-tune the effect.';const t=$('toolRoot');t?.prepend(msg)}
 }
}

if(page==='image-base64.html'&&qs.get('mode')==='decode'){
 document.querySelector('[data-mode="decode"]')?.click();
}
if(page==='caption-extractor.html'&&qs.get('mode')==='hashtags'){
 $('exText')?.focus();
}
})();
