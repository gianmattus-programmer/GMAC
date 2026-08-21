const TAB_COMP='COMPETICIONES';
const TAB_TORNEOS='TORNEOS';
const TAB_CODIGOS='CODIGOS';
const TAB_INS='INSCRIPCIONES';
const TAB_PARTIDOS='PARTIDOS';
const TAB_WIN='GANADORES';
const TAB_MEDIA='MULTIMEDIA';
const TAB_CONFIG='CONFIG';
const TAB_AUDIT='AUDITORIA';

const HEADERS={
  [TAB_COMP]:['competition_id','juego','nombre','categoria','copa_portada','copa_fixture','participantes_defecto','tipo_defecto','estructura_defecto','formato_defecto','tamano_grupo','clasifican_grupo','vueltas_grupo','regla_partidos','descripcion','orden','activo','copa_portada_avif','copa_fixture_avif','copa_portada_file_id','copa_fixture_file_id','copa_portada_url','copa_fixture_url','copa_biblioteca'],
  [TAB_TORNEOS]:['id','competition_id','edicion','juego','titulo','tipo','cupos','fecha','hora','formato','estructura','tamano_grupo','clasifican_grupo','vueltas_grupo','copa_portada','copa_fixture','premio_1','premio_2','inscripcion','estado','inscripciones_estado','ganador','segundo_lugar','foto_ganador','instagram_ganador','fecha_finalizacion','descripcion','destacado','activo','creado_en','copa_portada_file_id','copa_fixture_file_id','copa_portada_url','copa_fixture_url'],
  [TAB_CODIGOS]:['codigo','torneo_id','juego','estado','usos_max','usos','fecha_creacion','fecha_uso','participante'],
  [TAB_INS]:['fecha_registro','torneo_id','juego','nombre','nick','contacto','ubicacion','tiktok','codigo','foto_url','estado'],
  [TAB_PARTIDOS]:['torneo_id','juego','partido_id','fase','grupo','jornada','jugador_1','jugador_2','goles_1','goles_2','penales_1','penales_2','ganador','estado','actualizado'],
  [TAB_WIN]:['competition_id','torneo_id','edicion','juego','competicion','primer_lugar','foto_primer_lugar','premio_1','segundo_lugar','premio_2','instagram_url','fecha_finalizacion','es_actual'],
  [TAB_MEDIA]:['torneo_id','juego','tipo','titulo','url','orden','activo'],
  [TAB_CONFIG]:['CLAVE','VALOR','DESCRIPCION'],
  [TAB_AUDIT]:['fecha','torneo_id','accion','detalle','actor']
};

function onOpen(){
  SpreadsheetApp.getUi().createMenu('GMAC Control Center')
    .addItem('Preparar / reparar sistema','setupGMAC')
    .addItem('Sincronizar biblioteca de copas','sincronizarBibliotecaCopas')
    .addItem('Diagnóstico biblioteca de copas','diagnosticoBibliotecaCopas')
    .addSeparator()
    .addItem('Nueva competición','nuevaCompeticion')
    .addItem('Nuevo torneo / edición','nuevoTorneo')
    .addItem('Activar torneo','activarTorneo')
    .addItem('Generar códigos','generarCodigosMenu')
    .addItem('Preparar fixture','prepararFixtureMenu')
    .addSeparator()
    .addItem('Actualizar enlace Instagram ganador','actualizarInstagramGanador')
    .addItem('Recalcular torneo actual','recalcularTorneoActual')
    .addToUi();
}

function setupGMAC(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',ss.getId());
  Object.keys(HEADERS).forEach(n=>ensureSheet_(ss,n,HEADERS[n]));
  upsertConfigDefaults_(ss);
  styleCore_(ss);
  let sync='';try{const r=syncCupLibrary_();sync=`\nCopas enlazadas: ${r.updated}. Faltantes: ${r.missing.length}.`;}catch(err){sync=`\nBiblioteca pendiente: ${err.message}`;}
  SpreadsheetApp.getUi().alert('GMAC listo. Usa el menú “GMAC Control Center”.'+sync);
}
function upsertConfigDefaults_(ss){
  const sh=ss.getSheetByName(TAB_CONFIG),existing=rows_(sh),hm=Object.fromEntries(existing.map(r=>[String(r.CLAVE),r]));
  const defaults=[
    ['SISTEMA','GMAC','Nombre de la plataforma'],
    ['UN_SOLO_TORNEO_VIGENTE','SI','Solo un torneo puede estar VIGENTE'],
    ['REGLA_PARTIDOS','SOLO_IDA','Toda competición es a partido único / una vuelta'],
    ['CODIGO_USOS_MAX','1','Cada código es de un solo uso'],
    ['GENERAR_CODIGOS_AL_CREAR_TORNEO','SI','Crea un código por cupo'],
    ['FINALIZAR_CON_FINAL','SI','La final o tabla completa archiva el torneo'],
    ['MOSTRAR_FIXTURE_FINALIZADO','NO','Los torneos finalizados no exponen el estado competitivo'],
    ['MONEDA','PEN','Moneda por defecto'],['ZONA_HORARIA','America/Lima','Zona horaria operativa'],
    ['COPAS_ROOT_FOLDER_ID','1hZAdbnpiClB9LF2bYARk8Dy58uTHWSJl','Carpeta raíz de trofeos'],
    ['COPAS_COMPARTIDAS_FOLDER_ID','1riwk6_IVCJOmY5dJ_cV4j5kFmetQd4v9','Copas para ambos juegos'],
    ['COPAS_FCM_PORTADAS_FOLDER_ID','1LqQsgJMdpSGAeOy6pw32ukmIeBkUmtbX','Portadas FC Mobile'],
    ['COPAS_FCM_FIXTURE_FOLDER_ID','1cdH-AVsZQ68laqJ2OqGmU_rc1dMhVV6f','Fixture FC Mobile'],
    ['COPAS_EF_PORTADAS_FOLDER_ID','123xu7eod32Bdwz0M68IlcobiqmmpLfKO','Portadas eFootball'],
    ['COPAS_EF_FIXTURE_FOLDER_ID','1cqu-Fm16LegEYOLebEDjsj6GIEBIAvK_','Fixture eFootball'],
    ['COPAS_PUBLICAS','SI','Compartir AVIF con enlace para que la web pueda mostrarlos'],['COPAS_FORMATO','AVIF','Formato de la biblioteca']
  ];
  defaults.forEach(v=>{if(!hm[v[0]])sh.appendRow(v)});
}

function ensureSheet_(ss,name,headers){
  let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);
  const cur=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String):[];
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);}
  else{
    headers.forEach((h,i)=>{if(cur[i]!==h)sh.getRange(1,i+1).setValue(h)});
  }
  sh.setFrozenRows(1);return sh;
}

function styleCore_(ss){
  const dark='#111214',blue='#315FD6',white='#FFFFFF',paper='#F4F3EE';
  [TAB_COMP,TAB_TORNEOS,TAB_CODIGOS,TAB_INS,TAB_PARTIDOS,TAB_WIN,TAB_MEDIA,TAB_CONFIG,TAB_AUDIT].forEach(name=>{
    const sh=ss.getSheetByName(name);if(!sh)return;
    sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).setBackground(dark).setFontColor(white).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const dash=ss.getSheetByName('DASHBOARD');if(dash){dash.setTabColor(blue);}
  const wins=ss.getSheetByName(TAB_WIN);if(wins)wins.setTabColor('#C99B3D');
}

function ss_(){const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('Ejecuta setupGMAC() primero.');return SpreadsheetApp.openById(id)}
function prop_(k){return PropertiesService.getScriptProperties().getProperty(k)||''}
function secretOk_(v){const expected=prop_('API_SECRET');return !!expected&&String(v||'')===expected}
function adminOk_(v){const expected=prop_('ADMIN_SECRET')||prop_('API_SECRET');return !!expected&&String(v||'')===expected}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
function rows_(sh){if(!sh)return[];const vals=sh.getDataRange().getValues();if(vals.length<2)return[];const h=vals.shift().map(String);return vals.filter(r=>r.some(v=>String(v).trim()!=='')).map((r,idx)=>Object.assign({_row:idx+2},Object.fromEntries(h.map((k,i)=>[k,r[i]]))))}
function headerMap_(sh){return Object.fromEntries(sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map((h,i)=>[String(h),i+1]))}
function bool_(v){return ['1','true','si','sí','yes','activo'].includes(String(v).toLowerCase().trim())}
function first_(...vals){for(const v of vals){if(v!==''&&v!==null&&v!==undefined)return v}return ''}
function norm_(v){return String(v||'').trim()}
function upper_(v){return norm_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function slug_(v){return norm_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,52)}
function code_(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='GMAC-';for(let i=0;i<4;i++)s+=chars[Math.floor(Math.random()*chars.length)];s+='-';for(let i=0;i<4;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s}
function dateText_(d){return Utilities.formatDate(d||new Date(),prop_('TZ')||'America/Lima','yyyy-MM-dd HH:mm:ss')}

function activeSS_(){
  const active=SpreadsheetApp.getActiveSpreadsheet();
  if(active){PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',active.getId());return active;}
  return ss_();
}
function configMapFromSS_(ss){return Object.fromEntries(rows_(ss.getSheetByName(TAB_CONFIG)).map(r=>[String(r.CLAVE),String(r.VALOR||'')]))}
function configMap_(){return configMapFromSS_(activeSS_())}
function driveImageUrl_(id){return id?'https://drive.google.com/uc?export=view&id='+encodeURIComponent(id):''}
function driveIdFromRef_(ref){const s=String(ref||'').trim();if(!s)return'';const m=s.match(/\/d\/([A-Za-z0-9_-]{20,})|folders\/([A-Za-z0-9_-]{20,})|[?&]id=([A-Za-z0-9_-]{20,})|^([A-Za-z0-9_-]{20,})$/);return m?(m[1]||m[2]||m[3]||m[4]||''):''}
function cupFolderForPath_(path,cfg){path=String(path||'');if(path.startsWith('COMPARTIDAS/'))return cfg.COPAS_COMPARTIDAS_FOLDER_ID;if(path.startsWith('FC-MOBILE/PORTADAS/'))return cfg.COPAS_FCM_PORTADAS_FOLDER_ID;if(path.startsWith('FC-MOBILE/FIXTURE/'))return cfg.COPAS_FCM_FIXTURE_FOLDER_ID;if(path.startsWith('EFOOTBALL/PORTADAS/'))return cfg.COPAS_EF_PORTADAS_FOLDER_ID;if(path.startsWith('EFOOTBALL/FIXTURE/'))return cfg.COPAS_EF_FIXTURE_FOLDER_ID;return''}
function basename_(p){return String(p||'').split('/').pop()||''}
function publicCupFile_(file,cfg){if(!file)return;try{if(upper_(cfg.COPAS_PUBLICAS)==='SI')file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW)}catch(err){console.log('No se pudo cambiar permiso de '+file.getName()+': '+err.message)} }
function indexFolder_(folderId,prefix,cfg,out){
  if(!folderId)throw new Error('Falta configurar carpeta: '+prefix);
  const folder=DriveApp.getFolderById(folderId),files=folder.getFiles();
  while(files.hasNext()){
    const file=files.next();
    if(String(file.getMimeType()).toLowerCase()!=='image/avif')continue;
    publicCupFile_(file,cfg);
    out[prefix+file.getName()]={id:file.getId(),url:driveImageUrl_(file.getId()),name:file.getName()};
  }
}
function buildCupIndex_(cfg){
  const out={};
  indexFolder_(cfg.COPAS_COMPARTIDAS_FOLDER_ID,'COMPARTIDAS/',cfg,out);
  indexFolder_(cfg.COPAS_FCM_PORTADAS_FOLDER_ID,'FC-MOBILE/PORTADAS/',cfg,out);
  indexFolder_(cfg.COPAS_FCM_FIXTURE_FOLDER_ID,'FC-MOBILE/FIXTURE/',cfg,out);
  indexFolder_(cfg.COPAS_EF_PORTADAS_FOLDER_ID,'EFOOTBALL/PORTADAS/',cfg,out);
  indexFolder_(cfg.COPAS_EF_FIXTURE_FOLDER_ID,'EFOOTBALL/FIXTURE/',cfg,out);
  return out;
}
function syncCupLibrary_(){
  const ss=activeSS_(),sh=ss.getSheetByName(TAB_COMP);
  if(!sh)throw new Error('No existe la hoja COMPETICIONES.');
  const hm=headerMap_(sh),cfg=configMapFromSS_(ss),index=buildCupIndex_(cfg),records=rows_(sh),missing=[];
  ['copa_portada_file_id','copa_fixture_file_id','copa_portada_url','copa_fixture_url'].forEach(h=>{if(!hm[h])throw new Error('Falta la columna '+h+' en COMPETICIONES.')});
  const matrix=records.map(r=>{
    const portada=String(r.copa_portada_avif||'').trim();
    const fixture=String(r.copa_fixture_avif||portada).trim();
    const a=index[portada],b=index[fixture];
    if(!a)missing.push(String(r.competition_id)+': '+portada);
    if(!b)missing.push(String(r.competition_id)+': '+fixture);
    return [a?a.id:'',b?b.id:'',a?a.url:'',b?b.url:''];
  });
  if(matrix.length)sh.getRange(2,hm.copa_portada_file_id,matrix.length,4).setValues(matrix);
  SpreadsheetApp.flush();
  return{ok:true,updated:matrix.filter(r=>r[0]).length,total:matrix.length,missing};
}
function sincronizarBibliotecaCopas(){
  try{const r=syncCupLibrary_();SpreadsheetApp.getUi().alert(`Biblioteca sincronizada.\nCompeticiones enlazadas: ${r.updated}/${r.total}\nReferencias faltantes: ${r.missing.length}${r.missing.length?'\n\n'+r.missing.slice(0,15).join('\n'):''}`)}
  catch(err){SpreadsheetApp.getUi().alert('Error al sincronizar copas:\n'+err.message);throw err;}
}
function diagnosticoBibliotecaCopas(){
  const ss=activeSS_(),sh=ss.getSheetByName(TAB_COMP),cfg=configMapFromSS_(ss),idx=buildCupIndex_(cfg),recs=rows_(sh);
  let okP=0,okF=0;const missing=[];
  recs.forEach(r=>{const p=String(r.copa_portada_avif||''),f=String(r.copa_fixture_avif||p);if(idx[p])okP++;else missing.push(p);if(idx[f])okF++;else missing.push(f)});
  SpreadsheetApp.getUi().alert(`Diagnóstico GMAC\nCompeticiones: ${recs.length}\nPortadas encontradas: ${okP}\nFixtures encontrados: ${okF}\nReferencias faltantes: ${missing.length}${missing.length?'\n\n'+[...new Set(missing)].slice(0,20).join('\n'):''}`);
}
function gameCupFolder_(game,cfg){return game==='fc-mobile'?cfg.COPAS_FCM_PORTADAS_FOLDER_ID:cfg.COPAS_EF_PORTADAS_FOLDER_ID}
function attachCupFile_(game,ref,name){const id=driveIdFromRef_(ref);if(!id)return null;const cfg=configMap_(),file=DriveApp.getFileById(id);if(String(file.getMimeType()).toLowerCase()!=='image/avif')throw new Error('La copa nueva debe estar en formato AVIF.');const folder=DriveApp.getFolderById(gameCupFolder_(game,cfg));try{file.moveTo(folder)}catch(_){}const desired=slug_(name)+'.avif';try{file.setName(desired)}catch(_){}publicCupFile_(file,cfg);const prefix=game==='fc-mobile'?'FC-MOBILE/PORTADAS/':'EFOOTBALL/PORTADAS/';return{id:file.getId(),url:driveImageUrl_(file.getId()),path:prefix+file.getName()}}

function competitionMap_(){const rows=rows_(ss_().getSheetByName(TAB_COMP));return Object.fromEntries(rows.map(r=>[String(r.competition_id),r]))}
function mergedTournamentRow_(r,compMap){const c=compMap[String(r.competition_id)]||{};return Object.assign({},r,{
  juego:first_(r.juego,c.juego),titulo:first_(r.titulo,c.nombre),tipo:first_(r.tipo,c.tipo_defecto),cupos:first_(r.cupos,c.participantes_defecto),formato:first_(r.formato,c.formato_defecto),estructura:first_(r.estructura,c.estructura_defecto),tamano_grupo:first_(r.tamano_grupo,c.tamano_grupo,4),clasifican_grupo:first_(r.clasifican_grupo,c.clasifican_grupo,2),vueltas_grupo:1,copa_portada:first_(r.copa_portada_url,c.copa_portada_url,r.copa_portada,c.copa_portada),copa_fixture:first_(r.copa_fixture_url,c.copa_fixture_url,r.copa_fixture,c.copa_fixture),copa_portada_file_id:first_(r.copa_portada_file_id,c.copa_portada_file_id),copa_fixture_file_id:first_(r.copa_fixture_file_id,c.copa_fixture_file_id),descripcion:first_(r.descripcion,c.descripcion),categoria:first_(c.categoria,'')
})}
function tournament_(id){const map=competitionMap_();const row=rows_(ss_().getSheetByName(TAB_TORNEOS)).find(r=>String(r.id)===String(id));return row?mergedTournamentRow_(row,map):null}
function tournamentRow_(id){return rows_(ss_().getSheetByName(TAB_TORNEOS)).find(r=>String(r.id)===String(id))||null}
function activeRegistration_(r){return !['CANCELADA','RETIRADA','DESCALIFICADA'].includes(upper_(r&&r.estado||'CONFIRMADA'))}
function registrations_(id){return rows_(ss_().getSheetByName(TAB_INS)).filter(r=>String(r.torneo_id)===String(id)&&activeRegistration_(r))}
function allRegistrations_(id){return rows_(ss_().getSheetByName(TAB_INS)).filter(r=>String(r.torneo_id)===String(id))}
function matches_(id){return rows_(ss_().getSheetByName(TAB_PARTIDOS)).filter(r=>String(r.torneo_id)===String(id))}

function doGet(e){
  try{
    if(!secretOk_(e.parameter.secret))return json_({ok:false,message:'No autorizado.'});
    const action=String(e.parameter.action||'');
    if(action==='tournaments')return json_(tournaments_(e.parameter.game));
    if(action==='competitions')return json_(competitions_(e.parameter.game));
    if(action==='state')return json_(state_(e.parameter.tournamentId,e.parameter.game));
    if(action==='winners')return json_(winners_(e.parameter.competitionId,e.parameter.game));
    return json_({ok:false,message:'Acción no válida.'});
  }catch(err){return json_({ok:false,message:err.message})}
}

function doPost(e){
  try{
    const p=JSON.parse(e.postData&&e.postData.contents||'{}');
    if(!secretOk_(p.secret))return json_({ok:false,valid:false,message:'No autorizado.'});
    if(p.action==='validateCode')return json_(validateCode_(p));
    if(p.action==='register')return json_(register_(p));
    if(p.action==='saveResult'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(saveResult_(p));}
    if(p.action==='createCompetition'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(createCompetition_(p));}
    if(p.action==='createTournament'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(createTournament_(p));}
    if(p.action==='activateTournament'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(activateTournament_(p.tournamentId));}
    if(p.action==='generateCodes'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(generateCodes_(p.tournamentId,true));}
    if(p.action==='prepareFixture'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(prepareFixture_(p.tournamentId));}
    if(p.action==='setWinnerInstagram'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(setWinnerInstagram_(p.tournamentId,p.url));}
    if(p.action==='setRegistrations'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(setRegistrations_(p.tournamentId,p.status));}
    if(p.action==='adminSnapshot'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(adminSnapshot_(p.tournamentId));}
    if(p.action==='finalizeTournament'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(finalizeTournamentAdmin_(p));}
    if(p.action==='updateParticipant'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(updateParticipant_(p));}
    if(p.action==='setParticipantStatus'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(setParticipantStatus_(p));}
    if(p.action==='replaceParticipant'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(replaceParticipant_(p));}
    if(p.action==='setCodeStatus'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(setCodeStatus_(p));}
    if(p.action==='regenerateCode'){if(!adminOk_(p.adminSecret))return json_({ok:false,message:'Admin no autorizado.'});return json_(regenerateCode_(p));}
    return json_({ok:false,message:'Acción no válida.'});
  }catch(err){return json_({ok:false,valid:false,message:err.message})}
}

function competitions_(game){game=String(game||'').trim();const list=rows_(ss_().getSheetByName(TAB_COMP)).filter(r=>!game||String(r.juego)===game).filter(r=>r.activo===''||bool_(r.activo)).sort((a,b)=>(Number(a.orden)||999)-(Number(b.orden)||999)).map(r=>Object.assign({},r,{copa_portada:first_(r.copa_portada_url,r.copa_portada),copa_fixture:first_(r.copa_fixture_url,r.copa_fixture)}));return{ok:true,competitions:list}}
function tournaments_(game){
  game=String(game||'').trim();const ss=ss_(),media=rows_(ss.getSheetByName(TAB_MEDIA)),compMap=competitionMap_();
  const list=rows_(ss.getSheetByName(TAB_TORNEOS)).map(r=>mergedTournamentRow_(r,compMap)).filter(r=>!game||String(r.juego)===game).filter(r=>r.activo===''||bool_(r.activo)).map(r=>{
    const highlights=media.filter(m=>String(m.torneo_id)===String(r.id)&&upper_(m.tipo)==='YOUTUBE'&&(m.activo===''||bool_(m.activo))).sort((a,b)=>(Number(a.orden)||0)-(Number(b.orden)||0)).map(m=>({title:String(m.titulo||'Mejor jugada'),url:String(m.url||'')}));
    return {id:String(r.id),competitionId:String(r.competition_id||''),edition:Number(r.edicion)||1,title:String(r.titulo),type:String(r.tipo),slots:Number(r.cupos)||0,date:String(r.fecha||'Por definir'),time:String(r.hora||'Por definir'),format:String(r.formato||''),mode:String(r.estructura||''),groupSize:Number(r.tamano_grupo)||4,qualifiersPerGroup:Number(r.clasifican_grupo)||2,groupLegs:1,trophyCover:String(r.copa_portada||''),trophyFixture:String(r.copa_fixture||''),trophy:String(r.copa_portada||''),prize:String(r.premio_1||'Por anunciar'),prizeFirst:String(r.premio_1||'Por anunciar'),prizeSecond:String(r.premio_2||'Por anunciar'),entry:String(r.inscripcion||'Por anunciar'),status:String(r.estado||'Próximamente'),registrationStatus:String(r.inscripciones_estado||'Abiertas'),winner:String(r.ganador||''),runnerUp:String(r.segundo_lugar||''),championCover:String(r.foto_ganador||''),instagramWinner:String(r.instagram_ganador||''),finishedAt:String(r.fecha_finalizacion||''),highlights,desc:String(r.descripcion||''),tag:String(r.categoria||'')||(bool_(r.destacado)?'Destacado':'')};
  });return{ok:true,tournaments:list};
}
function state_(tournamentId,game){
  tournamentId=String(tournamentId||'');game=String(game||'');if(!tournamentId)return{ok:false,message:'Falta el torneo.'};
  const t=tournament_(tournamentId);if(!t)return{ok:false,message:'El torneo no existe.'};
  const status=upper_(t.estado);if(!['VIGENTE','FINALIZADO'].includes(status))return{ok:true,locked:true,registrations:[],matches:[],message:'El fixture se publica cuando la edición está VIGENTE o FINALIZADA.'};
  const ss=ss_();
  const registrations=rows_(ss.getSheetByName(TAB_INS)).filter(r=>String(r.torneo_id)===tournamentId&&(!game||String(r.juego)===game)&&activeRegistration_(r)).map(r=>({createdAt:r.fecha_registro,tournamentId:String(r.torneo_id),game:String(r.juego),nick:String(r.nick),location:String(r.ubicacion||''),tiktok:String(r.tiktok||''),photoUrl:String(r.foto_url||''),status:String(r.estado||'CONFIRMADA')}));
  const matches=rows_(ss.getSheetByName(TAB_PARTIDOS)).filter(r=>String(r.torneo_id)===tournamentId&&(!game||String(r.juego)===game)).map(matchPublic_);
  return{ok:true,locked:false,historical:status==='FINALIZADO',registrations,matches};
}
function matchPublic_(r){return{tournamentId:String(r.torneo_id),game:String(r.juego),matchId:String(r.partido_id),stage:String(r.fase||''),group:String(r.grupo||''),round:String(r.jornada||''),player1:String(r.jugador_1||''),player2:String(r.jugador_2||''),score1:r.goles_1===''?null:Number(r.goles_1),score2:r.goles_2===''?null:Number(r.goles_2),penalty1:(r.penales_1===''||r.penales_1==null)?null:Number(r.penales_1),penalty2:(r.penales_2===''||r.penales_2==null)?null:Number(r.penales_2),winner:String(r.ganador||''),status:String(r.estado||'')}}
function winners_(competitionId,game){let rows=rows_(ss_().getSheetByName(TAB_WIN));if(competitionId)rows=rows.filter(r=>String(r.competition_id)===String(competitionId));if(game)rows=rows.filter(r=>String(r.juego)===String(game));rows.sort((a,b)=>(Number(b.edicion)||0)-(Number(a.edicion)||0));return{ok:true,winners:rows.map(r=>({competitionId:String(r.competition_id),tournamentId:String(r.torneo_id),edition:Number(r.edicion)||1,game:String(r.juego),competition:String(r.competicion),winner:String(r.primer_lugar),winnerPhoto:String(r.foto_primer_lugar||''),prizeFirst:String(r.premio_1||''),runnerUp:String(r.segundo_lugar||''),prizeSecond:String(r.premio_2||''),instagram:String(r.instagram_url||''),finishedAt:String(r.fecha_finalizacion||''),official:upper_(r.es_actual)==='SI'}))}}

function findCode_(code){const sh=ss_().getSheetByName(TAB_CODIGOS);const vals=sh.getDataRange().getValues();if(vals.length<2)return null;const h=vals[0].map(String),ci=h.indexOf('codigo');for(let i=1;i<vals.length;i++)if(upper_(vals[i][ci])===upper_(code))return{sheet:sh,row:i+1,headers:h,values:vals[i]};return null}
function objFrom_(found){return Object.fromEntries(found.headers.map((k,i)=>[k,found.values[i]]))}
function validateCode_(p){
  const f=findCode_(p.code);if(!f)return{ok:false,valid:false,message:'Código no válido.'};const c=objFrom_(f);
  if(String(c.torneo_id)!==String(p.tournamentId))return{ok:false,valid:false,message:'Este código pertenece a otro torneo.'};
  if(c.juego&&String(c.juego)!==String(p.game))return{ok:false,valid:false,message:'Este código pertenece a otro juego.'};
  if(upper_(c.estado||'ACTIVO')!=='ACTIVO')return{ok:false,valid:false,message:'Este código ya no está activo.'};
  if((Number(c.usos)||0)>=(Number(c.usos_max)||1))return{ok:false,valid:false,message:'Este código ya fue utilizado.'};
  const t=tournament_(p.tournamentId);if(!t)return{ok:false,valid:false,message:'El torneo no existe.'};
  if(upper_(t.estado)!=='VIGENTE')return{ok:false,valid:false,message:'Este torneo todavía no está VIGENTE.'};
  if(!['ABIERTAS','ABIERTO','OPEN'].includes(upper_(t.inscripciones_estado||'ABIERTAS')))return{ok:false,valid:false,message:'Las inscripciones no están abiertas.'};
  const current=registrations_(p.tournamentId).length;if(current>=(Number(t.cupos)||0))return{ok:false,valid:false,message:'El torneo ya alcanzó el total de participantes.'};
  return{ok:true,valid:true,message:'Código válido.'};
}
function register_(p){
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const valid=validateCode_(p);if(!valid.valid)return valid;
    const sh=ss_().getSheetByName(TAB_INS),existing=registrations_(p.tournamentId);
    if(existing.some(r=>upper_(r.nick)===upper_(p.nick)))return{ok:false,message:'Ese nick ya está inscrito en este torneo.'};
    sh.appendRow([new Date(),p.tournamentId,p.game,p.name,p.nick,p.contact,p.location,p.tiktok||'',p.code,p.photoUrl||'','CONFIRMADA']);
    const f=findCode_(p.code),c=objFrom_(f),hm=headerMap_(f.sheet),next=(Number(c.usos)||0)+1;
    f.sheet.getRange(f.row,hm.usos).setValue(next);f.sheet.getRange(f.row,hm.fecha_uso).setValue(new Date());f.sheet.getRange(f.row,hm.participante).setValue(p.name+' / '+p.nick);if(next>=(Number(c.usos_max)||1))f.sheet.getRange(f.row,hm.estado).setValue('USADO');
    const t=tournament_(p.tournamentId);if(registrations_(p.tournamentId).length===(Number(t.cupos)||0)){try{prepareFixture_(p.tournamentId)}catch(_){} }
    audit_('INSCRIPCION',p.tournamentId,'Participante registrado: '+String(p.nick||''),'PARTICIPANTE');
    return{ok:true,message:'¡Inscripción registrada correctamente!',tournamentId:String(p.tournamentId||''),nick:String(p.nick||''),createdAt:dateText_(new Date())};
  }finally{lock.releaseLock()}
}

function createCompetition_(p){
  const sh=ss_().getSheetByName(TAB_COMP);const game=String(p.game||p.juego||'').trim();const name=String(p.name||p.nombre||'').trim();if(!['fc-mobile','efootball'].includes(game)||!name)throw new Error('Juego y nombre son obligatorios.');
  const base=(game==='fc-mobile'?'fcm':'ef')+'-'+slug_(name);let id=base,n=2;const ids=new Set(rows_(sh).map(r=>String(r.competition_id)));while(ids.has(id))id=base+'-'+n++;
  const order=Math.max(0,...rows_(sh).filter(r=>String(r.juego)===game).map(r=>Number(r.orden)||0))+1;
  const cup=attachCupFile_(game,p.trophyFileId||p.trophyDrive||p.trophyCover||' ',name);const legacy=p.copa_portada||p.trophyCover||cup?.url||'';const avif=cup?.path||'';
  const row=[id,game,name,p.category||p.categoria||'Competición GMAC',legacy,p.copa_fixture||p.trophyFixture||cup?.url||legacy,Number(p.slots||p.participantes_defecto)||8,p.type||p.tipo_defecto||'copa',p.mode||p.estructura_defecto||'knockout',p.format||p.formato_defecto||'Eliminación directa · partido único',Number(p.groupSize||p.tamano_grupo)||4,Number(p.qualifiersPerGroup||p.clasifican_grupo)||2,1,'SOLO_IDA',p.description||p.descripcion||'',order,'SI',avif,avif,cup?.id||'',cup?.id||'',cup?.url||'',cup?.url||'',game==='fc-mobile'?'FC-MOBILE':'EFOOTBALL'];
  sh.appendRow(row);return{ok:true,competitionId:id,message:'Competición creada.'};
}
function createTournament_(p){
  const ss=ss_(),sh=ss.getSheetByName(TAB_TORNEOS),comp=competitionMap_()[String(p.competitionId||p.competition_id)];if(!comp)throw new Error('La competición no existe.');
  const existing=rows_(sh).filter(r=>String(r.competition_id)===String(comp.competition_id));const edition=Math.max(0,...existing.map(r=>Number(r.edicion)||0))+1;
  const id=slug_(comp.competition_id)+'-e'+String(edition).padStart(3,'0');
  sh.appendRow([id,comp.competition_id,edition,comp.juego,comp.nombre,comp.tipo_defecto||'copa',Number(p.slots||comp.participantes_defecto)||8,p.date||p.fecha||'Por definir',p.time||p.hora||'Por definir',comp.formato_defecto||'',comp.estructura_defecto||'knockout',Number(comp.tamano_grupo)||4,Number(comp.clasifican_grupo)||2,1,comp.copa_portada||'',comp.copa_fixture||'',p.prizeFirst||p.premio_1||'Por anunciar',p.prizeSecond||p.premio_2||'Por anunciar',p.entry||p.inscripcion||'Por anunciar','PROXIMAMENTE','CERRADAS','','','','','',comp.descripcion||'','NO','SI',new Date(),comp.copa_portada_file_id||'',comp.copa_fixture_file_id||'',comp.copa_portada_url||'',comp.copa_fixture_url||'']);
  generateCodes_(id,false);return{ok:true,tournamentId:id,edition,message:'Torneo creado y códigos generados.'};
}
function generateCodes_(tournamentId,force){
  const t=tournament_(tournamentId);if(!t)throw new Error('Torneo no encontrado.');const sh=ss_().getSheetByName(TAB_CODIGOS);let existing=rows_(sh).filter(r=>String(r.torneo_id)===String(tournamentId));if(existing.length&&!force)return{ok:true,count:existing.length,message:'Los códigos ya existían.'};
  if(force&&existing.length){const vals=sh.getDataRange().getValues();const hm=headerMap_(sh);for(let i=vals.length;i>=2;i--){const same=String(vals[i-1][hm.torneo_id-1])===String(tournamentId),status=upper_(vals[i-1][hm.estado-1]),uses=Number(vals[i-1][hm.usos-1])||0;if(same&&status==='ACTIVO'&&uses===0)sh.deleteRow(i)}}
  existing=rows_(sh).filter(r=>String(r.torneo_id)===String(tournamentId));const used=existing.filter(r=>(Number(r.usos)||0)>0||upper_(r.estado)==='USADO').length;const active=existing.filter(r=>upper_(r.estado)==='ACTIVO'&&(Number(r.usos)||0)===0).length;const need=Math.max(0,(Number(t.cupos)||0)-used-active);
  const all=new Set(rows_(sh).map(r=>upper_(r.codigo)));const out=[];for(let i=0;i<need;i++){let c;do{c=code_()}while(all.has(c));all.add(c);out.push([c,t.id,t.juego,'ACTIVO',1,0,new Date(),'',''])}
  if(out.length)sh.getRange(sh.getLastRow()+1,1,out.length,out[0].length).setValues(out);audit_('CODIGOS_REGENERADOS',tournamentId,'Códigos nuevos: '+out.length,'ADMIN');return{ok:true,count:out.length,available:active+out.length,used,message:`${out.length} códigos generados. ${used} usados · ${active+out.length} disponibles.`};
}
function activateTournament_(id){
  const ss=ss_(),sh=ss.getSheetByName(TAB_TORNEOS),rows=rows_(sh),target=rows.find(r=>String(r.id)===String(id));if(!target)throw new Error('Torneo no encontrado.');const other=rows.find(r=>String(r.id)!==String(id)&&upper_(r.estado)==='VIGENTE');if(other)throw new Error('Ya existe un torneo VIGENTE: '+other.titulo+' · Edición '+other.edicion);
  const hm=headerMap_(sh);sh.getRange(target._row,hm.estado).setValue('VIGENTE');sh.getRange(target._row,hm.inscripciones_estado).setValue('ABIERTAS');audit_('TORNEO_ACTIVADO',id,'Edición activada y registros abiertos','ADMIN');return{ok:true,message:'Torneo activado.'};
}
function setWinnerInstagram_(tournamentId,url){const ss=ss_(),tsh=ss.getSheetByName(TAB_TORNEOS),tr=tournamentRow_(tournamentId);if(!tr)throw new Error('Torneo no encontrado.');const hm=headerMap_(tsh);tsh.getRange(tr._row,hm.instagram_ganador).setValue(url||'');const wsh=ss.getSheetByName(TAB_WIN),wh=headerMap_(wsh),wr=rows_(wsh).find(r=>String(r.torneo_id)===String(tournamentId));if(wr)wsh.getRange(wr._row,wh.instagram_url).setValue(url||'');audit_('INSTAGRAM_GANADOR',tournamentId,url||'Enlace eliminado','ADMIN');return{ok:true,message:'Instagram actualizado.'}}
function setRegistrations_(tournamentId,status){
  const ss=ss_(),sh=ss.getSheetByName(TAB_TORNEOS),tr=tournamentRow_(tournamentId);if(!tr)throw new Error('Torneo no encontrado.');
  const next=upper_(status);if(!['ABIERTAS','CERRADAS'].includes(next))throw new Error('Estado de inscripciones no válido.');
  if(upper_(tr.estado)==='FINALIZADO')throw new Error('La edición ya está FINALIZADA.');
  if(next==='ABIERTAS'&&upper_(tr.estado)!=='VIGENTE')throw new Error('Solo el torneo VIGENTE puede abrir inscripciones.');
  const hm=headerMap_(sh);sh.getRange(tr._row,hm.inscripciones_estado).setValue(next);audit_('INSCRIPCIONES_'+next,tournamentId,'Estado de inscripciones: '+next,'ADMIN');return{ok:true,status:next,message:next==='ABIERTAS'?'Inscripciones abiertas.':'Inscripciones cerradas.'};
}
function adminSnapshot_(tournamentId){
  const t=tournament_(tournamentId);if(!t)throw new Error('Torneo no encontrado.');const ss=ss_();
  const codes=rows_(ss.getSheetByName(TAB_CODIGOS)).filter(r=>String(r.torneo_id)===String(tournamentId)).map(r=>({code:String(r.codigo||''),status:String(r.estado||''),maxUses:Number(r.usos_max)||1,uses:Number(r.usos)||0,createdAt:r.fecha_creacion||r.creado_en||'',usedAt:r.fecha_uso||'',participant:String(r.participante||'')}));
  const registrations=allRegistrations_(tournamentId).map(r=>({createdAt:r.fecha_registro||'',tournamentId:String(r.torneo_id||''),game:String(r.juego||''),name:String(r.nombre||''),nick:String(r.nick||''),contact:String(r.contacto||''),location:String(r.ubicacion||''),tiktok:String(r.tiktok||''),code:String(r.codigo||''),photoUrl:String(r.foto_url||''),status:String(r.estado||'CONFIRMADA')}));
  const matches=matches_(tournamentId).map(matchPublic_);const audit=auditRows_(tournamentId,60);
  return{ok:true,tournament:{id:String(t.id),competitionId:String(t.competition_id||''),edition:Number(t.edicion)||1,game:String(t.juego||''),title:String(t.titulo||''),slots:Number(t.cupos)||0,status:String(t.estado||''),registrationStatus:String(t.inscripciones_estado||''),winner:String(t.ganador||''),runnerUp:String(t.segundo_lugar||''),prizeFirst:String(t.premio_1||''),prizeSecond:String(t.premio_2||'')},codes,registrations,matches,audit};
}
function ensureAuditSheet_(){const ss=ss_();let sh=ss.getSheetByName(TAB_AUDIT);if(!sh){sh=ss.insertSheet(TAB_AUDIT);sh.getRange(1,1,1,HEADERS[TAB_AUDIT].length).setValues([HEADERS[TAB_AUDIT]]);sh.setFrozenRows(1);sh.getRange(1,1,1,HEADERS[TAB_AUDIT].length).setBackground('#111214').setFontColor('#FFFFFF').setFontWeight('bold')}return sh}
function audit_(action,tournamentId,detail,actor){try{const sh=ensureAuditSheet_();sh.appendRow([new Date(),String(tournamentId||''),String(action||''),String(detail||'').slice(0,500),String(actor||'ADMIN')])}catch(err){console.log('AUDIT '+err.message)}}
function auditRows_(tournamentId,limit){let sh=ss_().getSheetByName(TAB_AUDIT);if(!sh)return[];let rows=rows_(sh).filter(r=>!tournamentId||String(r.torneo_id)===String(tournamentId));rows=rows.slice(-Math.max(1,Number(limit)||50)).reverse();return rows.map(r=>({at:r.fecha||'',tournamentId:String(r.torneo_id||''),action:String(r.accion||''),detail:String(r.detalle||''),actor:String(r.actor||'')}))}
function participantRow_(tournamentId,nick){return allRegistrations_(tournamentId).find(r=>upper_(r.nick)===upper_(nick))||null}
function hasPlayedResult_(tournamentId){return matches_(tournamentId).some(r=>upper_(r.estado)==='FINALIZADO')}
function rebuildAfterRosterChange_(tournamentId){const t=tournament_(tournamentId);if(!t)return;if(hasPlayedResult_(tournamentId))throw new Error('No se puede reconstruir la plantilla después de iniciar resultados.');const count=registrations_(tournamentId).length;if(count===(Number(t.cupos)||0))prepareFixture_(tournamentId);else deleteTournamentMatches_(tournamentId)}
function updateParticipant_(p){
  const id=String(p.tournamentId||''),oldNick=String(p.originalNick||p.nick||'').trim();if(!id||!oldNick)throw new Error('Torneo y nick son obligatorios.');const tr=tournament_(id);if(!tr)throw new Error('Torneo no encontrado.');if(upper_(tr.estado)==='FINALIZADO')throw new Error('No se editan participantes de una edición finalizada.');
  const sh=ss_().getSheetByName(TAB_INS),row=participantRow_(id,oldNick);if(!row)throw new Error('Participante no encontrado.');const hm=headerMap_(sh),nextNick=String(p.newNick||p.nick||oldNick).trim(),nextName=String(p.name||row.nombre||'').trim();if(!nextNick||!nextName)throw new Error('Nombre y nick son obligatorios.');
  const nickChanged=upper_(nextNick)!==upper_(oldNick);if(nickChanged&&hasPlayedResult_(id))throw new Error('El nick no puede cambiar después de iniciar resultados.');if(nickChanged&&allRegistrations_(id).some(r=>r._row!==row._row&&upper_(r.nick)===upper_(nextNick)))throw new Error('Ese nick ya existe en esta edición.');
  [['nombre',nextName],['nick',nextNick],['contacto',p.contact!==undefined?p.contact:row.contacto],['ubicacion',p.location!==undefined?p.location:row.ubicacion],['tiktok',p.tiktok!==undefined?p.tiktok:row.tiktok],['foto_url',p.photoUrl!==undefined?p.photoUrl:row.foto_url]].forEach(([k,v])=>{if(hm[k])sh.getRange(row._row,hm[k]).setValue(v||'')});
  const csh=ss_().getSheetByName(TAB_CODIGOS),ch=headerMap_(csh),cr=rows_(csh).find(r=>String(r.torneo_id)===id&&upper_(r.codigo)===upper_(row.codigo));if(cr&&ch.participante)csh.getRange(cr._row,ch.participante).setValue(nextName+' / '+nextNick);
  if(nickChanged)rebuildAfterRosterChange_(id);audit_('PARTICIPANTE_EDITADO',id,oldNick+(nickChanged?' → '+nextNick:''),'ADMIN');return{ok:true,message:'Participante actualizado.',nick:nextNick};
}
function setParticipantStatus_(p){
  const id=String(p.tournamentId||''),nick=String(p.nick||'').trim(),status=upper_(p.status);if(!id||!nick)throw new Error('Torneo y nick son obligatorios.');if(!['CONFIRMADA','RETIRADA','DESCALIFICADA','CANCELADA'].includes(status))throw new Error('Estado de participante no válido.');const t=tournament_(id);if(!t)throw new Error('Torneo no encontrado.');if(upper_(t.estado)==='FINALIZADO')throw new Error('La edición ya está finalizada.');if(hasPlayedResult_(id))throw new Error('No se puede retirar o reactivar participantes después de iniciar resultados.');
  const sh=ss_().getSheetByName(TAB_INS),row=participantRow_(id,nick);if(!row)throw new Error('Participante no encontrado.');const hm=headerMap_(sh);sh.getRange(row._row,hm.estado).setValue(status);rebuildAfterRosterChange_(id);audit_('PARTICIPANTE_'+status,id,nick,'ADMIN');return{ok:true,status,message:'Estado del participante actualizado.'};
}
function replaceParticipant_(p){
  const id=String(p.tournamentId||''),oldNick=String(p.originalNick||'').trim();if(!id||!oldNick)throw new Error('Torneo y participante a reemplazar son obligatorios.');if(hasPlayedResult_(id))throw new Error('El reemplazo solo está disponible antes del primer resultado.');const t=tournament_(id);if(!t||upper_(t.estado)==='FINALIZADO')throw new Error('Torneo no disponible para reemplazos.');const sh=ss_().getSheetByName(TAB_INS),row=participantRow_(id,oldNick);if(!row)throw new Error('Participante no encontrado.');const newNick=String(p.nick||p.newNick||'').trim(),newName=String(p.name||'').trim();if(!newNick||!newName)throw new Error('Nombre y nick del reemplazo son obligatorios.');if(allRegistrations_(id).some(r=>r._row!==row._row&&upper_(r.nick)===upper_(newNick)))throw new Error('El nick del reemplazo ya está inscrito.');const hm=headerMap_(sh);[['nombre',newName],['nick',newNick],['contacto',p.contact||''],['ubicacion',p.location||''],['tiktok',p.tiktok||''],['foto_url',p.photoUrl||''],['estado','CONFIRMADA']].forEach(([k,v])=>sh.getRange(row._row,hm[k]).setValue(v));const csh=ss_().getSheetByName(TAB_CODIGOS),ch=headerMap_(csh),cr=rows_(csh).find(r=>String(r.torneo_id)===id&&upper_(r.codigo)===upper_(row.codigo));if(cr)csh.getRange(cr._row,ch.participante).setValue(newName+' / '+newNick);rebuildAfterRosterChange_(id);audit_('PARTICIPANTE_REEMPLAZADO',id,oldNick+' → '+newNick,'ADMIN');return{ok:true,message:'Participante reemplazado.',nick:newNick};
}
function setCodeStatus_(p){
  const id=String(p.tournamentId||''),code=String(p.code||'').trim(),status=upper_(p.status);if(!id||!code)throw new Error('Torneo y código son obligatorios.');if(!['ACTIVO','ANULADO'].includes(status))throw new Error('Estado de código no válido.');const sh=ss_().getSheetByName(TAB_CODIGOS),hm=headerMap_(sh),r=rows_(sh).find(x=>String(x.torneo_id)===id&&upper_(x.codigo)===upper_(code));if(!r)throw new Error('Código no encontrado.');if((Number(r.usos)||0)>0||upper_(r.estado)==='USADO')throw new Error('Un código usado no puede modificarse.');sh.getRange(r._row,hm.estado).setValue(status);audit_('CODIGO_'+status,id,code,'ADMIN');return{ok:true,status,message:'Código actualizado.'};
}
function regenerateCode_(p){
  const id=String(p.tournamentId||''),code=String(p.code||'').trim();if(!id||!code)throw new Error('Torneo y código son obligatorios.');const t=tournament_(id);if(!t)throw new Error('Torneo no encontrado.');const sh=ss_().getSheetByName(TAB_CODIGOS),hm=headerMap_(sh),r=rows_(sh).find(x=>String(x.torneo_id)===id&&upper_(x.codigo)===upper_(code));if(!r)throw new Error('Código no encontrado.');if((Number(r.usos)||0)>0||upper_(r.estado)==='USADO')throw new Error('No se regenera un código ya utilizado.');sh.getRange(r._row,hm.estado).setValue('ANULADO');const all=new Set(rows_(sh).map(x=>upper_(x.codigo)));let next;do{next=code_()}while(all.has(next));sh.appendRow([next,id,t.juego,'ACTIVO',1,0,new Date(),'','']);audit_('CODIGO_REGENERADO',id,code+' → '+next,'ADMIN');return{ok:true,newCode:next,message:'Código regenerado.'};
}

function finalizeTournamentAdmin_(p){
  if(String(p.confirm||'')!=='FINALIZAR')throw new Error('Confirmación de cierre inválida.');const id=String(p.tournamentId||''),winner=String(p.winner||'').trim(),runner=String(p.runnerUp||'').trim();if(!id||!winner||!runner)throw new Error('Torneo, campeón y segundo lugar son obligatorios.');
  const t=tournament_(id);if(!t)throw new Error('Torneo no encontrado.');if(upper_(t.estado)==='FINALIZADO')return{ok:true,message:'La edición ya estaba finalizada.'};
  const regs=registrations_(id);if(regs.length){const names=new Set(regs.flatMap(r=>[upper_(r.nick),upper_(r.nombre)]).filter(Boolean));if(!names.has(upper_(winner)))throw new Error('El campeón no coincide con un participante inscrito.');if(!names.has(upper_(runner)))throw new Error('El segundo lugar no coincide con un participante inscrito.');}
  finalizeTournament_(id,winner,runner);audit_('CIERRE_MANUAL',id,'Campeón: '+winner+' · Segundo: '+runner,'ADMIN');return{ok:true,message:'Edición finalizada manualmente.'};
}


function onEdit(e){
  try{
    const sh=e.range.getSheet(),name=sh.getName();
    if(name===TAB_TORNEOS){enforceSingleActive_(e);return}
    if(name!==TAB_PARTIDOS)return;
    const hm=headerMap_(sh);if(e.range.getRow()<2)return;
    const row=e.range.getRow();const vals=sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0];const obj=Object.fromEntries(Object.entries(hm).map(([k,c])=>[k,vals[c-1]]));
    normalizeMatchResult_(sh,row,hm,obj);rebuildDerivedFixture_(obj.torneo_id);
  }catch(err){SpreadsheetApp.getActive().toast(err.message,'GMAC',6)}
}
function enforceSingleActive_(e){const sh=e.range.getSheet(),hm=headerMap_(sh);if(e.range.getColumn()!==hm.estado||upper_(e.value)!=='VIGENTE')return;const id=sh.getRange(e.range.getRow(),hm.id).getValue();const other=rows_(sh).find(r=>String(r.id)!==String(id)&&upper_(r.estado)==='VIGENTE');if(other){e.range.setValue(e.oldValue||'PROXIMAMENTE');SpreadsheetApp.getActive().toast('Ya existe un torneo VIGENTE: '+other.titulo,'GMAC',8)}}
function normalizeMatchResult_(sh,row,hm,obj){
  const s1=obj.goles_1===''?null:Number(obj.goles_1),s2=obj.goles_2===''?null:Number(obj.goles_2);if(!Number.isFinite(s1)||!Number.isFinite(s2))return;
  const allowDraw=isDrawAllowed_(obj.fase);let winner='';if(s1>s2)winner=obj.jugador_1;else if(s2>s1)winner=obj.jugador_2;else if(!allowDraw){const p1=obj.penales_1===''?null:Number(obj.penales_1),p2=obj.penales_2===''?null:Number(obj.penales_2);if(Number.isFinite(p1)&&Number.isFinite(p2)&&p1!==p2)winner=p1>p2?obj.jugador_1:obj.jugador_2;else return}
  sh.getRange(row,hm.ganador).setValue(winner);sh.getRange(row,hm.estado).setValue('FINALIZADO');sh.getRange(row,hm.actualizado).setValue(new Date());
}
function isDrawAllowed_(phase){const p=upper_(phase);return p.includes('GRUPO')||p.includes('LIGA')||p.includes('JORNADA')||p.includes('FASE LIGA')}
function matchWinner_(r){if(upper_(r.estado)!=='FINALIZADO')return'';if(norm_(r.ganador))return norm_(r.ganador);const s1=Number(r.goles_1),s2=Number(r.goles_2);if(s1>s2)return norm_(r.jugador_1);if(s2>s1)return norm_(r.jugador_2);const p1=Number(r.penales_1),p2=Number(r.penales_2);if(Number.isFinite(p1)&&Number.isFinite(p2)&&p1!==p2)return p1>p2?norm_(r.jugador_1):norm_(r.jugador_2);return''}
function loser_(r){const w=matchWinner_(r);if(!w)return'';return upper_(w)===upper_(r.jugador_1)?norm_(r.jugador_2):norm_(r.jugador_1)}

function roundRobinPairs_(size){const ids=Array.from({length:size},(_,i)=>i),rounds=[];let arr=ids.slice();for(let r=0;r<size-1;r++){const pairs=[];for(let i=0;i<size/2;i++)pairs.push([arr[i],arr[size-1-i]]);rounds.push(pairs);arr=[arr[0],arr[arr.length-1]].concat(arr.slice(1,-1))}return rounds}
function groupName_(i){let n=i+1,s='';while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)}return s}
function pow2_(n){let p=1;while(p<n)p*=2;return p}
function roundLabel_(matches){return matches===1?'FINAL':matches===2?'SEMIFINAL':matches===4?'CUARTOS':matches===8?'OCTAVOS':matches===16?'RONDA DE 32':matches===32?'RONDA DE 64':'ELIMINATORIA'}
function upsertMatch_(t,id,phase,group,round,p1,p2){
  const sh=ss_().getSheetByName(TAB_PARTIDOS),hm=headerMap_(sh),existing=rows_(sh).find(r=>String(r.torneo_id)===String(t.id)&&String(r.partido_id)===String(id));
  if(existing){const next1=p1===undefined?existing.jugador_1:(p1||''),next2=p2===undefined?existing.jugador_2:(p2||'');const changed=upper_(next1)!==upper_(existing.jugador_1)||upper_(next2)!==upper_(existing.jugador_2);if(p1!==undefined)sh.getRange(existing._row,hm.jugador_1).setValue(next1);if(p2!==undefined)sh.getRange(existing._row,hm.jugador_2).setValue(next2);if(phase)sh.getRange(existing._row,hm.fase).setValue(phase);if(changed&&upper_(existing.estado)==='FINALIZADO'){['goles_1','goles_2','penales_1','penales_2','ganador','actualizado'].forEach(k=>sh.getRange(existing._row,hm[k]).clearContent());sh.getRange(existing._row,hm.estado).setValue('PENDIENTE')}return existing._row}
  sh.appendRow([t.id,t.juego,id,phase||'',group||'',round||'',p1||'',p2||'','','','','','','PENDIENTE','']);return sh.getLastRow();
}
function deleteTournamentMatches_(id){const sh=ss_().getSheetByName(TAB_PARTIDOS),hm=headerMap_(sh),vals=sh.getDataRange().getValues();for(let i=vals.length;i>=2;i--)if(String(vals[i-1][hm.torneo_id-1])===String(id))sh.deleteRow(i)}
function prepareFixture_(id){
  const t=tournament_(id);if(!t)throw new Error('Torneo no encontrado.');const regs=registrations_(id);if(regs.length<Number(t.cupos||0))throw new Error(`Faltan participantes: ${regs.length}/${t.cupos}.`);const players=regs.slice(0,Number(t.cupos)).map(r=>String(r.nick));
  deleteTournamentMatches_(id);const mode=String(t.estructura||'knockout');
  if(mode==='groups')prepareGroups_(t,players);else if(mode==='league'||mode==='league_playoffs')prepareLeague_(t,players,mode==='league_playoffs');else if(mode==='league_phase')prepareLeaguePhase_(t,players);else prepareKnockout_(t,players,upper_(t.tipo).includes('REY')||String(t.competition_id).includes('copa-del-rey')?'CDR':'KO');
  rebuildDerivedFixture_(id);audit_('FIXTURE_PREPARADO',id,'Fixture generado con '+players.length+' participantes','SISTEMA');return{ok:true,message:'Fixture preparado.'};
}
function prepareKnockout_(t,players,prefix){let current=players.slice(),round=0;while(current.length>=2){const matches=current.length/2;for(let m=0;m<matches;m++)upsertMatch_(t,`${prefix}:R${round}:M${m}`,roundLabel_(matches),'',round+1,round===0?current[m*2]:'',round===0?current[m*2+1]:'');current=Array(matches).fill('');round++}}
function prepareGroups_(t,players){
  const gs=Number(t.tamano_grupo)||4,gc=Math.ceil(players.length/gs),groups=Array.from({length:gc},()=>Array(gs).fill(''));players.forEach((name,i)=>{const gi=i%gc,slot=Math.floor(i/gc);if(slot<gs)groups[gi][slot]=name});
  groups.forEach((gp,gi)=>{const letter=groupName_(gi),rounds=roundRobinPairs_(gs);let seq=0;rounds.forEach((pairs,ri)=>pairs.forEach(pair=>upsertMatch_(t,`G${letter}:M${seq++}`,`GRUPO ${letter}`,letter,ri+1,gp[pair[0]],gp[pair[1]])))});
  if(String(t.competition_id).includes('copa-del-mundo')){for(let n=73;n<=104;n++){if(n===103)upsertMatch_(t,'M103','TERCER PUESTO','','','', '');else upsertMatch_(t,'M'+n,n===104?'FINAL':n>=101?'SEMIFINAL':n>=97?'CUARTOS':n>=89?'OCTAVOS':'RONDA DE 32','','','', '')}}
  else{const q=Number(t.clasifican_grupo)||2,total=gc*q,br=pow2_(total);prepareKnockout_(t,Array(br).fill(''),'GKO')}
}
function prepareLeague_(t,players,playoffs){const rounds=roundRobinPairs_(players.length);rounds.forEach((pairs,ri)=>pairs.forEach((pair,mi)=>upsertMatch_(t,`LG:J${ri+1}:M${mi}`,'LIGA','',ri+1,players[pair[0]],players[pair[1]])));if(playoffs){const count=Math.max(2,Number(t.playoffCount)||4);prepareKnockout_(t,Array(count).fill(''),'LGPO')}}
function prepareLeaguePhase_(t,players){const rounds=roundRobinPairs_(players.length).slice(0,Math.min(8,players.length-1));rounds.forEach((pairs,ri)=>pairs.forEach((pair,mi)=>upsertMatch_(t,`UCL:J${ri+1}:M${mi}`,'FASE LIGA','',ri+1,players[pair[0]],players[pair[1]])));for(let i=0;i<8;i++)upsertMatch_(t,`UCLPO:M${i}`,'PLAY-OFF','','','', '');prepareKnockout_(t,Array(16).fill(''),'UCLKO')}

function stats_(names,matchRows){const map=Object.fromEntries(names.map((n,i)=>[upper_(n),{name:n,slot:i,pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0}]));matchRows.forEach(r=>{if(upper_(r.estado)!=='FINALIZADO')return;const a=map[upper_(r.jugador_1)],b=map[upper_(r.jugador_2)];if(!a||!b)return;const s1=Number(r.goles_1),s2=Number(r.goles_2);if(!Number.isFinite(s1)||!Number.isFinite(s2))return;a.pj++;b.pj++;a.gf+=s1;a.gc+=s2;b.gf+=s2;b.gc+=s1;if(s1>s2){a.g++;b.p++;a.pts+=3}else if(s2>s1){b.g++;a.p++;b.pts+=3}else{a.e++;b.e++;a.pts++;b.pts++}a.dg=a.gf-a.gc;b.dg=b.gf-b.gc});return Object.values(map).sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.name.localeCompare(b.name,'es'))}
function allFinal_(rows){return rows.length>0&&rows.every(r=>upper_(r.estado)==='FINALIZADO')}
function setPlayers_(t,id,p1,p2){upsertMatch_(t,id,'','','',p1,p2)}
function propagateBracket_(t,prefix){const rows=matches_(t.id).filter(r=>String(r.partido_id).startsWith(prefix+':R'));const by=Object.fromEntries(rows.map(r=>[String(r.partido_id),r]));let round=0;while(true){const current=rows.filter(r=>String(r.partido_id).startsWith(`${prefix}:R${round}:`)).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));if(!current.length)break;const next=rows.filter(r=>String(r.partido_id).startsWith(`${prefix}:R${round+1}:`)).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));if(!next.length)break;for(let i=0;i<next.length;i++)setPlayers_(t,next[i].partido_id,matchWinner_(current[i*2]),matchWinner_(current[i*2+1]));round++}
  const final=rows.sort((a,b)=>a.partido_id.localeCompare(b.partido_id)).filter(r=>String(r.fase)==='FINAL').pop();if(final&&matchWinner_(final))finalizeTournament_(t.id,matchWinner_(final),loser_(final));
}
function rebuildDerivedFixture_(id){
  const t=tournament_(id);if(!t)return;const mode=String(t.estructura||'knockout');
  if(mode==='groups')rebuildGroups_(t);else if(mode==='league')rebuildLeague_(t,false);else if(mode==='league_playoffs')rebuildLeague_(t,true);else if(mode==='league_phase')rebuildLeaguePhase_(t);else propagateBracket_(t,String(t.competition_id).includes('copa-del-rey')?'CDR':'KO');
}
function rebuildGroups_(t){
  const all=matches_(t.id),groupRows=all.filter(r=>String(r.partido_id).startsWith('G')&&!String(r.partido_id).startsWith('GKO'));const letters=[...new Set(groupRows.map(r=>String(r.grupo)).filter(Boolean))].sort();if(!letters.length)return;const q=Number(t.clasifican_grupo)||2,rankings={},thirds=[];let complete=true;
  letters.forEach(letter=>{const rows=groupRows.filter(r=>String(r.grupo)===letter),names=[...new Set(rows.flatMap(r=>[norm_(r.jugador_1),norm_(r.jugador_2)]).filter(Boolean))],rank=stats_(names,rows);rankings[letter]=rank;if(!allFinal_(rows))complete=false;if(rank[q])thirds.push(Object.assign({group:letter},rank[q]))});
  if(!complete)return;
  if(String(t.competition_id).includes('copa-del-mundo')){fillWorldCup_(t,rankings,thirds);return}
  if(String(t.competition_id).includes('eurocopa')){fillEuro_(t,rankings,thirds);return}
  const direct=[];for(let i=0;i<letters.length;i+=2){const a=rankings[letters[i]]||[],b=rankings[letters[i+1]]||[];if(q===2&&b.length)direct.push(a[0]?.name||'',b[1]?.name||'',b[0]?.name||'',a[1]?.name||'');else direct.push(...a.slice(0,q).map(x=>x.name),...b.slice(0,q).map(x=>x.name))}
  const first=matches_(t.id).filter(r=>String(r.partido_id).startsWith('GKO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));first.forEach((r,i)=>setPlayers_(t,r.partido_id,direct[i*2]||'',direct[i*2+1]||''));propagateBracket_(t,'GKO');
}
function assignEuroThirds_(qualified){const slots=[['C',['D','E','F']],['B',['A','D','E','F']],['F',['A','B','C']],['E',['A','B','C','D']]],by=Object.fromEntries(qualified.map(x=>[x.group,x])),used={},sol={};function rec(pos){if(pos>=slots.length)return true;const [key,elig]=slots[pos];for(const g of elig){if(!by[g]||used[g])continue;used[g]=true;sol[key]=by[g];if(rec(pos+1))return true;delete used[g];delete sol[key]}return false}if(!rec(0))throw new Error('No se pudo asignar la combinación de mejores terceros de Eurocopa.');return sol}
function fillEuro_(t,rankings,thirds){
  const rank=(g,p)=>rankings[g]?.[p-1]?.name||'',best=thirds.sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.group.localeCompare(b.group,'es')).slice(0,4),third=assignEuroThirds_(best);
  const r16=[[rank('A',2),rank('B',2)],[rank('A',1),rank('C',2)],[rank('C',1),third.C?.name||''],[rank('B',1),third.B?.name||''],[rank('D',2),rank('E',2)],[rank('F',1),third.F?.name||''],[rank('D',1),rank('F',2)],[rank('E',1),third.E?.name||'']];
  const first=matches_(t.id).filter(r=>String(r.partido_id).startsWith('GKO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));first.forEach((r,i)=>setPlayers_(t,r.partido_id,r16[i]?.[0]||'',r16[i]?.[1]||''));propagateBracket_(t,'GKO');
}
function assignThirds_(qualified){const slots=[['M74',['A','B','C','D','F']],['M77',['C','D','F','G','H']],['M79',['C','E','F','H','I']],['M80',['E','H','I','J','K']],['M81',['B','E','F','I','J']],['M82',['A','E','H','I','J']],['M85',['E','F','G','I','J']],['M87',['D','E','I','J','L']]];const by=Object.fromEntries(qualified.map(x=>[x.group,x]));const used={},sol={};function rec(pos){if(pos>=slots.length)return true;const [key,elig]=slots[pos];for(const g of elig){if(!by[g]||used[g])continue;used[g]=true;sol[key]=by[g];if(rec(pos+1))return true;delete used[g];delete sol[key]}return false}rec(0);return sol}
function fillWorldCup_(t,rankings,thirds){
  const rank=(g,p)=>rankings[g]?.[p-1]?.name||'';const best=thirds.sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.group.localeCompare(b.group,'es')).slice(0,8),third=assignThirds_(best);
  const r32={M73:[rank('A',2),rank('B',2)],M74:[rank('E',1),third.M74?.name||''],M75:[rank('F',1),rank('C',2)],M76:[rank('C',1),rank('F',2)],M77:[rank('I',1),third.M77?.name||''],M78:[rank('E',2),rank('I',2)],M79:[rank('A',1),third.M79?.name||''],M80:[rank('L',1),third.M80?.name||''],M81:[rank('D',1),third.M81?.name||''],M82:[rank('G',1),third.M82?.name||''],M83:[rank('K',2),rank('L',2)],M84:[rank('H',1),rank('J',2)],M85:[rank('B',1),third.M85?.name||''],M86:[rank('J',1),rank('H',2)],M87:[rank('K',1),third.M87?.name||''],M88:[rank('D',2),rank('G',2)]};Object.keys(r32).forEach(k=>setPlayers_(t,k,r32[k][0],r32[k][1]));
  const m=()=>Object.fromEntries(matches_(t.id).map(r=>[String(r.partido_id),r]));let map=m(),w=id=>matchWinner_(map[id]||{}),l=id=>loser_(map[id]||{});
  const r16={M89:[w('M74'),w('M77')],M90:[w('M73'),w('M75')],M91:[w('M76'),w('M78')],M92:[w('M79'),w('M80')],M93:[w('M83'),w('M84')],M94:[w('M81'),w('M82')],M95:[w('M86'),w('M88')],M96:[w('M85'),w('M87')]};Object.keys(r16).forEach(k=>setPlayers_(t,k,...r16[k]));map=m();w=id=>matchWinner_(map[id]||{});l=id=>loser_(map[id]||{});
  const qf={M97:[w('M89'),w('M90')],M98:[w('M93'),w('M94')],M99:[w('M91'),w('M92')],M100:[w('M95'),w('M96')]};Object.keys(qf).forEach(k=>setPlayers_(t,k,...qf[k]));map=m();w=id=>matchWinner_(map[id]||{});l=id=>loser_(map[id]||{});
  setPlayers_(t,'M101',w('M97'),w('M98'));setPlayers_(t,'M102',w('M99'),w('M100'));map=m();w=id=>matchWinner_(map[id]||{});l=id=>loser_(map[id]||{});setPlayers_(t,'M103',l('M101'),l('M102'));setPlayers_(t,'M104',w('M101'),w('M102'));map=m();if(matchWinner_(map.M104||{}))finalizeTournament_(t.id,matchWinner_(map.M104),loser_(map.M104));
}
function rebuildLeague_(t,playoffs){const rows=matches_(t.id).filter(r=>String(r.partido_id).startsWith('LG:J')),names=registrations_(t.id).map(r=>String(r.nick));if(!allFinal_(rows))return;const rank=stats_(names,rows);if(!playoffs){if(rank[0]?.name)finalizeTournament_(t.id,rank[0].name,rank[1]?.name||'');return}const po=matches_(t.id).filter(r=>String(r.partido_id).startsWith('LGPO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id)),count=po.length*2,qual=rank.slice(0,count).map(x=>x.name);po.forEach((r,i)=>setPlayers_(t,r.partido_id,qual[i]||'',qual[count-1-i]||''));propagateBracket_(t,'LGPO')}
function rebuildLeaguePhase_(t){const league=matches_(t.id).filter(r=>String(r.partido_id).startsWith('UCL:J')),names=registrations_(t.id).map(r=>String(r.nick));if(!allFinal_(league))return;const rank=stats_(names,league),direct=rank.slice(0,8).map(x=>x.name),seeds=rank.slice(8,24).map(x=>x.name),po=matches_(t.id).filter(r=>String(r.partido_id).startsWith('UCLPO:M')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));for(let i=0;i<8;i++)setPlayers_(t,`UCLPO:M${i}`,seeds[i]?.name||seeds[i]||'',seeds[15-i]?.name||seeds[15-i]||'');const map=Object.fromEntries(matches_(t.id).map(r=>[String(r.partido_id),r])),poW=Array.from({length:8},(_,i)=>matchWinner_(map[`UCLPO:M${i}`]||{}));const first=matches_(t.id).filter(r=>String(r.partido_id).startsWith('UCLKO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));const r16=[];for(let i=0;i<8;i++)r16.push(direct[i]||'',poW[7-i]||'');first.forEach((r,i)=>setPlayers_(t,r.partido_id,r16[i*2]||'',r16[i*2+1]||''));propagateBracket_(t,'UCLKO')}

function finalizeTournament_(id,winner,runner){
  if(!winner)return;const ss=ss_(),sh=ss.getSheetByName(TAB_TORNEOS),tr=tournamentRow_(id);if(!tr||upper_(tr.estado)==='FINALIZADO')return;const hm=headerMap_(sh),reg=registrations_(id).find(r=>upper_(r.nick)===upper_(winner)||upper_(r.nombre)===upper_(winner)),photo=reg?String(reg.foto_url||''):'';
  sh.getRange(tr._row,hm.estado).setValue('FINALIZADO');sh.getRange(tr._row,hm.inscripciones_estado).setValue('CERRADAS');sh.getRange(tr._row,hm.ganador).setValue(winner);sh.getRange(tr._row,hm.segundo_lugar).setValue(runner||'');sh.getRange(tr._row,hm.foto_ganador).setValue(photo);sh.getRange(tr._row,hm.fecha_finalizacion).setValue(new Date());
  const winSh=ss.getSheetByName(TAB_WIN),wh=headerMap_(winSh),existing=rows_(winSh);existing.filter(r=>String(r.competition_id)===String(tr.competition_id)).forEach(r=>winSh.getRange(r._row,wh.es_actual).setValue('NO'));
  const current=existing.find(r=>String(r.torneo_id)===String(id));const values=[tr.competition_id,id,tr.edicion,tr.juego,tr.titulo,winner,photo,tr.premio_1||'',runner||'',tr.premio_2||'',tr.instagram_ganador||'',new Date(),'SI'];
  if(current)winSh.getRange(current._row,1,1,values.length).setValues([values]);else winSh.appendRow(values);
  SpreadsheetApp.getActive().toast(`Edición finalizada · Campeón: ${winner}`,'GMAC',10);
}
function saveResult_(p){
  const t=tournament_(p.tournamentId);if(!t)throw new Error('Torneo no encontrado.');upsertMatch_(t,p.matchId,p.stage||p.fase||'',p.group||p.grupo||'',p.round||p.jornada||'',p.player1||p.jugador_1||'',p.player2||p.jugador_2||'');const sh=ss_().getSheetByName(TAB_PARTIDOS),hm=headerMap_(sh),r=rows_(sh).find(x=>String(x.torneo_id)===String(t.id)&&String(x.partido_id)===String(p.matchId));if(!r)throw new Error('Partido no encontrado.');
  sh.getRange(r._row,hm.goles_1).setValue(Number(p.score1));sh.getRange(r._row,hm.goles_2).setValue(Number(p.score2));if(p.penalty1!==undefined)sh.getRange(r._row,hm.penales_1).setValue(p.penalty1);if(p.penalty2!==undefined)sh.getRange(r._row,hm.penales_2).setValue(p.penalty2);const vals=sh.getRange(r._row,1,1,sh.getLastColumn()).getValues()[0],obj=Object.fromEntries(Object.entries(hm).map(([k,c])=>[k,vals[c-1]]));normalizeMatchResult_(sh,r._row,hm,obj);audit_('RESULTADO_GUARDADO',t.id,String(p.matchId)+' · '+String(p.player1||p.jugador_1||'')+' '+Number(p.score1)+'-'+Number(p.score2)+' '+String(p.player2||p.jugador_2||''),'ADMIN');rebuildDerivedFixture_(t.id);return{ok:true,message:'Resultado guardado.'};
}

function nuevaCompeticion(){const ui=SpreadsheetApp.getUi();const game=ui.prompt('Nueva competición','Juego: escribe fc-mobile o efootball',ui.ButtonSet.OK_CANCEL);if(game.getSelectedButton()!==ui.Button.OK)return;const name=ui.prompt('Nueva competición','Nombre de la competición',ui.ButtonSet.OK_CANCEL);if(name.getSelectedButton()!==ui.Button.OK)return;const slots=ui.prompt('Participantes','Cantidad de participantes',ui.ButtonSet.OK_CANCEL);if(slots.getSelectedButton()!==ui.Button.OK)return;const mode=ui.prompt('Formato','knockout, groups, league, league_playoffs o league_phase',ui.ButtonSet.OK_CANCEL);if(mode.getSelectedButton()!==ui.Button.OK)return;const trophy=ui.prompt('Trofeo AVIF','Sube primero el AVIF a Google Drive y pega aquí su enlace o File ID. GMAC lo moverá a la carpeta correcta.',ui.ButtonSet.OK_CANCEL);if(trophy.getSelectedButton()!==ui.Button.OK)return;const res=createCompetition_({game:game.getResponseText(),name:name.getResponseText(),slots:Number(slots.getResponseText()),mode:mode.getResponseText(),trophyFileId:trophy.getResponseText()});ui.alert('Creada: '+res.competitionId)}
function nuevoTorneo(){const ui=SpreadsheetApp.getUi(),c=ui.prompt('Nuevo torneo','Competition ID exacto de COMPETICIONES',ui.ButtonSet.OK_CANCEL);if(c.getSelectedButton()!==ui.Button.OK)return;const p1=ui.prompt('Premio 1.º','Ejemplo: S/ 150',ui.ButtonSet.OK_CANCEL);if(p1.getSelectedButton()!==ui.Button.OK)return;const p2=ui.prompt('Premio 2.º','Ejemplo: S/ 50',ui.ButtonSet.OK_CANCEL);if(p2.getSelectedButton()!==ui.Button.OK)return;const entry=ui.prompt('Inscripción','Ejemplo: S/ 10',ui.ButtonSet.OK_CANCEL);if(entry.getSelectedButton()!==ui.Button.OK)return;const r=createTournament_({competitionId:c.getResponseText(),prizeFirst:p1.getResponseText(),prizeSecond:p2.getResponseText(),entry:entry.getResponseText()});ui.alert(`${r.tournamentId}\nEdición ${r.edition}\nCódigos generados automáticamente.`)}
function activarTorneo(){const ui=SpreadsheetApp.getUi(),r=ui.prompt('Activar torneo','ID exacto del torneo',ui.ButtonSet.OK_CANCEL);if(r.getSelectedButton()!==ui.Button.OK)return;ui.alert(activateTournament_(r.getResponseText()).message)}
function generarCodigosMenu(){const ui=SpreadsheetApp.getUi(),r=ui.prompt('Generar códigos','ID exacto del torneo',ui.ButtonSet.OK_CANCEL);if(r.getSelectedButton()!==ui.Button.OK)return;const out=generateCodes_(r.getResponseText(),true);ui.alert(out.message)}
function prepararFixtureMenu(){const ui=SpreadsheetApp.getUi(),r=ui.prompt('Preparar fixture','ID exacto del torneo. Requiere cupos completos.',ui.ButtonSet.OK_CANCEL);if(r.getSelectedButton()!==ui.Button.OK)return;ui.alert(prepareFixture_(r.getResponseText()).message)}
function actualizarInstagramGanador(){const ui=SpreadsheetApp.getUi(),a=ui.prompt('Instagram ganador','ID del torneo finalizado',ui.ButtonSet.OK_CANCEL);if(a.getSelectedButton()!==ui.Button.OK)return;const b=ui.prompt('Instagram ganador','URL del post oficial',ui.ButtonSet.OK_CANCEL);if(b.getSelectedButton()!==ui.Button.OK)return;ui.alert(setWinnerInstagram_(a.getResponseText(),b.getResponseText()).message)}
function recalcularTorneoActual(){const t=rows_(ss_().getSheetByName(TAB_TORNEOS)).find(r=>upper_(r.estado)==='VIGENTE');if(!t)throw new Error('No hay torneo VIGENTE.');rebuildDerivedFixture_(t.id);SpreadsheetApp.getUi().alert('Torneo recalculado.');}
