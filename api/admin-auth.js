const {
  createSessionCookie,
  clearSessionCookie,
  hasValidSession,
  credentialsMatch,
} = require('../lib/admin-session');
const { enforceRateLimit, enforceBodySize } = require('../lib/request-guards');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: hasValidSession(req) });
  }

  if (req.method === 'POST') {
    if (!enforceBodySize(req, res, 4 * 1024)) return;
    if (!enforceRateLimit(req, res, { key: 'admin-login', limit: 8, windowMs: 15 * 60_000 })) return;
    const secret = String(req.body?.secret || '');
    if (!credentialsMatch(secret)) {
      return res.status(401).json({ authenticated: false, message: 'Clave administrativa incorrecta.' });
    }
    res.setHeader('Set-Cookie', createSessionCookie());
    return res.status(200).json({ authenticated: true, message: 'Sesión administrativa iniciada.' });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ authenticated: false, message: 'Sesión cerrada.' });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ message: 'Método no permitido.' });
};
