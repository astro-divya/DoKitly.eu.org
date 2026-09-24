(()=>{
'use strict';
const $=id=>document.getElementById(id);

const EN={
 easy:[
  'A quiet morning can make a familiar street feel new. Birds move between the trees while people walk to work, open small shops, and begin another ordinary day.',
  'Good habits grow through simple actions repeated over time. A short walk, a glass of water, a clean desk, and a few focused minutes can make a busy day easier.',
  'Rain changes the sound of a city. Cars move more slowly, roofs begin to tap, and the smell of wet soil reaches the streets after a strong shower.',
  'Learning becomes easier when a large task is divided into small steps. Each finished step gives useful feedback and makes the next step clearer.',
  'A train moves across the plain while small farms pass outside the window. The journey feels calm because the view changes slowly and there is time to notice simple details.'
 ],
 medium:[
  'A modern website may look simple on the screen, yet many small systems work together behind it. The browser loads files, applies styles, runs scripts, stores temporary data, and communicates with servers across a large network.',
  'Modern cities depend on many invisible systems working together. Water, electricity, data networks, public transport, waste collection, emergency services, and thousands of daily deliveries must remain reliable even when demand changes suddenly.',
  'Good decisions rarely come from one number alone. Context matters, assumptions should be visible, and useful comparisons require the same definitions. A quick estimate can guide attention, but important conclusions deserve stronger evidence and careful checking.',
  'A long walk through an unfamiliar neighborhood can reveal details that disappear from a moving vehicle. Small shops, old trees, building materials, local signs, street sounds, and patterns of movement slowly form a clearer picture of the place.',
  'Space exploration combines careful engineering with patient science. A spacecraft must survive vibration, extreme temperatures, radiation, communication delays, and long periods without repair while still collecting useful observations.'
 ],
 hard:[
  'Historical claims become stronger when independent evidence converges. Written records may contain bias, archaeological layers can be incomplete, and oral traditions can change over generations; however, dates, inscriptions, material remains, climate evidence, and records from different observers can be compared to test whether a proposed explanation is credible.',
  'Complex systems often behave differently from their individual parts. A network may remain stable after several small failures yet react sharply when a critical threshold is crossed, which is why resilience planning considers redundancy, feedback loops, dependencies, and recovery time instead of relying on a single performance metric.',
  'Scientific measurement is not merely the act of recording a value. Instruments have limits, samples contain variation, definitions influence what is counted, and uncertainty must be communicated honestly; otherwise, a precise-looking result can imply far more confidence than the evidence supports.',
  'Software reliability depends on more than writing code that works once. Clear interfaces, defensive validation, predictable state transitions, useful diagnostics, repeatable tests, and graceful handling of partial failure all reduce the chance that a small unexpected condition becomes a larger system-wide problem.'
 ]
};
const HI={
 easy:[
  'सुबह की हवा ठंडी और साफ होती है। लोग पार्क में धीरे धीरे चलते हैं और पक्षियों की आवाज सुनते हैं। नियमित अभ्यास से टाइपिंग की गति और शुद्धता दोनों बेहतर होती हैं।',
  'पानी जीवन के लिए बहुत जरूरी है। हमें पानी बचाना चाहिए और जरूरत के अनुसार ही उसका उपयोग करना चाहिए। छोटी अच्छी आदतें समय के साथ बड़ा फर्क पैदा कर सकती हैं।',
  'बारिश के बाद पेड़ अधिक साफ दिखाई देते हैं। सड़क पर पानी चमकता है और हवा में मिट्टी की खुशबू महसूस होती है।'
 ],
 medium:[
  'किसी भी कौशल में सुधार के लिए नियमित अभ्यास, सही तकनीक और धैर्य जरूरी है। तेज टाइप करने से पहले सही अक्षर और सही उंगली का अभ्यास करना अधिक उपयोगी होता है।',
  'शहर की व्यवस्था कई अलग सेवाओं पर निर्भर करती है। परिवहन, बिजली, पानी, संचार और आपात सेवाएं मिलकर रोजमर्रा के जीवन को सुचारु रूप से चलाती हैं।',
  'अच्छा निर्णय लेने के लिए केवल एक आंकड़ा पर्याप्त नहीं होता। संदर्भ, समय अवधि, स्रोत और परिभाषा को समझना जरूरी है ताकि तुलना सही तरीके से की जा सके।'
 ],
 hard:[
  'विश्वसनीय निष्कर्ष केवल आकर्षक आंकड़ों से नहीं बनते। स्रोत, परिभाषा, समय अवधि, नमूना और अनिश्चितता को समझे बिना कोई भी सटीक दिखाई देने वाला आंकड़ा भ्रामक हो सकता है।',
  'तकनीकी प्रणालियों की विश्वसनीयता बढ़ाने के लिए परीक्षण, त्रुटि प्रबंधन, स्पष्ट संकेत, सुरक्षित डिफॉल्ट और पुनर्प्राप्ति प्रक्रिया का व्यवस्थित रूप से डिजाइन किया जाना आवश्यक है।',
  'इतिहास का अध्ययन करते समय अलग अलग प्रकार के प्रमाणों की तुलना उपयोगी होती है। लिखित अभिलेख, पुरातात्विक सामग्री, तिथियां और स्वतंत्र विवरण मिलकर किसी दावे की विश्वसनीयता को बेहतर तरीके से परखने में मदद करते हैं।'
 ]
};

let words=[],spans=[],states=[],index=0,mode='normal';
let wrongKeys=0,printableKeys=0,currentTouched=false;
let running=false,paused=false,ended=false,timer=null,totalSec=300,remaining=300,lastTick=0,activeMs=0,lastLineTop=null;

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function source(){return (($('ttLang').value==='hi'?HI:EN)[$('ttDifficulty').value])}
function buildWords(){
 const target=Math.max(360,Math.ceil(Number($('ttDuration').value)/60*330));
 let out=[],pool=shuffle(source()),round=0;
 while(out.length<target){if(round && round%pool.length===0)pool=shuffle(source());out.push(...pool[round%pool.length].trim().split(/\s+/));round++}
 words=out;states=new Array(words.length).fill(null);index=0;currentTouched=false;renderInitial();
}
function makeSpan(word,i,cls='upcoming'){
 const s=document.createElement('span');s.className='tt-word '+cls;s.dataset.i=i;s.textContent=word;return s;
}
function renderInitial(){
 const flow=$('ttFlow');flow.innerHTML='';spans=[];
 const frag=document.createDocumentFragment();
 words.forEach((w,i)=>{const s=makeSpan(w,i,i===0?'current':'upcoming');spans.push(s);frag.appendChild(s);frag.appendChild(document.createTextNode(' '))});
 flow.appendChild(frag);$('ttWindow').scrollTop=0;
 requestAnimationFrame(()=>{lastLineTop=spans[0]?.offsetTop??0});updateLabels();
}
function appendMore(){
 const extra=shuffle(source()).join(' ').split(/\s+/);const frag=document.createDocumentFragment(),start=words.length;
 words.push(...extra);states.push(...new Array(extra.length).fill(null));
 extra.forEach((w,n)=>{const s=makeSpan(w,start+n);spans.push(s);frag.appendChild(s);frag.appendChild(document.createTextNode(' '))});$('ttFlow').appendChild(frag);
}
function updateLabels(){
 $('ttLocked').textContent=index;$('ttModeSide').textContent=mode==='god'?'God Mode':mode[0].toUpperCase()+mode.slice(1);
 $('ttCurrentLabel').textContent=ended?'Test finished.':paused?'Paused.':running?`Current word ${index+1}`:'Press Start Test to begin.';
}
function scrollOnlyWhenLineChanges(previousTop){
 const cur=spans[index];if(!cur)return;const newTop=cur.offsetTop;const base=lastLineTop??previousTop??newTop;
 if(Math.abs(newTop-base)>4){const lh=parseFloat(getComputedStyle($('ttFlow')).lineHeight)||40;const target=Math.max(0,newTop-lh*1.05);$('ttWindow').scrollTo({top:target,behavior:'smooth'});lastLineTop=newTop}
}
function accuracy(){return printableKeys?Math.max(0,Math.round((printableKeys-wrongKeys)/printableKeys*100)):100}
function updateStats(){
 const mins=Math.max(activeMs/60000,1/60000);$('ttWpm').textContent=activeMs?Math.max(0,Math.round((printableKeys/5)/mins)):0;$('ttCpm').textContent=activeMs?Math.max(0,Math.round(printableKeys/mins)):0;$('ttAcc').textContent=accuracy()+'%';$('ttErrors').textContent=wrongKeys;$('ttTime').textContent=fmt(remaining);$('ttBar').style.width=Math.min(100,Math.max(0,(totalSec-remaining)/totalSec*100))+'%'
}
function tick(){
 if(!running||paused)return;const now=performance.now();const delta=(now-lastTick)/1000;lastTick=now;remaining=Math.max(0,remaining-delta);activeMs+=delta*1000;updateStats();if(remaining<=0)finish();
}
function startTimer(){clearInterval(timer);lastTick=performance.now();timer=setInterval(tick,100)}
function start(){
 if(ended)reset(false);if(running&&!paused)return;running=true;paused=false;ended=false;$('ttInput').disabled=false;$('ttStart').disabled=true;$('ttPause').disabled=false;$('ttPause').textContent='Ⅱ Pause';document.body.classList.add('tt-focus');startTimer();$('ttInput').focus();$('ttResult').className='tt-result';$('ttResult').textContent='Test running. Space locks the current word; completed words stay visible.';updateLabels();
}
function pauseToggle(){
 if(!running||ended)return;if(!paused){tick();paused=true;clearInterval(timer);timer=null;$('ttInput').disabled=true;$('ttPause').textContent='▶ Resume';$('ttResult').className='tt-result pause';$('ttResult').textContent='Paused — timer and typing are stopped.'}else{paused=false;$('ttInput').disabled=false;$('ttPause').textContent='Ⅱ Pause';startTimer();$('ttInput').focus();$('ttResult').className='tt-result';$('ttResult').textContent='Resumed.'}updateLabels();
}
function finish(){
 if(ended)return;if(running&&!paused)tick();clearInterval(timer);timer=null;running=false;paused=false;ended=true;$('ttInput').disabled=true;$('ttStart').disabled=false;$('ttPause').disabled=true;$('ttPause').textContent='Ⅱ Pause';document.body.classList.remove('tt-focus');updateStats();$('ttResult').className='tt-result ok';$('ttResult').textContent=`Finished — ${$('ttWpm').textContent} WPM, ${$('ttCpm').textContent} CPM, ${$('ttAcc').textContent} accuracy, ${wrongKeys} wrong keystrokes.`;updateLabels();
}
function reset(rebuild=true){
 clearInterval(timer);timer=null;running=false;paused=false;ended=false;wrongKeys=0;printableKeys=0;activeMs=0;index=0;currentTouched=false;totalSec=Number($('ttDuration').value);remaining=totalSec;$('ttInput').value='';$('ttInput').disabled=true;$('ttStart').disabled=false;$('ttPause').disabled=true;$('ttPause').textContent='Ⅱ Pause';document.body.classList.remove('tt-focus');if(rebuild)buildWords();else{states=new Array(words.length).fill(null);renderInitial()}updateStats();$('ttResult').className='tt-result';$('ttResult').textContent='Choose your settings, then press Start Test. Completed words stay visible; only completed lines slide upward.';updateLabels();
}
function flashBad(){const x=$('ttInput');x.classList.remove('bad-flash');void x.offsetWidth;x.classList.add('bad-flash')}
function commit(){
 if(!running||paused||ended)return;const input=$('ttInput'),typed=input.value,expected=words[index]||'';if(!typed)return;
 const old=spans[index],previousTop=old?.offsetTop??lastLineTop;const exact=typed===expected;const ok=mode==='normal'?exact:(exact&&!currentTouched);
 states[index]={ok,typed,touched:currentTouched};if(old){old.classList.remove('current','upcoming');old.classList.add(ok?'locked-ok':'locked-bad')}
 index++;input.value='';currentTouched=false;if(index>=words.length-25)appendMore();const next=spans[index];if(next){next.classList.remove('upcoming');next.classList.add('current')}updateLabels();requestAnimationFrame(()=>scrollOnlyWhenLineChanges(previousTop));updateStats();
}
function modeHelp(){
 const t={normal:'Normal: Backspace works inside the current word. Space locks it, but the word stays visible. Wrong keystrokes still remain in accuracy even after correction.',strict:'Strict: Backspace works inside the current word, but any word that had a wrong keystroke stays marked wrong after Space. Previous words remain locked and visible.',god:'God Mode: Backspace is disabled. Every key is final. Space locks the current word and it stays visible.'};$('ttModeHelp').textContent=t[mode];updateLabels();
}
$('ttInput').addEventListener('keydown',e=>{
 if(!running||paused||ended)return;
 if(e.key==='Backspace'){if(mode==='god'){e.preventDefault();flashBad();return}if(!$('ttInput').value.length)e.preventDefault();return}
 if(e.code==='Space'||e.key===' '){e.preventDefault();commit();return}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Tab','Enter','Delete'].includes(e.key)){e.preventDefault();return}
 if((e.ctrlKey||e.metaKey)&&['v','x','z','y'].includes(e.key.toLowerCase())){e.preventDefault();return}
 if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const pos=Array.from($('ttInput').value).length,exp=Array.from(words[index]||'')[pos]||'';printableKeys++;if(e.key!==exp){wrongKeys++;currentTouched=true;flashBad()}setTimeout(updateStats,0)}
});
$('ttInput').addEventListener('paste',e=>e.preventDefault());
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');mode=btn.dataset.mode;modeHelp();reset(false)}));
$('ttStart').addEventListener('click',start);$('ttPause').addEventListener('click',pauseToggle);$('ttRestart').addEventListener('click',()=>reset(true));$('ttNew').addEventListener('click',()=>reset(true));$('ttFinish').addEventListener('click',finish);$('ttFocus').addEventListener('click',()=>{document.body.classList.toggle('tt-focus');if(running&&!paused)$('ttInput').focus()});
['ttLang','ttDuration','ttDifficulty'].forEach(id=>$(id).addEventListener('change',()=>reset(true)));
modeHelp();buildWords();reset(false);
})();
