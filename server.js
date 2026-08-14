require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

require('./db'); // ensures tables exist before anything else runs

const authRoutes = require('./routes/auth');
const kvRoutes = require('./routes/kv');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/kv', kvRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, 'public')));
// Anything not matched by an API route or a static file falls back to the hub —
// keeps things simple since this isn't a client-side router.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Reasoning Hub server running on http://localhost:${PORT}`);
});
