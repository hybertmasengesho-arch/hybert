const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — every account, plus "days completed per tracker."
//
// Matrix stores one kv row per day, so a row count is already meaningful.
// Reasoning Lab and Prep30 each store ALL their progress as a single JSON
// blob under one key, so a row count would only ever read 0 or 1 — instead
// we parse that blob and count actual completed days, per user.
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC').all();

  const matrixByUser = {};
  db.prepare(
    `SELECT scope_user_id AS user_id, COUNT(*) AS n FROM kv
     WHERE scope_user_id != 0 AND app = 'matrix' AND key LIKE 'day-progress:%'
     GROUP BY scope_user_id`
  ).all().forEach(r => { matrixByUser[r.user_id] = r.n; });

  const reasoningByUser = {};
  db.prepare(
    `SELECT scope_user_id AS user_id, value FROM kv
     WHERE scope_user_id != 0 AND app = 'reasoning' AND key = 'progress'`
  ).all().forEach(r => {
    try {
      const parsed = JSON.parse(r.value);
      reasoningByUser[r.user_id] = Object.values(parsed).filter(d => d && d.done).length;
    } catch (e) { reasoningByUser[r.user_id] = 0; }
  });

  const prep30ByUser = {};
  db.prepare(
    `SELECT scope_user_id AS user_id, value FROM kv
     WHERE scope_user_id != 0 AND app = 'prep30' AND key = 'prep30-progress'`
  ).all().forEach(r => {
    try {
      const parsed = JSON.parse(r.value);
      prep30ByUser[r.user_id] = Array.isArray(parsed.completed) ? parsed.completed.length : 0;
    } catch (e) { prep30ByUser[r.user_id] = 0; }
  });

  res.json({
    users: users.map(u => ({
      ...u,
      activity: {
        matrix: matrixByUser[u.id] || 0,
        reasoning: reasoningByUser[u.id] || 0,
        prep30: prep30ByUser[u.id] || 0
      }
    }))
  });
});

// POST /api/admin/users/:id/role  { role: 'admin' | 'user' }
router.post('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: "role must be 'admin' or 'user'" });
  const id = Number(req.params.id);
  if (id === req.user.id && role === 'user') {
    return res.status(400).json({ error: "You can't demote your own account — have another admin do it." });
  }
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

module.exports = router;
