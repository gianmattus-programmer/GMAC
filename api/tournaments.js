const { getAction } = require('../lib/apps-script');

const DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

function driveId(value) {
  const text = String(value || '').trim();
  if (DRIVE_ID_RE.test(text) && !text.includes('http')) return text;
  const query = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (query) return query[1];
  const path = text.match(/\/d\/([A-Za-z0-9_-]+)/);
  return path ? path[1] : '';
}

function mediaUrl(value) {
  const id = driveId(value);
  return id ? `/media/trophy/${id}` : value;
}

async function serveTrophy(id, res) {
  if (!DRIVE_ID_RE.test(id)) {
    return res.status(400).json({ message: 'ID de copa inválido.' });
  }

  const candidates = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}&confirm=t`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}`,
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const upstream = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 GMAC-Trophy-Proxy/1.0',
        },
      });
      if (!upstream.ok) {
        lastError = new Error(`Drive respondió ${upstream.status}`);
        continue;
      }

      const type = String(upstream.headers.get('content-type') || '').toLowerCase();
      if (type.includes('text/html') || type.includes('application/json')) {
        lastError = new Error('Drive devolvió una página en lugar de la imagen.');
        continue;
      }

      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (!bytes.length) {
        lastError = new Error('La copa llegó vacía desde Drive.');
        continue;
      }

      res.setHeader('Content-Type', type.startsWith('image/') ? type : 'image/avif');
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
      res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(bytes);
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(502).json({ message: lastError?.message || 'No se pudo cargar la copa desde Drive.' });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  if (req.query.asset) {
    return serveTrophy(String(req.query.asset), res);
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);

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
      const trophyCover = mediaUrl(t.trophyCover || t.trophy || '');
      const trophyFixture = mediaUrl(t.trophyFixture || t.trophyCover || t.trophy || '');
      const winnerRecord = winnerByTournament.get(String(t.id || '')) || {};
      const championCover = String(t.championCover || winnerRecord.winnerPhoto || '').trim();
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
