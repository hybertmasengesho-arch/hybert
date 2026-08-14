// db.js — opens (and, on first run, creates) the SQLite database.
// Everything the hub needs lives in two tables:
//   users — one row per account
//   kv    — the generic key/value store that stands in for window.storage.
//           scope_user_id = 0 means "shared" (visible to everyone),
//           otherwise it's that user's private row for that app+key.
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT,
    role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kv (
    scope_user_id INTEGER NOT NULL,   -- 0 = shared/global scope
    app           TEXT NOT NULL,      -- 'matrix' | 'reasoning' | 'prep30' | ...
    key           TEXT NOT NULL,
    value         TEXT NOT NULL,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (scope_user_id, app, key)
  );
`);

module.exports = db;
