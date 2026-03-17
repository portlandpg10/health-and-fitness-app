import { Router } from 'express';
import { isAuthEnabled, verifyPin, createAuthCookie, verifyAuthCookie, SESSION_COOKIE } from '../middleware/auth.js';

const router = Router();

router.get('/verify', (req, res) => {
  const authenticated = !isAuthEnabled() || verifyAuthCookie(req.cookies?.[SESSION_COOKIE]);
  res.json({ authEnabled: isAuthEnabled(), authenticated });
});

router.post('/login', (req, res) => {
  if (!isAuthEnabled()) {
    return res.json({ success: true });
  }
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN required' });
  }
  if (!verifyPin(pin)) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  const cookieVal = createAuthCookie();
  if (cookieVal) {
    res.cookie(SESSION_COOKIE, cookieVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

export default router;
