import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const SOURCE = 'google-sheets/Code.gs';
let code = await fs.readFile(SOURCE, 'utf8');

function replaceOnce(oldText, newText, alreadyMarker, label) {
  if (alreadyMarker && code.includes(alreadyMarker)) return;
  if (!code.includes(oldText)) throw new Error(`No se encontró el punto de actualización: ${label}.`);
  code = code.replace(oldText, newText);
}

const groupsNeedle = `  if(String(t.competition_id).includes('copa-del-mundo')){fillWorldCup_(t,rankings,thirds);return}\n  const direct=[];`;
const groupsReplacement = `  if(String(t.competition_id).includes('copa-del-mundo')){fillWorldCup_(t,rankings,thirds);return}\n  if(String(t.competition_id).includes('eurocopa')){fillEuro_(t,rankings,thirds);return}\n  const direct=[];`;
replaceOnce(groupsNeedle, groupsReplacement, `includes('eurocopa')){fillEuro_`, 'clasificación Eurocopa');

const thirdsNeedle = `function assignThirds_(qualified){const slots=[['M74',['A','B','C','D','F']],['M77',['C','D','F','G','H']],['M79',['C','E','F','H','I']],['M80',['E','H','I','J','K']],['M81',['B','E','F','I','J']],['M82',['A','E','H','I','J']],['M85',['E','F','G','I','J']],['M87',['D','E','I','J','L']]];`;
const euroFunctions = `function assignEuroThirds_(qualified){const slots=[['C',['D','E','F']],['B',['A','D','E','F']],['F',['A','B','C']],['E',['A','B','C','D']]],by=Object.fromEntries(qualified.map(x=>[x.group,x])),used={},sol={};function rec(pos){if(pos>=slots.length)return true;const [key,elig]=slots[pos];for(const g of elig){if(!by[g]||used[g])continue;used[g]=true;sol[key]=by[g];if(rec(pos+1))return true;delete used[g];delete sol[key]}return false}if(!rec(0))throw new Error('No se pudo asignar la combinación de mejores terceros de Eurocopa.');return sol}\nfunction fillEuro_(t,rankings,thirds){\n  const rank=(g,p)=>rankings[g]?.[p-1]?.name||'',best=thirds.sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.group.localeCompare(b.group,'es')).slice(0,4),third=assignEuroThirds_(best);\n  const r16=[[rank('A',2),rank('B',2)],[rank('A',1),rank('C',2)],[rank('C',1),third.C?.name||''],[rank('B',1),third.B?.name||''],[rank('D',2),rank('E',2)],[rank('F',1),third.F?.name||''],[rank('D',1),rank('F',2)],[rank('E',1),third.E?.name||'']];\n  const first=matches_(t.id).filter(r=>String(r.partido_id).startsWith('GKO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id));first.forEach((r,i)=>setPlayers_(t,r.partido_id,r16[i]?.[0]||'',r16[i]?.[1]||''));propagateBracket_(t,'GKO');\n}\n`;
replaceOnce(thirdsNeedle, euroFunctions + thirdsNeedle, 'function assignEuroThirds_', 'mejores terceros Eurocopa');

const playoffNeedle = `const po=matches_(t.id).filter(r=>String(r.partido_id).startsWith('LGPO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id)),count=po.length*2,qual=rank.slice(0,count).map(x=>x.name);po.forEach((r,i)=>setPlayers_(t,r.partido_id,qual[i*2]||'',qual[i*2+1]||''));propagateBracket_(t,'LGPO')`;
const playoffReplacement = `const po=matches_(t.id).filter(r=>String(r.partido_id).startsWith('LGPO:R0:')).sort((a,b)=>a.partido_id.localeCompare(b.partido_id)),count=po.length*2,qual=rank.slice(0,count).map(x=>x.name);po.forEach((r,i)=>setPlayers_(t,r.partido_id,qual[i]||'',qual[count-1-i]||''));propagateBracket_(t,'LGPO')`;
replaceOnce(playoffNeedle, playoffReplacement, 'qual[count-1-i]', 'siembra 1.º vs último clasificado');

const configOld = `['MOSTRAR_FIXTURE_FINALIZADO','NO','Los torneos finalizados no exponen el estado competitivo']`;
const configNew = `['MOSTRAR_FIXTURE_FINALIZADO','SI','Las ediciones finalizadas conservan y muestran su fixture histórico completo']`;
replaceOnce(configOld, configNew, configNew, 'configuración de historial finalizado');

const activationOld = `function activateTournament_(id){\n  const ss=ss_(),sh=ss.getSheetByName(TAB_TORNEOS),rows=rows_(sh),target=rows.find(r=>String(r.id)===String(id));if(!target)throw new Error('Torneo no encontrado.');const other=rows.find(r=>String(r.id)!==String(id)&&upper_(r.estado)==='VIGENTE');if(other)throw new Error('Ya existe un torneo VIGENTE: '+other.titulo+' · Edición '+other.edicion);\n  const hm=headerMap_(sh);sh.getRange(target._row,hm.estado).setValue('VIGENTE');sh.getRange(target._row,hm.inscripciones_estado).setValue('ABIERTAS');audit_('TORNEO_ACTIVADO',id,'Edición activada y registros abiertos','ADMIN');return{ok:true,message:'Torneo activado.'};\n}`;
const activationNew = `function activateTournament_(id){\n  const ss=ss_(),sh=ss.getSheetByName(TAB_TORNEOS),rows=rows_(sh),target=rows.find(r=>String(r.id)===String(id));if(!target)throw new Error('Torneo no encontrado.');const other=rows.find(r=>String(r.id)!==String(id)&&upper_(r.estado)==='VIGENTE');if(other)throw new Error('Ya existe un torneo VIGENTE: '+other.titulo+' · Edición '+other.edicion);\n  const codes=generateCodes_(id,false),hm=headerMap_(sh);sh.getRange(target._row,hm.estado).setValue('VIGENTE');sh.getRange(target._row,hm.inscripciones_estado).setValue('ABIERTAS');audit_('TORNEO_ACTIVADO',id,'Edición activada y registros abiertos · códigos disponibles: '+(Number(codes.available)||0),'ADMIN');return{ok:true,codesAvailable:Number(codes.available)||0,message:'Torneo activado. '+(Number(codes.available)||0)+' códigos disponibles.'};\n}`;
replaceOnce(activationOld, activationNew, 'codes=generateCodes_(id,false)', 'generación automática de códigos al activar');

await fs.writeFile('google-sheets/Code.gs', code);
await fs.writeFile('google-sheets/Code_GMAC_V35.gs', code);

const encoded = gzipSync(Buffer.from(code, 'utf8')).toString('base64');
const split = Math.ceil(encoded.length / 2);
await fs.writeFile('google-sheets/code-v35.part1', encoded.slice(0, split));
await fs.writeFile('google-sheets/code-v35.part2', encoded.slice(split));

console.log('Apps Script format and lifecycle integrity patch applied.');
