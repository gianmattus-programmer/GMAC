import fs from 'node:fs/promises';

const BASE_URL = String(process.env.GMAC_BASE_URL || 'https://gmac-iota.vercel.app').replace(/\/$/, '');
const HISTORY_PATH = new URL('../data/history/index.json', import.meta.url);
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`✗ ${message}`);
}
function pass(message) {
  console.log(`✓ ${message}`);
}
function assert(condition, message) {
  if (!condition) fail(message);
  else pass(message);
}

async function get(path, { timeout = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: '*/*', 'User-Agent': 'GMAC-Production-Smoke/1.0' },
      cache: 'no-store',
      signal: controller.signal,
      redirect: 'follow',
    });
    const type = String(response.headers.get('content-type') || '');
    let body;
    if (type.includes('application/json')) {
      try { body = await response.json(); } catch { body = null; }
    } else if (type.startsWith('image/')) {
      body = Buffer.from(await response.arrayBuffer());
    } else {
      body = await response.text();
    }
    return { response, body, type };
  } finally {
    clearTimeout(timer);
  }
}

async function checkHtml(path, needle) {
  try {
    const { response, body } = await get(path);
    assert(response.status === 200, `${path} responde 200`);
    assert(typeof body === 'string' && body.includes(needle), `${path} contiene ${needle}`);
    assert(response.headers.get('x-content-type-options') === 'nosniff', `${path} envía X-Content-Type-Options`);
  } catch (error) {
    fail(`${path} no pudo comprobarse: ${error.message}`);
  }
}

function hasRawGoogleDate(value) {
  return /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|\bGMT[+-]\d{4}\b/i.test(String(value || ''));
}

async function checkTournaments(game) {
  try {
    const { response, body } = await get(`/api/tournaments?game=${encodeURIComponent(game)}&smoke=${Date.now()}`);
    assert(response.status === 200, `/api/tournaments ${game} responde 200`);
    const rows = Array.isArray(body?.tournaments) ? body.tournaments : [];
    assert(rows.length > 0, `/api/tournaments ${game} devuelve torneos`);
    assert(rows.every((t) => !hasRawGoogleDate(t.date) && !hasRawGoogleDate(t.time) && !hasRawGoogleDate(t.finishedAt)), `${game} no expone fechas crudas de Google Sheets`);
    assert(rows.every((t) => !(/^\d+(?:[.,]\d+)?$/.test(String(t.entry || '').trim()))), `${game} no expone inscripción monetaria sin moneda`);
  } catch (error) {
    fail(`/api/tournaments ${game} falló: ${error.message}`);
  }
}

async function checkCompetitions(game) {
  try {
    const { response, body } = await get(`/api/competitions?game=${encodeURIComponent(game)}&smoke=${Date.now()}`);
    assert(response.status === 200, `/api/competitions ${game} responde 200`);
    const rows = Array.isArray(body?.competitions) ? body.competitions : [];
    assert(rows.length > 0, `/api/competitions ${game} devuelve competiciones`);
    assert(rows.every((c) => !('_row' in c) && !('copa_portada_file_id' in c) && !('copa_fixture_file_id' in c)), `${game} no expone columnas internas de competiciones`);
  } catch (error) {
    fail(`/api/competitions ${game} falló: ${error.message}`);
  }
}

async function checkAdmin() {
  try {
    const page = await get('/admin');
    assert(page.response.status === 200, '/admin responde 200');
    assert(/noindex/i.test(String(page.response.headers.get('x-robots-tag') || '')), '/admin mantiene noindex');
    assert(/no-store/i.test(String(page.response.headers.get('cache-control') || '')), '/admin mantiene no-store');

    const auth = await get('/api/admin-auth');
    assert(auth.response.status === 200, '/api/admin-auth responde 200 sin sesión');
    assert(auth.body?.authenticated === false, '/api/admin-auth no concede sesión anónima');
  } catch (error) {
    fail(`Comprobación admin falló: ${error.message}`);
  }
}

async function checkArchivedHistory() {
  let history = {};
  try { history = JSON.parse(await fs.readFile(HISTORY_PATH, 'utf8')); }
  catch (error) { fail(`No se pudo leer data/history/index.json: ${error.message}`); return; }

  for (const [id, entry] of Object.entries(history)) {
    const game = String(entry?.game || '');
    try {
      const state = await get(`/api/tournament-state?game=${encodeURIComponent(game)}&tournamentId=${encodeURIComponent(id)}&smoke=${Date.now()}`);
      assert(state.response.status === 200, `historial ${id} responde 200`);
      assert(state.body?.historical === true, `historial ${id} conserva historical=true`);
      assert(state.response.headers.get('x-gmac-history-source') === 'static-snapshot', `historial ${id} sale del snapshot estático`);
      assert(Array.isArray(state.body?.matches), `historial ${id} incluye partidos`);

      if (entry?.championPhoto) {
        const photo = await get(String(entry.championPhoto));
        assert(photo.response.status === 200, `foto archivada ${id} responde 200`);
        assert(photo.type.startsWith('image/'), `foto archivada ${id} es una imagen`);
        assert(Buffer.isBuffer(photo.body) && photo.body.length > 0, `foto archivada ${id} contiene bytes`);
      }
    } catch (error) {
      fail(`Historial ${id} falló: ${error.message}`);
    }
  }
}

async function checkWinners() {
  try {
    const { response, body } = await get(`/api/winners?game=fc-mobile&smoke=${Date.now()}`);
    assert(response.status === 200, '/api/winners responde 200');
    const rows = Array.isArray(body?.winners) ? body.winners : [];
    assert(rows.every((w) => !hasRawGoogleDate(w.finishedAt)), '/api/winners no expone fechas crudas');
    assert(rows.every((w) => !w.winnerPhoto || /^\/(?:media\/champion|assets\/champions)\//.test(w.winnerPhoto)), '/api/winners usa fotos internas/proxy');
  } catch (error) {
    fail(`/api/winners falló: ${error.message}`);
  }
}

await checkHtml('/', 'GMAC');
await checkHtml('/fc-mobile.html', 'FC Mobile');
await checkHtml('/efootball.html', 'eFootball');
await checkHtml('/contacto.html', 'Contacto');
await checkAdmin();
await checkTournaments('fc-mobile');
await checkTournaments('efootball');
await checkCompetitions('fc-mobile');
await checkCompetitions('efootball');
await checkWinners();
await checkArchivedHistory();

if (failures.length) {
  console.error(`\nGMAC smoke test: ${failures.length} fallo(s).`);
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log('\nGMAC smoke test: producción verificada sin fallos detectados.');
}
