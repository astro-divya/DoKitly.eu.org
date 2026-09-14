(()=>{
  const KEY='dokitly-dochips';
  function init(){if(localStorage.getItem(KEY)===null)localStorage.setItem(KEY,'2500');return Math.max(0,Math.floor(Number(localStorage.getItem(KEY)||0)))}
  function get(){return init()}
  function set(v){v=Math.max(0,Math.floor(Number(v)||0));localStorage.setItem(KEY,String(v));window.dispatchEvent(new CustomEvent('dokitly:chips',{detail:{balance:v}}));return v}
  function add(v){return set(get()+Number(v||0))}
  function spend(v){v=Math.max(0,Math.floor(Number(v)||0));if(get()<v)return false;set(get()-v);return true}
  function paint(){const v=get().toLocaleString('en-IN');document.querySelectorAll('#chipCount,#modalChipCount,[data-chip-balance]').forEach(el=>el.textContent=v)}
  window.DoKitlyWallet={get,set,add,spend,key:KEY,paint};
  addEventListener('dokitly:chips',paint);document.addEventListener('DOMContentLoaded',()=>{paint();const m=document.getElementById('accountModal'),b=document.getElementById('accountBtn'),c=document.getElementById('accountClose');if(b&&m)b.onclick=()=>{m.hidden=false;paint()};if(c&&m)c.onclick=()=>m.hidden=true;if(m)m.addEventListener('click',e=>{if(e.target===m)m.hidden=true});});
})();