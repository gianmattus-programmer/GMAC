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

function publicCompetition(c = {}) {
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
    competition_id: String(c.competition_id || ''),
    juego: String(c.juego || ''),
    nombre: String(c.nombre || ''),
    categoria: String(c.categoria || ''),
    participantes_defecto: c.participantes_defecto ?? '',
    tipo_defecto: String(c.tipo_defecto || ''),
    estructura_defecto: String(c.estructura_defecto || ''),
    formato_defecto: String(c.formato_defecto || ''),
    tamano_grupo: c.tamano_grupo ?? '',
    clasifican_grupo: c.clasifican_grupo ?? '',
    vueltas_grupo: c.vueltas_grupo ?? '',
    regla_partidos: String(c.regla_partidos || ''),
    descripcion: String(c.descripcion || ''),
    orden: c.orden ?? '',
    activo: String(c.activo || ''),
    copa_portada: cover,
    copa_fixture: fixture,
    copa_portada_url: cover,
    copa_fixture_url: fixture,
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  setJsonCache(res, 3600);

  try {
    const game = String(req.query.game || '');
    if (game && !['fc-mobile', 'efootball'].includes(game)) {
      return res.status(400).json({ message: 'Juego no válido.' });
    }
    const data = await getAction('competitions', { game });
    const competitions = (data.competitions || []).map(publicCompetition);
    return res.status(200).json({ competitions });
  } catch (error) {
    return res.status(503).json({ message: error.message });
  }
};
