(()=>{
'use strict';
const $=id=>document.getElementById(id);

const EN={
 easy:[
  'A quiet morning can make a familiar street feel new. Birds move between the trees while people walk to work and small shops begin another ordinary day.',
  'Good habits grow through simple actions repeated over time. A short walk, a glass of water, a clean desk, and a few focused minutes can make a busy day easier.',
  'Rain changes the sound of a city. Cars move slowly, roofs begin to tap, and the smell of wet soil reaches the streets after a strong shower.',
  'Learning becomes easier when a large task is divided into small steps. Each finished step gives useful feedback and makes the next step clearer.',
  'A train journey can turn an ordinary afternoon into a small adventure. Fields, bridges, towns, and stations pass by while the view keeps changing.',
  'Cooking a simple meal is easier when the ingredients are ready before the pan gets hot. A little planning saves time and keeps the kitchen calm.',
  'The night sky looks different away from bright city lights. More stars become visible, and familiar shapes appear between them after a few minutes.',
  'A good workspace does not need to be fancy. Enough light, a comfortable chair, and fewer distractions can make it easier to focus for longer.',
  'Plants near a window slowly turn toward the light. Their leaves may look still, but growth continues through many small changes each day.',
  'A short daily reading habit can add up quickly. Ten pages a day can become several books over a year without requiring a long study session.',
  'Public parks give people a place to walk, play, rest, and meet friends. Trees also provide shade and make crowded neighborhoods feel calmer.',
  'Saving a little money regularly is often easier than making one large saving later. Small amounts become meaningful when the habit continues.'
 ],
 medium:[
  'A modern website may look simple on the screen, yet many small systems work together behind it. The browser loads files, applies styles, runs scripts, stores temporary data, and communicates with servers across a large network.',
  'Modern cities depend on many invisible systems working together. Water, electricity, data networks, public transport, waste collection, emergency services, and thousands of daily deliveries must remain reliable even when demand changes suddenly.',
  'Good decisions rarely come from one number alone. Context matters, assumptions should be visible, and useful comparisons require the same definitions. A quick estimate can guide attention, but important conclusions deserve stronger evidence.',
  'A long walk through an unfamiliar neighborhood can reveal details that disappear from a moving vehicle. Small shops, old trees, local signs, street sounds, and patterns of movement slowly form a clearer picture of the place.',
  'Digital photographs are built from millions of tiny measurements of light. Software then interprets color, contrast, sharpness, noise, and compression so the final image can be stored, shared, or edited efficiently.',
  'Weather forecasts combine observations from satellites, radar, ground stations, aircraft, and computer models. The final prediction is not a single guess but an interpretation of many signals that change over time.',
  'A productive study session usually has a clear goal. Instead of reading without direction, a learner can define one topic, test recall, review mistakes, and stop after reaching a useful checkpoint.',
  'Railway networks are carefully coordinated because one delayed train can affect many others. Timetables, signaling, maintenance windows, platform capacity, and passenger demand all influence how smoothly the system works.',
  'Online privacy is shaped by many small choices. Browser settings, account permissions, app access, password habits, and the information shared publicly can all change how much personal data is exposed.',
  'Libraries have changed with technology without losing their original purpose. Printed books now sit beside digital archives, databases, study spaces, workshops, and community services that help people find reliable information.',
  'Energy demand changes throughout the day as homes, offices, factories, transport systems, and weather conditions shift. Power networks must continuously balance generation and consumption while maintaining safe operating limits.',
  'Travel planning becomes easier when priorities are clear. Time, budget, weather, transport, distance, and personal interests can be compared before choosing an itinerary instead of trying to fit every attraction into one day.'
 ],
 hard:[
  'Historical claims become stronger when independent evidence converges. Written records may contain bias, archaeological layers can be incomplete, and oral traditions can change over generations; however, dates, inscriptions, material remains, climate evidence, and records from different observers can be compared to test whether an explanation is credible.',
  'Complex systems often behave differently from their individual parts. A network may remain stable after several small failures yet react sharply when a critical threshold is crossed, which is why resilience planning considers redundancy, feedback loops, dependencies, and recovery time instead of relying on a single performance metric.',
  'Scientific measurement is not merely the act of recording a value. Instruments have limits, samples contain variation, definitions influence what is counted, and uncertainty must be communicated honestly; otherwise, a precise-looking result can imply far more confidence than the evidence supports.',
  'Software reliability depends on more than writing code that works once. Clear interfaces, defensive validation, predictable state transitions, useful diagnostics, repeatable tests, and graceful handling of partial failure all reduce the chance that a small unexpected condition becomes a larger system-wide problem.',
  'Economic comparisons can become misleading when nominal values, inflation-adjusted values, purchasing power, exchange rates, and population growth are mixed without explanation. The same dataset may support different interpretations depending on the denominator, time period, and assumptions selected for the analysis.',
  'Aviation safety depends on layered defenses rather than a single perfect component. Training, checklists, maintenance, redundant instruments, weather monitoring, air-traffic coordination, standardized communication, and incident investigation all contribute to reducing risk across a complex operating environment.',
  'Machine-learning systems can appear confident even when the underlying evidence is weak. Performance depends on data quality, sampling, labels, evaluation methods, distribution shifts, and the cost of different errors, so a single accuracy figure rarely describes real-world behavior completely.',
  'Urban water management requires balancing engineering, climate, land use, public health, and long-term maintenance. Drainage that works during ordinary rain may fail during rare storms if development changes runoff patterns or if channels become blocked at critical points.',
  'Cybersecurity is an ongoing process rather than a product that can be installed once and forgotten. Strong authentication, patch management, least-privilege access, backups, monitoring, staff awareness, and tested recovery plans reduce different parts of the overall risk.',
  'Reliable research separates observation from interpretation. A result may be statistically noticeable yet practically unimportant, while a meaningful effect can remain uncertain when the sample is small; therefore, methods, assumptions, uncertainty, and limitations should be reported together.',
  'Large infrastructure projects require coordination across design, procurement, construction, safety, regulation, finance, environmental constraints, and future maintenance. Delays can emerge from interactions between these areas even when each individual team performs its own task correctly.',
  'Language evolves through ordinary use rather than through a single central authority. New terms spread, meanings shift, pronunciation changes, and different communities develop distinct conventions, while writing systems and formal education often preserve older patterns for much longer.'
 ]
};

const HI={
 easy:[
  'सुबह की हवा ठंडी और साफ होती है। लोग पार्क में धीरे धीरे चलते हैं और पक्षियों की आवाज सुनते हैं। नियमित अभ्यास से टाइपिंग की गति बेहतर होती है।',
  'पानी जीवन के लिए बहुत जरूरी है। हमें पानी बचाना चाहिए और जरूरत के अनुसार ही उसका उपयोग करना चाहिए। छोटी अच्छी आदतें समय के साथ बड़ा फर्क पैदा करती हैं।',
  'बारिश के बाद पेड़ अधिक साफ दिखाई देते हैं। सड़क पर पानी चमकता है और हवा में मिट्टी की खुशबू महसूस होती है।',
  'एक साफ मेज और शांत जगह में काम करना आसान लगता है। छोटे लक्ष्य बनाकर काम करने से ध्यान लंबे समय तक बना रह सकता है।',
  'रोज थोड़ा पढ़ना अच्छी आदत है। कुछ पन्ने रोज पढ़ने से एक साल में कई किताबें पूरी की जा सकती हैं।',
  'सुबह की छोटी सैर शरीर और मन दोनों को ताजा महसूस करा सकती है। रास्ते में पेड़, दुकानें और लोगों की गतिविधियां दिखाई देती हैं।',
  'घर का साधारण खाना बनाने से पहले सामग्री तैयार रखना उपयोगी होता है। इससे समय बचता है और काम बिना जल्दबाजी के पूरा होता है।',
  'रात में शहर से दूर आकाश में अधिक तारे दिखाई देते हैं। आंखों को अंधेरे की आदत पड़ने पर दृश्य और साफ हो जाता है।'
 ],
 medium:[
  'किसी भी कौशल में सुधार के लिए नियमित अभ्यास, सही तकनीक और धैर्य जरूरी है। तेज टाइप करने से पहले सही अक्षर और सही उंगली का अभ्यास करना अधिक उपयोगी होता है।',
  'शहर की व्यवस्था कई अलग सेवाओं पर निर्भर करती है। परिवहन, बिजली, पानी, संचार और आपात सेवाएं मिलकर रोजमर्रा के जीवन को सुचारु रूप से चलाती हैं।',
  'अच्छा निर्णय लेने के लिए केवल एक आंकड़ा पर्याप्त नहीं होता। संदर्भ, समय अवधि, स्रोत और परिभाषा को समझना जरूरी है ताकि तुलना सही तरीके से की जा सके।',
  'मौसम का पूर्वानुमान कई स्रोतों से मिले आंकड़ों पर आधारित होता है। उपग्रह, रडार, जमीन पर लगे यंत्र और कंप्यूटर मॉडल मिलकर बदलती परिस्थितियों की जानकारी देते हैं।',
  'ऑनलाइन गोपनीयता कई छोटी आदतों से प्रभावित होती है। मजबूत पासवर्ड, सही अनुमति, सुरक्षित ब्राउजर सेटिंग और सोच समझकर साझा की गई जानकारी जोखिम कम कर सकती है।',
  'यात्रा की योजना बनाते समय समय, बजट, मौसम और दूरी को साथ देखना उपयोगी होता है। स्पष्ट प्राथमिकताएं होने से हर जगह जाने की कोशिश करने के बजाय बेहतर कार्यक्रम बनाया जा सकता है।',
  'एक प्रभावी अध्ययन सत्र का लक्ष्य स्पष्ट होना चाहिए। विषय चुनकर याद करने की कोशिश करना, गलतियों की समीक्षा करना और छोटे अंतराल में अभ्यास करना अक्सर केवल पढ़ते रहने से बेहतर परिणाम देता है।',
  'बिजली की मांग दिन भर बदलती रहती है। घर, कार्यालय, उद्योग, परिवहन और मौसम की स्थिति के अनुसार उत्पादन और खपत के बीच संतुलन बनाए रखना जरूरी होता है।'
 ],
 hard:[
  'विश्वसनीय निष्कर्ष केवल आकर्षक आंकड़ों से नहीं बनते। स्रोत, परिभाषा, समय अवधि, नमूना और अनिश्चितता को समझे बिना कोई भी सटीक दिखाई देने वाला आंकड़ा भ्रामक हो सकता है।',
  'तकनीकी प्रणालियों की विश्वसनीयता बढ़ाने के लिए परीक्षण, त्रुटि प्रबंधन, स्पष्ट संकेत, सुरक्षित डिफॉल्ट और पुनर्प्राप्ति प्रक्रिया का व्यवस्थित रूप से डिजाइन किया जाना आवश्यक है।',
  'इतिहास का अध्ययन करते समय अलग अलग प्रकार के प्रमाणों की तुलना उपयोगी होती है। लिखित अभिलेख, पुरातात्विक सामग्री, तिथियां और स्वतंत्र विवरण मिलकर किसी दावे की विश्वसनीयता को बेहतर तरीके से परखने में मदद करते हैं।',
  'जटिल प्रणालियां हमेशा अपने अलग अलग हिस्सों की तरह व्यवहार नहीं करतीं। कई छोटी विफलताएं लंबे समय तक नियंत्रित रह सकती हैं, लेकिन किसी महत्वपूर्ण सीमा के पार पहुंचते ही पूरा नेटवर्क तेजी से प्रभावित हो सकता है।',
  'वैज्ञानिक मापन में केवल एक संख्या लिख देना पर्याप्त नहीं होता। उपकरण की सीमा, नमूने का अंतर, परिभाषा, त्रुटि और अनिश्चितता को समझना जरूरी है, वरना अत्यधिक सटीक दिखने वाला परिणाम वास्तविक प्रमाण से अधिक विश्वास पैदा कर सकता है।',
  'साइबर सुरक्षा को एक बार किए जाने वाले काम की तरह नहीं देखा जा सकता। मजबूत पहचान व्यवस्था, नियमित अपडेट, सीमित अनुमति, बैकअप, निगरानी और परीक्षण की गई पुनर्प्राप्ति योजना अलग अलग जोखिमों को कम करती है।',
  'बड़े बुनियादी ढांचा प्रोजेक्ट में डिजाइन, खरीद, निर्माण, सुरक्षा, वित्त, पर्यावरण और भविष्य के रखरखाव के बीच लगातार समन्वय आवश्यक होता है। अलग टीमों का काम सही होने पर भी उनके बीच निर्भरता से देरी पैदा हो सकती है।',
  'विश्वसनीय शोध में अवलोकन और व्याख्या को अलग रखना जरूरी है। कोई परिणाम सांख्यिकीय रूप से स्पष्ट हो सकता है लेकिन व्यवहार में महत्वहीन, जबकि छोटा नमूना किसी वास्तविक प्रभाव के बारे में अनिश्चितता बनाए रख सकता है।'
 ]
};

let words=[],spans=[],states=[],index=0,mode='normal',passageSerial=0,lastStart=-1;
let wrongKeys=0,printableKeys=0,currentTouched=false;
let running=false,paused=false,ended=false,timer=null,totalSec=300,remaining=300,lastTick=0,activeMs=0,lastLineTop=null;
let completedChars=0;

function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function library(){return (($('ttLang').value==='hi'?HI:EN)[$('ttDifficulty').value])}
function difficultyName(){const d=$('ttDifficulty').value;return d.charAt(0).toUpperCase()+d.slice(1)}
function pickStart(len){if(len<2)return 0;let n=Math.floor(Math.random()*len);if(n===lastStart)n=(n+1)%len;lastStart=n;return n}
function buildWords(){
 const lib=library();const start=pickStart(lib.length);const target=Math.max(360,Math.ceil(Number($('ttDuration').value)/60*360));
 let out=[],order=[];for(let i=0;i<lib.length;i++)order.push(lib[(start+i)%lib.length]);
 let round=0;
 while(out.length<target){if(round && round%order.length===0)order=shuffle(order);out.push(...order[round%order.length].trim().split(/\s+/));round++}
 words=out;states=new Array(words.length).fill(null);index=0;currentTouched=false;passageSerial++;
 $('ttDifficultyBadge').textContent=difficultyName()+' passage';$('ttPassageCount').textContent='Passage '+passageSerial;
 renderInitial();
}
function makeSpan(word,i,cls='upcoming'){const s=document.createElement('span');s.className='tt-word '+cls;s.dataset.i=i;s.textContent=word;return s}
function renderInitial(){
 const flow=$('ttFlow');flow.innerHTML='';spans=[];const frag=document.createDocumentFragment();
 words.forEach((w,i)=>{const s=makeSpan(w,i,i===0?'current':'upcoming');spans.push(s);frag.appendChild(s);frag.appendChild(document.createTextNode(' '))});
 flow.appendChild(frag);$('ttWindow').scrollTop=0;requestAnimationFrame(()=>{lastLineTop=spans[0]?.offsetTop??0});updateLabels();
}
function appendMore(){
 const extra=shuffle(library()).join(' ').split(/\s+/),frag=document.createDocumentFragment(),start=words.length;words.push(...extra);states.push(...new Array(extra.length).fill(null));
 extra.forEach((w,n)=>{const s=makeSpan(w,start+n);spans.push(s);frag.appendChild(s);frag.appendChild(document.createTextNode(' '))});$('ttFlow').appendChild(frag);
}
function updateLabels(){
 $('ttLocked').textContent=index;$('ttModeSide').textContent=mode==='god'?'God Mode':mode[0].toUpperCase()+mode.slice(1);$('ttCurrentWord').textContent=words[index]||'—';
 $('ttCurrentLabel').textContent=ended?'Test finished.':paused?'Paused.':running?`Word ${index+1} · type “${words[index]||''}”`:'Press Start Test to begin.';
}
function scrollReference(previousTop){const cur=spans[index];if(!cur)return;const newTop=cur.offsetTop,base=lastLineTop??previousTop??newTop;if(Math.abs(newTop-base)>4){const lh=parseFloat(getComputedStyle($('ttFlow')).lineHeight)||36;$('ttWindow').scrollTo({top:Math.max(0,newTop-lh*1.05),behavior:'smooth'});lastLineTop=newTop}}
function scrollTyped(){requestAnimationFrame(()=>{$('ttTypedViewport').scrollTop=$('ttTypedViewport').scrollHeight})}
function sizeInput(){const val=$('ttInput').value||'';$('ttInput').style.width=Math.max(54,Math.min(330,(Array.from(val).length+1)*10+24))+'px'}
function accuracy(){return printableKeys?Math.max(0,Math.round((printableKeys-wrongKeys)/printableKeys*100)):100}
function updateStats(){
 const mins=Math.max(activeMs/60000,1/60000);const liveChars=completedChars+Array.from($('ttInput').value||'').length;
 $('ttWpm').textContent=activeMs?Math.max(0,Math.round((liveChars/5)/mins)):0;$('ttCpm').textContent=activeMs?Math.max(0,Math.round(liveChars/mins)):0;$('ttAcc').textContent=accuracy()+'%';$('ttErrors').textContent=wrongKeys;$('ttTime').textContent=fmt(remaining);$('ttBar').style.width=Math.min(100,Math.max(0,(totalSec-remaining)/totalSec*100))+'%';
}
function tick(){if(!running||paused)return;const now=performance.now(),delta=(now-lastTick)/1000;lastTick=now;remaining=Math.max(0,remaining-delta);activeMs+=delta*1000;updateStats();if(remaining<=0)finish()}
function startTimer(){clearInterval(timer);lastTick=performance.now();timer=setInterval(tick,100)}
function start(){
 if(ended)reset(false);if(running&&!paused)return;running=true;paused=false;ended=false;$('ttInput').disabled=false;$('ttStart').disabled=true;$('ttPause').disabled=false;$('ttPause').textContent='Ⅱ Pause';startTimer();$('ttInput').focus();$('ttResult').hidden=true;updateLabels();
}
function pauseToggle(){
 if(!running||ended)return;if(!paused){tick();paused=true;clearInterval(timer);timer=null;$('ttInput').disabled=true;$('ttPause').textContent='▶ Resume';showResult('Paused — timer and typing are stopped.','pause')}else{paused=false;$('ttInput').disabled=false;$('ttPause').textContent='Ⅱ Pause';startTimer();$('ttInput').focus();$('ttResult').hidden=true}updateLabels();
}
function finish(){
 if(ended)return;if(running&&!paused)tick();clearInterval(timer);timer=null;running=false;paused=false;ended=true;$('ttInput').disabled=true;$('ttStart').disabled=false;$('ttPause').disabled=true;$('ttPause').textContent='Ⅱ Pause';updateStats();showResult(`Finished — ${$('ttWpm').textContent} WPM · ${$('ttCpm').textContent} CPM · ${$('ttAcc').textContent} accuracy · ${wrongKeys} errors.`,'ok');updateLabels();
}
function clearTypedStream(){
 const stream=$('ttTypedStream');[...stream.querySelectorAll('.tt-typed-token')].forEach(n=>n.remove());$('ttEmptyHint').hidden=false;$('ttInput').value='';sizeInput();$('ttTypedViewport').scrollTop=0;
}
function reset(rebuild=true){
 clearInterval(timer);timer=null;running=false;paused=false;ended=false;wrongKeys=0;printableKeys=0;completedChars=0;activeMs=0;index=0;currentTouched=false;totalSec=Number($('ttDuration').value);remaining=totalSec;
 clearTypedStream();$('ttInput').disabled=true;$('ttStart').disabled=false;$('ttPause').disabled=true;$('ttPause').textContent='Ⅱ Pause';if(rebuild)buildWords();else{states=new Array(words.length).fill(null);renderInitial()}
 updateStats();$('ttResult').hidden=true;updateLabels();
}
function showResult(text,cls=''){const r=$('ttResult');r.hidden=false;r.className='tt-result'+(cls?' '+cls:'');r.textContent=text}
function flashBad(){const x=$('ttInput');x.classList.remove('bad-flash');void x.offsetWidth;x.classList.add('bad-flash')}
function appendTypedToken(text,ok){
 $('ttEmptyHint').hidden=true;const token=document.createElement('span');token.className='tt-typed-token '+(ok?'ok':'bad');token.textContent=text;token.title=ok?'Locked correct word':'Locked wrong word';$('ttTypedStream').insertBefore(token,$('ttInput'));scrollTyped();
}
function commit(){
 if(!running||paused||ended)return;const input=$('ttInput'),typed=input.value,expected=words[index]||'';if(!typed)return;
 const old=spans[index],previousTop=old?.offsetTop??lastLineTop,exact=typed===expected,ok=mode==='strict'?(exact&&!currentTouched):exact;
 states[index]={ok,typed,touched:currentTouched};if(old){old.classList.remove('current','upcoming');old.classList.add(ok?'locked-ok':'locked-bad')}
 appendTypedToken(typed,ok);completedChars+=Array.from(typed).length+1;index++;input.value='';sizeInput();currentTouched=false;if(index>=words.length-25)appendMore();
 const next=spans[index];if(next){next.classList.remove('upcoming');next.classList.add('current')}updateLabels();requestAnimationFrame(()=>scrollReference(previousTop));updateStats();
}
function modeHelp(){
 const t={normal:'Normal · Backspace works inside current word; errors still count.',strict:'Strict · A corrected mistake still marks that word wrong.',god:'God · Backspace disabled; every key is final.'};$('ttModeHelp').textContent=t[mode];updateLabels();
}

$('ttInput').addEventListener('input',()=>{sizeInput();scrollTyped();updateStats()});
$('ttInput').addEventListener('keydown',e=>{
 if(!running||paused||ended)return;
 if(e.key==='Backspace'){if(mode==='god'){e.preventDefault();flashBad();return}if(!$('ttInput').value.length)e.preventDefault();return}
 if(e.code==='Space'||e.key===' '){e.preventDefault();commit();return}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Tab','Enter','Delete'].includes(e.key)){e.preventDefault();return}
 if((e.ctrlKey||e.metaKey)&&['v','x','z','y'].includes(e.key.toLowerCase())){e.preventDefault();return}
 if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const pos=Array.from($('ttInput').value).length,exp=Array.from(words[index]||'')[pos]||'';printableKeys++;if(e.key!==exp){wrongKeys++;currentTouched=true;flashBad()}setTimeout(updateStats,0)}
});
$('ttInput').addEventListener('paste',e=>e.preventDefault());
$('ttTypebox').addEventListener('click',()=>{if(running&&!paused)$('ttInput').focus()});

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{if(running)return;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');mode=btn.dataset.mode;modeHelp();reset(false)}));
$('ttStart').addEventListener('click',start);$('ttPause').addEventListener('click',pauseToggle);$('ttRestart').addEventListener('click',()=>reset(false));$('ttNew').addEventListener('click',()=>reset(true));$('ttFinish').addEventListener('click',finish);
$('ttFocus').addEventListener('click',()=>{document.body.classList.toggle('tt-focus');$('ttFocus').textContent=document.body.classList.contains('tt-focus')?'✕ Exit Focus':'⛶ Focus';if(running&&!paused)$('ttInput').focus()});
['ttLang','ttDuration','ttDifficulty'].forEach(id=>$(id).addEventListener('change',()=>{if(running)return;reset(true)}));

modeHelp();buildWords();reset(false);
})();
