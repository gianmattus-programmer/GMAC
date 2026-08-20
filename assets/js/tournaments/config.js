// GMAC producción. La web usa exclusivamente la API oficial.
window.GM_ENV = 'production';

// Evita que un participante abra por error la inscripción de otra edición
// de la misma competición. Solo las tarjetas VIGENTES pueden inscribir.
(()=>{
  function guardTournamentCards(root=document){
    root.querySelectorAll?.('.gm-card[data-status]').forEach(card=>{
      const button=card.querySelector('[data-register]');
      if(!button)return;
      const isLive=String(card.dataset.status||'').toLowerCase()==='vigente';
      if(!isLive){
        button.disabled=true;
        button.removeAttribute('data-register');
        button.setAttribute('aria-disabled','true');
        button.title='Inscripciones disponibles cuando esta edición esté VIGENTE';
        button.setAttribute('aria-label','Inscripciones cerradas para esta edición');
      }
    });
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-register]');
    if(!button)return;
    const card=button.closest('.gm-card');
    if(card&&String(card.dataset.status||'').toLowerCase()!=='vigente'){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const edition=card?.querySelector('.gm-card__edition')?.textContent?.trim();
    if(edition){
      setTimeout(()=>{
        const title=document.querySelector('[data-selected-tournament]');
        if(title&&!title.textContent.includes(edition))title.textContent=`${title.textContent} · ${edition}`;
      },0);
    }
  },true);

  const observer=new MutationObserver(()=>guardTournamentCards());
  const start=()=>{
    guardTournamentCards();
    observer.observe(document.documentElement,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
