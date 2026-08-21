(()=>{
  const page=document.body.dataset.game;
  let list=(window.GM_TOURNAMENTS&&window.GM_TOURNAMENTS[page])||[];
  const grid=document.querySelector('[data-tournament-grid]');
  const modal=document.querySelector('.gm-modal');
  const completedGrid=document.querySelector('[data-completed-grid]');
  if(!grid||!modal)return;

  const feedback=document.querySelector('[data-feedback]');
  const reg=document.querySelector('.gm-registration');
  const codeInput=document.querySelector('#access-code');
  const tidInput=document.querySelector('#tournament-id');
  const selectedName=document.querySelector('[data-selected-tournament]');
  const fixtureEl=document.querySelector('[data-fixture]');
  const fixtureCaption=document.querySelector('[data-fixture-caption]');
  const fixtureSlots=document.querySelector('[data-fixture-slots]');
  const fixtureMessage=document.querySelector('[data-fixture-message]');
  const fixtureLabel=document.querySelector('[data-fixture-label]');
  const fixtureCup=document.querySelector('[data-fixture-cup]');
  let selected=null,currentFilter='all',validatedCode='',lastRegisteredNick='';
  let liveRegistrations=[],liveResults=[],livePollTimer=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const norm=v=>String(v??'').trim();
  const same=(a,b)=>norm(a).toLowerCase()===norm(b).toLowerCase();
  const modeOf=t=>t?.mode||(/liga/i.test(t?.format||'')?'league':((Number(t?.slots)>16||/grupos/i.test(t?.format||''))?'groups':'knockout'));
  const statusKey=t=>{const s=norm(t?.status||'Próximamente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(s.includes('vigente'))return'vigente';if(s.includes('final'))return'finalizado';return'proximamente'};
  const statusLabel=t=>statusKey(t)==='vigente'?'VIGENTE':statusKey(t)==='finalizado'?'FINALIZADO':'PRÓXIMAMENTE';

  function card(t){
    const mode=modeOf(t);
    const fallbackTag=(mode==='league'||mode==='league_playoffs')?'Liga':mode==='league_phase'?'Fase liga + play-off':mode==='groups'?'Fase de grupos':mode==='copa_rey'?'Copa eliminatoria':(t.type==='relampago'?'Torneo relámpago':`${t.slots} participantes`);
    const sk=statusKey(t); const detail=`torneo.html?game=${encodeURIComponent(page)}&id=${encodeURIComponent(t.id)}`;
    const cup=String(t.trophyCover||t.trophy||'').trim();
    const cupMarkup=cup?`<img class="gm-card__cup" src="${esc(cup)}" alt="Copa de ${esc(t.title)}" loading="lazy" decoding="async" fetchpriority="low">`:'';
    const titleMarkup=cup?`<div class="gm-card__title-row"><h3>${esc(t.title)}</h3>${cupMarkup}</div>`:`<h3>${esc(t.title)}</h3>`;
    const cupClass=cup?' gm-card--has-cup':'';
    const editionLabel=Number(t.edition)>0?`<span class="gm-card__edition">EDICIÓN ${esc(t.edition)}</span>`:'';
    return `<article class="gm-card${cupClass}" data-type="${esc(t.type)}" data-mode="${esc(mode)}" data-status="${sk}"><div class="gm-card__top"><span class="gm-tag">${esc(t.tag||fallbackTag)}</span><span class="gm-status gm-status--${sk}">${statusLabel(t)}</span></div>${titleMarkup}${editionLabel}<p>${esc(t.desc)}</p><div class="gm-meta"><div><small>Participantes</small><b>${esc(t.slots)}</b></div><div><small>Formato</small><b>${esc(t.format)}</b></div><div><small>Fecha</small><b>${esc(t.date||'Por definir')}</b></div><div><small>Premio</small><b>${esc(t.prize||'Por anunciar')}</b></div></div><div class="gm-card__actions"><a class="gm-sketch-btn gm-sketch-btn--dark" href="${detail}"><strong>VER TORNEO</strong><span aria-hidden="true">➜</span></a><button class="gm-link gm-register-mini" data-register="${esc(t.id)}" aria-label="Inscribirme en ${esc(t.title)}" title="Inscribirme" type="button">＋</button></div></article>`;
  }

  function completedCard(t){
    const detail=`torneo.html?game=${encodeURIComponent(page)}&id=${encodeURIComponent(t.id)}`;
    const cover=String(t.championCover||'').trim(); const winner=String(t.winner||'Campeón por confirmar').trim();
    const visual=cover?`<img src="${esc(cover)}" alt="Portada de ${esc(winner)}" loading="lazy" decoding="async" fetchpriority="low">`:`<div class="gm-completed-card__placeholder"><span>CAMPEÓN</span><strong>${esc(winner)}</strong><small>Portada pendiente</small></div>`;
    return `<a class="gm-completed-card" href="${detail}"><div class="gm-completed-card__visual">${visual}<span class="gm-status gm-status--finalizado">FINALIZADO</span></div><div class="gm-completed-card__body"><span>${esc(t.finishedAt||t.date||'Edición finalizada')}${Number(t.edition)>0?` · EDICIÓN ${esc(t.edition)}`:''}</span><h3>${esc(t.title)}</h3><p>CAMPEÓN · <b>${esc(winner)}</b></p><strong>VER CAMPEONATO <i>➜</i></strong></div></a>`;
  }

  function renderArchive(){
    if(!completedGrid)return;
    const rows=list.filter(t=>statusKey(t)==='finalizado' && t.visible!==false && (page!=='fc-mobile'||String(t.trophyCover||t.trophy||'').trim()));
    completedGrid.innerHTML=rows.length?rows.map(completedCard).join(''):'<div class="gm-archive-empty"><b>AÚN NO HAY CAMPEONATOS FINALIZADOS</b><span>Cuando cierres una edición desde Google Sheets, aparecerá automáticamente aquí con la portada de su campeón.</span></div>';
  }

  function render(filter=currentFilter){
    currentFilter=filter;
    const active=list.filter(t=>statusKey(t)!=='finalizado' && t.visible!==false && (page!=='fc-mobile'||String(t.trophyCover||t.trophy||'').trim()));
    const rows=active.filter(t=>{const mode=modeOf(t);return filter==='all'||t.type===filter||String(t.slots)===filter||mode===filter||(filter==='oficial'&&t.officialCup===true)||(filter==='league'&&['league','league_phase','league_playoffs'].includes(mode))||statusKey(t)===filter});
    grid.innerHTML=rows.length?rows.map(card).join(''):'<div class="gm-empty">No hay torneos en este filtro todavía.</div>';
    renderArchive();
  }
  render();

  document.querySelectorAll('.gm-filter').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.gm-filter').forEach(x=>x.classList.remove('is-active'));
    b.classList.add('is-active');render(b.dataset.filter);
  }));

  async function loadLiveTournaments(){
    try{
      const r=await fetch(`/api/tournaments?game=${encodeURIComponent(page)}`,{headers:{Accept:'application/json'}});
      if(!r.ok)return;const data=await r.json();
      if(Array.isArray(data.tournaments)&&data.tournaments.length){const nextList=data.tournaments.filter(t=>page!=='fc-mobile'||String(t?.trophyCover||t?.trophy||'').trim());if(JSON.stringify(nextList)!==JSON.stringify(list)){list=nextList;render(currentFilter)}}
    }catch(e){}
  }
  loadLiveTournaments();
  setInterval(loadLiveTournaments,60000);

  function registrationsFor(t){
    return liveRegistrations.filter(r=>r&&((r.game||r.juego)===page)&&((r.tournamentId||r.torneo_id)===t.id));
  }
  function resultsFor(t){
    return liveResults.filter(r=>r&&((r.game||r.juego)===page)&&((r.tournamentId||r.torneo_id)===t.id));
  }
  function playerName(r){return norm(r?.nick||r?.usuario||r?.player||r?.jugador)}
  function matchIdOf(r){return norm(r?.matchId||r?.partido_id)}
  function score1Of(r){const v=r?.score1??r?.goles_1;return v===''||v==null?null:Number(v)}
  function score2Of(r){const v=r?.score2??r?.goles_2;return v===''||v==null?null:Number(v)}
  function penalty1Of(r){const v=r?.penalty1??r?.penales_1;return v===''||v==null?null:Number(v)}
  function penalty2Of(r){const v=r?.penalty2??r?.penales_2;return v===''||v==null?null:Number(v)}
  function resultPlayer1(r){return norm(r?.player1||r?.jugador_1)}
  function resultPlayer2(r){return norm(r?.player2||r?.jugador_2)}

  function findResult(matchId,p1='',p2=''){
    const r=resultsFor(selected).find(x=>matchIdOf(x)===matchId);
    if(!r)return null;
    const rp1=resultPlayer1(r),rp2=resultPlayer2(r);
    if(p1&&p2&&rp1&&rp2&&(!same(rp1,p1)||!same(rp2,p2)))return null;
    const s1=score1Of(r),s2=score2Of(r);
    if(!Number.isFinite(s1)||!Number.isFinite(s2))return null;
    const p1s=penalty1Of(r),p2s=penalty2Of(r);
    return {...r,score1:s1,score2:s2,penalty1:Number.isFinite(p1s)?p1s:null,penalty2:Number.isFinite(p2s)?p2s:null,winner:norm(r.winner||r.ganador)};
  }

  async function loadTournamentState(){
    if(!selected)return;
    try{
      fixtureMessage.textContent='Cargando participantes y resultados desde Google Sheets…';
      const r=await fetch(`/api/tournament-state?game=${encodeURIComponent(page)}&tournamentId=${encodeURIComponent(selected.id)}`,{headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('No se pudo leer el estado.');
      const data=await r.json();
      liveRegistrations=Array.isArray(data.registrations)?data.registrations:[];
      liveResults=Array.isArray(data.matches)?data.matches:[];
    }catch(e){liveRegistrations=[];liveResults=[];fixtureMessage.textContent='No se pudo cargar el estado en vivo todavía.'}
  }

  function stopLivePolling(){if(livePollTimer){clearInterval(livePollTimer);livePollTimer=null}}
  function startLivePolling(){
    stopLivePolling();
    livePollTimer=setInterval(async()=>{
      if(!selected||!modal.classList.contains('is-open'))return;
      await loadTournamentState();renderCompetition();
    },30000);
  }

  function participantSlots(t){
    const regs=registrationsFor(t).slice(0,Number(t.slots)||0);
    return {regs,players:Array.from({length:Number(t.slots)||0},(_,i)=>playerName(regs[i])||'')};
  }

  function roundTitleByMatches(matches){
    if(matches===1)return'FINAL';if(matches===2)return'SEMIFINAL';if(matches===4)return'CUARTOS';if(matches===8)return'OCTAVOS';if(matches===16)return'DIECISEISAVOS';return`RONDA DE ${matches*2}`;
  }

  function resultControls(matchId,p1,p2,kind,result,allowDraw){
    if(!p1||!p2||!result)return'';
    const s1=result?.score1??'',s2=result?.score2??'';
    const pen1=result?.penalty1??'',pen2=result?.penalty2??'';
    const hasPens=Number.isFinite(Number(pen1))&&String(pen1)!==''&&Number.isFinite(Number(pen2))&&String(pen2)!=='';
    const pensText=hasPens?`<small class="gm-penalty-readonly">PENALES ${esc(pen1)} — ${esc(pen2)}</small>`:'';
    const inferredWinner=(s1>s2)?p1:(s2>s1?p2:(hasPens?(Number(pen1)>Number(pen2)?p1:(Number(pen2)>Number(pen1)?p2:'')):''));
    return `<div class="gm-result-readonly"><div><b>${s1} — ${s2}</b>${pensText}</div><span>${allowDraw?'Resultado oficial':`Ganador: ${esc(result.winner||inferredWinner||'Por definir')}`}</span></div>`;
  }

  function knockoutHTML(initialPlayers,{prefix='KO',initialVacancy='Cupo disponible',trophy=''}={}){
    let players=[...initialPlayers];
    const rounds=[];let champion='';let round=0;
    while(players.length>=2){
      const matches=players.length/2,next=[];let matchesHTML='';
      for(let m=0;m<matches;m++){
        const p1=players[m*2]||'',p2=players[m*2+1]||'';
        const id=`${prefix}:R${round}:M${m}`;
        const result=findResult(id,p1,p2);
        let winner='';
        if(result&&p1&&p2){
          if(result.score1>result.score2)winner=p1;
          else if(result.score2>result.score1)winner=p2;
          else if(result.penalty1!=null&&result.penalty2!=null&&result.penalty1!==result.penalty2)winner=result.penalty1>result.penalty2?p1:p2;
          else if(result.winner&&(same(result.winner,p1)||same(result.winner,p2)))winner=result.winner;
        }
        next.push(winner);
        const label1=p1||((round===0)?initialVacancy:'Por definir');
        const label2=p2||((round===0)?initialVacancy:'Por definir');
        const s1=result?.score1,s2=result?.score2;
        const pen1=result?.penalty1,pen2=result?.penalty2;
        const playerRow=(name,label,score,penalty,slot)=>`<div class="gm-fixture-player ${name?'is-registered':'gm-fixture-empty'} ${lastRegisteredNick&&name&&same(lastRegisteredNick,name)?'is-me':''}"><span>${esc(label)}</span><small>${score!=null?`<b class="gm-inline-score">${score}</b>${penalty!=null?`<i class="gm-inline-penalty">P ${penalty}</i>`:''}`:(round===0&&initialVacancy==='Cupo disponible'?`#${String(slot).padStart(2,'0')}`:'POR DEFINIR')}</small></div>`;
        matchesHTML+=`<div class="gm-fixture-match">${playerRow(p1,label1,s1,pen1,m*2+1)}${playerRow(p2,label2,s2,pen2,m*2+2)}${resultControls(id,p1,p2,'knockout',result,false)}</div>`;
      }
      const isFinal=matches===1;
      const finalTrophy=isFinal&&trophy?`<div class="gm-final-cup"><img decoding="async" fetchpriority="low" src="${esc(trophy)}" alt="Copa minimalista de ${esc(selected?.title||'torneo')}"><span>COPA DEL CAMPEÓN</span></div>`:'';
      rounds.push(`<div class="gm-fixture-round ${isFinal?'is-final':''}"><div class="gm-fixture-round__title">${roundTitleByMatches(matches)}</div><div class="gm-fixture-round__matches">${finalTrophy}${matchesHTML}</div></div>`);
      if(matches===1)champion=next[0]||'';
      players=next;round++;
    }
    return {html:`<div class="gm-fixture gm-fixture--knockout">${rounds.join('')}</div>`,champion};
  }

  // Calendario de una sola vuelta: cada pareja se enfrenta exactamente una vez.
  function roundRobinPairs(size){
    const ids=Array.from({length:size},(_,i)=>i);const rounds=[];let arr=[...ids];
    for(let r=0;r<size-1;r++){
      const pairs=[];for(let i=0;i<size/2;i++)pairs.push([arr[i],arr[size-1-i]]);
      rounds.push(pairs);arr=[arr[0],arr[arr.length-1],...arr.slice(1,-1)];
    }
    return rounds;
  }

  function blankStats(name,slot){return{name,slot,pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0}}
  function applyTableResult(stats,p1,p2,s1,s2){
    const a=stats.find(x=>same(x.name,p1)),b=stats.find(x=>same(x.name,p2));if(!a||!b)return;
    a.pj++;b.pj++;a.gf+=s1;a.gc+=s2;b.gf+=s2;b.gc+=s1;
    if(s1>s2){a.g++;b.p++;a.pts+=3}else if(s2>s1){b.g++;a.p++;b.pts+=3}else{a.e++;b.e++;a.pts++;b.pts++}
    a.dg=a.gf-a.gc;b.dg=b.gf-b.gc;
  }
  function sortedStats(stats){
    return [...stats].sort((a,b)=>{if(!a.name&&!b.name)return a.slot-b.slot;if(!a.name)return 1;if(!b.name)return-1;return b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.name.localeCompare(b.name,'es')});
  }
  function tableHTML(stats,{qualifiers=0,complete=false,league=false}={}){
    const sorted=sortedStats(stats);
    return `<div class="gm-standings-wrap"><table class="gm-standings"><thead><tr><th>POS</th><th>JUGADOR</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead><tbody>${sorted.map((s,i)=>`<tr class="${s.name&&qualifiers&&i<qualifiers?'is-qualifying':''}"><td>${i+1}</td><td>${s.name?`<b>${esc(s.name)}</b>${s.name&&qualifiers&&i<qualifiers?`<small>${complete?'CLASIFICADO':'ZONA DE CLASIFICACIÓN'}</small>`:''}`:'<span class="gm-available-slot">Cupo disponible</span>'}</td><td>${s.pj}</td><td>${s.g}</td><td>${s.e}</td><td>${s.p}</td><td>${s.gf}</td><td>${s.gc}</td><td>${s.dg>0?'+':''}${s.dg}</td><td><strong>${s.pts}</strong></td></tr>`).join('')}</tbody></table>${league?'<div class="gm-table-note">Victoria 3 pts · Empate 1 pt · Derrota 0 pts</div>':''}</div>`;
  }

  function groupName(index){let n=index+1,s='';while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)}return s}

  function thirdPlaceRankingHTML(rows,bestThirdCount,allGroupsComplete){
    const ranked=[...rows].sort((a,b)=>{
      if(!a.name&&!b.name)return a.group.localeCompare(b.group,'es');
      if(!a.name)return 1;if(!b.name)return-1;
      return b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.group.localeCompare(b.group,'es');
    });
    const activeGroups=new Set(ranked.filter(x=>x.name).slice(0,bestThirdCount).map(x=>x.group));
    return `<section class="gm-best-thirds"><div class="gm-best-thirds__head"><div><span>CLASIFICACIÓN GENERAL</span><b>MEJORES TERCEROS</b></div><small>${allGroupsComplete?'FASE DE GRUPOS FINALIZADA · CLASIFICADOS DEFINIDOS':'SE ACTUALIZA CON CADA RESULTADO · CLASIFICACIÓN PROVISIONAL'}</small></div><div class="gm-standings-wrap"><table class="gm-standings gm-best-thirds__table"><thead><tr><th>POS</th><th>GRUPO</th><th>JUGADOR</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th><th>ESTADO</th></tr></thead><tbody>${ranked.map((r,i)=>{
      const qualifies=!!r.name&&activeGroups.has(r.group);
      const status=!r.name?'POR DEFINIR':allGroupsComplete?(qualifies?'CLASIFICADO':'ELIMINADO'):(qualifies?'CLASIFICA AHORA':'FUERA AHORA');
      return `<tr class="${qualifies?'is-qualifying':''} ${allGroupsComplete&&r.name&&!qualifies?'is-eliminated':''}"><td>${i+1}</td><td><b>${esc(r.group)}</b></td><td>${r.name?`<b>${esc(r.name)}</b>`:'<span class="gm-available-slot">Por definir</span>'}</td><td>${r.pj||0}</td><td>${r.g||0}</td><td>${r.e||0}</td><td>${r.p||0}</td><td>${r.gf||0}</td><td>${r.gc||0}</td><td>${(r.dg||0)>0?'+':''}${r.dg||0}</td><td><strong>${r.pts||0}</strong></td><td><span class="gm-third-status ${qualifies?'is-in':''}">${status}</span></td></tr>`;
    }).join('')}</tbody></table></div><p class="gm-best-thirds__note">Criterios GMAC: puntos → diferencia de gol → goles a favor. Los ocho mejores terceros quedan resaltados y se recalculan automáticamente después de cada partido.</p></section>`;
  }

  function assignWorldCupThirdSlots(qualified){
    const slots=[
      {key:'M74',eligible:['A','B','C','D','F']},
      {key:'M77',eligible:['C','D','F','G','H']},
      {key:'M79',eligible:['C','E','F','H','I']},
      {key:'M80',eligible:['E','H','I','J','K']},
      {key:'M81',eligible:['B','E','F','I','J']},
      {key:'M82',eligible:['A','E','H','I','J']},
      {key:'M85',eligible:['E','F','G','I','J']},
      {key:'M87',eligible:['D','E','I','J','L']}
    ];
    const byGroup=new Map(qualified.filter(x=>x?.name).map(x=>[x.group,x]));
    const groups=[...byGroup.keys()];
    const order=slots.map((slot,index)=>({slot,index,candidates:slot.eligible.filter(g=>byGroup.has(g))})).sort((a,b)=>a.candidates.length-b.candidates.length||a.index-b.index);
    const used=new Set(),solution={};
    function search(pos){
      if(pos>=order.length)return true;
      const item=order[pos];
      for(const group of item.candidates){
        if(used.has(group))continue;
        used.add(group);solution[item.slot.key]=byGroup.get(group);
        if(search(pos+1))return true;
        used.delete(group);delete solution[item.slot.key];
      }
      return false;
    }
    if(!search(0)){
      slots.forEach((slot,i)=>{solution[slot.key]=qualified[i]||null});
    }
    return solution;
  }

  function knockoutWinner(matchId,p1,p2){
    if(!p1||!p2)return'';
    const result=findResult(matchId,p1,p2);if(!result)return'';
    if(result.score1>result.score2)return p1;if(result.score2>result.score1)return p2;
    if(result.penalty1!=null&&result.penalty2!=null&&result.penalty1!==result.penalty2)return result.penalty1>result.penalty2?p1:p2;
    if(result.winner&&(same(result.winner,p1)||same(result.winner,p2)))return result.winner;
    return'';
  }
  function knockoutLoser(matchId,p1,p2){const w=knockoutWinner(matchId,p1,p2);return!w?'':same(w,p1)?p2:p1}
  function worldCupMatchHTML(matchId,p1,p2){
    const result=findResult(matchId,p1,p2);const s1=result?.score1,s2=result?.score2,pen1=result?.penalty1,pen2=result?.penalty2;
    const row=(name,score,penalty)=>`<div class="gm-fixture-player ${name?'is-registered':'gm-fixture-empty'} ${lastRegisteredNick&&name&&same(lastRegisteredNick,name)?'is-me':''}"><span>${esc(name||'Por definir')}</span><small>${score!=null?`<b class="gm-inline-score">${score}</b>${penalty!=null?`<i class="gm-inline-penalty">P ${penalty}</i>`:''}`:'POR DEFINIR'}</small></div>`;
    return `<div class="gm-fixture-match gm-world-cup-match"><span class="gm-world-match-id">${esc(matchId)}</span>${row(p1,s1,pen1)}${row(p2,s2,pen2)}${resultControls(matchId,p1,p2,'knockout',result,false)}</div>`;
  }
  function worldCupRoundHTML(title,matches,{final=false,trophy=''}={}){
    const cup=final&&trophy?`<div class="gm-final-cup"><img src="${esc(trophy)}" alt="Copa de ${esc(selected?.title||'torneo')}"><span>COPA DEL CAMPEÓN</span></div>`:'';
    return `<div class="gm-fixture-round ${final?'is-final':''}"><div class="gm-fixture-round__title">${title}</div><div class="gm-fixture-round__matches">${cup}${matches.map(m=>worldCupMatchHTML(m[0],m[1],m[2])).join('')}</div></div>`;
  }
  function worldCupKnockoutHTML(groupRankings,thirdRows,trophy){
    const rank=(letter,pos)=>groupRankings[letter]?.[pos-1]?.name||'';
    const rankedThirds=[...thirdRows].filter(x=>x.name).sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.group.localeCompare(b.group,'es')).slice(0,8);
    const thirds=assignWorldCupThirdSlots(rankedThirds);
    const r32=[
      ['M73',rank('A',2),rank('B',2)],['M74',rank('E',1),thirds.M74?.name||''],['M75',rank('F',1),rank('C',2)],['M76',rank('C',1),rank('F',2)],
      ['M77',rank('I',1),thirds.M77?.name||''],['M78',rank('E',2),rank('I',2)],['M79',rank('A',1),thirds.M79?.name||''],['M80',rank('L',1),thirds.M80?.name||''],
      ['M81',rank('D',1),thirds.M81?.name||''],['M82',rank('G',1),thirds.M82?.name||''],['M83',rank('K',2),rank('L',2)],['M84',rank('H',1),rank('J',2)],
      ['M85',rank('B',1),thirds.M85?.name||''],['M86',rank('J',1),rank('H',2)],['M87',rank('K',1),thirds.M87?.name||''],['M88',rank('D',2),rank('G',2)]
    ];
    const map=Object.fromEntries(r32.map(m=>[m[0],m]));
    const w=id=>knockoutWinner(id,map[id]?.[1]||'',map[id]?.[2]||'');
    const r16=[['M89',w('M74'),w('M77')],['M90',w('M73'),w('M75')],['M91',w('M76'),w('M78')],['M92',w('M79'),w('M80')],['M93',w('M83'),w('M84')],['M94',w('M81'),w('M82')],['M95',w('M86'),w('M88')],['M96',w('M85'),w('M87')]];
    r16.forEach(m=>map[m[0]]=m);
    const qf=[['M97',w('M89'),w('M90')],['M98',w('M93'),w('M94')],['M99',w('M91'),w('M92')],['M100',w('M95'),w('M96')]];qf.forEach(m=>map[m[0]]=m);
    const sf=[['M101',w('M97'),w('M98')],['M102',w('M99'),w('M100')]];sf.forEach(m=>map[m[0]]=m);
    const third=['M103',knockoutLoser('M101',map.M101?.[1]||'',map.M101?.[2]||''),knockoutLoser('M102',map.M102?.[1]||'',map.M102?.[2]||'')];map.M103=third;
    const final=['M104',w('M101'),w('M102')];map.M104=final;
    const champion=knockoutWinner('M104',final[1],final[2]);
    const assignmentNote=rankedThirds.map(r=>{const target=Object.keys(thirds).find(k=>thirds[k]?.group===r.group);return `<span><b>3.º ${esc(r.group)}</b>${target?` → ${target}`:''}</span>`}).join('');
    return {html:`<div class="gm-world-third-assignments"><b>UBICACIÓN DE LOS 8 MEJORES TERCEROS</b><div>${assignmentNote}</div></div><div class="gm-fixture gm-fixture--knockout gm-fixture--world-cup">${worldCupRoundHTML('DIECISEISAVOS · RONDA DE 32',r32)}${worldCupRoundHTML('OCTAVOS',r16)}${worldCupRoundHTML('CUARTOS',qf)}${worldCupRoundHTML('SEMIFINAL',sf)}${worldCupRoundHTML('FINAL',[final],{final:true,trophy})}${worldCupRoundHTML('TERCER PUESTO',[third])}</div>`,champion};
  }

  function groupsHTML(players,t){
    const groupSize=Number(t.groupSize)||4;
    const groupCount=Math.ceil(players.length/groupSize);
    const q=Number(t.qualifiersPerGroup)||2;
    const bestThirdCount=Math.max(0,Number(t.bestThirdCount)||0);
    // Todas las competiciones con grupos de GMAC se juegan a una sola vuelta.
    const legs=1;
    const groups=Array.from({length:groupCount},()=>Array(groupSize).fill(''));
    players.forEach((name,i)=>{const gi=i%groupCount,slot=Math.floor(i/groupCount);if(slot<groupSize)groups[gi][slot]=name});
    let groupCards='',playedTotal=0,allGroupsComplete=true;
    const groupQualifiers=[],thirdRows=[],groupRankings={};
    groups.forEach((gp,gi)=>{
      const letter=groupName(gi);
      const stats=gp.map((name,i)=>blankStats(name,i));
      const baseRounds=roundRobinPairs(groupSize);
      let expected=0,played=0,matches='';
      let matchSeq=0;
      baseRounds.forEach((pairs,ri)=>pairs.forEach((pair,mi)=>{
        const p1=gp[pair[0]]||'',p2=gp[pair[1]]||'';
        const id=`G${letter}:M${matchSeq}`;matchSeq++;
        const result=findResult(id,p1,p2);expected++;
        if(result&&p1&&p2){applyTableResult(stats,p1,p2,result.score1,result.score2);played++;playedTotal++}
        matches+=`<div class="gm-group-match"><div><span>${esc(p1||'Por definir')}</span><b>VS</b><span>${esc(p2||'Por definir')}</span></div>${result?`<strong>${result.score1} — ${result.score2}</strong>`:''}${resultControls(id,p1,p2,'group',result,true)}</div>`;
      }));
      const full=gp.filter(Boolean).length===groupSize;
      const complete=full&&played===expected;
      if(!complete)allGroupsComplete=false;
      const ranking=sortedStats(stats).filter(x=>x.name);
      groupRankings[letter]=ranking;
      groupQualifiers.push(complete?ranking.slice(0,q).map(x=>x.name):Array(q).fill(''));
      const third=ranking[q];
      thirdRows.push(third?{...third,group:letter,complete}:{...blankStats('',q),group:letter,complete});
      groupCards+=`<article class="gm-group-card" data-group-card="${letter}"><div class="gm-group-card__head"><div><h4>GRUPO ${letter}</h4><span>${played}/${expected} PARTIDOS · SOLO IDA</span></div><button class="gm-share-capture gm-share-capture--small" type="button" data-share-capture="group" data-share-name="${esc(selected?.title||'torneo')}-grupo-${letter}" aria-label="Compartir captura del Grupo ${letter}">COMPARTIR ↗</button></div>${tableHTML(stats,{qualifiers:q,complete})}<details class="gm-match-list"><summary>PARTIDOS DEL GRUPO</summary><div>${matches}</div></details></article>`;
    });

    const direct=[];
    for(let gi=0;gi<groupQualifiers.length;gi+=2){
      const a=groupQualifiers[gi]||Array(q).fill(''),b=groupQualifiers[gi+1]||Array(q).fill('');
      if(q===2&&b.length){direct.push(a[0]||'',b[1]||'',b[0]||'',a[1]||'')}
      else{direct.push(...a,...b)}
    }
    const rankedThirds=[...thirdRows].filter(x=>x.name).sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.group.localeCompare(b.group,'es'));
    let extra=Array(bestThirdCount).fill('');
    if(allGroupsComplete&&bestThirdCount)extra=rankedThirds.slice(0,bestThirdCount).map(x=>x.name);
    const isWorldCup=t.officialFormatSlug==='copa-del-mundo'&&groupCount===12&&groupSize===4&&bestThirdCount===8;
    const trophy=String(t.trophyFixture||'').trim();
    const ko=isWorldCup&&allGroupsComplete?worldCupKnockoutHTML(groupRankings,thirdRows,trophy):knockoutHTML([...direct,...extra],{prefix:'GKO',initialVacancy:'Por definir',trophy});
    const bestThirdCopy=bestThirdCount?` · + ${bestThirdCount} mejores terceros`:'';
    const intro=`${groupCount} GRUPOS DE ${groupSize}`;
    const rule=`Solo ida · ${q} clasificados directos por grupo${bestThirdCopy}.`;
    const thirdsHTML=isWorldCup?thirdPlaceRankingHTML(thirdRows,bestThirdCount,allGroupsComplete):'';
    const phaseCopy=allGroupsComplete?'Clasificados definidos':isWorldCup?'La tabla de terceros se actualiza con cada resultado. El cuadro se completa al terminar todos los grupos.':'Los cruces aparecerán cuando terminen todos los grupos';
    return {html:`<div class="gm-groups-intro"><b>${intro}</b><span>${rule}</span></div><div class="gm-groups-grid">${groupCards}</div>${thirdsHTML}<div class="gm-phase-divider"><span>FASE ELIMINATORIA</span><small>${phaseCopy}</small></div><div class="gm-fixture-scroll">${ko.html}</div>`,champion:ko.champion,playedTotal,allGroupsComplete};
  }

  function leagueHTML(players,t){
    const size=players.length;
    const legs=1; // GMAC: toda competición se juega a una sola vuelta / partido único
    const baseSchedule=roundRobinPairs(size);
    const schedule=[];
    for(let leg=0;leg<legs;leg++){
      baseSchedule.forEach((pairs,ri)=>schedule.push({
        leg,round:ri,
        pairs:pairs.map(pair=>leg===0?pair:[pair[1],pair[0]])
      }));
    }
    const stats=players.map((name,i)=>blankStats(name,i));const legStats=Array.from({length:legs},()=>players.map((name,i)=>blankStats(name,i)));let played=0;let rounds='';
    schedule.forEach((roundData,idx)=>{
      let matches='';
      roundData.pairs.forEach((pair,mi)=>{
        const p1=players[pair[0]]||'',p2=players[pair[1]]||'';
        const id=roundData.leg===0?`LG:J${roundData.round+1}:M${mi}`:`LG${roundData.leg+1}:J${roundData.round+1}:M${mi}`;
        const result=findResult(id,p1,p2);
        if(result&&p1&&p2){applyTableResult(stats,p1,p2,result.score1,result.score2);applyTableResult(legStats[roundData.leg],p1,p2,result.score1,result.score2);played++}
        matches+=`<div class="gm-league-match"><div class="gm-league-match__teams"><b>${esc(p1||'Por definir')}</b><span>${result?`${result.score1} — ${result.score2}`:'VS'}</span><b>${esc(p2||'Por definir')}</b></div>${resultControls(id,p1,p2,'league',result,true)}</div>`;
      });
      rounds+=`<details class="gm-league-round" ${idx===0?'open':''}><summary><b>JORNADA ${idx+1}</b><span>${roundData.pairs.length} partidos</span></summary><div>${matches}</div></details>`;
    });
    const total=size*(size-1)/2*legs;
    const full=players.filter(Boolean).length===size;
    const complete=full&&played===total;
    const ranked=sortedStats(stats).filter(x=>x.name);
    const first=played>0?(ranked[0]?.name||''):'';
    const second=played>0?(ranked[1]?.name||''):'';
    const trophy=String(t.trophyFixture||'').trim();
    const isPlayoffs=t.mode==='league_playoffs';
    const playoffCount=isPlayoffs?Math.max(2,Number(t.playoffCount)||4):0;

    let post='';
    let champion=complete?first:'';
    if(isPlayoffs){
      let qualifiers=[];
      if(complete) qualifiers=ranked.slice(0,playoffCount).map(x=>x.name).filter(Boolean);
      while(qualifiers.length<playoffCount)qualifiers.push('');
      const ko=knockoutHTML(qualifiers,{prefix:'LGPO',initialVacancy:'Por definir',trophy});
      champion=ko.champion;
      const phaseSummary=complete?`Los ${playoffCount} mejores de la tabla clasifican · cruces a partido único`:`Se habilitan al terminar las ${size-1} jornadas de la fase regular`;
      post=`<div class="gm-phase-divider"><span>PLAY-OFFS POR EL TÍTULO</span><small>${phaseSummary}</small></div><div class="gm-fixture-scroll">${ko.html}</div>`;
    }else{
      const trophyMarkup=trophy?`<img src="${esc(trophy)}" alt="Copa de ${esc(t.title)}">`:'<span class="gm-league-podium__placeholder">🏆</span>';
      post=`<section class="gm-league-podium" aria-label="Podio de la liga"><div class="gm-league-podium__cup">${trophyMarkup}</div><div class="gm-league-podium__places"><span>${complete?'CAMPEÓN':'PRIMER LUGAR'}</span><strong>${esc(first||'Por definir')}</strong><small>SEGUNDO LUGAR</small><b>${esc(second||'Por definir')}</b></div></section>`;
    }

    return {html:`<div class="gm-league-head"><div><b>${isPlayoffs?'TABLA DE FASE REGULAR':'TABLA DE POSICIONES'}</b><span>${size} participantes · ${size-1} jornadas · ${total} partidos · solo ida</span></div><strong>${played}/${total} RESULTADOS</strong></div>${tableHTML(stats,{qualifiers:playoffCount,complete,league:true})}<div class="gm-phase-divider gm-phase-divider--league"><span>CALENDARIO · SOLO IDA</span><small>Cada participante se enfrenta una sola vez a los otros ${size-1} rivales.</small></div><div class="gm-league-rounds">${rounds}</div>${post}`,champion,leader:first,runnerUp:second,complete,played,total};
  }


  function leaguePhaseHTML(players,t){
    const size=players.length;
    const matchdays=Math.min(Math.max(1,Number(t.leagueStageMatches)||8),size-1);
    const schedule=roundRobinPairs(size).slice(0,matchdays);
    const stats=players.map((name,i)=>blankStats(name,i));
    let played=0,rounds='';
    schedule.forEach((pairs,ri)=>{
      let matches='';
      pairs.forEach((pair,mi)=>{
        const p1=players[pair[0]]||'',p2=players[pair[1]]||'';
        const id=`UCL:J${ri+1}:M${mi}`;
        const result=findResult(id,p1,p2);
        if(result&&p1&&p2){applyTableResult(stats,p1,p2,result.score1,result.score2);played++}
        matches+=`<div class="gm-league-match"><div class="gm-league-match__teams"><b>${esc(p1||'Por definir')}</b><span>${result?`${result.score1} — ${result.score2}`:'VS'}</span><b>${esc(p2||'Por definir')}</b></div>${resultControls(id,p1,p2,'league',result,true)}</div>`;
      });
      rounds+=`<details class="gm-league-round" ${ri===0?'open':''}><summary><b>JORNADA ${ri+1}</b><span>${pairs.length} partidos</span></summary><div>${matches}</div></details>`;
    });
    const total=size*matchdays/2;
    const full=players.filter(Boolean).length===size;
    const complete=full&&played===total;
    const ranked=sortedStats(stats).filter(x=>x.name);
    const direct=complete?ranked.slice(0,8).map(x=>x.name):Array(8).fill('');
    const playoffSeeds=complete?ranked.slice(8,24).map(x=>x.name):Array(16).fill('');
    const playoffWinners=[];let playoffHTML='';
    for(let i=0;i<8;i++){
      const p1=playoffSeeds[i]||'',p2=playoffSeeds[15-i]||'';
      const id=`UCLPO:M${i}`;const result=findResult(id,p1,p2);
      let winner='';
      if(result&&p1&&p2){
        if(result.score1>result.score2)winner=p1;
        else if(result.score2>result.score1)winner=p2;
        else if(result.penalty1!=null&&result.penalty2!=null&&result.penalty1!==result.penalty2)winner=result.penalty1>result.penalty2?p1:p2;
        else if(result.winner&&(same(result.winner,p1)||same(result.winner,p2)))winner=result.winner;
      }
      playoffWinners.push(winner);
      playoffHTML+=`<div class="gm-fixture-match"><div class="gm-fixture-player ${p1?'is-registered':'gm-fixture-empty'}"><span>${esc(p1||'Por definir')}</span><small>${p1?`SEED ${i+9}`:'POR DEFINIR'}</small></div><div class="gm-fixture-player ${p2?'is-registered':'gm-fixture-empty'}"><span>${esc(p2||'Por definir')}</span><small>${p2?`SEED ${24-i}`:'POR DEFINIR'}</small></div>${resultControls(id,p1,p2,'knockout',result,false)}</div>`;
    }
    const round16=[];
    for(let i=0;i<8;i++)round16.push(direct[i]||'',playoffWinners[7-i]||'');
    const trophy=String(t.trophyFixture||'').trim();
    const ko=knockoutHTML(round16,{prefix:'UCLKO',initialVacancy:'Por definir',trophy});
    return {html:`<div class="gm-league-head"><div><b>FASE LIGA</b><span>${size} participantes · ${matchdays} partidos por participante</span></div><strong>${played}/${total} RESULTADOS</strong></div>${tableHTML(stats,{qualifiers:8,complete,league:true})}<div class="gm-phase-divider gm-phase-divider--league"><span>FASE LIGA · 36</span><small>1.º–8.º a octavos · 9.º–24.º al play-off · 25.º–36.º eliminados</small></div><div class="gm-league-rounds">${rounds}</div><div class="gm-phase-divider"><span>PLAY-OFF DE ACCESO A OCTAVOS</span><small>Seeds 9–24 · eliminación directa</small></div><div class="gm-fixture-scroll"><div class="gm-fixture gm-fixture--knockout"><div class="gm-fixture-round"><div class="gm-fixture-round__title">PLAY-OFF</div><div class="gm-fixture-round__matches">${playoffHTML}</div></div></div>${ko.html}</div>`,champion:ko.champion,complete};
  }

  function copaReyHTML(players,t){
    const trophy=String(t.trophyFixture||'').trim();
    const bracket=knockoutHTML(players.slice(0,64),{prefix:'CDR',initialVacancy:'Cupo disponible',trophy});
    return {html:`<div class="gm-groups-intro"><b>COPA DEL REY · 64 PARTICIPANTES</b><span>Eliminación directa a partido único desde la ronda de 64 hasta la final.</span></div><div class="gm-fixture-scroll">${bracket.html}</div>`,champion:bracket.champion};
  }

  function renderCompetition(highlightNick=''){
    if(!selected||!fixtureEl)return;
    lastRegisteredNick=highlightNick||lastRegisteredNick;
    const {regs,players}=participantSlots(selected);const slots=Number(selected.slots)||players.length;const mode=modeOf(selected);
    fixtureSlots.textContent=`${regs.length}/${slots} PARTICIPANTES`;
    fixtureEl.className='gm-competition-view';
    const fixtureTrophy=String(selected.trophyFixture||'').trim();
    let out={html:'',champion:''};
    if(mode==='league_phase'){
      fixtureLabel&&(fixtureLabel.textContent='FASE LIGA + PLAY-OFFS');
      fixtureCaption.textContent=`${selected.title} · ${slots} participantes · 8 partidos por participante · play-off y eliminatorias`;
      out=leaguePhaseHTML(players,selected);
    }else if(mode==='league_playoffs'){
      fixtureLabel&&(fixtureLabel.textContent='LIGA + PLAY-OFFS');
      fixtureCaption.textContent=`${selected.title} · ${slots} participantes · ${slots-1} jornadas · solo ida · top ${Number(selected.playoffCount)||4} a play-offs`;
      out=leagueHTML(players,selected);
    }else if(mode==='league'){
      fixtureLabel&&(fixtureLabel.textContent='TABLA + CALENDARIO');
      fixtureCaption.textContent=`${selected.title} · ${slots} participantes · ${slots-1} jornadas · solo ida`;
      out=leagueHTML(players,selected);
    }else if(mode==='groups'){
      const gc=Math.ceil(slots/(Number(selected.groupSize)||4));
      const legs=1;
      const bestThird=Math.max(0,Number(selected.bestThirdCount)||0);
      fixtureLabel&&(fixtureLabel.textContent='GRUPOS + ELIMINATORIAS');
      fixtureCaption.textContent=`${selected.title} · ${gc} grupos de ${Number(selected.groupSize)||4} · solo ida · clasifican ${Number(selected.qualifiersPerGroup)||2} por grupo${bestThird?` + ${bestThird} mejores terceros`:''}`;
      out=groupsHTML(players,selected);
    }else if(mode==='copa_rey'){
      fixtureLabel&&(fixtureLabel.textContent='COPA · ELIMINATORIAS');
      fixtureCaption.textContent=`${selected.title} · 64 participantes · eliminación directa · todos los partidos a una sola ida`;
      out=copaReyHTML(players,selected);
    }else{
      fixtureLabel&&(fixtureLabel.textContent='FIXTURE DEL TORNEO');
      fixtureCaption.textContent=`${selected.title} · ${slots} participantes · eliminación directa`;
      out=knockoutHTML(players,{prefix:'KO',initialVacancy:'Cupo disponible',trophy:fixtureTrophy});
      out.html=`<div class="gm-fixture-scroll">${out.html}</div>`;
    }
    if(fixtureCup){fixtureCup.innerHTML=fixtureTrophy?`<img src="${esc(fixtureTrophy)}" alt="Copa de ${esc(selected.title)}">`:'';fixtureCup.hidden=!fixtureTrophy;}
    const trophy=fixtureTrophy?`<img class="gm-champion__trophy" src="${esc(fixtureTrophy)}" alt="Copa de ${esc(selected.title)}">`:'<span class="gm-champion__placeholder">🏆</span>';
    fixtureEl.innerHTML=out.html+((out.champion&&mode!=='league')?`<div class="gm-champion">${trophy}<div><span>CAMPEÓN</span><strong>${esc(out.champion)}</strong><small>${fixtureTrophy?'Copa oficial de esta competición.':'Copa gráfica pendiente de incorporar.'}</small></div></div>`:'');
    if(fixtureMessage){
      const base=regs.length?`${regs.length} de ${slots} participantes registrados.`:`Todavía hay ${slots} cupos disponibles para participantes.`;
      if(highlightNick){
        const msg=mode==='groups'?'Se asignó automáticamente a un grupo.':(mode==='league'||mode==='league_playoffs'||mode==='league_phase')?'Ya forma parte de la tabla y el calendario.':'Ya ocupa un lugar en el cuadro.';
        fixtureMessage.textContent=`✓ ${highlightNick} ya aparece entre los participantes. ${msg}`;fixtureMessage.classList.add('is-success');
      }else{fixtureMessage.textContent=base+' Los resultados oficiales se sincronizan con Google Sheets.';fixtureMessage.classList.remove('is-success')}
    }
  }

  async function open(id){
    selected=list.find(t=>t.id===id);if(!selected)return;
    if(statusKey(selected)==='finalizado'){location.href=`torneo.html?game=${encodeURIComponent(page)}&id=${encodeURIComponent(selected.id)}`;return;}
    validatedCode='';lastRegisteredNick='';liveRegistrations=[];liveResults=[];
    selectedName.textContent=selected.title;tidInput.value=selected.id;codeInput.value='';feedback.textContent='';feedback.className='gm-feedback';reg.classList.remove('is-unlocked');
    modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    renderCompetition();await loadTournamentState();renderCompetition();startLivePolling();setTimeout(()=>codeInput.focus(),50);
  }
  window.GM_OPEN_TOURNAMENT=open;
  function close(){stopLivePolling();modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-register]');if(b)open(b.dataset.register);
    if(e.target.closest('[data-close-modal]')||e.target===modal)close();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});


  async function api(path,payload){
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.message||'No se pudo completar la solicitud.');return data;
  }

  document.querySelector('[data-validate-code]').addEventListener('click',async()=>{
    const code=codeInput.value.trim();if(!code){feedback.textContent='Ingresa el código que recibiste después del pago.';feedback.className='gm-feedback is-error';return}
    feedback.textContent='Verificando código…';feedback.className='gm-feedback';
    try{
      const data=await api('/api/validate-code',{code,tournamentId:selected.id,game:page});
      if(data.valid){validatedCode=code.toUpperCase();feedback.textContent='Código válido. Ya puedes completar tu inscripción.';feedback.className='gm-feedback is-ok';reg.classList.add('is-unlocked');document.querySelector('#player-name').focus()}else throw new Error(data.message||'Código no válido para este torneo.');
    }catch(err){validatedCode='';feedback.textContent=err.message||'Código no válido.';feedback.className='gm-feedback is-error';reg.classList.remove('is-unlocked')}
  });
  codeInput.addEventListener('input',()=>{if(validatedCode&&codeInput.value.trim().toUpperCase()!==validatedCode){validatedCode='';reg.classList.remove('is-unlocked');feedback.textContent='El código cambió. Vuelve a validarlo.';feedback.className='gm-feedback is-error'}});

  document.querySelector('#registration-form').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]');const payload=Object.fromEntries(new FormData(form).entries());payload.code=codeInput.value.trim().toUpperCase();payload.game=page;payload.tournamentId=selected.id;
    if(!validatedCode||payload.code!==validatedCode){feedback.textContent='Valida el código antes de confirmar.';feedback.className='gm-feedback is-error';return}
    feedback.textContent='Registrando participación…';feedback.className='gm-feedback';btn.disabled=true;
    try{
      const data=await api('/api/register',payload);await loadTournamentState()
      lastRegisteredNick=payload.nick||payload.name||'';feedback.textContent=data.message||'¡Inscripción registrada correctamente!';feedback.className='gm-feedback is-ok';renderCompetition(lastRegisteredNick);form.reset();validatedCode='';reg.classList.remove('is-unlocked');fixtureEl?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(err){feedback.textContent=err.message||'No se pudo registrar la inscripción.';feedback.className='gm-feedback is-error'}finally{btn.disabled=false}
  });
})();
