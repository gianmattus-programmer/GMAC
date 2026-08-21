import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'data', 'history', 'index.json');
const CHAMPION_DIR = path.join(ROOT, 'assets', 'champions');
const BASE_URL = String(process.env.GMAC_BASE_URL || 'https://gmac-iota.vercel.app').replace(/\/$/, '');
const GAMES = ['fc-mobile', 'efootball'];
const MAX_ATTEMPTS = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const upper = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

async function jsonFetch(url, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'GMAC-History-Snapshot/1.1' },
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
        all.push({ ...tournament, id: String(tournament.id), game });
      }
    }
  }
  return all;
}

function imageExtension(contentType) {
  const type = String(contentType || '').toLowerCase().split(';')[0].trim();
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/avif') return 'avif';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  return '';
}

async function fileExists(filePath) {
  try { await fs.access(filePath); return true; }
  catch { return false; }
}

async function archiveChampionPhoto(tournament, currentEntry) {
  const current = String(currentEntry?.championPhoto || '').trim();
  if (current.startsWith('/assets/champions/')) {
    const filePath = path.join(ROOT, current.replace(/^\//, ''));
    if (await fileExists(filePath)) return current;
  }

  const source = String(tournament?.championCover || '').trim();
  if (!source) return '';
  const url = new URL(source, `${BASE_URL}/`);
  url.searchParams.set('archive', String(Date.now()));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*', 'User-Agent': 'GMAC-History-Snapshot/1.1' },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const extension = imageExtension(response.headers.get('content-type'));
    if (!extension) throw new Error('el endpoint no devolvió una imagen compatible');
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_IMAGE_BYTES) throw new Error('la foto supera 8 MB');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('la foto está vacía o supera 8 MB');

    await fs.mkdir(CHAMPION_DIR, { recursive: true });
    const safeId = tournament.id.replace(/[^A-Za-z0-9_-]/g, '_');
    const filename = `${safeId}.${extension}`;
    await fs.writeFile(path.join(CHAMPION_DIR, filename), bytes);
    return `/assets/champions/${filename}`;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const index = await readIndex();
  const finalized = await finalizedTournaments();
  let snapshotsAdded = 0;
  let photosAdded = 0;
  let changed = false;

  for (const tournament of finalized) {
    let entry = index[tournament.id] || null;

    if (!entry?.payload?.historical) {
      const url = `${BASE_URL}/api/tournament-state?game=${encodeURIComponent(tournament.game)}&tournamentId=${encodeURIComponent(tournament.id)}&snapshot=${Date.now()}`;
      try {
        const data = await jsonFetch(url);
        if (!data.historical) {
          console.warn(`::warning::${tournament.id} todavía no devolvió historical=true; se intentará de nuevo en la próxima ejecución.`);
        } else {
          const payload = canonicalPayload(data, tournament.id, tournament.game);
          entry = {
            ...(entry || {}),
            game: tournament.game,
            snapshotAt: new Date().toISOString(),
            payload,
          };
          index[tournament.id] = entry;
          snapshotsAdded += 1;
          changed = true;
          console.log(`Snapshot permanente creado: ${tournament.id} (${payload.registrations.length} participantes, ${payload.matches.length} partidos)`);
        }
      } catch (error) {
        console.warn(`::warning::No se pudo archivar ${tournament.id}: ${error.message}. Se reintentará automáticamente.`);
      }
    }

    // Conserva también la foto del campeón como activo local, para que el
    // historial no dependa a futuro de Drive, Spotify u otro host externo.
    if (entry?.payload?.historical && !String(entry.championPhoto || '').startsWith('/assets/champions/')) {
      try {
        const championPhoto = await archiveChampionPhoto(tournament, entry);
        if (championPhoto) {
          entry.championPhoto = championPhoto;
          index[tournament.id] = entry;
          photosAdded += 1;
          changed = true;
          console.log(`Foto del campeón archivada: ${tournament.id} -> ${championPhoto}`);
        }
      } catch (error) {
        console.warn(`::warning::No se pudo archivar la foto de ${tournament.id}: ${error.message}. Se reintentará automáticamente.`);
      }
    }
  }

  if (!changed) {
    console.log('No hay nuevos torneos ni fotos de campeón para archivar.');
    return;
  }

  const ordered = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
  console.log(`Historial actualizado: ${snapshotsAdded} snapshot(s), ${photosAdded} foto(s) nueva(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
