(()=>{
  const qs=(s,p=document)=>p.querySelector(s);
  const qsa=(s,p=document)=>Array.from(p.querySelectorAll(s));

  qsa('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  const navLinks=qsa('[data-nav-link]');
  const sections=qsa('[data-section]');
  if('IntersectionObserver' in window&&navLinks.length&&sections.length){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      navLinks.forEach(a=>a.classList.toggle('is-active',a.dataset.navLink===visible.target.dataset.section));
    },{rootMargin:'-24% 0px -58% 0px',threshold:[0,.12,.35,.6]});
    sections.forEach(section=>observer.observe(section));
  }


  const trophyVisual=qs('[data-trophy-carousel]');
  if(trophyVisual){
    const competitionGroups=window.GM_COMPETITIONS||{};
    const competitionCups=[
      ...(competitionGroups['fc-mobile']||[]).map(x=>({...x,game:'fc-mobile'})),
      ...(competitionGroups.efootball||[]).map(x=>({...x,game:'efootball'}))
    ].filter(x=>x&&x.active!==false&&(x.trophyCover||x.trophyFixture));
    const cleanCupName=value=>String(value||'COPA GMAC')
      .replace(/\s*·\s*(FC Mobile|eFootball)\s*$/i,'')
      .trim();
    const cupCode=value=>{
      const words=cleanCupName(value)
        .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ]/g,' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter(w=>!/^(DE|DEL|LA|EL|THE|OF|Y)$/i.test(w));
      return (words.map(w=>w[0]).join('').slice(0,4)||'GMAC').toUpperCase();
    };
    const uniqueCups=new Map();
    competitionCups.forEach(cup=>{
      const src=cup.trophyCover||cup.trophyFixture;
      if(!src)return;
      const gameLabel=cup.game==='fc-mobile'?'FC Mobile':'eFootball';
      if(!uniqueCups.has(src)){
        const label=cleanCupName(cup.name);
        uniqueCups.set(src,{code:cupCode(label),name:label.toUpperCase(),subtitle:gameLabel,src,alt:`Trofeo ${label}`,games:new Set([gameLabel])});
      }else{
        const slide=uniqueCups.get(src);
        slide.games.add(gameLabel);
        slide.subtitle=[...slide.games].join(' · ');
      }
    });
    const trophySlides=[...uniqueCups.values()];
    const image=qs('[data-trophy-image]',trophyVisual);
    const code=qs('[data-trophy-code]',trophyVisual);
    const name=qs('[data-trophy-name]',trophyVisual);
    const subtitle=qs('[data-trophy-subtitle]',trophyVisual);
    const counter=qs('[data-trophy-counter]',trophyVisual);
    const prev=qs('[data-trophy-prev]',trophyVisual);
    const next=qs('[data-trophy-next]',trophyVisual);
    let trophyIndex=0,trophyTimer=0;
    const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const paint=()=>{
      const slide=trophySlides[trophyIndex];
      trophyVisual.classList.add('is-changing');
      window.setTimeout(()=>{
        if(image){image.decoding='async';image.src=slide.src;image.alt=slide.alt;const nextSlide=trophySlides[(trophyIndex+1)%trophySlides.length];if(nextSlide?.src){const preload=new Image();preload.decoding='async';preload.src=nextSlide.src}}
        if(code)code.textContent=slide.code;
        if(name)name.innerHTML=slide.name;
        if(subtitle)subtitle.textContent=slide.subtitle;
        if(counter)counter.textContent=`${String(trophyIndex+1).padStart(2,'0')} / ${String(trophySlides.length).padStart(2,'0')}`;
        trophyVisual.classList.remove('is-changing');
      },reduce?0:130);
    };
    const go=dir=>{trophyIndex=(trophyIndex+dir+trophySlides.length)%trophySlides.length;paint()};
    const stop=()=>{if(trophyTimer){clearInterval(trophyTimer);trophyTimer=0}};
    const start=()=>{stop();if(!reduce&&!document.hidden)trophyTimer=setInterval(()=>go(1),4800)};
    prev?.addEventListener('click',()=>{go(-1);start()});
    next?.addEventListener('click',()=>{go(1);start()});
    trophyVisual.addEventListener('mouseenter',stop);
    trophyVisual.addEventListener('mouseleave',start);
    trophyVisual.addEventListener('focusin',stop);
    trophyVisual.addEventListener('focusout',start);
    document.addEventListener('keydown',e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
      if(trophyVisual.matches(':hover')||trophyVisual.contains(document.activeElement)){
        e.preventDefault();go(e.key==='ArrowLeft'?-1:1);start();
      }
    });
    document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
    paint();start();
  }

  const tournaments=window.GM_TOURNAMENTS||{};
  const fc=(tournaments['fc-mobile']||[]).filter(x=>x&&x.visible!==false);
  const ef=(tournaments.efootball||[]).filter(x=>x&&x.visible!==false);
  const all=[...fc,...ef];
  const setText=(sel,val)=>{const el=qs(sel);if(el)el.textContent=val};
  setText('[data-stat-games]',String([fc,ef].filter(a=>a.length).length).padStart(2,'0'));
  setText('[data-stat-formats]',String(all.length).padStart(2,'0'));
  setText('[data-fc-count]',`${fc.length} formatos`);
  setText('[data-ef-count]',`${ef.length} formatos`);

  const host=qs('[data-featured-tournaments]');
  if(!host)return;
  const fcFeatured=fc.filter(x=>x.featured).slice(0,2).map(x=>({...x,game:'fc-mobile'}));
  const efHomeIds=['ef-relampago-champions-8','ef-relampago-pro-8'];
  const efFeatured=efHomeIds.map(id=>ef.find(x=>x.id===id)).filter(Boolean).map(x=>({...x,game:'efootball'}));
  const featured=[...fcFeatured,...efFeatured];
  const fallback=[...fc.slice(0,2).map(x=>({...x,game:'fc-mobile'})),...ef.slice(0,2).map(x=>({...x,game:'efootball'}))];
  const cards=(featured.length>=4?featured:fallback).slice(0,4);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const gameLabel=g=>g==='fc-mobile'?'FC MOBILE':'eFOOTBALL';
  const pageFor=g=>g==='fc-mobile'?'fc-mobile.html':'efootball.html';
  const status=x=>String(x.registrationStatus||x.status||'Próximamente');
  if(!cards.length){host.innerHTML='<article class="tournament-placeholder"><span>PRÓXIMOS TORNEOS EN PREPARACIÓN</span></article>';return}
  host.innerHTML=cards.map((t,i)=>{
    const cup=t.trophyCover||t.trophy||'';
    const link=t.id?`torneo.html?game=${encodeURIComponent(t.game)}&id=${encodeURIComponent(t.id)}`:`${pageFor(t.game)}#torneos`;
    const media=cup?`<img src="${esc(cup)}" alt="Copa de ${esc(t.title)}" loading="lazy" decoding="async" fetchpriority="low">`:`<div class="tournament-no-cup">${gameLabel(t.game)}</div>`;
    const open=/abiert/i.test(status(t));
    return `<a class="tournament-card" href="${link}"><div class="tournament-meta"><span>${String(i+1).padStart(2,'0')} · ${gameLabel(t.game)}</span><span class="${open?'open':''}">${esc(status(t))}</span></div><div class="tournament-media">${media}</div><h3>${esc(t.title||'Torneo GMAC')}</h3><p>${esc(t.format||t.desc||'Formato competitivo')}</p><div class="tournament-link"><span>${esc(t.slots||'—')} JUGADORES</span><span>VER TORNEO ↗</span></div></a>`;
  }).join('');
})();
