/* DoKitly Build 24. Guest forms use real Worker/D1 only after configured; until then original GitHub issue flow is preserved. */
(()=>{'use strict';
const cfg=window.DoKitlyServices||{},api=String(cfg.feedbackApi||'').replace(/\/+$/,''),sitekey=String(cfg.turnstileSiteKey||'');
const available=!!(api&&sitekey);
let loader;
function loadTurnstile(){if(!available)return Promise.reject(Error('Guest inbox deployment is pending.'));
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.defer=true;s.onload=()=>window.turnstile?resolve(window.turnstile):reject(Error('Challenge unavailable'));s.onerror=()=>reject(Error('Challenge unavailable'));document.head.append(s)});return loader;}
async function mount(id){const el=typeof id==='string'?document.getElementById(id):id;if(!el||!available)return false;
 try{const ts=await loadTurnstile();if(!el.dataset.widget){const id=ts.render(el,{sitekey,theme:'auto',callback:token=>{el.dataset.token=token},'expired-callback':()=>delete el.dataset.token,'error-callback':()=>delete el.dataset.token});el.dataset.widget=String(id);}return true;
 }catch{return false;}}
async function send(item,challengeId){const el=typeof challengeId==='string'?document.getElementById(challengeId):challengeId;
 if(!available)throw Error('Guest feedback inbox is not connected yet.');
 const token=el?.dataset.token||'';if(!token)throw Error('Complete the anti-spam verification first.');
 try{const response=await fetch(api+'/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,turnstile:token,website:''})});
 const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||'Feedback could not be sent.');return data;
 }finally{if(el){delete el.dataset.token;try{window.turnstile?.reset(el.dataset.widget)}catch{}}}
}
function setupForm(kind){const isBug=kind==='bug',f=document.getElementById(isBug?'bugForm':'suggestForm');if(!f)return;
 const note=f.parentElement.querySelector('.dk-form-note'),status=document.getElementById(isBug?'bugStatus':'stStatus');
 if(!available){if(note)note.textContent='Direct guest feedback is not yet connected. For now this opens a pre-filled GitHub issue; nothing is submitted until you confirm it on GitHub.';return;}
 if(note)note.textContent='Submit directly as a guest — no GitHub account needed. Contact email is optional.';
 mount('dkFeedbackCaptcha');
 f.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const button=f.querySelector('button[type=submit]'),email=document.getElementById('dkGuestEmail')?.value.trim()||'';
  const tool=isBug?document.getElementById('bugPage').value.trim():document.getElementById('stName').value.trim();
  const message=isBug?document.getElementById('bugWhat').value.trim()+'\n\nSteps: '+(document.getElementById('bugSteps').value.trim()||'Not given')+'\nDevice: '+(document.getElementById('bugDevice').value.trim()||'Not given'):'Category: '+document.getElementById('stCat').value+'\n'+document.getElementById('stDesc').value.trim();
  if(!tool||message.trim().length<10)return;
  button.disabled=true;status.textContent='Sending guest feedback…';status.className='dk-form-status';
  try{const data=await send({type:kind==='bug'?'bug':'suggestion',tool,message,email,page:location.href,rating:'',reasons:[]},'dkFeedbackCaptcha');status.textContent='Submitted and saved successfully. Reference: '+data.id.slice(0,8);status.className='dk-form-status ok';f.reset();window.DoKitlyAnalytics?.track?.('feedback_submitted',{feedback_type:kind});}
  catch(err){status.textContent=err.message||'Submission failed. Please try again.';status.className='dk-form-status';}
  finally{button.disabled=false;}
 },true);
}
window.DoKitlyFeedback=Object.freeze({available,mount,send});
setupForm('bug');setupForm('suggestion');
})();
