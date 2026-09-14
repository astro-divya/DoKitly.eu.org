(() => {
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mapFont(name=''){
  const n=String(name).toLowerCase(),bold=/bold|black|semibold|demi/.test(n),italic=/italic|oblique/.test(n);
  if(/courier|mono|consolas/.test(n))return bold?'CourierBold':'Courier';
  if(/times|serif|georgia/.test(n))return bold?'TimesRomanBold':italic?'TimesRomanItalic':'TimesRoman';
  return bold?'HelveticaBold':italic?'HelveticaOblique':'Helvetica';
}
function extractBlocks(textContent, viewport){
  const W=viewport.width,H=viewport.height;
  const raw=(textContent.items||[]).map((item,index)=>{
    if(!item?.str || !item.str.trim())return null;
    const tr=item.transform||[], sx=Math.hypot(Number(tr[0])||0,Number(tr[1])||0), sy=Math.hypot(Number(tr[2])||0,Number(tr[3])||0);
    // PDF.js text height follows the vertical text-matrix axis (c,d). Using the horizontal
    // axis here makes stretched fonts look too large/small in the inline editor.
    const fontSize=Math.max(5.5,sy||Number(item.height)||sx||10), style=textContent.styles?.[item.fontName]||{};
    const font=mapFont(`${style.fontFamily||''} ${item.fontName||''}`), x=Number(tr[4])||0, baseline=Number(tr[5])||0;
    const ascent=Number.isFinite(style.ascent)?style.ascent:.82, descent=Number.isFinite(style.descent)?style.descent:-.18;
    const top=baseline+fontSize*ascent, bottom=baseline+fontSize*descent, width=Math.max(1,Number(item.width)||item.str.length*fontSize*.5);
    return {id:`item-${index}`,sourceIds:[index],text:item.str,xPdf:x,baselinePdf:baseline,widthPdf:width,fontSize,font,fontName:item.fontName||'',fontFamily:style.fontFamily||'',x:x/W,y:clamp(1-top/H,0,1),w:Math.max(.003,width/W),h:Math.max(.01,(top-bottom)/H),baselineN:clamp(baseline/H,0,1)};
  }).filter(Boolean);

  raw.sort((a,b)=>b.baselinePdf-a.baselinePdf||a.xPdf-b.xPdf);
  const rows=[];
  for(const r of raw){
    let row=rows.find(q=>Math.abs(q.baseline-r.baselinePdf)<=Math.max(1.8,Math.min(q.fontSize,r.fontSize)*.30) && Math.abs(q.fontSize-r.fontSize)<=Math.max(2,Math.min(q.fontSize,r.fontSize)*.28));
    if(!row){row={items:[],baseline:r.baselinePdf,fontSize:r.fontSize,font:r.font};rows.push(row)}
    row.items.push(r);
  }
  const blocks=[]; let bi=0;
  for(const row of rows){
    row.items.sort((a,b)=>a.xPdf-b.xPdf); let cur=null;
    for(const r of row.items){
      if(!cur){cur={...r,sourceIds:[...r.sourceIds]};continue}
      const end=cur.xPdf+cur.widthPdf, gap=r.xPdf-end, size=Math.min(cur.fontSize,r.fontSize);
      const sameFont=cur.font===r.font;
      const sameRun=sameFont && gap<=Math.max(1.6,size*.45) && gap>=-Math.max(2,size*.30);
      if(sameRun){
        const needsSpace=gap>Math.max(.7,size*.14)&&!/\s$/.test(cur.text)&&!/^\s/.test(r.text);
        cur.text+=needsSpace?' '+r.text:r.text; cur.sourceIds.push(...r.sourceIds);
        cur.widthPdf=Math.max(cur.widthPdf,r.xPdf+r.widthPdf-cur.xPdf);cur.w=Math.max(.003,cur.widthPdf/W);cur.fontSize=Math.max(cur.fontSize,r.fontSize);
      }else{cur.id=`text-${bi++}`;blocks.push(cur);cur={...r,sourceIds:[...r.sourceIds]}}
    }
    if(cur){cur.id=`text-${bi++}`;blocks.push(cur)}
  }
  return blocks;
}
function samplePalette(canvas, block){
  try{
    const ctx=canvas.getContext('2d',{willReadFrequently:true}),W=canvas.width,H=canvas.height;
    const x=clamp(Math.floor(block.x*W),0,W-1), y=clamp(Math.floor(block.y*H),0,H-1), w=Math.max(2,Math.min(W-x,Math.ceil(block.w*W))), h=Math.max(2,Math.min(H-y,Math.ceil(block.h*H)));
    const pad=Math.max(2,Math.round(Math.min(w,h)*.30));
    const sx=clamp(x-pad,0,W-1),sy=clamp(y-pad,0,H-1),sw=Math.max(2,Math.min(W-sx,w+pad*2)),sh=Math.max(2,Math.min(H-sy,h+pad*2));
    const d=ctx.getImageData(sx,sy,sw,sh).data;
    const border=[],inside=[];
    for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++){
      const i=(yy*sw+xx)*4;if(d[i+3]<100)continue;const p=[d[i],d[i+1],d[i+2]], inCore=xx>=pad&&xx<pad+w&&yy>=pad&&yy<pad+h;(inCore?inside:border).push(p)
    }
    const avg=arr=>{if(!arr.length)return[255,255,255];const s=arr.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]);return s.map(v=>Math.round(v/arr.length))};
    // Dominant quantized border colour is more stable than a simple average on forms,
    // ruled tables and lightly tinted PDFs. It avoids a visible rectangular clean-up patch.
    const dominant=arr=>{if(!arr.length)return[255,255,255];const m=new Map();for(const p of arr){const q=p.map(v=>Math.round(v/24)*24),k=q.join(',');m.set(k,(m.get(k)||0)+1)}let key='255,255,255',n=-1;for(const[k,v]of m)if(v>n){key=k;n=v}const q=key.split(',').map(Number);const near=arr.filter(p=>Math.max(...p.map((v,i)=>Math.abs(v-q[i])))<=30);return avg(near.length?near:arr)};
    const bg=dominant(border.length?border:inside), lum=p=>.2126*p[0]+.7152*p[1]+.0722*p[2],dist=p=>Math.hypot(p[0]-bg[0],p[1]-bg[1],p[2]-bg[2]);
    const candidates=inside.filter(p=>dist(p)>58&&Math.abs(lum(p)-lum(bg))>30);const ink=avg(candidates.length?candidates:inside.filter(p=>lum(p)<150));
    const hex=p=>'#'+p.map(v=>clamp(v,0,255).toString(16).padStart(2,'0')).join('');
    return {text:hex(ink),background:hex(bg)};
  }catch(_){return{text:'#111827',background:'#ffffff'}}
}
function cssFamily(font){return String(font).startsWith('Times')?'Georgia, "Times New Roman", serif':String(font).startsWith('Courier')?'"Courier New", monospace':'Arial, Helvetica, sans-serif'}
function cssWeight(font){return /Bold/.test(font)?'700':'400'}
function cssStyle(font){return /Italic|Oblique/.test(font)?'italic':'normal'}
window.DMOPdfInlineEngine={version:'7.3-inline-font-refined',extractBlocks,samplePalette,mapFont,cssFamily,cssWeight,cssStyle};
})();
