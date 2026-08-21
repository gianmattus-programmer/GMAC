import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'data', 'history', 'index.json');
const BASE_URL = String(process.env.GMAC_BASE_URL || 'https://gmac-iota.vercel.app').replace(/\/$/, '');
const GAMES = ['fc-mobile', 'efootball'];
const MAX_ATTEMPTS = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const upper = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

async function jsonFetch(url, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'GMAC-History-Snapshot/1.0' },
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!response.ok || !data) {
      throw new Error(`HTTP ${response.status}: ${data?.message || text.slice(0, 180) || 'respuesta inválida'}`);
    }
    return data;
  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) throw error;
    const delay = 2500 * attempt;
    console.warn(`Reintento ${attempt}/${MAX_ATTEMPTS - 1} en ${delay} ms: ${error.message}`);
    await sleep(delay);
    return jsonFetch(url, attempt + 1);
  } finally {
    clearTimeout(timer);
  }
}

function canonicalRegistration(r, tournamentId, game) {
  // El historial público solo necesita el nick para reconstruir el fixture.
  // No persistimos nombre real, contacto, ubicación, TikTok, código ni foto.
  return {
    tournamentId,
    game,
    nick: String(r?.nick || '').trim(),
    status: String(r?.status || 'CONFIRMADA'),
  };
}

function canonicalMatch(m, tournamentId, game) {
  const numberOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v))) ? null : Number(v);
  return {
    tournamentId,
    game,
    matchId: String(m?.matchId || '').trim(),
    stage: String(m?.stage || ''),
    group: String(m?.group || ''),
    round: String(m?.round || ''),
    player1: String(m?.player1 || ''),
    player2: String(m?.player2 || ''),
    score1: numberOrNull(m?.score1),
    score2: numberOrNull(m?.score2),
    penalty1: numberOrNull(m?.penalty1),
    penalty2: numberOrNull(m?.penalty2),
    winner: String(m?.winner || ''),
    status: String(m?.status || ''),
  };
}

function canonicalPayload(data, tournamentId, game) {
  return {
    locked: false,
    historical: true,
    registrations: (Array.isArray(data?.registrations) ? data.registrations : [])
      .filter((r) => !['CANCELADA', 'RETIRADA', 'DESCALIFICADA'].includes(upper(r?.status)))
      .map((r) => canonicalRegistration(r, tournamentId, game))
      .filter((r) => r.nick),
    matches: (Array.isArray(data?.matches) ? data.matches : [])
      .map((m) => canonicalMatch(m, tournamentId, game))
      .filter((m) => m.matchId),
    message: '',
  };
}

async function readIndex() {
  try { return JSON.parse(await fs.readFile(INDEX_PATH, 'utf8')); }
  catch { return {}; }
}

async function finalizedTournaments() {
  const all = [];
  for (const game of GAMES) {
    const data = await jsonFetch(`${BASE_URL}/api/tournaments?game=${encodeURIComponent(game)}&snapshot=${Date.now()}`);
    for (const tournament of (data.tournaments || [])) {
      if (upper(tournament?.status) === 'FINALIZADO' && tournament?.id) {
        all.push({ id: String(tournament.id), game });
      }
    }
  }
  return all;
}

async function main() {
  const index = await readIndex();
  const finalized = await finalizedTournaments();
  let added = 0;

  for (const tournament of finalized) {
    if (index[tournament.id]?.payload?.historical) continue;
    const url = `${BASE_URL}/api/tournament-state?game=${encodeURIComponent(tournament.game)}&tournamentId=${encodeURIComponent(tournament.id)}&snapshot=${Date.now()}`;
    try {
      const data = await jsonFetch(url);
      if (!data.historical) {
        console.warn(`::warning::${tournament.id} todavía no devolvió historical=true; se intentará de nuevo en la próxima ejecución.`);
        continue;
      }
      const payload = canonicalPayload(data, tournament.id, tournament.game);
      index[tournament.id] = {
        game: tournament.game,
        snapshotAt: new Date().toISOString(),
        payload,
      };
      added += 1;
      console.log(`Snapshot permanente creado: ${tournament.id} (${payload.registrations.length} participantes, ${payload.matches.length} partidos)`);
    } catch (error) {
      console.warn(`::warning::No se pudo archivar ${tournament.id}: ${error.message}. Se reintentará automáticamente.`);
    }
  }

  if (!added) {
    console.log('No hay nuevos torneos finalizados para archivar.');
    return;
  }

  const ordered = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
  console.log(`Historial actualizado: ${added} snapshot(s) nuevo(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
