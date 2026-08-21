(()=>{
  const toggle=document.querySelector('[data-mobile-menu-toggle]');
  const menu=document.querySelector('[data-mobile-menu]');
  if(toggle&&menu){
    const close=()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')};
    toggle.addEventListener('click',()=>{const open=!menu.classList.contains('is-open');menu.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open)});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    addEventListener('resize',()=>{if(innerWidth>980)close()},{passive:true});
    addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  const queryGame=new URLSearchParams(location.search).get('game');
  const currentGame=queryGame||document.body.dataset.game||'';
  if(currentGame==='fc-mobile'||currentGame==='efootball'){
    document.querySelectorAll('.rail-game-link,.mobile-game-links a').forEach(a=>{
      const active=a.getAttribute('href')?.startsWith(currentGame+'.html');
      a.classList.toggle('is-current',!!active);
      if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  }
  if(document.querySelector('[data-share-capture="fixture"]')||document.body.classList.contains('gm-detail-page')){
    const script=document.createElement('script');
    script.src='assets/js/shared/fixture-history-pdf.js?v=32.0';
    script.async=false;
    document.head.appendChild(script);
  }
  if(currentGame==='fc-mobile'||currentGame==='efootball'){
    const participant=document.createElement('script');
    participant.src='assets/js/shared/participant-v35.js?v=35.0';
    participant.async=false;
    document.head.appendChild(participant);
  }
})();
