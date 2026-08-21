(()=>{
'use strict';
const $=(q,el=document)=>el?.querySelector?.(q)||null;
const $$=(q,el=document)=>el?.querySelectorAll?[...el.querySelectorAll(q)]:[];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const isFinalized=()=>document.body.classList.contains('gm-detail-page')&&upper($('[data-detail-status]')?.textContent).includes('FINALIZADO');

function toast(message){
  let el=$('.gm-share-toast');
  if(!el){el=document.createElement('div');el.className='gm-share-toast';document.body.appendChild(el)}
  el.textContent=message;el.classList.add('is-visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('is-visible'),3200);
}
function syncFinalizedButtons(){
  if(!isFinalized())return;
  $$('[data-detail-register]').forEach(btn=>{
    btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');
    btn.innerHTML='VER FIXTURE COMPLETO <span>➜</span>';
    btn.setAttribute('aria-label','Ver fixture completo con todos los resultados');
  });
}
function makeReadonlyModal(){
  const modal=$('.gm-modal');if(!modal)return;
  modal.classList.add('gm-modal--readonly','gm-modal--fixture-only');
  const tag=$('.gm-modal__head .gm-tag',modal);if(tag)tag.textContent='HISTORIAL DEL TORNEO';
  const note=$('.gm-note',modal);if(note)note.hidden=true;
  const code=$('#access-code',modal);const field=code?.closest('.gm-field');if(field)field.hidden=true;
  const feedback=$('[data-feedback]',modal);if(feedback)feedback.hidden=true;
  const reg=$('.gm-registration',modal);if(reg)reg.hidden=true;
  const msg=$('[data-fixture-message]',modal);if(msg)msg.textContent='Edición finalizada · fixture histórico con todos los participantes y resultados oficiales.';
  if(document.activeElement===code)code.blur();
  requestAnimationFrame(()=>window.GMAC_ENHANCE_BRACKETS?.());
}
function openFinalizedFixture(btn){
  const id=clean(btn?.dataset?.register)||clean(new URLSearchParams(location.search).get('id'));
  const original=window.GM_OPEN_TOURNAMENT;
  if(!id||typeof original!=='function'){toast('No se pudo abrir el fixture histórico.');return}

  // registration.js redirige los torneos finalizados antes de abrir el modal.
  // Durante esa única búsqueda se presenta el registro como vigente; después
  // se restaura inmediatamente. No se modifica Google Sheets ni el backend.
  const nativeFind=Array.prototype.find;let touched=null,oldStatus;
  Array.prototype.find=function(predicate,thisArg){
    const found=nativeFind.call(this,predicate,thisArg);
    if(found&&String(found.id)===String(id)){touched=found;oldStatus=found.status;found.status='Vigente'}
    return found;
  };
  try{
    const pending=original(id);
    makeReadonlyModal();
    Promise.resolve(pending).then(()=>{makeReadonlyModal();window.GMAC_ENHANCE_BRACKETS?.()}).catch(err=>{
      console.error('[GMAC historial]',err);toast('No se pudo cargar el fixture histórico.');
    });
  }finally{
    Array.prototype.find=nativeFind;
    if(touched)touched.status=oldStatus;
  }
}

document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-detail-register]');
  if(!btn||!isFinalized())return;
  e.preventDefault();e.stopImmediatePropagation();openFinalizedFixture(btn);
},true);

const status=$('[data-detail-status]');
if(status)new MutationObserver(syncFinalizedButtons).observe(status,{childList:true,subtree:true,characterData:true});
syncFinalizedButtons();
})();
