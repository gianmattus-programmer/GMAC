(()=>{
'use strict';
const $=(q,el=document)=>el.querySelector(q);
const $$=(q,el=document)=>[...el.querySelectorAll(q)];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const safeName=v=>clean(v||'gmac').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'gmac';
const finalText=()=>upper($('[data-detail-status]')?.textContent).includes('FINALIZADO');

function toast(message){
  let el=$('.gm-share-toast');
  if(!el){el=document.createElement('div');el.className='gm-share-toast';document.body.appendChild(el)}
  el.textContent=message;el.classList.add('is-visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('is-visible'),3200);
}
function syncFixtureButtons(){
  $$('[data-share-capture="fixture"]').forEach(btn=>{btn.dataset.pdfReady='37';btn.textContent='DESCARGAR FIXTURE PDF ↓';btn.setAttribute('aria-label','Descargar fixture completo en PDF vectorial')});
}
function syncFinalizedButtons(){
  if(!document.body.classList.contains('gm-detail-page')||!finalText())return;
  $$('[data-detail-register]').forEach(btn=>{btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');btn.innerHTML='VER FIXTURE COMPLETO <span>➜</span>';btn.setAttribute('aria-label','Ver fixture completo con todos los resultados')});
}
function makeReadonlyModal(){
  const modal=$('.gm-modal');if(!modal)return;
  modal.classList.add('gm-modal--readonly');
  const tag=$('.gm-modal__head .gm-tag',modal);if(tag)tag.textContent='HISTORIAL DEL TORNEO';
  const note=$('.gm-note',modal);if(note)note.hidden=true;
  const code=$('#access-code',modal);if(code?.closest('.gm-field'))code.closest('.gm-field').hidden=true;
  const feedback=$('[data-feedback]',modal);if(feedback)feedback.hidden=true;
  const reg=$('.gm-registration',modal);if(reg)reg.hidden=true;
  setTimeout(()=>{
    const msg=$('[data-fixture-message]',modal);if(msg)msg.textContent='Edición finalizada · fixture histórico con todos los participantes y resultados oficiales.';
    if(document.activeElement===code)code.blur();
    window.GMAC_ENHANCE_BRACKETS?.();
  },450);
}
function openFinalizedFixture(btn){
  const id=btn.dataset.register||new URLSearchParams(location.search).get('id');
  const original=window.GM_OPEN_TOURNAMENT;
  if(!id||typeof original!=='function'){toast('No se pudo abrir el fixture histórico.');return}
  const nativeFind=Array.prototype.find;let touched=null,oldStatus;
  Array.prototype.find=function(predicate,thisArg){
    const found=nativeFind.call(this,predicate,thisArg);
    if(found&&String(found.id)===String(id)){touched=found;oldStatus=found.status;found.status='Vigente'}
    return found;
  };
  try{
    const pending=original(id);makeReadonlyModal();
    Promise.resolve(pending).then(()=>{makeReadonlyModal();window.GMAC_ENHANCE_BRACKETS?.()}).catch(err=>{console.error('[GMAC historial]',err);toast('No se pudo cargar el fixture histórico.')});
  }finally{
    Array.prototype.find=nativeFind;if(touched)touched.status=oldStatus;
  }
}

function latin(v){return clean(v).replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/→/g,'>').replace(/←/g,'<').replace(/↗/g,'').replace(/↓/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\xFF]/g,'?')}
const escPdf=v=>latin(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const num=v=>Number(v).toFixed(2).replace(/\.00$/,'');
function ordinalLabel(value){
  const x=Number(value)||0;if(!x)return'EDICION';
  const suffix={1:'ERA',2:'DA',3:'ERA',4:'TA',5:'TA',6:'TA',7:'MA',8:'VA',9:'NA',10:'MA'}[x]||'TA';
  return`${x}${suffix} EDICION`;
}
function bracketEdition(bracket){
  const direct=Number(bracket?.dataset?.edition)||0;if(direct)return direct;
  const detail=clean($('[data-detail-edition]')?.textContent);let m=detail.match(/(\d+)/);if(m)return Number(m[1]);
  const selected=clean($('[data-selected-tournament]')?.textContent);m=selected.match(/EDICI[ÓO]N\s*(\d+)/i);return m?Number(m[1]):0;
}
function matchRows(match){
  return $$('.gm-v36-player',match).map(row=>({
    name:clean($('.gm-v36-player__name',row)?.textContent)||'Por definir',
    score:clean($('.gm-v36-score',row)?.textContent).replace('—',''),
    penalty:clean($('.gm-v36-penalty',row)?.textContent),
  }));
}
async function waitBracketMeta(bracket){
  if(!bracket||bracket.dataset.metaReady==='1')return;
  await Promise.race([
    new Promise(resolve=>bracket.addEventListener('gmac:bracket-meta',resolve,{once:true})),
    new Promise(resolve=>setTimeout(resolve,1100)),
  ]);
}
async function trophyJpeg(bracket){
  const src=$('.gm-v36-trophy img',bracket)?.src;if(!src)return null;
  try{
    const r=await fetch(src,{cache:'force-cache'});if(!r.ok)return null;
    const blob=await r.blob();const bmp=await createImageBitmap(blob);
    const size=320,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f4f3ee';ctx.fillRect(0,0,size,size);
    const scale=Math.min((size-20)/bmp.width,(size-20)/bmp.height),w=bmp.width*scale,h=bmp.height*scale;
    ctx.drawImage(bmp,(size-w)/2,(size-h)/2,w,h);bmp.close?.();
    const jpg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!jpg)return null;
    const bytes=new Uint8Array(await jpg.arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return{binary,width:size,height:size};
  }catch(_){return null}
}

async function createPdf(panel){
  window.GMAC_ENHANCE_BRACKETS?.();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const bracket=$('[data-gmac-bracket]',panel);
  if(bracket)await waitBracketMeta(bracket);

  const firstSideCount=bracket?Math.max(0,...$$('.gm-v36-round',bracket).filter(x=>Number(x.dataset.roundIndex)===0).map(x=>$$('[data-v36-match]',x).length)):0;
  const roundCount=bracket?$$('.gm-v36-round[data-side="left"]',bracket).length:0;
  const large=firstSideCount>8||roundCount>4;
  const PW=large?1683.78:1190.55;
  const PH=large?1190.55:841.89;
  const M=large?46:34,CONTENT_W=PW-M*2;
  const pages=[];let ops=[],pageNo=0;
  const rgb=h=>{const s=h.replace('#','');return[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)};
  const col={bg:rgb('#18191a'),panel:rgb('#272829'),paper:rgb('#f4f3ee'),ink:rgb('#111214'),muted:rgb('#a7a8aa'),line:rgb('#696c71'),blue:rgb('#315fd6'),pen:rgb('#22356d')};
  const fill=c=>`${num(c[0])} ${num(c[1])} ${num(c[2])} rg`;
  const stroke=c=>`${num(c[0])} ${num(c[1])} ${num(c[2])} RG`;
  const yPdf=(top,h=0)=>PH-top-h;
  const rect=(x,top,w,h,c,sc=null)=>{ops.push(`${fill(c)} ${num(x)} ${num(yPdf(top,h))} ${num(w)} ${num(h)} re f`);if(sc)ops.push(`${stroke(sc)} .75 w ${num(x)} ${num(yPdf(top,h))} ${num(w)} ${num(h)} re S`)};
  const line=(x1,t1,x2,t2,c=col.line,w=.8)=>ops.push(`${stroke(c)} ${num(w)} w ${num(x1)} ${num(PH-t1)} m ${num(x2)} ${num(PH-t2)} l S`);
  const text=(v,x,top,size=10,bold=false,c=col.paper)=>{const s=escPdf(v);if(!s)return;ops.push(`${fill(c)} BT /${bold?'F2':'F1'} ${num(size)} Tf 1 0 0 1 ${num(x)} ${num(PH-top-size)} Tm (${s}) Tj ET`)};
  const fit=(v,max,size=10)=>{const s=latin(v),limit=Math.max(4,Math.floor(max/(size*.52)));return s.length>limit?s.slice(0,Math.max(1,limit-1))+'...':s};
  const title=clean($('[data-selected-tournament]',panel.closest('.gm-modal'))?.textContent||$('[data-detail-title]')?.textContent||'Torneo GMAC');
  function header(sub='FIXTURE Y RESULTADOS OFICIALES'){
    rect(0,0,PW,PH,col.bg);
    text('GMAC',M,large?30:24,large?18:14,true,col.paper);
    text('FIXTURE OFICIAL',M,large?56:45,large?30:24,true,col.paper);
    text(fit(title,CONTENT_W-(large?340:250),large?14:12),M,large?96:78,large?14:12,true,col.paper);
    text(sub,M,large?120:98,large?10:8,true,col.muted);
    text(`PAGINA ${pageNo+1}`,PW-M-(large?98:78),large?34:28,large?10:8,true,col.muted);
    line(M,large?142:116,PW-M,large?142:116,col.line,1);
  }

  let cup=null;
  if(bracket){cup=await trophyJpeg(bracket);header('CUADRO ELIMINATORIO · PARTIDO UNICO');renderBracket(bracket)}
  else{header();renderFallback()}
  pages.push(ops.join('\n'));

  const objects=[];const add=s=>{objects.push(s);return objects.length};
  const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let imageId=0;
  if(cup)imageId=add(`<< /Type /XObject /Subtype /Image /Width ${cup.width} /Height ${cup.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${cup.binary.length} >>\nstream\n${cup.binary}\nendstream`);
  const contentIds=[],pageIds=[];
  pages.forEach(content=>{contentIds.push(add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));pageIds.push(add('PENDING_PAGE'))});
  const pagesId=objects.length+1,catalogId=objects.length+2;
  pageIds.forEach((pid,i)=>{
    const xo=imageId?` /XObject << /Cup ${imageId} 0 R >>`:'';
    objects[pid-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >>${xo} >> /Contents ${contentIds[i]} 0 R >>`;
  });
  add(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf='%PDF-1.4\n%âãÏÓ\n',offsets=[0];
  objects.forEach((obj,i)=>{offsets[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
  return new Blob([bytes],{type:'application/pdf'});

  function renderMatch(x,top,w,h,match){
    const rows=matchRows(match);rect(x,top,w,h,col.panel,col.line);const rowH=h/2;
    rows.slice(0,2).forEach((r,idx)=>{
      if(idx)line(x,top+rowH,x+w,top+rowH,[.25,.26,.27],.45);
      const hasPen=r.penalty!=='';const scoreW=large?28:22,penW=hasPen?(large?28:22):0,gap=hasPen?(large?5:4):0;
      const pad=large?6:5,nameW=w-(pad*2+scoreW+penW+gap+2),boxTop=top+idx*rowH+(large?5:4),boxH=rowH-(large?10:8);
      rect(x+pad,boxTop,nameW,boxH,col.paper);
      text(fit(r.name,nameW-(large?12:10),large?8:7),x+pad+(large?6:5),boxTop+(large?7:5),large?8:7,true,col.ink);
      const sx=x+pad+nameW+1;rect(sx,boxTop,scoreW,boxH,col.paper);
      text(r.score||'-',sx+(large?9:7),boxTop+(large?6:5),large?10:8,true,col.ink);
      if(hasPen){const px=sx+scoreW+gap;rect(px,boxTop,penW,boxH,col.pen,col.blue);text(r.penalty,px+(large?9:7),boxTop+(large?6:5),large?10:8,true,col.paper)}
    });
  }
  function connectOrthogonal(x1,y1,x2,y2){const mid=(x1+x2)/2;line(x1,y1,mid,y1);line(mid,y1,mid,y2);line(mid,y2,x2,y2)}
  function renderBracket(br){
    const left=$$('.gm-v36-round[data-side="left"]',br).sort((a,b)=>Number(a.dataset.roundIndex)-Number(b.dataset.roundIndex));
    const right=$$('.gm-v36-round[data-side="right"]',br);const R=left.length;if(!R){renderFallback();return}
    const gap=large?14:10,finalW=large?300:245,available=(CONTENT_W-finalW-gap*(2*R));
    const roundW=Math.min(large?150:190,Math.max(large?104:86,available/(2*R)));
    const totalW=2*R*roundW+2*R*gap+finalW,origin=M+Math.max(0,(CONTENT_W-totalW)/2),centerX=origin+R*(roundW+gap);
    const titleTop=large?154:130,areaTop=large?194:162,areaBottom=PH-(large?96:84),areaH=areaBottom-areaTop,matchH=large?48:44;
    const positions={left:{},right:{}};
    left.forEach((colEl,idx)=>{
      const x=origin+idx*(roundW+gap),matches=$$('[data-v36-match]',colEl),titleTxt=clean($('.gm-v36-round__title',colEl)?.textContent);
      text(fit(titleTxt,roundW,large?12:10),x,titleTop,large?12:10,true,col.paper);
      positions.left[idx]=matches.map((m,i)=>{const cy=areaTop+(i+.5)*areaH/matches.length,top=cy-matchH/2;renderMatch(x,top,roundW,matchH,m);return{x,cy,w:roundW}});
    });
    for(let idx=0;idx<R;idx++){
      const colEl=right.find(x=>Number(x.dataset.roundIndex)===idx);if(!colEl)continue;
      const x=centerX+finalW+gap+(R-1-idx)*(roundW+gap),matches=$$('[data-v36-match]',colEl),titleTxt=clean($('.gm-v36-round__title',colEl)?.textContent);
      text(fit(titleTxt,roundW,large?12:10),x,titleTop,large?12:10,true,col.paper);
      positions.right[idx]=matches.map((m,i)=>{const cy=areaTop+(i+.5)*areaH/matches.length,top=cy-matchH/2;renderMatch(x,top,roundW,matchH,m);return{x,cy,w:roundW}});
    }
    for(const side of['left','right'])for(let r=0;r<R-1;r++){
      const from=positions[side][r]||[],to=positions[side][r+1]||[];
      from.forEach((a,i)=>{const b=to[Math.floor(i/2)];if(!b)return;const x1=side==='left'?a.x+a.w:a.x,x2=side==='left'?b.x:b.x+b.w;connectOrthogonal(x1,a.cy,x2,b.cy)});
    }
    const final=$('[data-v36-final] [data-v36-match]',br),cardH=large?218:178,finalTop=areaTop+areaH/2-cardH/2;
    rect(centerX,finalTop,finalW,cardH,col.paper,[.48,.49,.5]);
    text('FINAL',centerX+(large?16:12),finalTop+(large?18:12),large?24:18,true,col.ink);
    text(ordinalLabel(bracketEdition(br)),centerX+(large?16:12),finalTop+(large?50:36),large?12:10,true,[.32,.33,.35]);
    const trophyS=large?96:74,trophyX=centerX+finalW-trophyS-(large?16:18),trophyY=finalTop+(large?18:12);
    rect(trophyX,trophyY,trophyS,trophyS,[1,1,1],[.68,.68,.66]);
    if(cup)ops.push(`q ${num(trophyS-10)} 0 0 ${num(trophyS-10)} ${num(trophyX+5)} ${num(PH-(trophyY+5)-(trophyS-10))} cm /Cup Do Q`);
    else text('COPA PENDIENTE',trophyX+(large?10:7),trophyY+trophyS/2-4,large?8:6,true,col.muted);
    const fmX=centerX+(large?16:12),fmY=finalTop+cardH-(large?78:70),fmW=finalW-(large?32:24),fmH=large?62:58;
    renderMatch(fmX,fmY,fmW,fmH,final);
    const lf=(positions.left[R-1]||[])[0],rf=(positions.right[R-1]||[])[0];
    if(lf)connectOrthogonal(lf.x+lf.w,lf.cy,fmX,fmY+fmH*.25);
    if(rf)connectOrthogonal(rf.x,rf.cy,fmX+fmW,fmY+fmH*.75);
    const third=$('.gm-v36-third-place [data-v36-match]',br);
    if(third){const tw=finalW-(large?70:60),tx=centerX+(finalW-tw)/2,ty=finalTop+cardH+(large?20:14);text('TERCER PUESTO',tx,ty,large?8:7,true,col.muted);renderMatch(tx,ty+(large?15:12),tw,large?46:42,third)}
    text('GMAC · DOCUMENTO VECTORIAL · FIXTURE OFICIAL',M,PH-(large?34:28),large?10:8,true,col.muted);
  }
  function renderFallback(){
    let cursor=large?176:145;const rounds=$$('.gm-league-round',panel);
    if(rounds.length){
      rounds.forEach((round,ri)=>{
        const matches=$$('.gm-league-match',round),rowH=large?32:25,gap=large?7:5;
        if(cursor+42+matches.length*(rowH+gap)>PH-(large?65:45)){pages.push(ops.join('\n'));ops=[];pageNo++;header('CALENDARIO OFICIAL');cursor=large?176:145}
        text(clean($('summary b',round)?.textContent)||`JORNADA ${ri+1}`,M,cursor,large?16:13,true,col.paper);cursor+=large?30:25;
        matches.forEach(m=>{const teams=$$('.gm-league-match__teams b',m).map(x=>clean(x.textContent));const score=clean($('.gm-league-match__teams span',m)?.textContent||'VS');rect(M,cursor,CONTENT_W,rowH,col.panel,col.line);text(fit(teams[0]||'Por definir',CONTENT_W*.32,large?11:9),M+12,cursor+(large?9:7),large?11:9,true,col.paper);text(score,PW/2-(large?30:24),cursor+(large?9:7),large?11:9,true,col.paper);text(fit(teams[1]||'Por definir',CONTENT_W*.32,large?11:9),PW/2+(large?70:55),cursor+(large?9:7),large?11:9,true,col.paper);cursor+=rowH+gap});
      });return;
    }
    text('El fixture eliminatorio todavía no está disponible.',M,large?205:160,large?16:13,true,col.paper);
    text('Cuando se complete la fase correspondiente aparecerá aquí.',M,large?234:184,large?11:9,false,col.muted);
  }
}
function downloadPdf(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
}

document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-detail-register]');if(!btn||!finalText())return;
  e.preventDefault();e.stopImmediatePropagation();openFinalizedFixture(btn);
},true);
document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-share-capture="fixture"]');if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  const panel=btn.closest('.gm-fixture-panel');if(!panel){toast('No se encontró el fixture para exportar.');return}
  const old=btn.textContent;btn.disabled=true;btn.textContent='GENERANDO PDF…';
  try{
    const blob=await createPdf(panel);if(!blob.size)throw new Error('PDF vacío');
    const tournament=clean($('[data-selected-tournament]',panel.closest('.gm-modal'))?.textContent||$('[data-detail-title]')?.textContent||'torneo');
    downloadPdf(blob,`${safeName(tournament)}-fixture-gmac.pdf`);toast('Fixture PDF descargado en calidad vectorial.');
  }catch(err){console.error('[GMAC PDF V37]',err);toast('No se pudo generar el PDF del fixture.');}
  finally{btn.disabled=false;btn.textContent=old||'DESCARGAR FIXTURE PDF ↓'}
},true);

syncFixtureButtons();syncFinalizedButtons();setInterval(()=>{syncFixtureButtons();syncFinalizedButtons()},1800);
})();
