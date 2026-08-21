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

function payloadFor(route, body = {}) {
  switch (route) {
    case 'activate-tournament':
    case 'generate-codes':
    case 'prepare-fixture':
    case 'snapshot':
      return { tournamentId: body.tournamentId };
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
