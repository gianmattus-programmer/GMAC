(()=>{
  const $=(q,el=document)=>el.querySelector(q), $$=(q,el=document)=>[...el.querySelectorAll(q)];
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fileSafe=v=>clean(v||'gmac').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'gmac';
  const colors={bg:'#18191a',panel:'#262728',panel2:'#202122',line:'#505154',text:'#f4f3ee',muted:'#a7a8aa',paper:'#f4f3ee',ink:'#111214',blue:'#315fd6',soft:'#deddd7'};
  const MAX_CANVAS_DIM=15000;

  const RR=(ctx,x,y,w,h,r,fill,stroke)=>{
    r=Math.min(r,w/2,h/2);ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
  };
  const setFont=(ctx,size=24,weight=700)=>{ctx.font=`${weight} ${size}px Arial, Helvetica, sans-serif`};
  const txt=(ctx,t,x,y,size=24,weight=700,color=colors.text,align='left')=>{ctx.fillStyle=color;setFont(ctx,size,weight);ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(clean(t),x,y)};
  const fitTxt=(ctx,t,x,y,maxWidth,size=24,weight=700,color=colors.text,align='left',min=10)=>{
    const value=clean(t);let s=size;setFont(ctx,s,weight);while(s>min&&ctx.measureText(value).width>maxWidth){s-=1;setFont(ctx,s,weight)}
    let out=value;if(ctx.measureText(out).width>maxWidth){while(out.length>2&&ctx.measureText(out+'…').width>maxWidth)out=out.slice(0,-1);out+='…'}
    ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(out,x,y);return s;
  };
  function makeCanvas(w,h,preferredScale=2.4){
    const scale=Math.max(1.35,Math.min(preferredScale,MAX_CANVAS_DIM/Math.max(w,h)));
    const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);
    const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas no disponible.');ctx.scale(scale,scale);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    return {c,ctx,scale};
  }
  function brand(ctx,w,title,sub){
    ctx.fillStyle=colors.bg;ctx.fillRect(0,0,w,170);
    txt(ctx,'GMAC',48,49,26,900,colors.paper);txt(ctx,title,48,96,40,900,colors.text);
    fitTxt(ctx,sub,48,132,w-220,17,700,colors.muted,'left',12);
    ctx.strokeStyle='#68696b';ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(48,151);ctx.lineTo(w-48,151);ctx.stroke();ctx.setLineDash([]);
  }
  function drawLoadedImage(ctx,img,x,y,w,h){try{if(img&&img.complete&&img.naturalWidth){const r=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*r,dh=img.naturalHeight*r;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);return true}}catch(e){}return false}
  function getCup(target){const panel=target.closest?.('.gm-fixture-panel')||target;return $('.gm-fixture-cup img',panel)||$('.gm-final-cup img',panel)||$('.gm-league-podium__cup img',panel)}

  function tableData(table){
    return {
      heads:$$('thead th',table).map(x=>clean(x.textContent)),
      rows:$$('tbody tr',table).map(tr=>({cells:$$('td',tr).map(td=>clean(td.textContent)),qualifying:tr.classList.contains('is-qualifying'),eliminated:tr.classList.contains('is-eliminated')}))
    };
  }
  function playerInfo(el){
    if(!el)return{name:'POR DEFINIR',score:null,penalty:null};
    const name=clean($(':scope > span',el)?.textContent||'POR DEFINIR');
    const scoreEl=$('.gm-inline-score',el),penEl=$('.gm-inline-penalty',el);
    const score=scoreEl?Number(clean(scoreEl.textContent)):null;
    const penRaw=penEl?clean(penEl.textContent).match(/\d+/):null;
    return {name:name||'POR DEFINIR',score:Number.isFinite(score)?score:null,penalty:penRaw?Number(penRaw[0]):null};
  }
  function matchInfo(m){
    const players=$$('.gm-fixture-player',m),a=playerInfo(players[0]),b=playerInfo(players[1]);
    if(a.score==null||b.score==null){
      const readonly=clean($('.gm-result-readonly b',m)?.textContent||'');const nums=readonly.match(/\d+/g);
      if(nums&&nums.length>=2){a.score=Number(nums[0]);b.score=Number(nums[1])}
    }
    if(a.penalty==null||b.penalty==null){
      const pens=clean($('.gm-penalty-readonly',m)?.textContent||'').match(/\d+/g);
      if(pens&&pens.length>=2){a.penalty=Number(pens[0]);b.penalty=Number(pens[1])}
    }
    const played=Number.isFinite(a.score)&&Number.isFinite(b.score);
    return {p1:a.name,p2:b.name,s1:a.score,s2:b.score,pen1:a.penalty,pen2:b.penalty,played};
  }

  function drawGroupTable(ctx,x,y,w,heads,rows,{compact=false}={}){
    const rowH=compact?38:52,headH=compact?42:58;
    const cols=compact?[50,w-50-82-82,82,82]:[56,330,66,62,62,62,66,66,66,72];
    const wanted=heads.slice(0,cols.length),total=cols.reduce((a,b)=>a+b,0),scale=Math.min(1,(w-24)/total);let xx=x+12;
    ctx.fillStyle='#343536';ctx.fillRect(x+2,y+2,w-4,headH-2);
    wanted.forEach((hd,i)=>{const wd=cols[i]*scale;txt(ctx,hd,xx+wd/2,y+(compact?27:37),compact?11:13,900,colors.muted,'center');xx+=wd});
    rows.forEach((row,ri)=>{
      const cells=row.cells||row,yy=y+headH+ri*rowH,qualified=!!row.qualifying;
      if(qualified){ctx.fillStyle=colors.paper;ctx.fillRect(x+2,yy,w-4,rowH)}
      else if(ri%2===1){ctx.fillStyle='#2c2d2e';ctx.fillRect(x+2,yy,w-4,rowH)}
      ctx.strokeStyle=qualified?'#d7d6d1':'#414245';ctx.beginPath();ctx.moveTo(x+12,yy);ctx.lineTo(x+w-12,yy);ctx.stroke();
      let px=x+12;cells.slice(0,cols.length).forEach((cell,i)=>{const wd=cols[i]*scale,col=qualified?colors.ink:colors.text;fitTxt(ctx,cell,i===1?px+5:px+wd/2,yy+(compact?25:34),wd-(i===1?10:4),compact?(i===1?12:11):(i===1?15:13),i===1?850:750,col,i===1?'left':'center',9);px+=wd});
    });
    return headH+rows.length*rowH;
  }

  function groupCanvas(card){
    const table=$('.gm-standings',card);if(!table)throw new Error('No se encontró la tabla del grupo.');
    const {heads,rows}=tableData(table),title=clean($('h4',card)?.textContent||'GRUPO'),subtitle=clean($('.gm-group-card__head span',card)?.textContent||'FASE DE GRUPOS');
    const w=1120,top=190,tableH=58+rows.length*52,footer=92,h=top+tableH+footer,{c,ctx}=makeCanvas(w,h,2.7);
    ctx.fillStyle=colors.bg;ctx.fillRect(0,0,w,h);brand(ctx,w,title,subtitle);
    const x=44,y=190,tw=w-88;RR(ctx,x,y,tw,tableH,18,colors.panel,colors.line);drawGroupTable(ctx,x,y,tw,heads,rows);
    const cup=getCup(card);if(cup)drawLoadedImage(ctx,cup,w-150,h-80,92,60);txt(ctx,'GMAC · CAPTURA EN ALTA RESOLUCIÓN',48,h-35,14,800,colors.muted);return c;
  }

  function fixtureSections(panel){
    const groups=$$('.gm-group-card',panel),rounds=$$('.gm-fixture-round',panel),leagueTable=$('.gm-standings',panel);
    const groupData=groups.map(g=>{
      const table=$('.gm-standings',g),td=table?tableData(table):{heads:[],rows:[]};
      return {title:clean($('h4',g)?.textContent||'GRUPO'),sub:clean($('.gm-group-card__head span',g)?.textContent||''),heads:td.heads,rows:td.rows.map(r=>({cells:[r.cells[0],r.cells[1],r.cells[2],r.cells[9]],qualifying:r.qualifying}))};
    });
    const roundData=rounds.map(r=>({title:clean($('.gm-fixture-round__title',r)?.textContent||'RONDA'),rows:$$('.gm-fixture-match',r).map(matchInfo)}));
    let league=null;if(!groups.length&&!rounds.length&&leagueTable){const td=tableData(leagueTable);league={title:'TABLA DE POSICIONES',heads:td.heads,rows:td.rows.map(r=>({cells:[r.cells[0],r.cells[1],r.cells[2],r.cells[9]],qualifying:r.qualifying}))}}
    return {groups:groupData,rounds:roundData,league};
  }

  function roundLayout(round,w){
    const cols=round.rows.length>=8?2:1,gap=14,innerW=w-36,colW=(innerW-gap*(cols-1))/cols,rowCount=Math.ceil(Math.max(1,round.rows.length)/cols),matchH=56;
    return {cols,gap,colW,rowCount,matchH,height:52+rowCount*(matchH+8)+10};
  }
  function drawMatchRow(ctx,x,y,w,m,index){
    RR(ctx,x,y,w,56,9,colors.panel2,'#444548');
    const center=w<560?104:128,nameW=(w-center-58)/2;
    txt(ctx,String(index+1).padStart(2,'0'),x+17,y+34,11,900,colors.muted,'left');
    fitTxt(ctx,m.p1||'POR DEFINIR',x+42,y+35,nameW,14,850,colors.text,'left',10);
    fitTxt(ctx,m.p2||'POR DEFINIR',x+w-18,y+35,nameW,14,850,colors.text,'right',10);
    if(m.played){
      const scoreText=`${m.s1} — ${m.s2}`,scoreW=76,scoreX=x+w/2-scoreW/2;
      RR(ctx,scoreX,y+10,scoreW,36,8,colors.paper,colors.paper);txt(ctx,scoreText,x+w/2,y+35,16,950,colors.ink,'center');
      if(Number.isFinite(m.pen1)&&Number.isFinite(m.pen2)){
        const pText=`P ${m.pen1}—${m.pen2}`,pw=64,px=Math.min(x+w-70,scoreX+scoreW+7);RR(ctx,px,y+14,pw,28,7,colors.soft,colors.soft);txt(ctx,pText,px+pw/2,y+34,11,950,colors.ink,'center');
      }
    }else txt(ctx,'VS',x+w/2,y+35,11,900,colors.muted,'center');
  }

  function fixtureCanvas(panel){
    const caption=clean($('[data-fixture-caption]',panel)?.textContent||$('.gm-fixture-panel__head p',panel)?.textContent||'Fixture del torneo');
    const data=fixtureSections(panel),w=1200,gap=20,margin=44,colW=(w-margin*2-gap)/2;
    const groupCardH=g=>54+42+Math.max(1,g.rows.length)*38+12;
    let groupHeight=0;if(data.groups.length){for(let i=0;i<data.groups.length;i+=2)groupHeight+=Math.max(groupCardH(data.groups[i]),data.groups[i+1]?groupCardH(data.groups[i+1]):0)+gap;groupHeight+=56}
    let roundHeight=0;data.rounds.forEach(r=>roundHeight+=roundLayout(r,w-margin*2).height+18);
    let leagueHeight=data.league?92+Math.max(1,data.league.rows.length)*42+30:0;
    const h=Math.max(600,205+groupHeight+roundHeight+leagueHeight+80),{c,ctx}=makeCanvas(w,h,2.4);
    ctx.fillStyle=colors.bg;ctx.fillRect(0,0,w,h);brand(ctx,w,'FIXTURE DEL TORNEO',caption);const cup=getCup(panel);if(cup)drawLoadedImage(ctx,cup,w-168,17,104,122);let y=186;

    if(data.groups.length){
      txt(ctx,'FASE DE GRUPOS · SOLO IDA',margin,y+31,23,900,colors.paper);y+=55;
      for(let i=0;i<data.groups.length;i+=2){
        const pair=[data.groups[i],data.groups[i+1]].filter(Boolean),rowH=Math.max(...pair.map(groupCardH));
        pair.forEach((g,ci)=>{
          const x=margin+ci*(colW+gap),gh=groupCardH(g);RR(ctx,x,y,colW,gh,14,colors.panel,colors.line);
          txt(ctx,g.title,x+15,y+30,18,900,colors.paper);fitTxt(ctx,g.sub,x+colW-15,y+29,colW*.48,10,850,colors.muted,'right',8);
          const rows=g.rows.map(r=>({cells:r.cells,qualifying:r.qualifying}));drawGroupTable(ctx,x,y+43,colW,['POS','JUGADOR','PJ','PTS'],rows,{compact:true});
        });y+=rowH+gap;
      }
    }

    data.rounds.forEach(r=>{
      const layout=roundLayout(r,w-margin*2);RR(ctx,margin,y,w-margin*2,layout.height,16,colors.panel,colors.line);txt(ctx,r.title,margin+18,y+34,21,900,colors.paper);
      const startY=y+52;r.rows.forEach((m,i)=>{const col=i%layout.cols,row=Math.floor(i/layout.cols),x=margin+18+col*(layout.colW+layout.gap),yy=startY+row*(layout.matchH+8);drawMatchRow(ctx,x,yy,layout.colW,m,i)});
      y+=layout.height+18;
    });

    if(data.league){
      const r=data.league,boxH=58+42+Math.max(1,r.rows.length)*42+18;RR(ctx,margin,y,w-margin*2,boxH,16,colors.panel,colors.line);txt(ctx,r.title,margin+18,y+34,21,900,colors.paper);
      drawGroupTable(ctx,margin+14,y+50,w-margin*2-28,['POS','JUGADOR','PJ','PTS'],r.rows,{compact:true});y+=boxH+18;
    }
    txt(ctx,'GMAC · FC MOBILE / eFOOTBALL · PNG ALTA RESOLUCIÓN',48,h-32,14,800,colors.muted);return c;
  }

  function canvasToBlob(canvas){return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>{if(blob)return resolve(blob);try{const data=canvas.toDataURL('image/png'),bin=atob(data.split(',')[1]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);resolve(new Blob([bytes],{type:'image/png'}))}catch(e){reject(e)}},'image/png')}catch(e){reject(e)}})}
  function toast(message){let el=$('.gm-share-toast');if(!el){el=document.createElement('div');el.className='gm-share-toast';document.body.appendChild(el)}el.textContent=message;el.classList.add('is-visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('is-visible'),3200)}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);try{a.click()}catch(e){window.open(url,'_blank','noopener')}a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
  function removePreview(){const old=$('.gm-capture-preview');if(old){const url=old.dataset.objectUrl;if(url)URL.revokeObjectURL(url);old.remove()}}
  function showPreview(blob,name,label){
    removePreview();const url=URL.createObjectURL(blob),wrap=document.createElement('div');wrap.className='gm-capture-preview';wrap.dataset.objectUrl=url;
    wrap.innerHTML=`<div class="gm-capture-preview__backdrop" data-capture-close></div><section class="gm-capture-preview__panel" role="dialog" aria-modal="true" aria-label="Vista previa de captura"><div class="gm-capture-preview__head"><div><small>PNG ALTA RESOLUCIÓN</small><b>${clean(label)}</b></div><button type="button" data-capture-close aria-label="Cerrar">×</button></div><div class="gm-capture-preview__image"><img alt="Vista previa de ${clean(label)}"></div><div class="gm-capture-preview__actions"><button type="button" class="gm-share-capture gm-share-capture--primary" data-capture-native>COMPARTIR ↗</button><button type="button" class="gm-share-capture" data-capture-download>DESCARGAR PNG ↓</button></div><p class="gm-capture-preview__help">La captura se genera con resolución ampliada para conservar texto y marcadores al hacer zoom. En fixtures grandes la vista previa se reduce, pero el PNG mantiene su resolución completa.</p></section>`;
    $('.gm-capture-preview__image img',wrap).src=url;document.body.appendChild(wrap);document.body.classList.add('gm-capture-open');
    $('[data-capture-download]',wrap).addEventListener('click',()=>{download(blob,name);toast('PNG en alta resolución descargado.')});
    $('[data-capture-native]',wrap).addEventListener('click',async ev=>{const b=ev.currentTarget,old=b.textContent;try{if(!window.isSecureContext||!navigator.share){download(blob,name);toast('Tu navegador no permite compartir archivos aquí. Descargué el PNG.');return}let file;try{file=new File([blob],name,{type:'image/png'})}catch(e){download(blob,name);toast('Este navegador no admite archivos compartidos. Descargué el PNG.');return}if(navigator.canShare&&!navigator.canShare({files:[file]})){download(blob,name);toast('Tu navegador no admite compartir imágenes. Descargué el PNG.');return}b.textContent='ABRIENDO…';await navigator.share({title:`GMAC · ${label}`,text:`${label} · GMAC`,files:[file]});toast('Compartido correctamente.')}catch(err){if(err?.name!=='AbortError'){console.error('[GMAC share]',err);toast('No se pudo abrir el menú de compartir. Puedes descargar el PNG.')}}finally{b.textContent=old}});
    wrap.querySelectorAll('[data-capture-close]').forEach(el=>el.addEventListener('click',()=>{removePreview();document.body.classList.remove('gm-capture-open')}));
  }

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-share-capture]');if(!btn)return;e.preventDefault();const kind=btn.dataset.shareCapture,target=kind==='group'?btn.closest('.gm-group-card'):btn.closest('.gm-fixture-panel');if(!target){toast('No se encontró el contenido para capturar.');return}
    const old=btn.textContent;btn.disabled=true;btn.textContent='GENERANDO…';
    try{const canvas=kind==='group'?groupCanvas(target):fixtureCanvas(target),blob=await canvasToBlob(canvas);if(!blob||!blob.size)throw new Error('La imagen generada está vacía.');const name=`${fileSafe(btn.dataset.shareName||(kind==='group'?'grupo-gmac':'fixture-gmac'))}.png`,label=kind==='group'?`Grupo ${target.dataset.groupCard||''}`:'Fixture del torneo';showPreview(blob,name,label);toast('Captura de alta resolución generada.');}
    catch(err){console.error('[GMAC capture]',err);toast(`No se pudo generar la captura${err?.message?': '+err.message:''}.`)}
    finally{btn.disabled=false;btn.textContent=old}
  },{passive:false});
})();
