const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function scopeFor(req, sharedParam) {
  const shared = sharedParam === true || sharedParam === 'true';
  return shared ? 0 : req.user.id;
}

// GET /api/kv?app=matrix&key=day-progress:1&shared=false
router.get('/', (req, res) => {
  const { app, key } = req.query;
  if (!app || !key) return res.status(400).json({ error: 'app and key are required' });
  const scope = scopeFor(req, req.query.shared);
  const row = db.prepare('SELECT value FROM kv WHERE scope_user_id = ? AND app = ? AND key = ?').get(scope, app, key);
  res.json({ key, value: row ? row.value : null });
});

// POST /api/kv  { app, key, value, shared }
router.post('/', (req, res) => {
  const { app, key, value, shared } = req.body || {};
  if (!app || !key || value === undefined) return res.status(400).json({ error: 'app, key, and value are required' });
  const scope = scopeFor(req, shared);
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  db.prepare(`
    INSERT INTO kv (scope_user_id, app, key, value, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(scope_user_id, app, key)
    DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(scope, app, key, valueStr);
  res.json({ key, value: valueStr, shared: !!shared });
});

// DELETE /api/kv  { app, key, shared }
router.delete('/', (req, res) => {
  const { app, key, shared } = req.body || {};
  if (!app || !key) return res.status(400).json({ error: 'app and key are required' });
  const scope = scopeFor(req, shared);
  db.prepare('DELETE FROM kv WHERE scope_user_id = ? AND app = ? AND key = ?').run(scope, app, key);
  res.json({ key, deleted: true });
});

// GET /api/kv/list?app=matrix&prefix=day-progress:&shared=false
router.get('/list', (req, res) => {
  const { app } = req.query;
  const prefix = req.query.prefix || '';
  if (!app) return res.status(400).json({ error: 'app is required' });
  const scope = scopeFor(req, req.query.shared);
  const rows = db.prepare(
    'SELECT key FROM kv WHERE scope_user_id = ? AND app = ? AND key LIKE ? ORDER BY key'
  ).all(scope, app, prefix + '%');
  res.json({ keys: rows.map(r => r.key) });
});

module.exports = router;
