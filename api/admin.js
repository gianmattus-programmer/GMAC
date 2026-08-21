const { postAction } = require('../lib/apps-script');
const { requireAdminRequest } = require('../lib/admin-session');

const ACTIONS = {
  'activate-tournament': 'activateTournament',
  'create-competition': 'createCompetition',
  'create-tournament': 'createTournament',
  'generate-codes': 'generateCodes',
  'prepare-fixture': 'prepareFixture',
  'save-result': 'saveResult',
  'set-winner-instagram': 'setWinnerInstagram',
  'set-registrations': 'setRegistrations',
  'snapshot': 'adminSnapshot',
  'finalize-tournament': 'finalizeTournament',
  'update-participant': 'updateParticipant',
  'set-participant-status': 'setParticipantStatus',
  'replace-participant': 'replaceParticipant',
  'set-code-status': 'setCodeStatus',
  'regenerate-code': 'regenerateCode',
};

function upper(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function nonNegativeInteger(value, label) {
  if (value === '' || value === null || value === undefined) {
    throw new Error(`${label} es obligatorio.`);
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${label} debe ser un número entero igual o mayor que 0.`);
  }
  return number;
}

function drawAllowed(stage) {
  const value = upper(stage);
  return value.includes('GRUPO') || value.includes('LIGA') || value.includes('JORNADA') || value.includes('FASE LIGA');
}

function saveResultPayload(body = {}) {
  const payload = {
    tournamentId: String(body.tournamentId || '').trim(),
    matchId: String(body.matchId || '').trim(),
    stage: String(body.stage || body.fase || '').trim(),
    group: String(body.group || body.grupo || '').trim(),
    round: body.round ?? body.jornada ?? '',
    player1: String(body.player1 || body.jugador_1 || '').trim(),
    player2: String(body.player2 || body.jugador_2 || '').trim(),
    score1: nonNegativeInteger(body.score1, 'Marcador 1'),
    score2: nonNegativeInteger(body.score2, 'Marcador 2'),
  };

  if (!payload.tournamentId || !payload.matchId) {
    throw new Error('Torneo y partido son obligatorios.');
  }
  if (!payload.player1 || !payload.player2) {
    throw new Error('El partido todavía no tiene ambos participantes definidos.');
  }

  const tied = payload.score1 === payload.score2;
  if (!tied || drawAllowed(payload.stage)) {
    // En partidos sin desempate se limpian penales anteriores para que nunca
    // quede un segundo marcador obsoleto en el fixture público.
    payload.penalty1 = '';
    payload.penalty2 = '';
    return payload;
  }

  payload.penalty1 = nonNegativeInteger(body.penalty1, 'Penales 1');
  payload.penalty2 = nonNegativeInteger(body.penalty2, 'Penales 2');
  if (payload.penalty1 === payload.penalty2) {
    throw new Error('Los penales deben definir un ganador.');
  }
  return payload;
}

function payloadFor(route, body = {}) {
  switch (route) {
    case 'activate-tournament':
    case 'generate-codes':
    case 'prepare-fixture':
    case 'snapshot':
      return { tournamentId: body.tournamentId };
    case 'save-result':
      return saveResultPayload(body);
    case 'set-winner-instagram':
      return { tournamentId: body.tournamentId, url: body.url || '' };
    case 'set-registrations':
      return { tournamentId: body.tournamentId, status: body.status };
    case 'finalize-tournament':
      return {
        tournamentId: body.tournamentId,
        winner: body.winner,
        runnerUp: body.runnerUp,
        confirm: body.confirm,
      };
    case 'update-participant':
      return {
        tournamentId: body.tournamentId,
        originalNick: body.originalNick,
        newNick: body.newNick,
        name: body.name,
        contact: body.contact,
        location: body.location,
        tiktok: body.tiktok,
        photoUrl: body.photoUrl,
      };
    case 'set-participant-status':
      return { tournamentId: body.tournamentId, nick: body.nick, status: body.status };
    case 'replace-participant':
      return {
        tournamentId: body.tournamentId,
        originalNick: body.originalNick,
        nick: body.nick,
        name: body.name,
        contact: body.contact,
        location: body.location,
        tiktok: body.tiktok,
        photoUrl: body.photoUrl,
      };
    case 'set-code-status':
      return { tournamentId: body.tournamentId, code: body.code, status: body.status };
    case 'regenerate-code':
      return { tournamentId: body.tournamentId, code: body.code };
    default:
      return body || {};
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  if (!requireAdminRequest(req)) {
    return res.status(401).json({ message: 'Sesión administrativa requerida.' });
  }

  const route = String(req.query?.action || '').trim().toLowerCase();
  const action = ACTIONS[route];
  if (!action) {
    return res.status(404).json({ message: 'Acción administrativa no encontrada.' });
  }

  try {
    const data = await postAction(action, payloadFor(route, req.body || {}), process.env.ADMIN_SECRET);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
