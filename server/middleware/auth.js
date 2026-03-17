import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SESSION_COOKIE = 'health_session';
const SESSION_SECRET = process.env.AUTH_PIN
  ? crypto.createHash('sha256').update(process.env.AUTH_PIN).digest('hex')
  : null;

export function isAuthEnabled() {
  return !!process.env.AUTH_PIN;
}

let pinHashCache = null;
export function getPinHash() {
  if (!process.env.AUTH_PIN) return null;
  if (!pinHashCache) pinHashCache = bcrypt.hashSync(process.env.AUTH_PIN, 10);
  return pinHashCache;
}

export function verifyPin(pin) {
  if (!process.env.AUTH_PIN) return true;
  return bcrypt.compareSync(pin, getPinHash());
}

export function createAuthCookie() {
  if (!SESSION_SECRET) return null;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update('auth').digest('hex');
  return `auth.${sig}`;
}

export function verifyAuthCookie(cookieVal) {
  if (!cookieVal || !SESSION_SECRET) return false;
  const parts = cookieVal.split('.');
  if (parts.length !== 2 || parts[0] !== 'auth') return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update('auth').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(parts[1], 'hex'), Buffer.from(expected, 'hex'));
}

export function authMiddleware(req, res, next) {
  if (!isAuthEnabled()) return next();

  const cookieVal = req.cookies?.[SESSION_COOKIE];
  if (verifyAuthCookie(cookieVal)) return next();

  if (req.path === '/api/auth/verify' || req.path === '/api/auth/login') {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized', requiresAuth: true });
}

export { SESSION_COOKIE };
