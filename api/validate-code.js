const { postAction } = require('../lib/apps-script');
const { enforceRateLimit, enforceBodySize, text } = require('../lib/request-guards');

const TOURNAMENT_RE = /^[A-Za-z0-9_-]{1,100}$/;
const CODE_RE = /^[A-Za-z0-9-]{4,48}$/;
const GAMES = new Set(['fc-mobile', 'efootball']);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, message: 'Método no permitido.' });
  }
  if (!enforceBodySize(req, res, 4 * 1024)) return;
  if (!enforceRateLimit(req, res, { key: 'validate-code', limit: 30, windowMs: 10 * 60_000 })) return;

  try {
    const code = text(req.body?.code, 48).toUpperCase();
    const tournamentId = text(req.body?.tournamentId, 100);
    const game = text(req.body?.game || '', 24).toLowerCase();
    if (!code || !tournamentId) return res.status(400).json({ valid: false, message: 'Falta el código o el torneo.' });
    if (!CODE_RE.test(code) || !TOURNAMENT_RE.test(tournamentId) || (game && !GAMES.has(game))) {
      return res.status(400).json({ valid: false, message: 'Los datos de validación no tienen un formato válido.' });
    }

    const data = await postAction('validateCode', { code, tournamentId, game });
    return res.status(data.valid ? 200 : 401).json({ valid: !!data.valid, message: data.message || '' });
  } catch (error) {
    return res.status(503).json({ valid: false, message: error.message || 'No se pudo validar el código.' });
  }
};
