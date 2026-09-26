(()=>{
'use strict';
const $=id=>document.getElementById(id), params=new URLSearchParams(location.search), id=params.get('id');
const typeLabel=m=>{const map={'application/pdf':'PDF document','application/zip':'ZIP archive','image/jpeg':'JPG image','image/png':'PNG image','image/webp':'WebP image','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'Word document'};return map[m]||m||'File';};
const size=n=>{if(!Number.isFinite(n))return '—';const u=['B','KB','MB','GB'];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++;}return `${v>=10||i===0?v.toFixed(i?1:0):v.toFixed(2)} ${u[i]}`;};
function showError(title,msg,back='/'){document.body.classList.add('download-error');$('readyTitle').textContent=title;$('readySub').textContent=msg;$('fileMeta').hidden=true;$('downloadBtn').hidden=true;$('adArea').hidden=true;$('privacyNote').textContent='The generated file is not available in this browser session.';$('backBtn').href=back;$('backBtn').textContent='Return to tool';}
async function init(){if(!id){showError('Download link is missing','Return to the tool and generate the file again.');return;}let item;try{item=await DoKitlyDownload.get(id);}catch(e){showError('Browser storage is unavailable','Your browser blocked access to the temporary generated file. Return to the tool and try again.');return;}if(!item||!(item.blob instanceof Blob)){showError('This file is no longer available','The temporary download may have expired or browser storage may have been cleared.');return;}if(item.expiresAt<Date.now()){showError('This download has expired','For privacy and storage safety, temporary files are removed after a short time.',item.backUrl||'/');return;}
$('fileName').textContent=item.filename;$('fileType').textContent=typeLabel(item.mimeType);$('fileSize').textContent=size(item.size);$('fileTool').textContent=item.tool||'DoKitly';$('backBtn').href=item.backUrl||'/';$('anotherBtn').href=item.backUrl||'/';$('readySub').textContent='Your generated file is stored temporarily in this browser and is ready to save.';
$('downloadBtn').addEventListener('click',async()=>{window.DoKitlyAnalytics?.trackDownload({tool_name:item.tool||'DoKitly',file_type:item.mimeType||'unknown'});const b=$('downloadBtn');b.disabled=true;b.textContent='Preparing download…';try{DoKitlyDownload.direct(item.blob,item.filename);await DoKitlyDownload.markDownloaded(item.id);b.textContent='✓ Download started';$('trouble').hidden=false;$('trouble').textContent='If your browser did not save the file, click “Download File” again.';setTimeout(()=>{b.disabled=false;b.textContent='Download File';},1800);}catch(e){console.error('DoKitly download failed',e);b.disabled=false;b.textContent='Download File';$('trouble').hidden=false;$('trouble').textContent='Download could not start. Try again, or return to the tool and regenerate the file.';}});
}
init();
})();
/* Build 21 — feedback face slider; no file content or personal data is sent. */
(()=>{
'use strict';
const card=document.getElementById('feedbackCard'),range=document.getElementById('feedbackRange');
if(!card||!range)return;
const wrap=document.getElementById('faceWrap'),faces={sad:document.getElementById('faceSad'),neutral:document.getElementById('faceNeutral'),happy:document.getElementById('faceHappy')};
const msg=document.getElementById('feedbackMessage'),sub=document.getElementById('feedbackSub'),chips=document.getElementById('feedbackChips'),submit=document.getElementById('feedbackSubmit'),thanks=document.getElementById('feedbackThanks');
let selected=new Set(),state='neutral';
const data={sad:{title:'Oops, we missed the mark',sub:'Tell us what went wrong',chips:['Too slow','Formatting issue','Hard to use','Download issue']},neutral:{title:'Thanks for letting us know',sub:'We’re always improving',chips:['Could be smoother','Almost right','Easy enough']},happy:{title:'Nice! Glad it worked',sub:'Thanks for trying DoKitly',chips:['Fast','Easy to use','Great output','Worked perfectly']}};
function renderChips(list){selected.clear();chips.replaceChildren();list.forEach(label=>{const b=document.createElement('button');b.type='button';b.className='dl-feedback-chip';b.textContent=label;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));on?selected.add(label):selected.delete(label)});chips.appendChild(b)})}
function render(){const v=Number(range.value);wrap.style.left=v+'%';wrap.style.transform=`translateX(-${v}%)`;const next=v<34?'sad':v<67?'neutral':'happy';if(next!==state){state=next;Object.entries(faces).forEach(([k,el])=>el?.classList.toggle('active',k===state));renderChips(data[state].chips)}msg.textContent=data[state].title;sub.textContent=data[state].sub}
range.addEventListener('input',render);range.addEventListener('change',render);
submit.addEventListener('click',()=>{const level=state==='sad'?'needs_work':state==='happy'?'great':'okay';window.DoKitlyAnalytics?.track?.('tool_feedback_submit',{feedback_level:level,has_feedback_reason:selected.size>0});submit.hidden=true;thanks.hidden=false;range.disabled=true;chips.querySelectorAll('button').forEach(b=>b.disabled=true)});
window.addEventListener('dokitly:download-clicked',()=>{card.hidden=false;requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'nearest'}))},{once:true});
renderChips(data[state].chips);render();
})();
(()=>{const b=document.getElementById('downloadBtn'),c=document.getElementById('feedbackCard');if(b&&c)b.addEventListener('click',()=>{setTimeout(()=>{c.hidden=false},350)})})();
