(()=>{
'use strict';
const $=(q,el=document)=>el.querySelector(q);
const $$=(q,el=document)=>[...el.querySelectorAll(q)];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const metaCache=new Map();
let raf=0;

function tournamentId(){return clean($('#tournament-id')?.value)||clean(new URLSearchParams(location.search).get('id'))}
function pageGame(){return clean(document.body?.dataset?.game)||clean(new URLSearchParams(location.search).get('game'))}
function localTournament(id=tournamentId(),game=pageGame()){
  if(!id)return null;
  const source=window.GM_TOURNAMENTS||{};
  const preferred=Array.isArray(source?.[game])?source[game]:[];
  const hit=preferred.find(t=>String(t?.id)===String(id));if(hit)return hit;
  for(const rows of Object.values(source)){if(!Array.isArray(rows))continue;const found=rows.find(t=>String(t?.id)===String(id));if(found)return found}
  return null;
}
async function tournamentMeta(){
  const id=tournamentId(),game=pageGame();if(!id)return null;
  const local=localTournament(id,game);if(local&&Number(local.edition)>0&&clean(local.trophyFixture))return local;
  const key=`${game}|${id}`;if(metaCache.has(key))return metaCache.get(key);
  const pending=(async()=>{
    try{
      const r=await fetch(`/api/tournaments?game=${encodeURIComponent(game)}`,{headers:{Accept:'application/json'},cache:'no-store'});
      if(r.ok){const data=await r.json();const found=(Array.isArray(data?.tournaments)?data.tournaments:[]).find(t=>String(t?.id)===String(id));if(found)return found}
    }catch(_){}
    return local||null;
  })();
  metaCache.set(key,pending);return pending;
}
function editionNumber(meta=null){
  const direct=clean($('[data-detail-edition]:not([data-v36-edition-marker])')?.textContent);
  let m=direct.match(/(\d+)/);if(m)return Number(m[1]);
  const selected=clean($('[data-selected-tournament]')?.dataset?.edition)||clean($('[data-selected-tournament]')?.textContent);
  m=selected.match(/EDICI[ÓO]N\s*(\d+)/i)||selected.match(/^(\d+)$/);if(m)return Number(m[1]);
  const local=meta||localTournament();if(Number(local?.edition)>0)return Number(local.edition);
  const id=tournamentId();m=id.match(/(?:e|edicion|edition)[-_]?(\d+)$/i);return m?Number(m[1]):0;
}
function editionLabel(n){
  if(!n)return'EDICIÓN';
  const suffix={1:'ERA',2:'DA',3:'ERA',4:'TA',5:'TA',6:'TA',7:'MA',8:'VA',9:'NA',10:'MA'}[Number(n)]||'TA';
  return `${n}${suffix} EDICIÓN`;
}
function syncEditionMarker(bracket,edition){
  if(!bracket||!edition)return;
  let marker=$('[data-v36-edition-marker]',bracket);
  if(!marker){marker=document.createElement('span');marker.hidden=true;marker.dataset.v36EditionMarker='';marker.dataset.detailEdition='';bracket.appendChild(marker)}
  marker.textContent=`EDICIÓN ${edition}`;
}
function displayRoundTitle(value){
  const raw=upper(value);
  if(raw==='FINAL')return'FINAL';
  if(raw.includes('SEMIFINAL'))return'SEMIFINAL';
  if(raw.includes('CUART'))return'CUARTOS';
  if(raw.includes('OCTAV'))return'OCTAVOS';
  if(raw.includes('DIECISEIS')||raw.includes('RONDA DE 32'))return'16AVOS';
  if(raw.includes('RONDA DE 64'))return'32AVOS';
  if(raw.includes('RONDA DE 128'))return'64AVOS';
  return clean(value);
}
function playerData(row){
  if(!row)return{name:'Por definir',score:'',penalty:'',empty:true};
  const name=clean($(':scope > span',row)?.textContent)||'Por definir';
  const score=clean($('.gm-inline-score',row)?.textContent);
  const ptxt=clean($('.gm-inline-penalty',row)?.textContent);
  const pm=ptxt.match(/-?\d+/);
  return{name,score,penalty:pm?pm[0]:'',empty:row.classList.contains('gm-fixture-empty')||!clean($(':scope > span',row)?.textContent)};
}
function matchData(match){
  const rows=$$('.gm-fixture-player',match);
  return{p1:playerData(rows[0]),p2:playerData(rows[1]),source:match};
}
function playerHTML(p){
  const hasPen=p.penalty!=='';
  return `<div class="gm-v36-player${hasPen?' has-penalty':''}${p.empty?' is-empty':''}"><span class="gm-v36-player__name" title="${esc(p.name)}">${esc(p.name)}</span><b class="gm-v36-score">${esc(p.score||'—')}</b>${hasPen?`<b class="gm-v36-penalty" title="Penales">${esc(p.penalty)}</b>`:''}</div>`;
}
function matchHTML(match,{final=false}={}){
  const d=matchData(match);
  return `<article class="gm-v36-match${final?' is-final':''}" data-v36-match>${playerHTML(d.p1)}${playerHTML(d.p2)}</article>`;
}
function roundTitle(round){return clean($('.gm-fixture-round__title',round)?.textContent)||'RONDA'}
function roundMatches(round){return $$('.gm-fixture-match',round)}
function trophySrc(finalRound,meta=null){
  return clean(meta?.trophyFixture)||clean(localTournament()?.trophyFixture)||$('.gm-final-cup img',finalRound)?.getAttribute('src')||$('[data-fixture-cup] img')?.getAttribute('src')||$('[data-detail-trophy] img')?.getAttribute('src')||'';
}
function makeColumn(round,idx,side,matches,height){
  const col=document.createElement('section');
  col.className=`gm-v36-round gm-v36-round--${side}`;
  col.dataset.side=side;col.dataset.roundIndex=String(idx);col.style.setProperty('--v36-height',`${height}px`);col.style.setProperty('--v36-height-mobile',`${Math.max(500,Math.round(height*.82))}px`);
  col.innerHTML=`<h4 class="gm-v36-round__title">${esc(displayRoundTitle(roundTitle(round)))}</h4><div class="gm-v36-round__matches">${matches.map(m=>matchHTML(m)).join('')}</div>`;
  return col;
}
async function hydrateMeta(bracket,finalRound){
  if(!bracket?.isConnected)return;
  const meta=await tournamentMeta();if(!bracket?.isConnected)return;
  const edition=editionNumber(meta),cup=trophySrc(finalRound,meta);
  if(edition){bracket.dataset.edition=String(edition);syncEditionMarker(bracket,edition);const label=$('.gm-v36-final-meta span',bracket);if(label)label.textContent=editionLabel(edition)}
  if(cup){
    bracket.dataset.trophyFixture=cup;
    const host=$('.gm-v36-trophy',bracket);if(host){let img=$('img',host);if(!img){host.innerHTML='<img alt="Copa del torneo" decoding="async">';img=$('img',host)}if(img&&img.getAttribute('src')!==cup)img.setAttribute('src',cup)}
  }
  bracket.dataset.metaReady='1';
  bracket.dispatchEvent(new CustomEvent('gmac:bracket-meta',{bubbles:true,detail:{edition,cup}}));
}
function enhance(source){
  if(!source||source.dataset.v36Enhanced==='1')return;
  const rounds=$$('.gm-fixture-round',source);
  const finalIndex=rounds.findIndex(r=>upper(roundTitle(r))==='FINAL');
  if(finalIndex<1)return;
  const finalRound=rounds[finalIndex];
  const finalMatch=roundMatches(finalRound)[0];if(!finalMatch)return;
  const competitive=rounds.slice(0,finalIndex).filter(r=>!upper(roundTitle(r)).includes('TERCER'));
  if(!competitive.length)return;
  const firstCount=roundMatches(competitive[0]).length;
  if(firstCount<2||firstCount%2!==0)return;
  const height=Math.max(520,Math.ceil(firstCount/2)*94+120);
  const shell=document.createElement('div');shell.className='gm-v36-bracket-shell';shell.tabIndex=0;shell.setAttribute('aria-label','Fixture eliminatorio desplazable');
  const hint=document.createElement('div');hint.className='gm-v36-scroll-hint';hint.textContent='Desliza horizontalmente para ver todo el fixture';
  const bracket=document.createElement('div');bracket.className='gm-v36-bracket';bracket.dataset.gmacBracket='';bracket.style.setProperty('--v36-height',`${height}px`);bracket.style.gridTemplateColumns=`repeat(${competitive.length},var(--v36-round-w)) var(--v36-final-w) repeat(${competitive.length},var(--v36-round-w))`;
  const id=tournamentId(),local=localTournament(id,pageGame()),initialEdition=editionNumber(local),initialCup=trophySrc(finalRound,local);if(id)bracket.dataset.tournamentId=id;if(initialEdition){bracket.dataset.edition=String(initialEdition);syncEditionMarker(bracket,initialEdition)}if(initialCup)bracket.dataset.trophyFixture=initialCup;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','gm-v36-connectors');svg.setAttribute('aria-hidden','true');bracket.appendChild(svg);
  competitive.forEach((round,idx)=>{const all=roundMatches(round),half=all.length/2;bracket.appendChild(makeColumn(round,idx,'left',all.slice(0,half),height))});
  const center=document.createElement('section');center.className='gm-v36-final-column';center.dataset.v36Final='';center.style.setProperty('--v36-height',`${height}px`);center.style.setProperty('--v36-height-mobile',`${Math.max(500,Math.round(height*.82))}px`);
  const ed=editionLabel(initialEdition);
  center.innerHTML=`<div class="gm-v36-final-card"><div class="gm-v36-final-grid"><div class="gm-v36-final-meta"><b>FINAL</b><span>${esc(ed)}</span></div><div class="gm-v36-trophy">${initialCup?`<img src="${esc(initialCup)}" alt="Copa del torneo" decoding="async">`:'<span>COPA PENDIENTE</span>'}</div><div class="gm-v36-final-match">${matchHTML(finalMatch,{final:true})}</div></div></div>`;
  bracket.appendChild(center);
  [...competitive].reverse().forEach((round,rev)=>{const idx=competitive.length-1-rev,all=roundMatches(round),half=all.length/2;bracket.appendChild(makeColumn(round,idx,'right',all.slice(half),height))});
  const third=rounds.find(r=>upper(roundTitle(r)).includes('TERCER'));
  if(third&&roundMatches(third)[0]){const box=document.createElement('div');box.className='gm-v36-third-place';box.innerHTML=matchHTML(roundMatches(third)[0]);bracket.appendChild(box)}
  shell.append(hint,bracket);source.insertAdjacentElement('beforebegin',shell);source.classList.add('gm-v36-source-hidden');source.dataset.v36Enhanced='1';source.setAttribute('aria-hidden','true');
  hydrateMeta(bracket,finalRound);requestAnimationFrame(()=>draw(bracket));
}
function point(el,host,edge){
  const r=el.getBoundingClientRect(),h=host.getBoundingClientRect();
  return{x:(edge==='left'?r.left:edge==='right'?r.right:r.left+r.width/2)-h.left,y:r.top+r.height/2-h.top};
}
function path(svg,a,b){
  const mid=(a.x+b.x)/2;const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} H ${mid.toFixed(1)} V ${b.y.toFixed(1)} H ${b.x.toFixed(1)}`);svg.appendChild(p);
}
function draw(bracket){
  if(!bracket?.isConnected)return;
  const svg=$('.gm-v36-connectors',bracket);if(!svg)return;svg.innerHTML='';svg.setAttribute('width',bracket.scrollWidth);svg.setAttribute('height',bracket.scrollHeight);svg.setAttribute('viewBox',`0 0 ${bracket.scrollWidth} ${bracket.scrollHeight}`);
  const indices=[...new Set($$('.gm-v36-round',bracket).map(x=>Number(x.dataset.roundIndex)))].sort((a,b)=>a-b);
  ['left','right'].forEach(side=>{
    for(let r=0;r<indices.length-1;r++){
      const outer=$(`.gm-v36-round[data-side="${side}"][data-round-index="${indices[r]}"]`,bracket);const inner=$(`.gm-v36-round[data-side="${side}"][data-round-index="${indices[r+1]}"]`,bracket);if(!outer||!inner)continue;
      const a=$$('[data-v36-match]',outer),b=$$('[data-v36-match]',inner);
      a.forEach((m,i)=>{const target=b[Math.floor(i/2)];if(!target)return;path(svg,point(m,bracket,side==='left'?'right':'left'),point(target,bracket,side==='left'?'left':'right'))});
    }
    const last=$(`.gm-v36-round[data-side="${side}"][data-round-index="${indices.at(-1)}"]`,bracket);const semi=$('[data-v36-match]',last);const final=$('[data-v36-final] [data-v36-match]',bracket);if(semi&&final)path(svg,point(semi,bracket,side==='left'?'right':'left'),point(final,bracket,side==='left'?'left':'right'));
  });
}
function enhanceAll(){
  $$('.gm-fixture--knockout').forEach(enhance);
  cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>$$('[data-gmac-bracket]').forEach(draw));
}
window.GMAC_ENHANCE_BRACKETS=enhanceAll;
const obs=new MutationObserver(()=>enhanceAll());
obs.observe(document.body,{childList:true,subtree:true});
addEventListener('resize',()=>{clearTimeout(window.__gmacV36Resize);window.__gmacV36Resize=setTimeout(()=>$$('[data-gmac-bracket]').forEach(draw),120)},{passive:true});
enhanceAll();
})();
