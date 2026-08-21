const { postAction } = require('../lib/apps-script');
const { enforceRateLimit, enforceBodySize, text, accepted } = require('../lib/request-guards');

const TOURNAMENT_RE = /^[A-Za-z0-9_-]{1,100}$/;
const CODE_RE = /^[A-Za-z0-9-]{4,48}$/;
const GAMES = new Set(['fc-mobile', 'efootball']);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método no permitido.' });
  }
  if (!enforceBodySize(req, res, 16 * 1024)) return;
  if (!enforceRateLimit(req, res, { key: 'register', limit: 10, windowMs: 10 * 60_000 })) return;

  try {
    const p = req.body || {};
    const payload = {
      code: text(p.code, 48).toUpperCase(),
      tournamentId: text(p.tournamentId, 100),
      game: text(p.game, 24).toLowerCase(),
      name: text(p.name, 90),
      nick: text(p.nick, 48),
      contact: text(p.contact, 120),
      location: text(p.location, 90),
      tiktok: text(p.tiktok || '', 90),
      photoUrl: text(p.photoUrl || '', 1000),
      rulesAccepted: accepted(p.rulesAccepted) ? 'true' : '',
    };

    if (!payload.code || !payload.tournamentId || !payload.game || !payload.name || !payload.nick || !payload.contact || !payload.location || !payload.rulesAccepted) {
      return res.status(400).json({ message: 'Completa todos los datos obligatorios y acepta las normas.' });
    }
    if (!CODE_RE.test(payload.code)) return res.status(400).json({ message: 'El código de inscripción no tiene un formato válido.' });
    if (!TOURNAMENT_RE.test(payload.tournamentId)) return res.status(400).json({ message: 'El identificador del torneo no es válido.' });
    if (!GAMES.has(payload.game)) return res.status(400).json({ message: 'El juego seleccionado no es válido.' });

    const data = await postAction('register', payload);
    return res.status(200).json({ message: data.message || '¡Inscripción registrada!' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'No se pudo registrar la inscripción.' });
  }
};
