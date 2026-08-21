(()=>{
  const qs=new URLSearchParams(location.search);
  const game=qs.get('game'); const id=qs.get('id');
  const validGames=['fc-mobile','efootball'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||''),location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}};
  const statusKey=t=>{const s=String(t?.status||'Próximamente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(s.includes('vigente'))return'vigente';if(s.includes('final'))return'finalizado';return'proximamente'};
  const statusLabel=t=>statusKey(t)==='vigente'?'VIGENTE':statusKey(t)==='finalizado'?'FINALIZADO':'PRÓXIMAMENTE';
  const setAll=(sel,val)=>document.querySelectorAll(sel).forEach(el=>el.textContent=val);
  const set=(sel,val)=>{const el=document.querySelector(sel);if(el)el.textContent=val};
  const youtubeId=url=>{try{const u=new URL(url);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.hostname.includes('youtube.com')){if(u.pathname.startsWith('/shorts/'))return u.pathname.split('/')[2]||'';if(u.pathname.startsWith('/embed/'))return u.pathname.split('/')[2]||'';return u.searchParams.get('v')||''}}catch{}return''};
  function renderVideos(t){const host=document.querySelector('[data-detail-videos]');if(!host)return;const rows=Array.isArray(t.highlights)?t.highlights:[];const valid=rows.map((x,i)=>typeof x==='string'?{title:`Jugada ${i+1}`,url:x}:x).map((x,i)=>({...x,id:youtubeId(x?.url||'')})).filter(x=>x.id);if(!valid.length){host.innerHTML='<div class="gm-media-empty"><b>VIDEOS PENDIENTES</b><span>Cuando agregues enlaces de YouTube a este campeonato, aparecerán aquí listos para reproducirse.</span></div>';return}host.innerHTML=valid.map((v,i)=>`<article class="gm-video-card"><div class="gm-video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}" title="${esc(v.title||`Mejor jugada ${i+1}`)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div><span>MEJOR JUGADA ${String(i+1).padStart(2,'0')}</span><b>${esc(v.title||'Video destacado')}</b></div></article>`).join('')}
  function trophyMarkup(t,small=false){const raw=t.trophyCover||t.trophy||'';const src=safeUrl(raw)||String(raw||'');if(src && !/^javascript:/i.test(src))return `<img src="${esc(src)}" alt="Copa de ${esc(t.title)}">`;return small?'<span>🏆</span>':'<div class="gm-trophy-placeholder">🏆</div><span>COPA DEL TORNEO</span><small>La imagen se añadirá cuando GMAC la asigne.</small>'}
  function renderEditions(t){const host=document.querySelector('[data-detail-editions]');if(!host)return;const rows=(list||[]).filter(x=>x&&x.id!==t.id&&String(x.competitionId||'')===String(t.competitionId||'')&&x.visible!==false).sort((a,b)=>(Number(b.edition)||0)-(Number(a.edition)||0));if(!rows.length){host.innerHTML='<div class="gm-editions-empty"><b>PRIMERA EDICIÓN REGISTRADA</b><span>Cuando crees otra edición de esta competición en Google Sheets aparecerá aquí automáticamente.</span></div>';return}host.innerHTML=rows.map(x=>`<a class="gm-edition-card" href="torneo.html?game=${encodeURIComponent(game)}&id=${encodeURIComponent(x.id)}"><span>EDICIÓN ${esc(x.edition||'—')}</span><b>${esc(x.title)}</b><small>${esc(statusLabel(x))} · ${esc(x.date||'Por definir')}</small><i>VER EDICIÓN ➜</i></a>`).join('')}
  function render(t){
    if(!t)return showError('No encontramos este campeonato. Revisa el enlace o vuelve al listado.');
    document.body.dataset.game=game; document.title=`${t.title} | GMAC`;
    const handle=game==='fc-mobile'?'@gianmattusfc':'@gianmattusef · @chocochonef'; const gameName=game==='fc-mobile'?'FC Mobile':'eFootball';
    setAll('[data-detail-game]',gameName); setAll('[data-detail-handle]',handle); set('[data-detail-edition]',Number(t.edition)>0?`EDICIÓN ${t.edition}`:'EDICIÓN'); set('[data-detail-title]',t.title); set('[data-detail-desc]',t.detailIntro||t.desc||'Campeonato GMAC.'); set('[data-detail-slots]',t.slots||'—'); set('[data-detail-format]',t.format||'—'); set('[data-detail-format-long]',t.format||'—'); set('[data-detail-date]',t.date||'Por definir'); set('[data-detail-prize]',t.prize||'Por anunciar'); set('[data-detail-entry]',t.entry||'Por anunciar'); setAll('[data-detail-status]',statusLabel(t)); set('[data-detail-status-summary]',statusLabel(t)); set('[data-detail-status-fact]',statusLabel(t)); set('[data-detail-status-winner]',statusLabel(t)); set('[data-detail-registration]',`INSCRIPCIONES ${String(t.registrationStatus||'Abiertas').toUpperCase()}`); set('[data-detail-registration-fact]',String(t.registrationStatus||'Abiertas').toUpperCase()); set('[data-detail-id]',t.id||'—');
    const mode=t.mode==='league_phase'?'FASE LIGA + PLAY-OFFS':t.mode==='league_playoffs'?'LIGA + PLAY-OFFS':t.mode==='league'?'LIGA':t.mode==='groups'?'FASE DE GRUPOS + ELIMINATORIAS':t.mode==='copa_rey'?'ELIMINACIÓN DIRECTA · COPA':'ELIMINACIÓN DIRECTA';set('[data-detail-mode]',mode);set('[data-detail-competition-title]',t.mode==='league_phase'?'FASE LIGA Y ELIMINATORIAS':t.mode==='league_playoffs'?'TABLA, CALENDARIO Y PLAY-OFFS':t.mode==='league'?'TABLA Y CALENDARIO':t.mode==='groups'?'GRUPOS Y ELIMINATORIAS':'FIXTURE Y RESULTADOS');
    document.querySelectorAll('[data-detail-status],[data-detail-status-winner]').forEach(el=>{el.classList.remove('gm-status--vigente','gm-status--proximamente','gm-status--finalizado');el.classList.add(`gm-status--${statusKey(t)}`)});
    document.querySelectorAll('[data-nav-game]').forEach(a=>a.classList.toggle('is-active',a.dataset.navGame===game));
    const back=document.querySelector('[data-detail-back]');if(back)back.href=game==='fc-mobile'?'fc-mobile.html':'efootball.html';const rules=document.querySelector('[data-detail-rules]');if(rules)rules.href=(game==='fc-mobile'?'fc-mobile.html':'efootball.html')+'#normas';
    document.querySelectorAll('[data-detail-register]').forEach(btn=>{btn.dataset.register=t.id});
    const finalized=statusKey(t)==='finalizado';
    const trophy=document.querySelector('[data-detail-trophy]');if(trophy)trophy.innerHTML=trophyMarkup(t,false);
    const winner=String(t.winner||'').trim(); set('[data-detail-winner]',winner||'POR DEFINIR'); set('[data-detail-winner-copy]',winner?`${winner} es el campeón oficial de esta edición.`:'El campeón se mostrará cuando finalice la competición.');
    const coverSrc=String(t.championCover||'').trim();
    const winnerCup=document.querySelector('[data-detail-winner-cup]');
    if(winnerCup){
      const showWinnerPhoto=finalized&&coverSrc;
      winnerCup.innerHTML=showWinnerPhoto?`<img src="${esc(coverSrc)}" alt="Foto del campeón ${esc(winner||t.title)}" style="width:100%;height:100%;min-height:280px;object-fit:cover;display:block;border-radius:18px;filter:none">`:trophyMarkup(t,true);
      winnerCup.style.overflow=showWinnerPhoto?'hidden':'';
      winnerCup.style.padding=showWinnerPhoto?'0':'';
    }
    const cover=document.querySelector('[data-detail-champion-cover]');if(cover){cover.hidden=true;cover.innerHTML=''}
    document.querySelectorAll('[data-detail-register]').forEach(btn=>{if(finalized){btn.disabled=true;btn.setAttribute('aria-disabled','true');btn.textContent='CAMPEONATO FINALIZADO'}else{btn.disabled=false;btn.removeAttribute('aria-disabled')}}); const sideCopy=document.querySelector('[data-detail-side-copy]');if(sideCopy&&finalized)sideCopy.textContent='consulta el historial completo de esta edición.';
    const ig=document.querySelector('[data-detail-instagram]');const igUrl=safeUrl(t.instagramWinner);if(ig){if(igUrl){ig.href=igUrl;ig.target='_blank';ig.rel='noopener noreferrer';ig.classList.remove('is-disabled');ig.removeAttribute('aria-disabled')}else{ig.href='#';ig.classList.add('is-disabled');ig.setAttribute('aria-disabled','true')}}
    renderVideos(t);renderEditions(t);
  }
  function showError(msg){document.body.dataset.game=validGames.includes(game)?game:'fc-mobile';set('[data-detail-title]','TORNEO NO ENCONTRADO');set('[data-detail-desc]',msg);document.querySelectorAll('[data-detail-register]').forEach(b=>{b.disabled=true;b.setAttribute('aria-disabled','true')});}
  if(!validGames.includes(game)||!id){showError('Falta el juego o el identificador del campeonato.');return}
  document.body.dataset.game=game;
  let list=(window.GM_TOURNAMENTS&&window.GM_TOURNAMENTS[game])||[];let tournament=list.find(t=>String(t.id)===id);render(tournament);
  const refresh=()=>fetch(`/api/tournaments?game=${encodeURIComponent(game)}`,{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():null).then(data=>{const liveList=Array.isArray(data?.tournaments)?data.tournaments:[];const live=liveList.find(t=>String(t.id)===id);if(live){list=liveList;tournament=live;render(live)}}).catch(()=>{});refresh();setInterval(refresh,15000);
})();
