(()=>{
  const pipMap={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  const faces=[['front',1],['back',6],['right',3],['left',4],['top',2],['bottom',5]];
  const faceRotation={1:[0,0,0],6:[0,180,0],3:[0,-90,0],4:[0,90,0],2:[-90,0,0],5:[90,0,0]};
  const idleTilt=[-14,20,2];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function finalRotation(value){const [x,y,z]=faceRotation[value];return[x+idleTilt[0],y+idleTilt[1],z+idleTilt[2]]}
  function faceHtml(name,value){return `<div class="die-face die-${name}" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="die-pip3 ${pipMap[value].includes(i+1)?'on':''}"></i>`).join('')}</div>`}
  function ensure(el){
    if(!el)return null; let cube=el.querySelector('.dice-cube3d'); if(cube)return cube;
    el.innerHTML=`<div class="dice-cube3d">${faces.map(([n,v])=>faceHtml(n,v)).join('')}</div>`;
    cube=el.querySelector('.dice-cube3d'); cube.dataset.rx='0';cube.dataset.ry='0';cube.dataset.rz='0';setFace(el,1);return cube;
  }
  function applyRotation(cube,rx,ry,rz=0){cube.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;cube.dataset.rx=String(rx);cube.dataset.ry=String(ry);cube.dataset.rz=String(rz)}
  function setFace(el,value){
    value=Math.max(1,Math.min(6,+value||1)); const cube=ensure(el); if(!cube)return;
    const [rx,ry,rz]=finalRotation(value); cube.getAnimations?.().forEach(a=>a.cancel()); el.getAnimations?.().forEach(a=>a.cancel()); applyRotation(cube,rx,ry,rz);
    el.dataset.value=String(value);el.setAttribute('aria-label',`Dice shows ${value}`);
  }
  async function roll(el,{duration=880}={}){
    if(!el||el.dataset.rolling==='1')return null; const cube=ensure(el);if(!cube)return null;el.dataset.rolling='1';el.classList.add('dice-is-rolling');
    const final=1+Math.floor(Math.random()*6),[fx,fy,fz]=finalRotation(final); const sx=Number(cube.dataset.rx||0),sy=Number(cube.dataset.ry||0),sz=Number(cube.dataset.rz||0);
    if(reduce){await wait(160);applyRotation(cube,fx,fy,fz)}else{
      // Offset angles deliberately keep at least two cube faces visible through most of the tumble.
      const xTurns=720+(Math.random()>.5?360:0),yTurns=900+(Math.random()>.5?360:0),zTurns=360;
      const k=[
        {transform:`rotateX(${sx}deg) rotateY(${sy}deg) rotateZ(${sz}deg)`},
        {offset:.16,transform:`rotateX(${sx+137}deg) rotateY(${sy+191}deg) rotateZ(${sz+43}deg)`},
        {offset:.38,transform:`rotateX(${sx+xTurns*.43+31}deg) rotateY(${sy+yTurns*.41+47}deg) rotateZ(${sz+137}deg)`},
        {offset:.64,transform:`rotateX(${sx+xTurns*.73+23}deg) rotateY(${sy+yTurns*.70+39}deg) rotateZ(${sz+251}deg)`},
        {offset:.84,transform:`rotateX(${fx+xTurns-41}deg) rotateY(${fy+yTurns-53}deg) rotateZ(${fz+zTurns-29}deg)`},
        {transform:`rotateX(${fx+xTurns}deg) rotateY(${fy+yTurns}deg) rotateZ(${fz+zTurns}deg)`}
      ];
      const lift=el.animate([
        {transform:'translateY(0) scale(1)'},
        {offset:.28,transform:'translateY(-16px) scale(1.055)'},
        {offset:.64,transform:'translateY(-6px) scale(1.02)'},
        {offset:.88,transform:'translateY(2px) scale(.985)'},
        {transform:'translateY(0) scale(1)'}
      ],{duration,easing:'cubic-bezier(.18,.72,.2,1)',fill:'none'});
      const spin=cube.animate(k,{duration,easing:'cubic-bezier(.15,.66,.18,1)',fill:'forwards'});
      try{await Promise.all([spin.finished,lift.finished])}catch(e){}
      spin.cancel();applyRotation(cube,fx,fy,fz);
      const land=el.animate([{transform:'translateY(-4px) scale(1.03)'},{offset:.52,transform:'translateY(3px) scale(.975)'},{transform:'translateY(0) scale(1)'}],{duration:230,easing:'cubic-bezier(.2,.88,.25,1)'});
      try{await land.finished}catch(e){}
    }
    applyRotation(cube,fx,fy,fz);el.dataset.value=String(final);el.setAttribute('aria-label',`Dice shows ${final}`);el.classList.remove('dice-is-rolling');delete el.dataset.rolling;return final;
  }
  window.DoKitlyDice={roll,setFace,ensure};
})();
