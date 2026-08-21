const { getAction } = require('../lib/apps-script');
const { trophyUrl } = require('../lib/trophy-assets');

function setJsonCache(res, seconds = 3600) {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control', `public, max-age=${seconds}`);
  res.setHeader('Vercel-CDN-Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=86400`);
}

function firstTrophyUrl(...values) {
  for (const value of values) {
    if (!value) continue;
    const url = trophyUrl(value);
    if (url) return url;
  }
  return '';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  setJsonCache(res, 3600);

  try {
    const data = await getAction('competitions', { game: req.query.game || '' });
    const competitions = (data.competitions || []).map((c) => {
      const cover = firstTrophyUrl(c.copa_portada_file_id, c.copa_portada_url, c.copa_portada);
      const fixture = firstTrophyUrl(
        c.copa_fixture_file_id,
        c.copa_fixture_url,
        c.copa_fixture,
        c.copa_portada_file_id,
        c.copa_portada_url,
        c.copa_portada
      );
      return {
        ...c,
        copa_portada: cover,
        copa_fixture: fixture,
        copa_portada_url: cover,
        copa_fixture_url: fixture,
      };
    });
    return res.status(200).json({ competitions });
  } catch (error) {
    return res.status(503).json({ message: error.message });
  }
};
