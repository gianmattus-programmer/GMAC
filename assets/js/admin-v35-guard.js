(()=>{
'use strict';
const $=(q,el=document)=>el.querySelector(q);
const $$=(q,el=document)=>[...el.querySelectorAll(q)];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
let scheduled=0;

function drawAllowed(stage){
  const s=upper(stage);
  return s.includes('GRUPO')||s.includes('LIGA')||s.includes('JORNADA')||s.includes('FASE LIGA');
}
function cardStage(card){return clean($('.match-top b',card)?.textContent)}
function scoreValue(card,sel){const el=$(sel,card);return el?clean(el.value):''}
function syncPenaltyCard(card){
  const box=$('.penalties',card);if(!box)return;
  const stage=cardStage(card),s1=scoreValue(card,'.s1'),s2=scoreValue(card,'.s2');
  const p1=$('.p1',card),p2=$('.p2',card),hasStored=clean(p1?.value)!==''||clean(p2?.value)!=='';
  const knockout=!drawAllowed(stage),tie=s1!==''&&s2!==''&&Number(s1)===Number(s2);
  const show=knockout&&(tie||hasStored);
  box.style.display=show?'grid':'none';
  box.setAttribute('aria-hidden',show?'false':'true');
  if(!show&&p1&&!p1.disabled)p1.value='';
  if(!show&&p2&&!p2.disabled)p2.value='';
  if(show){
    box.title='Los penales solo se guardan cuando el marcador del partido termina empatado.';
    if(p1)p1.required=tie&&!p1.disabled;
    if(p2)p2.required=tie&&!p2.disabled;
  }else{
    if(p1)p1.required=false;
    if(p2)p2.required=false;
  }
  if(card.dataset.v35PenaltyBound!=='1'){
    card.dataset.v35PenaltyBound='1';
    $$('.s1,.s2',card).forEach(input=>input.addEventListener('input',()=>syncPenaltyCard(card)));
  }
}
function syncPenalties(){ $$('.match-card').forEach(syncPenaltyCard) }

function ensureFlow(){
  const summary=$('#tournamentSummary');if(!summary||$('#v35GuardFlow')||document.querySelector('[data-v35-flow]'))return;
  const flow=document.createElement('div');flow.id='v35GuardFlow';flow.className='v35-guard-flow';flow.setAttribute('aria-label','Flujo de la edición');
  flow.innerHTML=['Crear','Activar','Inscripciones','Fixture','Resultados','Final','Finalizado'].map((label,i)=>`<span data-step="${i}"><b>${i+1}</b>${label}</span>`).join('');
  summary.insertAdjacentElement('afterend',flow);
}
function flowIndex(){
  const summary=$('#tournamentSummary');if(!summary||summary.classList.contains('empty'))return-1;
  const text=upper(summary.textContent),cards=$$('.match-card'),finalCard=cards.find(c=>upper(cardStage(c))==='FINAL');
  if(text.includes('FINALIZADO'))return 6;
  if(finalCard&&scoreValue(finalCard,'.s1')!==''&&scoreValue(finalCard,'.s2')!=='')return 5;
  if(cards.some(c=>scoreValue(c,'.s1')!==''&&scoreValue(c,'.s2')!==''))return 4;
  if(cards.length)return 3;
  const regCount=Number(clean($('#registrationCount')?.textContent))||0;
  if(text.includes('ABIERTAS')||text.includes('CERRADAS')||regCount>0)return 2;
  if(text.includes('VIGENTE'))return 1;
  return 0;
}
function syncFlow(){
  ensureFlow();const flow=$('#v35GuardFlow');if(!flow)return;const at=flowIndex();
  $$('[data-step]',flow).forEach(step=>{const i=Number(step.dataset.step);step.classList.toggle('is-done',i<at);step.classList.toggle('is-current',i===at)});
}

function ensureAudit(){
  if($('#v35GuardAudit')||document.querySelector('[data-v35-audit]'))return;
  const matches=$('.matches-panel');if(!matches)return;
  const panel=document.createElement('section');panel.id='v35GuardAudit';panel.className='panel v35-guard-audit';panel.innerHTML='<div class="panel-heading"><div><p class="eyebrow">AUDITORÍA</p><h2>Control de consistencia</h2></div><span class="count-pill" data-audit-count>0</span></div><div data-audit-body class="v35-guard-audit__body">Sin inconsistencias detectadas.</div>';
  matches.insertAdjacentElement('afterend',panel);
}
function auditIssues(){
  const issues=[];
  const nicks=$$('#registrationsBody tr td:first-child b').map(el=>upper(el.textContent)).filter(Boolean);
  const dupNicks=[...new Set(nicks.filter((x,i)=>nicks.indexOf(x)!==i))];
  if(dupNicks.length)issues.push(`Nicks duplicados: ${dupNicks.join(', ')}`);
  const codes=$$('#codesBody tr .code-value').map(el=>upper(el.textContent)).filter(Boolean);
  const dupCodes=[...new Set(codes.filter((x,i)=>codes.indexOf(x)!==i))];
  if(dupCodes.length)issues.push(`Códigos duplicados: ${dupCodes.length}`);
  $$('.match-card').forEach(card=>{
    const stage=cardStage(card),players=$$('.player-line b',card).map(x=>upper(x.textContent));
    const defined=players.map(x=>x&&x!=='POR DEFINIR');
    if(defined[0]!==defined[1])issues.push(`${stage||card.dataset.match}: falta un participante.`);
    const s1=scoreValue(card,'.s1'),s2=scoreValue(card,'.s2');
    if(!drawAllowed(stage)&&s1!==''&&s2!==''&&Number(s1)===Number(s2)){
      const p1=scoreValue(card,'.p1'),p2=scoreValue(card,'.p2');
      if(p1===''||p2==='')issues.push(`${stage||card.dataset.match}: empate pendiente de penales.`);
      else if(Number(p1)===Number(p2))issues.push(`${stage||card.dataset.match}: los penales no definen ganador.`);
    }
  });
  return [...new Set(issues)].slice(0,8);
}
function syncAudit(){
  ensureAudit();const panel=$('#v35GuardAudit');if(!panel)return;const issues=auditIssues();
  const count=$('[data-audit-count]',panel),body=$('[data-audit-body]',panel),countText=String(issues.length);
  if(count&&count.textContent!==countText)count.textContent=countText;
  panel.classList.toggle('has-issues',issues.length>0);
  const html=issues.length?`<ul>${issues.map(x=>`<li>${x.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</li>`).join('')}</ul>`:'Sin inconsistencias detectadas en la vista cargada.';
  if(body&&body.innerHTML!==html)body.innerHTML=html;
}

function injectStyle(){
  if($('#v35GuardStyle'))return;const style=document.createElement('style');style.id='v35GuardStyle';style.textContent=`
.v35-guard-flow{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin:12px 0 14px}.v35-guard-flow span{min-height:48px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:8px;display:flex;align-items:center;gap:7px;font-size:.68rem;font-weight:850;color:var(--muted)}.v35-guard-flow b{width:22px;height:22px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;font-size:.62rem;color:var(--ink)}.v35-guard-flow span.is-done{border-color:#a9c2ef;color:var(--blue)}.v35-guard-flow span.is-done b{background:var(--blue);border-color:var(--blue);color:#fff}.v35-guard-flow span.is-current{border-color:var(--ink);color:var(--ink)}.v35-guard-flow span.is-current b{background:var(--ink);border-color:var(--ink);color:#fff}.v35-guard-audit__body{border:1px solid var(--line);border-radius:12px;background:#fff;padding:13px 14px;font-size:.78rem;color:var(--muted)}.v35-guard-audit__body ul{margin:0;padding-left:18px;color:var(--danger);display:grid;gap:6px}.v35-guard-audit.has-issues [data-audit-count]{border-color:#d8aaaa;color:var(--danger)}@media(max-width:860px){.v35-guard-flow{grid-template-columns:repeat(4,minmax(120px,1fr));overflow-x:auto;padding-bottom:3px}}@media(max-width:560px){.v35-guard-flow{display:flex;overflow-x:auto}.v35-guard-flow span{min-width:128px}}
`;
  document.head.appendChild(style);
}
function run(){injectStyle();syncPenalties();syncFlow();syncAudit()}
function schedule(){cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(run)}
const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
document.addEventListener('input',e=>{if(e.target.matches?.('.score-input'))schedule()});
run();
})();
