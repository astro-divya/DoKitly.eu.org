/* DoKitly PDF→DOCX engine v4 — text PDFs + scanned-PDF OCR
   Browser-first. PDF.js extracts embedded text/layout; Tesseract.js OCR handles image-only pages;
   JSZip writes conservative Word 2007-safe OOXML. OCR output stays editable whenever recognition
   succeeds, with a full-page image fallback only when OCR cannot recover usable text.
*/
(function(){
'use strict';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clean=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]/g,'').replace(/\uFFFD/g,'');
const xml=s=>clean(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const px=i=>Number.isFinite(i?.transform?.[4])?i.transform[4]:0;
const py=i=>Number.isFinite(i?.transform?.[5])?i.transform[5]:0;
const fs=i=>clamp(Math.hypot(Number(i?.transform?.[0])||0,Number(i?.transform?.[1])||0)||Number(i?.height)||9,6,48);
const tw=i=>Math.max(1,Number(i?.width)||clean(i?.str).length*fs(i)*.5);
function fontIdentity(i){return `${i?._fontFamily||''} ${i?._fontNameResolved||''} ${i?.fontName||''}`.trim()}
function fontName(i){const n=fontIdentity(i);return /courier|mono|consolas/i.test(n)?'Courier New':/times|serif|georgia/i.test(n)?'Times New Roman':/helvetica|arial|sans/i.test(n)?'Arial':'Arial'}
function isBold(i){return /bold|black|semibold|demi|heavy/i.test(fontIdentity(i))}
function isItalic(i){return /italic|oblique/i.test(fontIdentity(i))}
function enrichItems(page,tc){
 return (tc.items||[]).map(it=>{
  const style=tc.styles?.[it.fontName]||{};let obj=null;
  try{obj=page?.commonObjs?.get?.(it.fontName)||null}catch(_){}
  const resolved=[obj?.name,obj?.fontFamily,obj?.fallbackName,obj?.loadedName,style.fontFamily].filter(Boolean).join(' ');
  return Object.assign({},it,{_fontFamily:style.fontFamily||'',_fontNameResolved:resolved});
 });
}
function rows(items){
 const out=[];
 for(const it of [...items].sort((a,b)=>py(b)-py(a)||px(a)-px(b))){
  const y=py(it),tol=Math.max(1.45,fs(it)*.24);let r=out.find(q=>Math.abs(q.y-y)<=Math.max(q.tol,tol));
  if(!r){r={y,tol,items:[]};out.push(r)}r.items.push(it);r.y=(r.y*(r.items.length-1)+y)/r.items.length;r.tol=Math.max(r.tol,tol)
 }
 out.sort((a,b)=>b.y-a.y);out.forEach(r=>r.items.sort((a,b)=>px(a)-px(b)));return out
}
function segmentRow(r){
 const out=[];let cur=[];let end=null;const size=r.items.length?Math.max(...r.items.map(fs)):9;
 // Larger threshold avoids turning ordinary double-spaces in prose into Word tab stops.
 for(const it of r.items){const x=px(it),gap=end==null?0:x-end;if(cur.length&&gap>Math.max(18,size*1.55)){out.push(cur);cur=[]}cur.push(it);end=x+tw(it)}if(cur.length)out.push(cur);
 return out.map(items=>({items,x:Math.min(...items.map(px))}))
}
function itemTextXml(items){
 let body='',lastEnd=null;
 for(const it of items){const x=px(it),gap=lastEnd==null?0:x-lastEnd;if(body&&gap>Math.max(.8,fs(it)*.12))body+=runXml(it,' ');body+=runXml(it,clean(it.str));lastEnd=x+tw(it)}
 return body
}
function runXml(it,text,forceBold=false){
 const size=clamp(Math.round(fs(it)*2),12,96),font=xml(fontName(it)),b=forceBold||isBold(it),i=isItalic(it),t=xml(text??it?.str??'');
 if(!t)return '';
 return `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${b?'<w:b/><w:bCs/>':''}${i?'<w:i/><w:iCs/>':''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`
}
function bandForRow(r,bands,pageHeight){const yTop=pageHeight-r.y;return (bands||[]).find(b=>yTop>=b.y0-3&&yTop<=b.y1+3)||null}
function rowParaXml(r,prevY,pageWidthPt,pageHeightPt,bands){
 const segs=segmentRow(r);if(!segs.length)return '<w:p/>';
 const maxFs=Math.max(...r.items.map(fs)),gap=Math.max(0,prevY-r.y),band=bandForRow(r,bands,pageHeightPt);
 const linePt=band?Math.max(maxFs,band.y1-band.y0):maxFs;
 const before=clamp(Math.round(Math.max(0,gap-linePt)*20),0,1600);
 let leftPt=segs[0].x,rightPt=0,shade='';
 if(band){leftPt=Math.min(leftPt,band.x0);rightPt=Math.max(0,pageWidthPt-band.x1);shade=`<w:shd w:val="clear" w:color="auto" w:fill="${band.fill}"/>`}
 const left=clamp(Math.round(leftPt*20),0,30000),right=clamp(Math.round(rightPt*20),0,30000);
 const tabStops=segs.slice(1).map(s=>`<w:tab w:val="left" w:pos="${clamp(Math.round(s.x*20),left+20,30000)}"/>`).join('');
 let body='';segs.forEach((s,idx)=>{if(idx)body+='<w:r><w:tab/></w:r>';body+=itemTextXml(s.items)});
 // Exact line spacing keeps PDF baselines far closer than Word's default font-leading spacing.
 const line=clamp(Math.round(linePt*20),160,1920);
 const ppr=`<w:pPr>${shade}${tabStops?`<w:tabs>${tabStops}</w:tabs>`:''}<w:spacing w:before="${before}" w:after="0" w:line="${line}" w:lineRule="exact"/><w:ind w:left="${left}"${right?` w:right="${right}"`:''}/></w:pPr>`;
 return `<w:p>${ppr}${body}</w:p>`
}
function headerColumns(r){
 const cols=[];
 for(const it of r.items){const t=clean(it.str).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(/^(sr\s*no|bill\s*no|description|quantity|rate|value\s*claimed)/.test(t))cols.push(px(it))}
 return [...new Set(cols.map(x=>Math.round(x*100)/100))].sort((a,b)=>a-b)
}
function tableHeaderScore(r){const t=r.items.map(i=>clean(i.str)).join(' ').toLowerCase().replace(/[^a-z0-9]+/g,' ');return ['sr no','bill no','description','quantity','rate','value','claimed'].reduce((n,k)=>n+(t.includes(k)?1:0),0)}
function trueTableAt(rs,idx){
 if(tableHeaderScore(rs[idx])<3)return null;const cols=headerColumns(rs[idx]);if(cols.length<3)return null;
 let end=idx;for(let k=idx+1;k<Math.min(rs.length,idx+8);k++){const txt=rs[k].items.map(i=>clean(i.str)).join(' ');if(/long\s*desc/i.test(txt))break;if(k>idx+1&&rs[k].items.length<2)break;end=k}
 return end>idx?{end,cols}:null
}
function bucketRowItems(r,cols){
 const buckets=cols.map(()=>[]),mids=[];for(let i=0;i<cols.length-1;i++)mids.push((cols[i]+cols[i+1])/2);
 for(const it of r.items){const x=px(it);let bi=0;while(bi<mids.length&&x>=mids[bi])bi++;buckets[bi].push(it)}
 return buckets
}
function tableXml(rs,cols,pageWidthTwips){
 const left=clamp(Math.round(cols[0]*20),0,18000),right=Math.max(left+2400,pageWidthTwips-170),usable=right-left;
 const boundaries=[...cols.map(x=>Math.round(x*20)),right],widths=[];for(let i=0;i<cols.length;i++)widths.push(clamp((boundaries[i+1]||right)-boundaries[i],360,7000));
 const sum=widths.reduce((a,b)=>a+b,0),scale=usable/sum;for(let i=0;i<widths.length;i++)widths[i]=Math.max(360,Math.round(widths[i]*scale));
 const grid=widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('');let body='';
 rs.forEach((r,ri)=>{const buckets=bucketRowItems(r,cols);body+='<w:tr>'+buckets.map((arr,j)=>{if(!arr.length)return `<w:tc><w:tcPr><w:tcW w:w="${widths[j]}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`;return `<w:tc><w:tcPr><w:tcW w:w="${widths[j]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${Math.round(Math.max(...arr.map(fs))*20)}" w:lineRule="exact"/></w:pPr>${arr.map(it=>runXml(it,clean(it.str),ri===0)).join('')}</w:p></w:tc>`}).join('')+'</w:tr>'});
 const border='<w:top w:val="single" w:sz="6" w:color="000000"/><w:left w:val="single" w:sz="6" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:color="000000"/><w:right w:val="single" w:sz="6" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:color="000000"/>';
 return `<w:tbl><w:tblPr><w:tblW w:w="${usable}" w:type="dxa"/><w:tblInd w:w="${left}" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`
}
async function detectDarkBands(page,vp){
 try{
  const scale=Math.min(1,850/Math.max(vp.width,vp.height)),rv=page.getViewport({scale}),c=document.createElement('canvas');c.width=Math.ceil(rv.width);c.height=Math.ceil(rv.height);const ctx=c.getContext('2d',{willReadFrequently:true});await page.render({canvasContext:ctx,viewport:rv}).promise;const im=ctx.getImageData(0,0,c.width,c.height),rows=[];
  for(let y=0;y<c.height;y++){let dark=0,sum=0,minX=c.width,maxX=-1;for(let x=0;x<c.width;x++){const k=(y*c.width+x)*4,r=im.data[k],g=im.data[k+1],b=im.data[k+2],a=im.data[k+3];if(a<80)continue;const lum=.2126*r+.7152*g+.0722*b;if(lum<225){dark++;sum+=lum;minX=Math.min(minX,x);maxX=Math.max(maxX,x)}}const ratio=dark/c.width;if(ratio>.62)rows.push({y,ratio,lum:dark?sum/dark:255,minX,maxX})}
  const groups=[];for(const r of rows){let g=groups[groups.length-1];if(!g||r.y>g.y1+1){g={y0:r.y,y1:r.y,minX:r.minX,maxX:r.maxX,lums:[r.lum]};groups.push(g)}else{g.y1=r.y;g.minX=Math.min(g.minX,r.minX);g.maxX=Math.max(g.maxX,r.maxX);g.lums.push(r.lum)}}
  return groups.filter(g=>g.y1-g.y0+1>=3).map(g=>{const lum=Math.round(g.lums.reduce((a,b)=>a+b,0)/g.lums.length),h=Math.max(0,Math.min(255,lum)).toString(16).padStart(2,'0').toUpperCase();return{x0:g.minX/scale,x1:(g.maxX+1)/scale,y0:g.y0/scale,y1:(g.y1+1)/scale,fill:h+h+h}})
 }catch(_){return[]}
}
async function renderScanImage(page,vp){
 const scale=Math.min(1.65,1800/Math.max(vp.width,vp.height)),rv=page.getViewport({scale}),c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(rv.width));c.height=Math.max(1,Math.ceil(rv.height));const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);await page.render({canvasContext:ctx,viewport:rv}).promise;const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not render scanned PDF page.')),'image/jpeg',.9));return new Uint8Array(await blob.arrayBuffer())
}
function scanImagePara(relId,vp,docPrId){
 const cx=Math.round(vp.width*12700),cy=Math.round(vp.height*12700);
 return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="Scanned PDF page ${docPrId}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="scan-${docPrId}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}
function sectionPrXml(w,h,next=false){return `<w:sectPr>${next?'<w:type w:val="nextPage"/>':''}<w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`}
function sectionBreak(w,h){return `<w:p><w:pPr>${sectionPrXml(w,h,true)}</w:pPr></w:p>`}
async function renderOcrCanvas(page,vp){
 const scale=Math.min(3,Math.max(1.8,2200/Math.max(vp.width,vp.height))),rv=page.getViewport({scale}),c=document.createElement('canvas');
 c.width=Math.max(1,Math.ceil(rv.width));c.height=Math.max(1,Math.ceil(rv.height));const ctx=c.getContext('2d',{alpha:false,willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);await page.render({canvasContext:ctx,viewport:rv}).promise;return c
}
function tsvWords(tsv){
 if(!tsv)return [];const lines=String(tsv).split(/\r?\n/),out=[];
 for(let i=1;i<lines.length;i++){const c=lines[i].split('\t');if(c.length<12||Number(c[0])!==5)continue;const text=clean(c.slice(11).join('\t')).trim(),conf=Number(c[10]);if(!text||(!Number.isNaN(conf)&&conf<12))continue;const left=Number(c[6]),top=Number(c[7]),width=Number(c[8]),height=Number(c[9]);if([left,top,width,height].some(v=>!Number.isFinite(v))||width<=0||height<=0)continue;out.push({text,conf:Number.isFinite(conf)?conf:50,bbox:{x0:left,y0:top,x1:left+width,y1:top+height}})}
 return out
}
function blockWords(blocks){
 const out=[];const walk=n=>{if(!n)return;if(Array.isArray(n)){n.forEach(walk);return}if(typeof n!=='object')return;const text=clean(n.text||n.symbol||'').trim(),b=n.bbox;if(text&&b&&Number.isFinite(b.x0)&&Number.isFinite(b.y0)&&Number.isFinite(b.x1)&&Number.isFinite(b.y1)&&b.x1>b.x0&&b.y1>b.y0&&(!('confidence'in n)||Number(n.confidence)>=12))out.push({text,conf:Number(n.confidence)||50,bbox:b});for(const k of ['blocks','paragraphs','lines','words','symbols'])if(n[k])walk(n[k])};walk(blocks);return out
}
function ocrWordsFromData(data){
 let ws=[];if(Array.isArray(data?.words))ws=data.words.map(w=>({text:clean(w.text).trim(),conf:Number(w.confidence??w.conf??50),bbox:w.bbox})).filter(w=>w.text&&w.bbox&&w.conf>=12);
 if(!ws.length)ws=tsvWords(data?.tsv);if(!ws.length)ws=blockWords(data?.blocks);return ws
}
function wordsToPdfItems(words,canvas,vp){
 const sx=canvas.width/vp.width,sy=canvas.height/vp.height;
 return words.map(w=>{const b=w.bbox||{},x0=Number(b.x0)||0,y0=Number(b.y0)||0,x1=Number(b.x1)||x0,y1=Number(b.y1)||y0,wpt=Math.max(.5,(x1-x0)/sx),hpt=Math.max(1,(y1-y0)/sy),fontSize=clamp(hpt*.82,6,48),baselineTop=(y0+(y1-y0)*.82)/sy,y=vp.height-baselineTop;return{str:clean(w.text),width:wpt,height:hpt,fontName:'OCRArial',transform:[fontSize,0,0,fontSize,x0/sx,y],_fontFamily:'Arial',_fontNameResolved:'Arial',_ocrConfidence:w.conf}}).filter(i=>i.str.trim())
}
function plainTextOcrItems(text,vp){
 const ls=clean(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean),out=[],fsz=10,line=14;let top=36;
 for(const l of ls){out.push({str:l,width:Math.min(vp.width-72,Math.max(12,l.length*fsz*.5)),height:fsz,fontName:'OCRArial',transform:[fsz,0,0,fsz,36,vp.height-top-fsz],_fontFamily:'Arial',_fontNameResolved:'Arial',_ocrConfidence:40});top+=line}return out
}
async function createOcrWorker(language,onLog){
 if(!window.Tesseract?.createWorker)throw Error('OCR engine did not load. Check your internet connection and try again.');const logger=m=>{try{onLog?.(m)}catch(_){}};
 try{return await window.Tesseract.createWorker(language||'eng',1,{logger})}catch(first){
  try{const w=await window.Tesseract.createWorker({logger});if(w.loadLanguage)await w.loadLanguage(language||'eng');if(w.initialize)await w.initialize(language||'eng');return w}catch(_){throw first}
 }
}
async function ocrPage(worker,page,vp,onLog){
 const canvas=await renderOcrCanvas(page,vp);let res;
 try{res=await worker.recognize(canvas,{}, {text:true,tsv:true,blocks:true,hocr:false,pdf:false})}catch(_){res=await worker.recognize(canvas)}
 const data=res?.data||{},words=ocrWordsFromData(data);let items=wordsToPdfItems(words,canvas,vp);if(!items.length&&clean(data.text).trim())items=plainTextOcrItems(data.text,vp);const chars=items.reduce((n,i)=>n+clean(i.str).replace(/\s+/g,'').length,0),conf=words.length?words.reduce((a,w)=>a+(Number(w.conf)||0),0)/words.length:0;onLog?.({status:'ocr complete',progress:1});return{items,chars,confidence:conf}
}
function contentTypes(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`}
function rootRels(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`}
function docRels(media=[]){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${media.map(m=>`<Relationship Id="${m.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`}
function styles(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`}
function settings(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="12"/></w:compat></w:settings>`}
function core(){const now=new Date().toISOString();return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Converted PDF</dc:title><dc:creator>DoKitly</dc:creator><cp:lastModifiedBy>DoKitly</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`}
function app(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>DoKitly</Application><AppVersion>12.0000</AppVersion></Properties>`}
async function convert(file,opts={}){
 if(!window.pdfjsLib)throw Error('PDF text engine did not load.');if(!window.JSZip)throw Error('DOCX package engine did not load.');
 const language=opts.language||'eng',progress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};let ocrWorker=null,currentOcrPage=0,totalPages=0;
 const report=(phase,message,extra={})=>{try{progress(Object.assign({phase,message,page:currentOcrPage,pages:totalPages},extra))}catch(_){}};
 try{
  const bytes=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data:bytes}).promise;totalPages=pdf.numPages;const counts=new Map(),pages=[],media=[];
  report('analyze','Analyzing PDF…',{percent:2});
  for(let p=1;p<=pdf.numPages;p++){
   currentOcrPage=p;report('analyze',`Analyzing page ${p} of ${pdf.numPages}…`,{percent:Math.round((p-1)/Math.max(1,pdf.numPages)*22)+3});
   const pg=await pdf.getPage(p),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent({disableCombineTextItems:false}),embedded=enrichItems(pg,tc).filter(i=>clean(i.str).trim()),embeddedChars=embedded.reduce((n,i)=>n+clean(i.str).replace(/\s+/g,'').length,0);
   let items=embedded,bands=[],scan=null,isScanned=embeddedChars<8,ocrUsed=false,ocrConfidence=0;
   if(isScanned){
    if(!ocrWorker){report('ocr-init','Loading OCR engine for scanned pages…',{percent:25});ocrWorker=await createOcrWorker(language,m=>{const pgNo=currentOcrPage||1,pct=Number(m?.progress);report('ocr',`OCR page ${pgNo} of ${pdf.numPages}: ${m?.status||'recognizing text'}${Number.isFinite(pct)?` — ${Math.round(pct*100)}%`:''}`,{progress:Number.isFinite(pct)?pct:null})})}
    report('ocr',`Reading scanned page ${p} of ${pdf.numPages} with OCR…`);
    let ocr={items:[],chars:0,confidence:0};try{ocr=await ocrPage(ocrWorker,pg,vp)}catch(e){console.warn('OCR page failed',p,e)}
    if(ocr.chars>=3){items=ocr.items;ocrUsed=true;ocrConfidence=ocr.confidence;bands=await detectDarkBands(pg,vp)}else{const name=`scan-page-${p}.jpg`,relId=`rId${media.length+3}`,data=await renderScanImage(pg,vp);scan={name,relId,data};media.push(scan)}
   }else bands=await detectDarkBands(pg,vp);
   pages.push({vp,items,bands,scan,isScanned,ocrUsed,ocrConfidence});for(const i of items){const t=clean(i.str).trim();if(t.length>10)counts.set(t,(counts.get(t)||0)+1)}
  }
  if(ocrWorker){try{await ocrWorker.terminate()}catch(_){}ocrWorker=null}
  report('build','Building editable Word document…',{percent:78});
  let body='',blocks=0,tables=0,bandsFound=0,scannedPages=0,ocrPages=0,imageFallbackPages=0,lastW=12240,lastH=15840;
  for(let pi=0;pi<pages.length;pi++){
   const {vp,bands,scan,isScanned,ocrUsed}=pages[pi],pw=clamp(Math.round(vp.width*20),7200,31680),ph=clamp(Math.round(vp.height*20),7200,31680);lastW=pw;lastH=ph;bandsFound+=bands.length;if(isScanned)scannedPages++;if(ocrUsed)ocrPages++;
   if(scan){body+=scanImagePara(scan.relId,vp,pi+1);imageFallbackPages++;blocks++}
   else{
    const filtered=pages[pi].items.filter(i=>{const t=clean(i.str).trim();return !(pdf.numPages>2&&counts.get(t)>=Math.ceil(pdf.numPages*.7)&&t.length>14)}),rs=rows(filtered);let prev=vp.height;
    for(let i=0;i<rs.length;){const tb=trueTableAt(rs,i);if(tb){body+=tableXml(rs.slice(i,tb.end+1),tb.cols,pw);tables++;prev=rs[tb.end].y;i=tb.end+1}else{body+=rowParaXml(rs[i],prev,vp.width,vp.height,bands);prev=rs[i].y;i++}blocks++}
   }
   if(pi<pages.length-1)body+=sectionBreak(pw,ph)
  }
  body+=sectionPrXml(lastW,lastH,false);
  const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`;
  const parsed=new DOMParser().parseFromString(documentXml,'application/xml');if(parsed.querySelector('parsererror'))throw Error('Word engine generated invalid XML.');
  report('package','Packaging DOCX…',{percent:90});
  const zip=new JSZip();zip.file('[Content_Types].xml',contentTypes());zip.folder('_rels').file('.rels',rootRels());zip.folder('docProps').file('core.xml',core()).file('app.xml',app());const word=zip.folder('word');word.file('document.xml',documentXml).file('styles.xml',styles()).file('settings.xml',settings());word.folder('_rels').file('document.xml.rels',docRels(media));const mediaFolder=word.folder('media');media.forEach(m=>mediaFolder.file(m.name,m.data));
  const blob=await zip.generateAsync({type:'blob',mimeType:MIME,compression:'DEFLATE',compressionOptions:{level:6}},m=>report('package',`Packaging DOCX — ${Math.round(m.percent||0)}%`,{percent:90+Math.round((m.percent||0)*.09)}));
  const verify=await JSZip.loadAsync(blob);for(const n of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/settings.xml','word/_rels/document.xml.rels'])if(!verify.file(n))throw Error(`DOCX validation failed: missing ${n}.`);
  for(const n of ['word/document.xml','word/styles.xml','word/settings.xml']){const vx=await verify.file(n).async('string'),vp2=new DOMParser().parseFromString(vx,'application/xml');if(vp2.querySelector('parsererror'))throw Error(`DOCX validation failed: ${n} is invalid XML.`)}
  report('done','Editable Word file ready.',{percent:100});
  return {blob,pages:pdf.numPages,tables,blocks,bands:bandsFound,scannedPages,ocrPages,imageFallbackPages};
 }finally{if(ocrWorker){try{await ocrWorker.terminate()}catch(_){}}}
}
window.DMOWordEngine={convert,version:'dokitly-2-word-layout-ocr-editable'};
})();
