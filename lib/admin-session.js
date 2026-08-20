const crypto = require('crypto');

const COOKIE_NAME = 'gmac_admin_session';
const SESSION_SECONDS = 60 * 60 * 12;

function adminSecret() {
  return String(process.env.ADMIN_SECRET || '');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sign(value) {
  const secret = adminSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(String(value)).digest('base64url');
}

function parseCookies(req) {
  const raw = String(req.headers.cookie || '');
  return raw.split(';').reduce((out, part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return out;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
    return out;
  }, {});
}

function createSessionCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = `${expiresAt}.${sign(expiresAt)}`;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function hasValidSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return false;
  const [expiresRaw, signature] = String(token).split('.');
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) return false;
  return safeEqual(signature, sign(expiresRaw));
}

function credentialsMatch(value) {
  const expected = adminSecret();
  return !!expected && safeEqual(value, expected);
}

function requireAdminRequest(req) {
  return hasValidSession(req) || credentialsMatch(req.headers['x-admin-secret']);
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  hasValidSession,
  credentialsMatch,
  requireAdminRequest,
};
