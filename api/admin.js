const { postAction, requireAdmin } = require('../lib/apps-script');

const ACTIONS = {
  'activate-tournament': 'activateTournament',
  'create-competition': 'createCompetition',
  'create-tournament': 'createTournament',
  'generate-codes': 'generateCodes',
  'prepare-fixture': 'prepareFixture',
  'save-result': 'saveResult',
  'set-winner-instagram': 'setWinnerInstagram'
};

function payloadFor(route, body = {}) {
  switch (route) {
    case 'activate-tournament':
    case 'generate-codes':
    case 'prepare-fixture':
      return { tournamentId: body.tournamentId };
    case 'set-winner-instagram':
      return { tournamentId: body.tournamentId, url: body.url || '' };
    default:
      return body || {};
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ message: 'No autorizado.' });
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
