const buckets = global.__GMAC_RATE_BUCKETS__ || new Map();
global.__GMAC_RATE_BUCKETS__ = buckets;

function clientIp(req) {
  const candidates = [
    req?.headers?.['x-vercel-forwarded-for'],
    req?.headers?.['x-forwarded-for'],
    req?.headers?.['x-real-ip'],
  ];
  for (const value of candidates) {
    const ip = String(Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();
    if (ip) return ip.slice(0, 96);
  }
  return 'unknown';
}

function rateLimit(req, { key = 'request', limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucketKey = `${key}:${clientIp(req)}`;
  let bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(bucketKey, bucket);
  }
  bucket.count += 1;

  // Evita que una instancia caliente acumule claves para siempre.
  if (buckets.size > 2000) {
    for (const [name, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(name);
      if (buckets.size <= 1500) break;
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function enforceRateLimit(req, res, options) {
  const result = rateLimit(req, options);
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  if (result.allowed) return true;
  res.setHeader('Retry-After', String(result.retryAfter));
  res.status(429).json({ message: 'Demasiadas solicitudes. Inténtalo nuevamente en unos minutos.' });
  return false;
}

function enforceBodySize(req, res, maxBytes = 16 * 1024) {
  const declared = Number(req?.headers?.['content-length'] || 0);
  if (!Number.isFinite(declared) || declared <= maxBytes) return true;
  res.status(413).json({ message: 'La solicitud supera el tamaño permitido.' });
  return false;
}

function text(value, maxLength, { trim = true } = {}) {
  let output = String(value ?? '');
  if (trim) output = output.trim();
  if (output.length > maxLength) throw new Error(`Uno de los campos supera el máximo de ${maxLength} caracteres.`);
  return output;
}

function accepted(value) {
  if (value === true || value === 1) return true;
  return ['1', 'true', 'on', 'si', 'sí', 'acepto', 'accepted'].includes(String(value || '').trim().toLowerCase());
}

module.exports = { clientIp, rateLimit, enforceRateLimit, enforceBodySize, text, accepted };
