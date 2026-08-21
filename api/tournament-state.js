const { getAction, postAction } = require('../lib/apps-script');

const upper = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

function safeRegistration(r = {}) {
  return {
    createdAt: r.createdAt || r.fecha_registro || '',
    tournamentId: String(r.tournamentId || r.torneo_id || ''),
    game: String(r.game || r.juego || ''),
    nick: String(r.nick || ''),
    location: String(r.location || r.ubicacion || ''),
    tiktok: String(r.tiktok || ''),
    photoUrl: String(r.photoUrl || r.foto_url || ''),
    status: String(r.status || r.estado || 'CONFIRMADA'),
  };
}

function safeMatch(m = {}) {
  return {
    tournamentId: String(m.tournamentId || m.torneo_id || ''),
    game: String(m.game || m.juego || ''),
    matchId: String(m.matchId || m.partido_id || ''),
    stage: String(m.stage || m.fase || ''),
    group: String(m.group || m.grupo || ''),
    round: String(m.round || m.jornada || ''),
    player1: String(m.player1 || m.jugador_1 || ''),
    player2: String(m.player2 || m.jugador_2 || ''),
    score1: m.score1 ?? m.goles_1 ?? null,
    score2: m.score2 ?? m.goles_2 ?? null,
    penalty1: m.penalty1 ?? m.penales_1 ?? null,
    penalty2: m.penalty2 ?? m.penales_2 ?? null,
    winner: String(m.winner || m.ganador || ''),
    status: String(m.status || m.estado || ''),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);

  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' });
  if (!req.query.tournamentId) return res.status(400).json({ message: 'Falta el torneo.' });

  const tournamentId = String(req.query.tournamentId);
  const game = String(req.query.game || '');

  try {
    let data = await getAction('state', { tournamentId, game });
    let historical = !!data.historical;

    // Compatibilidad con Apps Script V30: los finalizados devolvían locked=true.
    // Solo en ese caso usamos adminSnapshot dentro del servidor y eliminamos
    // códigos, nombres reales y contactos antes de responder al navegador.
    if (data.locked) {
      const list = await getAction('tournaments', { game });
      const tournament = (list.tournaments || []).find((t) => String(t.id) === tournamentId);
      if (tournament && upper(tournament.status) === 'FINALIZADO') {
        const snap = await postAction('adminSnapshot', { tournamentId }, process.env.ADMIN_SECRET);
        data = { registrations: snap.registrations || [], matches: snap.matches || [], locked: false };
        historical = true;
      }
    }

    return res.status(200).json({
      locked: !!data.locked,
      historical,
      registrations: (data.registrations || []).filter((r) => !['CANCELADA','RETIRADA','DESCALIFICADA'].includes(upper(r.status || r.estado))).map(safeRegistration),
      matches: (data.matches || []).map(safeMatch),
      message: data.message || '',
    });
  } catch (e) {
    return res.status(503).json({ message: e.message });
  }
};
