(()=>{
  const pips={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  const faces=[['front',1],['back',6],['right',3],['left',4],['top',2],['bottom',5]];
  const target={1:[-16,22,0],6:[-16,202,0],3:[-16,-68,0],4:[-16,112,0],2:[-106,22,0],5:[74,22,0]};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const face=(name,value)=>`<div class="die-face die-${name}" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="die-pip3 ${pips[value].includes(i+1)?'on':''}"></i>`).join('')}</div>`;
  function ensure(el){if(!el)return null;let cube=el.querySelector('.dice-cube3d');if(cube)return cube;el.innerHTML=`<div class="dice-cube3d">${faces.map(([n,v])=>face(n,v)).join('')}</div>`;cube=el.firstElementChild;cube.dataset.rx='-16';cube.dataset.ry='22';cube.dataset.rz='0';return cube}
  function apply(c,rx,ry,rz=0){c.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;c.dataset.rx=rx;c.dataset.ry=ry;c.dataset.rz=rz}
  function setFace(el,value){value=Math.max(1,Math.min(6,+value||1));const c=ensure(el);if(!c)return;c.getAnimations?.().forEach(a=>a.cancel());el.getAnimations?.().forEach(a=>a.cancel());apply(c,...target[value]);el.dataset.value=value;el.setAttribute('aria-label',`Dice shows ${value}`)}
  async function roll(el,{duration=920}={}){if(!el||el.dataset.rolling==='1')return null;const c=ensure(el);if(!c)return null;el.dataset.rolling='1';el.classList.add('dice-is-rolling');const value=1+crypto.getRandomValues(new Uint8Array(1))[0]%6,[fx,fy,fz]=target[value],sx=Number(c.dataset.rx||-16),sy=Number(c.dataset.ry||22),sz=Number(c.dataset.rz||0);
    if(reduced){await wait(160);apply(c,fx,fy,fz)}else{
      const spin=c.animate([
        {transform:`rotateX(${sx}deg) rotateY(${sy}deg) rotateZ(${sz}deg)`},
        {offset:.18,transform:`rotateX(${sx+155}deg) rotateY(${sy+205}deg) rotateZ(${sz+65}deg)`},
        {offset:.42,transform:`rotateX(${sx+385}deg) rotateY(${sy+505}deg) rotateZ(${sz+175}deg)`},
        {offset:.70,transform:`rotateX(${sx+655}deg) rotateY(${sy+810}deg) rotateZ(${sz+285}deg)`},
        {offset:.88,transform:`rotateX(${fx+710}deg) rotateY(${fy+1080}deg) rotateZ(${fz+350}deg)`},
        {transform:`rotateX(${fx+720}deg) rotateY(${fy+1080}deg) rotateZ(${fz+360}deg)`}
      ],{duration,easing:'cubic-bezier(.16,.76,.18,1)',fill:'forwards'});
      const hop=el.animate([{transform:'translateY(0) scale(1)'},{offset:.34,transform:'translateY(-26px) scale(1.07)'},{offset:.76,transform:'translateY(-5px) scale(1.025)'},{offset:.9,transform:'translateY(4px) scale(.985)'},{transform:'translateY(0) scale(1)'}],{duration,easing:'cubic-bezier(.2,.8,.2,1)'});
      try{await Promise.all([spin.finished,hop.finished])}catch{}spin.cancel();apply(c,fx,fy,fz);const land=el.animate([{transform:'translateY(-3px) scale(1.025)'},{offset:.55,transform:'translateY(3px) scale(.98)'},{transform:'translateY(0) scale(1)'}],{duration:220,easing:'ease-out'});try{await land.finished}catch{}
    }
    apply(c,fx,fy,fz);el.dataset.value=value;el.setAttribute('aria-label',`Dice shows ${value}`);el.classList.remove('dice-is-rolling');delete el.dataset.rolling;return value
  }
  window.DoKitlyDice={ensure,setFace,roll};
})();
