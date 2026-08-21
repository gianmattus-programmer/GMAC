(()=>{
'use strict';
const $=(q,el=document)=>el?.querySelector?.(q)||null;
const $$=(q,el=document)=>el?.querySelectorAll?[...el.querySelectorAll(q)]:[];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const latin=v=>clean(v).replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?');
const escPdf=v=>latin(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const safeName=v=>clean(v||'gmac').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'gmac';
const num=v=>Number(v).toFixed(2).replace(/\.00$/,'');
const C={bg:[.106,.11,.118],round:[.125,.129,.137],match:[.141,.149,.161],paper:[.957,.953,.933],white:[1,1,1],ink:[.067,.071,.078],muted:[.44,.45,.47],line:[.455,.467,.486],border:[.357,.369,.388],finalBorder:[.467,.482,.51],empty:[.851,.847,.827],pen:[.133,.208,.427],penBorder:[.192,.373,.839]};
let raf=0;
function rgb(c,stroke=false){return`${num(c[0])} ${num(c[1])} ${num(c[2])} ${stroke?'RG':'rg'}`}
function toast(message){let el=$('.gm-share-toast');if(!el){el=document.createElement('div');el.className='gm-share-toast';document.body.appendChild(el)}el.textContent=message;el.classList.add('is-visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('is-visible'),3600)}
function isKnockout(panel){return !!panel?.querySelector?.('.gm-fixture--knockout,[data-gmac-bracket]')}
function syncButtons(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{$$('[data-share-capture="fixture"]').forEach(btn=>{const panel=btn.closest('.gm-fixture-panel');if(!isKnockout(panel))return;btn.dataset.pdfReady='39.2';btn.textContent='DESCARGAR FIXTURE PDF ↓';btn.setAttribute('aria-label','Descargar fixture completo en PDF vectorial')})})}
function waitFrames(n=2){return new Promise(resolve=>{const step=()=>n--<=0?resolve():requestAnimationFrame(step);step()})}
async function waitForBracket(panel,timeout=3000){const start=performance.now();while(performance.now()-start<timeout){window.GMAC_ENHANCE_BRACKETS?.();await waitFrames(1);const bracket=$('[data-gmac-bracket]',panel);if(bracket)return bracket;await new Promise(r=>setTimeout(r,40))}return null}
function player(row){
  if(!row)return{name:'Por definir',score:'-',penalty:'',empty:true};
  const nameEl=$('.gm-v36-player__name',row)||$(':scope > span',row);
  const scoreEl=$('.gm-v36-score',row)||$('.gm-inline-score',row);
  const penaltyEl=$('.gm-v36-penalty',row)||$('.gm-inline-penalty',row);
  const name=clean(nameEl?.textContent)||'Por definir';
  const penaltyRaw=clean(penaltyEl?.textContent);const penaltyMatch=penaltyRaw.match(/-?\d+/);
  return{name,score:clean(scoreEl?.textContent)||'-',penalty:penaltyMatch?penaltyMatch[0]:'',empty:row.classList?.contains('is-empty')||row.classList?.contains('gm-v36-player')&&name.toLowerCase().includes('por definir')};
}
function match(matchEl){
  if(!matchEl)return{rows:[player(null),player(null)]};
  let rows=$$(':scope > .gm-v36-player',matchEl);if(rows.length<2)rows=$$('.gm-v36-player',matchEl);
  return{rows:[player(rows[0]),player(rows[1])]};
}
function columnData(bracket,side){return $$('.gm-v36-round',bracket).filter(x=>x.dataset.side===side).sort((a,b)=>Number(a.dataset.roundIndex)-Number(b.dataset.roundIndex)).map(el=>({title:clean($('.gm-v36-round__title',el)?.textContent),matches:$$('[data-v36-match]',el).map(match)}))}
async function imageToJpeg(img){
  if(!img?.src)return null;
  try{await img.decode?.()}catch(_){}
  const draw=async source=>{
    const sw=source.naturalWidth||source.width||1,sh=source.naturalHeight||source.height||1,max=560,scale=Math.min(1,max/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.fillStyle='#1b1c1e';ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(!blob)return null;return{bytes:new Uint8Array(await blob.arrayBuffer()),width:w,height:h};
  };
  try{return await draw(img)}catch(_){}
  try{const response=await fetch(img.currentSrc||img.src,{cache:'force-cache'});if(!response.ok)return null;const blob=await response.blob();const bmp=await createImageBitmap(blob);try{return await draw(bmp)}finally{bmp.close?.()}}catch(_){return null}
}
function fit(text,max,size){let s=latin(text),fs=size;while(s.length*fs*.55>max&&fs>5)fs-=.25;if(s.length*fs*.55>max){const limit=Math.max(1,Math.floor(max/(fs*.55))-1);s=s.slice(0,limit)+'~'}return{s,fs}}
function pdfRenderer(W,H){
  const ops=[];const py=(top,h=0)=>H-top-h;
  const rect=(x,top,w,h,fill,stroke=null,sw=1,r=0)=>{if(r<=0){ops.push(`${rgb(fill)} ${num(x)} ${num(py(top,h))} ${num(w)} ${num(h)} re f`);if(stroke)ops.push(`${rgb(stroke,true)} ${num(sw)} w ${num(x)} ${num(py(top,h))} ${num(w)} ${num(h)} re S`);return}const y=py(top,h),rad=Math.min(r,w/2,h/2),k=.55228475,c=rad*k,p=[`${num(x+rad)} ${num(y)} m`,`${num(x+w-rad)} ${num(y)} l`,`${num(x+w-rad+c)} ${num(y)} ${num(x+w)} ${num(y+rad-c)} ${num(x+w)} ${num(y+rad)} c`,`${num(x+w)} ${num(y+h-rad)} l`,`${num(x+w)} ${num(y+h-rad+c)} ${num(x+w-rad+c)} ${num(y+h)} ${num(x+w-rad)} ${num(y+h)} c`,`${num(x+rad)} ${num(y+h)} l`,`${num(x+rad-c)} ${num(y+h)} ${num(x)} ${num(y+h-rad+c)} ${num(x)} ${num(y+h-rad)} c`,`${num(x)} ${num(y+rad)} l`,`${num(x)} ${num(y+rad-c)} ${num(x+rad-c)} ${num(y)} ${num(x+rad)} ${num(y)} c h`].join(' ');ops.push(`${rgb(fill)} ${p} f`);if(stroke)ops.push(`${rgb(stroke,true)} ${num(sw)} w ${p} S`)};
  const line=(x1,y1,x2,y2,c=C.line,sw=1.35)=>ops.push(`${rgb(c,true)} ${num(sw)} w ${num(x1)} ${num(H-y1)} m ${num(x2)} ${num(H-y2)} l S`);
  const text=(value,x,top,size=11,c=C.paper,max=999,center=false)=>{const {s,fs}=fit(value,max,size);if(!s)return;const est=s.length*fs*.52,tx=center?x+(max-est)/2:x;ops.push(`${rgb(c)} BT /F1 ${num(fs)} Tf 1 0 0 1 ${num(tx)} ${num(H-top-fs)} Tm (${escPdf(s)}) Tj ET`)};
  return{ops,rect,line,text,py};
}
function buildPdf(W,H,ops,cup,cupBox){
  const objects=[];const add=s=>{objects.push(s);return objects.length};const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');let imageId=0;
  if(cup?.bytes?.length){let hex='';for(const b of cup.bytes)hex+=b.toString(16).padStart(2,'0').toUpperCase();const stream=hex+'>';imageId=add(`<< /Type /XObject /Subtype /Image /Width ${cup.width} /Height ${cup.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${stream.length} >>\nstream\n${stream}\nendstream`);if(cupBox)ops.push(`q ${num(cupBox.w)} 0 0 ${num(cupBox.h)} ${num(cupBox.x)} ${num(H-cupBox.y-cupBox.h)} cm /Cup Do Q`)}
  const content=ops.join('\n'),contentId=add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),pageId=add('PENDING'),pagesId=objects.length+1,catalogId=objects.length+2,xobj=imageId?` /XObject << /Cup ${imageId} 0 R >>`:'';objects[pageId-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(W)} ${num(H)}] /Resources << /Font << /F1 ${font} 0 R >>${xobj} >> /Contents ${contentId} 0 R >>`;add(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf='%PDF-1.4\n%GMAC392\n',offsets=[0];objects.forEach((obj,i)=>{offsets[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'})
}
async function renderPdf(bracket){
  const left=columnData(bracket,'left'),right=columnData(bracket,'right');if(!left.length||left.length!==right.length)throw new Error('Llave incompleta para exportar.');
  const R=left.length,roundW=188,finalW=360,gap=28,padX=22,padTop=18,padBottom=24,first=Math.max(left[0].matches.length,right[0].matches.length),stageH=Math.max(520,first*94+120),W=padX*2+2*R*roundW+2*R*gap+finalW,H=padTop+stageH+padBottom,centerX=padX+R*(roundW+gap),areaTop=padTop+52,areaBottom=padTop+stageH-8,areaH=areaBottom-areaTop,matchH=84;
  const p=pdfRenderer(W,H);p.rect(0,0,W,H,C.bg,C.finalBorder,1,24);
  const pos={left:{},right:{}};
  const drawPlayer=(row,x,y,w,final=false)=>{const safe=row||player(null),pad=4,rowH=38,scoreW=34,penW=safe.penalty?34:0,g=5,nameW=w-pad*2-scoreW-penW-(safe.penalty?g*2:g),fillName=safe.empty?C.empty:(final?C.white:C.paper);p.rect(x+pad,y+4,nameW,rowH-8,fillName,null,1,6);p.text(safe.name,x+pad+8,y+12,11,safe.empty?C.muted:C.ink,nameW-14);const sx=x+pad+nameW+g;p.rect(sx,y+4,scoreW,rowH-8,final?C.white:C.paper,null,1,6);p.text(safe.score||'-',sx,y+11,12,C.ink,scoreW,true);if(safe.penalty){const px=sx+scoreW+g;p.rect(px,y+4,penW,rowH-8,C.pen,C.penBorder,1,6);p.text(safe.penalty,px,y+11,12,C.white,penW,true)}};
  const drawMatch=(m,x,cy,w,final=false)=>{const safe=m||{rows:[player(null),player(null)]},top=cy-matchH/2;p.rect(x,top,w,matchH,final?C.empty:C.match,final?C.finalBorder:C.border,1,10);drawPlayer(safe.rows?.[0],x,top,w,final);drawPlayer(safe.rows?.[1],x,top+42,w,final);return{x,cy,w}};
  const drawColumn=(col,side,idx)=>{const x=side==='left'?padX+idx*(roundW+gap):centerX+finalW+gap+(R-1-idx)*(roundW+gap);p.rect(x,padTop,roundW,stageH,C.round,null,1,16);p.text(col.title,x,padTop+7,19,C.paper,roundW,true);const arr=col.matches.map((m,i)=>drawMatch(m,x,areaTop+(i+.5)*areaH/col.matches.length,roundW,false));pos[side][idx]=arr};
  left.forEach((c,i)=>drawColumn(c,'left',i));right.forEach((c,i)=>drawColumn(c,'right',i));
  const orth=(a,b,side)=>{const x1=side==='left'?a.x+a.w:a.x,x2=side==='left'?b.x:b.x+b.w,mid=(x1+x2)/2;p.line(x1,a.cy,mid,a.cy);p.line(mid,a.cy,mid,b.cy);p.line(mid,b.cy,x2,b.cy)};
  for(const side of['left','right'])for(let r=0;r<R-1;r++){(pos[side][r]||[]).forEach((a,i)=>{const b=(pos[side][r+1]||[])[Math.floor(i/2)];if(b)orth(a,b,side)})}
  const finalEl=$('.gm-v36-final-match [data-v36-match]',bracket)||$('[data-v36-final] [data-v36-match]',bracket);if(!finalEl)throw new Error('Final no disponible.');const final=match(finalEl),finalCardH=132,finalCardY=padTop+stageH/2-finalCardH/2,finalMatchW=212,finalMatchX=centerX+finalW-finalMatchW-18,finalCy=padTop+stageH/2;
  p.rect(centerX,finalCardY,finalW,finalCardH,C.paper,C.finalBorder,1,18);p.text('FINAL',centerX+20,finalCardY+34,25,C.ink,105);p.text(clean($('.gm-v36-final-meta span',bracket)?.textContent)||'EDICION',centerX+20,finalCardY+68,13,[.33,.35,.37],112);drawMatch(final,finalMatchX,finalCy,finalMatchW,true);
  const ls=(pos.left[R-1]||[])[0],rs=(pos.right[R-1]||[])[0];if(ls)p.line(ls.x+ls.w,ls.cy,centerX,finalCy);if(rs)p.line(rs.x,rs.cy,centerX+finalW,finalCy);
  const cupImg=$('.gm-v36-trophy img',bracket),cup=await imageToJpeg(cupImg);let cupBox=null;if(cup){const maxW=166,maxH=174,scale=Math.min(maxW/cup.width,maxH/cup.height),cw=cup.width*scale,ch=cup.height*scale,cx=centerX+(finalW-cw)/2,cy=Math.max(6,finalCardY-ch-40);cupBox={x:cx,y:cy,w:cw,h:ch}}else p.text('COPA',centerX,finalCardY-38,12,C.muted,finalW,true);
  const third=$('.gm-v36-third-place [data-v36-match]',bracket);if(third){const m=match(third),w=260,cy=padTop+stageH-64,x=centerX+(finalW-w)/2;p.text('TERCER PUESTO',x,cy-60,9,C.muted,w,true);drawMatch(m,x,cy,w,false)}
  return buildPdf(W,H,p.ops,cup,cupBox)
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
document.addEventListener('click',async e=>{const btn=e.target.closest('[data-share-capture="fixture"]');if(!btn)return;const panel=btn.closest('.gm-fixture-panel');if(!isKnockout(panel))return;e.preventDefault();e.stopImmediatePropagation();const old=btn.textContent;btn.disabled=true;btn.textContent='GENERANDO PDF…';try{const bracket=await waitForBracket(panel);if(!bracket)throw new Error('No se encontró el fixture.');const blob=await renderPdf(bracket);if(!blob.size)throw new Error('PDF vacío.');const title=clean($('[data-selected-tournament]',panel.closest('.gm-modal'))?.textContent||$('[data-detail-title]')?.textContent||'torneo');download(blob,`${safeName(title)}-fixture-gmac.pdf`);toast('Fixture PDF descargado correctamente.')}catch(err){console.error('[GMAC PDF V39.2]',err);toast(`No se pudo generar el PDF: ${clean(err?.message||'error inesperado')}`)}finally{btn.disabled=false;btn.textContent=old||'DESCARGAR FIXTURE PDF ↓';syncButtons()}},true);
const observer=new MutationObserver(syncButtons);observer.observe(document.body,{childList:true,subtree:true});syncButtons();
})();
