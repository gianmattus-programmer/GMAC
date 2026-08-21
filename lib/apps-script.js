const crypto=require('crypto');

function env(){
  const url=process.env.GOOGLE_APPS_SCRIPT_URL,secret=process.env.SHEETS_API_SECRET;
  if(!url||!secret)throw new Error('Google Sheets todavía no está configurado.');
  return{url,secret};
}
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function requireAdmin(req){const expected=process.env.ADMIN_SECRET;if(!expected)return false;return safeEqual(req.headers['x-admin-secret'],expected)}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const transientStatus=status=>[408,425,429,500,502,503,504].includes(Number(status));

async function fetchJson(url,options={},config={}){
  const retries=Math.max(0,Number(config.retries)||0);
  const timeoutMs=Math.max(2500,Number(config.timeoutMs)||12000);
  let lastError=null;
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      const text=await response.text();
      let data={};
      try{data=text?JSON.parse(text):{}}catch(_){
        const error=new Error('Google Apps Script no devolvió una respuesta JSON válida.');
        error.status=response.status||502;
        error.transient=true;
        throw error;
      }
      if(!response.ok||data.ok===false){
        const error=new Error(data.message||`Google Sheets respondió ${response.status}.`);
        error.status=response.status;
        error.transient=transientStatus(response.status);
        throw error;
      }
      return data;
    }catch(error){
      if(error?.name==='AbortError'){
        lastError=new Error('Google Sheets tardó demasiado en responder.');
        lastError.status=504;
        lastError.transient=true;
      }else lastError=error;
      const retryable=lastError?.transient===true||transientStatus(lastError?.status)||!lastError?.status;
      if(attempt>=retries||!retryable)throw lastError;
      await wait(220*(attempt+1));
    }finally{clearTimeout(timer)}
  }
  throw lastError||new Error('No se pudo conectar con Google Sheets.');
}

async function getAction(action,params={}){
  const{url,secret}=env();
  const u=new URL(url);
  u.searchParams.set('action',action);u.searchParams.set('secret',secret);
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))});
  return fetchJson(u,{redirect:'follow',headers:{Accept:'application/json'},cache:'no-store'},{retries:2,timeoutMs:12000});
}

async function postAction(action,payload={},adminSecret=''){
  const{url,secret}=env();
  const body={action,secret,...payload};if(adminSecret)body.adminSecret=adminSecret;
  // Las escrituras no se reintentan automáticamente: una respuesta perdida no debe
  // duplicar inscripciones, códigos ni resultados en Sheets.
  return fetchJson(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store'},{retries:0,timeoutMs:15000});
}
module.exports={getAction,postAction,requireAdmin};
