const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

function adminEmailSet() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const role = adminEmailSet().includes(normalizedEmail) ? 'admin' : 'user';
  const passwordHash = bcrypt.hashSync(password, 10);

  const info = db.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(normalizedEmail, passwordHash, name ? String(name).trim() : null, role);

  const user = { id: info.lastInsertRowid, email: normalizedEmail, name: name || null, role };
  const token = signToken(user);
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  // Re-sync role from ADMIN_EMAILS on every login, so adding your email to the
  // env var and restarting the server is enough to self-grant admin even on
  // an account created before ADMIN_EMAILS was set.
  const shouldBeAdmin = adminEmailSet().includes(normalizedEmail);
  if (shouldBeAdmin && user.role !== 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
    user.role = 'admin';
  }

  const publicUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(publicUser);
  res.json({ token, user: publicUser });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
