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
  const params=new URLSearchParams(location.search);
  const queryGame=params.get('game');
  const currentGame=queryGame||document.body.dataset.game||'';
  const validGame=currentGame==='fc-mobile'||currentGame==='efootball';

  const nativeSetInterval=window.setInterval.bind(window);
  window.setInterval=(fn,delay,...args)=>{
    if(Number(delay)===30000&&document.querySelector('.gm-modal.gm-modal--readonly.is-open'))return 0;
    return nativeSetInterval(fn,delay,...args);
  };

  function fixtureModal(){return document.querySelector('.gm-modal')}
  function fixtureOnlyMode(){
    const modal=fixtureModal();if(!modal)return;
    modal.classList.add('gm-modal--fixture-only');
    const tag=modal.querySelector('.gm-modal__head .gm-tag');if(tag)tag.textContent='FIXTURE COMPLETO';
    const note=modal.querySelector('.gm-note');if(note)note.hidden=true;
    const code=modal.querySelector('#access-code');const codeField=code?.closest('.gm-field');if(codeField)codeField.hidden=true;
    const feedback=modal.querySelector('[data-feedback]');if(feedback)feedback.hidden=true;
    const reg=modal.querySelector('.gm-registration');if(reg)reg.hidden=true;
    setTimeout(()=>{if(document.activeElement===code)code.blur();window.GMAC_ENHANCE_BRACKETS?.()},80);
  }
  function registrationMode(){
    const modal=fixtureModal();if(!modal||!modal.classList.contains('gm-modal--fixture-only'))return;
    modal.classList.remove('gm-modal--fixture-only');
    const tag=modal.querySelector('.gm-modal__head .gm-tag');if(tag)tag.textContent='INSCRIPCIÓN CON CÓDIGO';
    const note=modal.querySelector('.gm-note');if(note)note.hidden=false;
    const code=modal.querySelector('#access-code');const codeField=code?.closest('.gm-field');if(codeField)codeField.hidden=false;
    const feedback=modal.querySelector('[data-feedback]');if(feedback)feedback.hidden=false;
    const reg=modal.querySelector('.gm-registration');if(reg)reg.hidden=false;
  }
  function fixtureHref(id){return `torneo.html?game=${encodeURIComponent(currentGame)}&id=${encodeURIComponent(id)}&fixture=1#competicion`}
  function syncFixtureShortcuts(){
    document.querySelectorAll('.gm-register-mini[data-register]').forEach(btn=>{
      const id=String(btn.dataset.register||'').trim();if(!id)return;
      const link=document.createElement('a');
      link.className=btn.className;
      link.href=fixtureHref(id);
      link.dataset.fixtureShortcut='1';
      link.title='Ver fixture completo';
      link.setAttribute('aria-label','Ver fixture completo del torneo');
      link.innerHTML=btn.innerHTML||'＋';
      btn.replaceWith(link);
    });
  }

  if(validGame){
    document.querySelectorAll('.rail-game-link,.mobile-game-links a').forEach(a=>{
      const active=a.getAttribute('href')?.startsWith(currentGame+'.html');
      a.classList.toggle('is-current',!!active);
      if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    syncFixtureShortcuts();
    const grid=document.querySelector('[data-tournament-grid]');
    if(grid)new MutationObserver(syncFixtureShortcuts).observe(grid,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      const btn=e.target.closest?.('[data-detail-register]');if(!btn)return;
      registrationMode();
    },true);
  }

  if(document.body.classList.contains('gm-detail-page')&&validGame){
    const id=String(params.get('id')||'').trim();
    if(id){
      const stateUrl=`/api/tournament-state?game=${encodeURIComponent(currentGame)}&tournamentId=${encodeURIComponent(id)}`;
      const absoluteStateUrl=new URL(stateUrl,location.href).href;
      const nativeFetch=window.fetch.bind(window);
      const prefetch=nativeFetch(stateUrl,{headers:{Accept:'application/json'}}).then(async r=>{
        if(!r.ok)return null;
        const data=await r.clone().json();
        return{data,status:r.status,statusText:r.statusText,headers:[...r.headers.entries()]};
      }).catch(()=>null);
      window.GMAC_STATE_PREFETCH=prefetch.then(x=>x?.data||null);
      window.fetch=(input,init)=>{
        let url='';try{url=new URL(typeof input==='string'?input:input?.url||'',location.href).href}catch(_){}
        if(url===absoluteStateUrl){
          return prefetch.then(hit=>{
            if(!hit)return nativeFetch(input,init);
            return new Response(JSON.stringify(hit.data),{status:hit.status||200,statusText:hit.statusText||'OK',headers:{'Content-Type':'application/json',...Object.fromEntries(hit.headers||[])}});
          });
        }
        return nativeFetch(input,init);
      };
      const autoFixture=params.get('fixture')==='1';
      const autoRegister=params.get('register')==='1';
      if(autoFixture||autoRegister){
        let tries=0;
        const openWhenReady=()=>{
          if(autoFixture&&String(document.querySelector('[data-detail-status]')?.textContent||'').toUpperCase().includes('FINALIZADO')){
            const btn=document.querySelector('[data-detail-register]');
            if(btn&&/VER FIXTURE/i.test(btn.textContent||'')){btn.click();return}
            if(++tries<100)setTimeout(openWhenReady,60);
            return;
          }
          if(typeof window.GM_OPEN_TOURNAMENT==='function'){
            try{
              const pending=window.GM_OPEN_TOURNAMENT(id);
              if(autoFixture){fixtureOnlyMode();Promise.resolve(pending).then(()=>fixtureOnlyMode()).catch(()=>{})}
            }catch(_){}
            return;
          }
          if(++tries<80)setTimeout(openWhenReady,50);
        };
        setTimeout(openWhenReady,0);
      }
    }
  }
  if(document.querySelector('[data-share-capture="fixture"]')||document.body.classList.contains('gm-detail-page')){
    if(!document.querySelector('link[data-gmac-bracket-v36]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='assets/css/bracket-v36.css?v=36.12';css.dataset.gmacBracketV36='';
      css.addEventListener('load',()=>requestAnimationFrame(()=>window.GMAC_ENHANCE_BRACKETS?.()));
      document.head.appendChild(css);
    }
    const bracket=document.createElement('script');bracket.src='assets/js/shared/bracket-v36.js?v=36.10';bracket.async=false;document.head.appendChild(bracket);
    const pdf=document.createElement('script');pdf.src='assets/js/shared/fixture-pdf-v39.js?v=39.2';pdf.async=false;document.head.appendChild(pdf);
    const history=document.createElement('script');history.src='assets/js/shared/fixture-history-pdf-v37.js?v=37.0';history.async=false;document.head.appendChild(history);
  }
  if(validGame){
    const participant=document.createElement('script');
    participant.src='assets/js/shared/participant-v35.js?v=35.0';
    participant.async=false;
    document.head.appendChild(participant);
  }
})();
