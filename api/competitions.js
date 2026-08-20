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

function mediaUrl(...values) {
  for (const value of values) {
    const id = driveId(value);
    if (id) return `/media/trophy/${id}`;
  }
  return values.find(Boolean) || '';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  try {
    const data = await getAction('competitions', { game: req.query.game || '' });
    const competitions = (data.competitions || []).map((c) => {
      const cover = mediaUrl(c.copa_portada_file_id, c.copa_portada_url, c.copa_portada);
      const fixture = mediaUrl(c.copa_fixture_file_id, c.copa_fixture_url, c.copa_fixture, c.copa_portada_file_id, c.copa_portada_url, c.copa_portada);
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
