(()=>{
  'use strict';
  const $=(q,el=document)=>el.querySelector(q);
  const $$=(q,el=document)=>[...el.querySelectorAll(q)];
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const safeName=v=>clean(v||'gmac').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'gmac';
  const finalText=()=>clean($('[data-detail-status]')?.textContent).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().includes('FINALIZADO');

  function toast(message){
    let el=$('.gm-share-toast');
    if(!el){el=document.createElement('div');el.className='gm-share-toast';document.body.appendChild(el)}
    el.textContent=message;el.classList.add('is-visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('is-visible'),3200);
  }

  function syncFixtureButtons(){
    $$('[data-share-capture="fixture"]').forEach(btn=>{
      if(btn.dataset.pdfReady==='1')return;
      btn.dataset.pdfReady='1';btn.textContent='DESCARGAR FIXTURE PDF ↓';btn.setAttribute('aria-label','Descargar fixture completo en PDF');
    });
  }

  function syncFinalizedButtons(){
    if(!document.body.classList.contains('gm-detail-page')||!finalText())return;
    $$('[data-detail-register]').forEach(btn=>{
      btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');
      btn.innerHTML='VER FIXTURE COMPLETO <span>➜</span>';
      btn.setAttribute('aria-label','Ver fixture completo con todos los resultados');
    });
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
    },450);
  }

  function openFinalizedFixture(btn){
    const id=btn.dataset.register||new URLSearchParams(location.search).get('id');
    const original=window.GM_OPEN_TOURNAMENT;if(!id||typeof original!=='function'){toast('No se pudo abrir el fixture histórico.');return}
    const nativeFind=Array.prototype.find;let touched=null,oldStatus;
    Array.prototype.find=function(predicate,thisArg){
      const found=nativeFind.call(this,predicate,thisArg);
      if(found&&String(found.id)===String(id)){
        touched=found;oldStatus=found.status;found.status='Vigente';
      }
      return found;
    };
    try{
      const pending=original(id);makeReadonlyModal();
      Promise.resolve(pending).then(makeReadonlyModal).catch(err=>{console.error('[GMAC historial]',err);toast('No se pudo cargar el fixture histórico.')});
    }finally{
      Array.prototype.find=nativeFind;
      if(touched)touched.status=oldStatus;
    }
  }

  function latin(v){
    return clean(v).replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/→/g,'>').replace(/←/g,'<').replace(/↗/g,'').replace(/↓/g,'').replace(/[^\x20-\xFF]/g,'?');
  }
  const escPdf=v=>latin(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const n=v=>Number(v).toFixed(2).replace(/\.00$/,'');

  function createPdf(panel){
    const PW=1190.55,PH=841.89,M=42,CONTENT_W=PW-M*2;
    const pages=[];let ops=[],cursor=116,pageNo=0;
    const rgb=(hex)=>{const s=hex.replace('#','');return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)};
    const col={bg:rgb('#18191a'),panel:rgb('#272829'),paper:rgb('#f4f3ee'),ink:rgb('#111214'),muted:rgb('#a7a8aa'),line:rgb('#55575a'),blue:rgb('#315fd6')};
    const fill=c=>`${n(c[0])} ${n(c[1])} ${n(c[2])} rg`;
    const stroke=c=>`${n(c[0])} ${n(c[1])} ${n(c[2])} RG`;
    const yPdf=(top,h=0)=>PH-top-h;
    const rect=(x,top,w,h,c,sc=null)=>{ops.push(`${fill(c)} ${n(x)} ${n(yPdf(top,h))} ${n(w)} ${n(h)} re f`);if(sc)ops.push(`${stroke(sc)} 0.8 w ${n(x)} ${n(yPdf(top,h))} ${n(w)} ${n(h)} re S`)};
    const line=(x1,t1,x2,t2,c=col.line,w=0.8)=>ops.push(`${stroke(c)} ${n(w)} w ${n(x1)} ${n(PH-t1)} m ${n(x2)} ${n(PH-t2)} l S`);
    const text=(v,x,top,size=11,bold=false,c=col.paper)=>{const s=escPdf(v);if(!s)return;ops.push(`${fill(c)} BT /${bold?'F2':'F1'} ${n(size)} Tf 1 0 0 1 ${n(x)} ${n(PH-top-size)} Tm (${s}) Tj ET`)};
    const fit=(v,max,size=11)=>{let s=latin(v),limit=Math.max(5,Math.floor(max/(size*.54)));return s.length>limit?s.slice(0,Math.max(1,limit-1))+'…':s};

    function header(){
      rect(0,0,PW,PH,col.bg);text('GMAC',M,28,16,true,col.paper);text('FIXTURE OFICIAL DEL TORNEO',M,53,27,true,col.paper);
      const title=clean($('[data-selected-tournament]',panel.closest('.gm-modal'))?.textContent||$('[data-detail-title]')?.textContent||'Torneo GMAC');
      const caption=clean($('[data-fixture-caption]',panel)?.textContent||'Fixture y resultados oficiales');
      text(fit(title,CONTENT_W-280,14),M,87,14,true,col.paper);text(fit(caption,CONTENT_W-280,10),M,105,10,false,col.muted);
      text(`PÁGINA ${pageNo+1}`,PW-M-92,34,10,true,col.muted);line(M,126,PW-M,126,col.line,1);cursor=146;
    }
    function newPage(){if(ops.length)pages.push(ops.join('\n'));ops=[];pageNo++;header()}
    function ensure(h){if(cursor+h>PH-48)newPage()}
    function section(title,sub=''){
      ensure(48);text(title,M,cursor,16,true,col.paper);if(sub)text(fit(sub,CONTENT_W-280,9),M+270,cursor+3,9,false,col.muted);line(M,cursor+27,PW-M,cursor+27,col.line,.7);cursor+=39;
    }
    function matchCard(x,top,w,p1,p2,score='',meta=''){
      rect(x,top,w,48,col.panel,col.line);text(fit(p1,w*.36,10),x+12,top+10,10,true,col.paper);text(fit(p2,w*.36,10),x+w-12-Math.min(w*.36,latin(p2).length*5.4),top+28,10,true,col.paper);
      if(score){rect(x+w/2-38,top+9,76,30,col.paper);text(score,x+w/2-22,top+16,13,true,col.ink)}else text('VS',x+w/2-8,top+18,9,true,col.muted);
      if(meta)text(fit(meta,w-24,7),x+12,top+37,7,false,col.muted);
    }
    function table(title,tableEl,cols=[0,1,2,9]){
      if(!tableEl)return;const heads=$$('thead th',tableEl).map(x=>clean(x.textContent));const rows=$$('tbody tr',tableEl);
      section(title,`${rows.length} registros`);const rowH=24,headH=25;ensure(headH+Math.min(rows.length,16)*rowH+12);
      const widths=[70,CONTENT_W-300,90,120],labels=cols.map((ci,i)=>heads[ci]||['POS','JUGADOR','PJ','PTS'][i]);
      let x=M;rect(M,cursor,CONTENT_W,headH,col.panel,col.line);labels.forEach((h,i)=>{text(fit(h,widths[i]-10,9),x+7,cursor+7,9,true,col.muted);x+=widths[i]});cursor+=headH;
      rows.forEach((tr,ri)=>{
        ensure(rowH+4);const cells=$$('td',tr).map(td=>clean(td.textContent));if(ri%2===0)rect(M,cursor,CONTENT_W,rowH,[.13,.135,.14]);line(M,cursor+rowH,PW-M,cursor+rowH,col.line,.35);x=M;
        cols.forEach((ci,i)=>{text(fit(cells[ci]||'',widths[i]-10,i===1?9:8),x+7,cursor+6,i===1?9:8,i===1,col.paper);x+=widths[i]});cursor+=rowH;
      });cursor+=12;
    }

    header();
    const groups=$$('.gm-group-card',panel);
    groups.forEach(g=>{
      const title=clean($('h4',g)?.textContent||'GRUPO');const sub=clean($('.gm-group-card__head span',g)?.textContent||'');
      const t=$('.gm-standings',g);if(t)table(title,t,[0,1,2,9]);
      const matches=$$('.gm-group-match',g);if(matches.length){section(`PARTIDOS ${title}`,sub);const gap=10,cw=(CONTENT_W-gap)/2;matches.forEach((m,i)=>{if(i%2===0)ensure(58);const teams=$$('div:first-child span',m).map(x=>clean(x.textContent)),score=clean($(':scope > strong',m)?.textContent||'');const colIdx=i%2;matchCard(M+colIdx*(cw+gap),cursor,cw,teams[0]||'Por definir',teams[1]||'Por definir',score);if(colIdx===1||i===matches.length-1)cursor+=58});}
    });

    const best=$('.gm-best-thirds .gm-standings',panel);if(best)table('MEJORES TERCEROS',best,[0,2,3,10]);
    const standaloneTables=$$('.gm-standings',panel).filter(t=>!t.closest('.gm-group-card')&&!t.closest('.gm-best-thirds'));
    standaloneTables.forEach((t,i)=>table(i===0?'TABLA DE POSICIONES':'TABLA DE CLASIFICACIÓN',t,[0,1,2,9]));

    const leagueRounds=$$('.gm-league-round',panel);
    leagueRounds.forEach(round=>{
      const title=clean($('summary b',round)?.textContent||'JORNADA');const matches=$$('.gm-league-match',round);section(title,`${matches.length} partidos`);const gap=10,cw=(CONTENT_W-gap)/2;
      matches.forEach((m,i)=>{if(i%2===0)ensure(58);const teams=$$('.gm-league-match__teams b',m).map(x=>clean(x.textContent));const score=clean($('.gm-league-match__teams span',m)?.textContent||'VS');const colIdx=i%2;matchCard(M+colIdx*(cw+gap),cursor,cw,teams[0]||'Por definir',teams[1]||'Por definir',score==='VS'?'':score);if(colIdx===1||i===matches.length-1)cursor+=58});
    });

    const rounds=$$('.gm-fixture-round',panel);
    rounds.forEach(round=>{
      const title=clean($('.gm-fixture-round__title',round)?.textContent||'RONDA');const matches=$$('.gm-fixture-match',round);section(title,`${matches.length} partidos`);const gap=10,cw=(CONTENT_W-gap)/2;
      matches.forEach((m,i)=>{if(i%2===0)ensure(58);const players=$$('.gm-fixture-player',m);const p1=clean($(':scope > span',players[0])?.textContent||'Por definir'),p2=clean($(':scope > span',players[1])?.textContent||'Por definir');const s1=clean($('.gm-inline-score',players[0])?.textContent||''),s2=clean($('.gm-inline-score',players[1])?.textContent||'');const pen=clean($('.gm-penalty-readonly',m)?.textContent||'');const score=s1!==''&&s2!==''?`${s1} - ${s2}`:'';const colIdx=i%2;matchCard(M+colIdx*(cw+gap),cursor,cw,p1,p2,score,pen);if(colIdx===1||i===matches.length-1)cursor+=58});
    });

    const champ=clean($('.gm-champion strong',panel)?.textContent||'');if(champ){section('CAMPEÓN OFICIAL');ensure(60);rect(M,cursor,CONTENT_W,52,col.paper);text(champ,M+18,cursor+13,20,true,col.ink);cursor+=66}
    text('GMAC · DOCUMENTO VECTORIAL · FIXTURE Y RESULTADOS OFICIALES',M,PH-35,9,true,col.muted);
    pages.push(ops.join('\n'));

    const objects=[];const add=s=>{objects.push(s);return objects.length};
    const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds=[],contentIds=[];
    pages.forEach(content=>{contentIds.push(add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));pageIds.push(add('PENDING_PAGE'))});
    const pagesId=objects.length+1,catalogId=objects.length+2;
    pageIds.forEach((pid,i)=>{objects[pid-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`});
    add(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let pdf='%PDF-1.4\n%âãÏÓ\n',offsets=[0];
    objects.forEach((obj,i)=>{offsets[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});
    const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;return new Blob([bytes],{type:'application/pdf'});
  }

  function downloadPdf(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000)}

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-detail-register]');if(!btn||!finalText())return;
    e.preventDefault();e.stopImmediatePropagation();openFinalizedFixture(btn);
  },true);

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-share-capture="fixture"]');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    const panel=btn.closest('.gm-fixture-panel');if(!panel){toast('No se encontró el fixture para exportar.');return}
    const old=btn.textContent;btn.disabled=true;btn.textContent='GENERANDO PDF…';
    try{
      const blob=createPdf(panel);if(!blob.size)throw new Error('PDF vacío');
      const tournament=clean($('[data-selected-tournament]',panel.closest('.gm-modal'))?.textContent||$('[data-detail-title]')?.textContent||'torneo');
      downloadPdf(blob,`${safeName(tournament)}-fixture-gmac.pdf`);toast('Fixture PDF descargado en calidad vectorial.');
    }catch(err){console.error('[GMAC PDF]',err);toast('No se pudo generar el PDF del fixture.');}
    finally{btn.disabled=false;btn.textContent=old||'DESCARGAR FIXTURE PDF ↓'}
  },true);

  syncFixtureButtons();syncFinalizedButtons();
  setInterval(()=>{syncFixtureButtons();syncFinalizedButtons()},1800);
})();