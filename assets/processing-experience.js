/* BUILD 37: lightweight processing presentation with procedural non-repeating sparkles. */
(()=>{'use strict';
const status=document.getElementById('status')||document.querySelector('[role="status"].status');
if(!status)return;
const root=document.body,preview=document.getElementById('afterStage')||document.getElementById('preview')||document.querySelector('.preview-stage');
const panel=document.createElement('div');panel.className='dk-processing-indicator';panel.setAttribute('role','status');panel.setAttribute('aria-live','off');panel.innerHTML='<span class="dk-processing-orbit" aria-hidden="true"></span><div class="dk-processing-details"><span class="dk-processing-caption">Processing…</span><div class="dk-progress-track" role="progressbar" aria-label="Processing progress" aria-valuemin="0" aria-valuemax="100"><span class="dk-progress-fill"></span></div></div>';
status.insertAdjacentElement('beforebegin',panel);
const fill=panel.querySelector('.dk-progress-fill'),track=panel.querySelector('.dk-progress-track'),caption=panel.querySelector('.dk-processing-caption');
const field=document.createElement('div');field.className='dk-processing-sparkles';field.setAttribute('aria-hidden','true');
const sweep=document.createElement('b');sweep.className='dk-processing-sweep';field.append(sweep);
if(preview){preview.classList.add('dk-processing-host');preview.append(field)}
const palette=['cyan','blue','violet','pink','gold','ice'];let sparkleTimer=0;
function spawnSparkle(burst=false){if(!preview||!root.classList.contains('dk-is-processing'))return;const s=document.createElement('i');const size=burst?6+Math.random()*8:3+Math.random()*8;const life=burst?420+Math.random()*420:700+Math.random()*1500;s.className='dk-spark dk-spark-'+palette[(Math.random()*palette.length)|0]+' dk-rays-'+(Math.random()<.34?8:Math.random()<.55?6:4);s.style.cssText=`--x:${3+Math.random()*94}%;--y:${4+Math.random()*90}%;--sz:${size.toFixed(1)}px;--rot:${(Math.random()*90).toFixed(0)}deg;--life:${life.toFixed(0)}ms;--delay:${(Math.random()*100).toFixed(0)}ms`;field.append(s);setTimeout(()=>s.remove(),life+180)}
function startSparkles(){clearInterval(sparkleTimer);const mobile=matchMedia('(max-width:760px)').matches;for(let i=0;i<(mobile?7:13);i++)setTimeout(()=>spawnSparkle(),i*65);sparkleTimer=setInterval(()=>spawnSparkle(),mobile?260:145)}
function stopSparkles(){clearInterval(sparkleTimer);sparkleTimer=0}
function completionBurst(){if(!preview)return;for(let i=0;i<18;i++)setTimeout(()=>spawnSparkle(true),i*18)}
let active=false,start=0,progress=0,known=null,ticker=0,ending=0;
const WORK=/loading|processing|recogniz|analyz|checking \d+°|prepar|refining|extracting|removing background|detecting|converting|compressing|rendering|creating result|downloading ai|initializ|reconstructing|reading page/i;
const END=/processed\b|downloaded|download page|ready to|ready for|failed|error|could not|completed|no readable|timed out|text extracted|ready to extract|choose an|upload an|select an|cancelled/i;
function draw(){const elapsed=(performance.now()-start)/1000;if(known!==null)progress=Math.max(progress,Math.min(95,known));else{const target=Math.min(91,12+79*(1-Math.exp(-elapsed/24)));progress+=(target-progress)*.12}fill.style.width=progress.toFixed(2)+'%';known!==null?track.setAttribute('aria-valuenow',String(Math.round(progress))):track.removeAttribute('aria-valuenow')}
function begin(){if(active)return;active=true;start=performance.now();progress=0;known=null;root.classList.add('dk-is-processing');clearInterval(ticker);ticker=setInterval(draw,110);draw();startSparkles()}
function finish(){if(!active)return;active=false;clearInterval(ticker);stopSparkles();progress=100;fill.style.width='100%';track.setAttribute('aria-valuenow','100');root.classList.add('dk-processing-complete');completionBurst();clearTimeout(ending);ending=setTimeout(()=>{root.classList.remove('dk-is-processing','dk-processing-complete');field.querySelectorAll('.dk-spark').forEach(e=>e.remove())},650)}
function stop(){if(!active)return;active=false;clearInterval(ticker);stopSparkles();root.classList.remove('dk-is-processing','dk-processing-complete');field.querySelectorAll('.dk-spark').forEach(e=>e.remove())}
function refresh(){const message=(status.textContent||'').trim().slice(0,180);if(!message)return;const working=WORK.test(message),ended=END.test(message);if(working&&!ended){begin();caption.textContent=message;const m=message.match(/(?:^|\s)(\d{1,3})\s*%/);if(m){const n=Number(m[1]);known=n>=0&&n<=100?Math.min(95,n):null}else known=null}else if(ended){/failed|error|could not|timed out|cancelled/i.test(message)?stop():finish()}if(preview&&!preview.contains(field))preview.append(field)}
const observer=new MutationObserver(refresh);observer.observe(status,{childList:true,characterData:true,subtree:true});
window.DoKitlyProcessing={start:begin,finish,stop,progress(p,label){begin();if(Number.isFinite(p))known=Math.min(95,Math.max(0,p));if(label)caption.textContent=label}};
window.addEventListener('pagehide',()=>{observer.disconnect();clearInterval(ticker);clearTimeout(ending);stopSparkles()});
})();
