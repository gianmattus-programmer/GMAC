const { getAction } = require('../lib/apps-script');

const ID_RE = /^[A-Za-z0-9_-]{0,100}$/;

function money(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Por anunciar';
  if (/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return `S/ ${raw.replace(',', '.')}`;
  return raw;
}

function date(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(parsed).replace(', ', ' · ');
}

function safeWinner(w = {}) {
  const tournamentId = String(w.tournamentId || '');
  return {
    competitionId: String(w.competitionId || ''),
    tournamentId,
    edition: Number(w.edition) || 0,
    game: String(w.game || ''),
    competition: String(w.competition || ''),
    winner: String(w.winner || ''),
    winnerPhoto: w.winnerPhoto && tournamentId ? `/media/champion/${encodeURIComponent(tournamentId)}` : '',
    prizeFirst: money(w.prizeFirst),
    runnerUp: String(w.runnerUp || ''),
    prizeSecond: money(w.prizeSecond),
    instagram: String(w.instagram || ''),
    finishedAt: date(w.finishedAt),
    official: w.official !== false,
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido.' });
  }
  const competitionId = String(req.query.competitionId || '');
  const game = String(req.query.game || '');
  if (!ID_RE.test(competitionId) || (game && !['fc-mobile', 'efootball'].includes(game))) {
    return res.status(400).json({ message: 'Filtro no válido.' });
  }
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control', 'public, max-age=300');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  try {
    const data = await getAction('winners', { competitionId, game });
    return res.status(200).json({ winners: (data.winners || []).map(safeWinner) });
  } catch (error) {
    return res.status(503).json({ message: error.message });
  }
};
