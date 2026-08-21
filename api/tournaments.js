const { getAction } = require('../lib/apps-script');
const { DRIVE_ID_RE, driveId, localCupPath, trophyUrl } = require('../lib/trophy-assets');

const TOURNAMENT_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

function setJsonCache(res, seconds = 15) {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control', `public, max-age=${seconds}`);
  res.setHeader('Vercel-CDN-Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=60`);
}

function setImageHeaders(res, type, length, cacheSeconds = 604800) {
  res.setHeader('Content-Type', type.startsWith('image/') ? type : 'image/jpeg');
  res.setHeader('Content-Length', String(length));
  res.setHeader('Cache-Control', `public, max-age=86400, stale-while-revalidate=2592000`);
  res.setHeader('CDN-Cache-Control', `public, max-age=${cacheSeconds}`);
  res.setHeader('Vercel-CDN-Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=2592000`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

async function fetchImage(url, userAgent) {
  const upstream = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      'User-Agent': userAgent,
    },
  });
  if (!upstream.ok) throw new Error(`El proveedor de imagen respondió ${upstream.status}.`);
  const type = String(upstream.headers.get('content-type') || '').toLowerCase();
  if (!type.startsWith('image/')) throw new Error('El proveedor no devolvió una imagen.');
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (!bytes.length) throw new Error('La imagen llegó vacía.');
  return { type, bytes };
}

async function serveTrophy(id, res) {
  if (!DRIVE_ID_RE.test(id)) {
    return res.status(400).json({ message: 'ID de copa inválido.' });
  }

  const local = localCupPath(id);
  if (local) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.redirect(308, local);
  }

  const candidates = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}&confirm=t`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}`,
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const { type, bytes } = await fetchImage(url, 'Mozilla/5.0 GMAC-Trophy-Proxy/2.0');
      setImageHeaders(res, type, bytes.length);
      return res.status(200).send(bytes);
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(502).json({ message: lastError?.message || 'No se pudo cargar la copa desde Drive.' });
}

function safeRemoteImageUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' || host.endsWith('.local') || host === '0.0.0.0' || host === '::1' ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

async function championPhotoFor(tournamentId) {
  const winnersData = await getAction('winners', {}).catch(() => ({ winners: [] }));
  const winner = (winnersData.winners || []).find((item) => String(item.tournamentId || '') === tournamentId);
  if (winner?.winnerPhoto) return String(winner.winnerPhoto).trim();

  const tournamentData = await getAction('tournaments', {}).catch(() => ({ tournaments: [] }));
  const tournament = (tournamentData.tournaments || []).find((item) => String(item.id || '') === tournamentId);
  return String(tournament?.championCover || '').trim();
}

async function serveChampion(tournamentId, res) {
  if (!TOURNAMENT_ID_RE.test(tournamentId)) {
    return res.status(400).json({ message: 'ID de torneo inválido.' });
  }

  try {
    const source = await championPhotoFor(tournamentId);
    if (!source) return res.status(404).json({ message: 'Esta edición todavía no tiene foto de campeón.' });

    const id = driveId(source);
    if (id) return serveTrophy(id, res);

    const safeUrl = safeRemoteImageUrl(source);
    if (!safeUrl) return res.status(400).json({ message: 'La URL de la foto del campeón no es válida.' });

    const { type, bytes } = await fetchImage(safeUrl, 'Mozilla/5.0 GMAC-Champion-Proxy/1.0');
    setImageHeaders(res, type, bytes.length, 86400);
    return res.status(200).send(bytes);
  } catch (error) {
    return res.status(502).json({ message: error.message || 'No se pudo cargar la foto del campeón.' });
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  if (req.query.asset) {
    return serveTrophy(String(req.query.asset), res);
  }
  if (req.query.champion) {
    return serveChampion(String(req.query.champion), res);
  }

  setJsonCache(res, 15);

  try {
    const game = req.query.game || '';
    const [data, winnersData] = await Promise.all([
      getAction('tournaments', { game }),
      getAction('winners', { game }).catch(() => ({ winners: [] })),
    ]);

    const winnerByTournament = new Map(
      (winnersData.winners || []).map((winner) => [String(winner.tournamentId || ''), winner])
    );

    const tournaments = (data.tournaments || []).map((t) => {
      const trophyCover = trophyUrl(t.trophyCover || t.trophy || '');
      const trophyFixture = trophyUrl(t.trophyFixture || t.trophyCover || t.trophy || '');
      const winnerRecord = winnerByTournament.get(String(t.id || '')) || {};
      const rawChampionCover = String(t.championCover || winnerRecord.winnerPhoto || '').trim();
      const championCover = rawChampionCover ? `/media/champion/${encodeURIComponent(String(t.id || ''))}` : '';
      return {
        ...t,
        game: t.game || game,
        trophyCover,
        trophyFixture,
        trophy: trophyCover,
        championCover,
      };
    });
    return res.status(200).json({ tournaments });
  } catch (error) {
    return res.status(503).json({ message: error.message });
  }
};
