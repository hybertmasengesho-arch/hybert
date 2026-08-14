# Reasoning Hub

One account, three trackers:

- **`/matrix.html`** — 20-Day Matrix Accuracy Tracker
- **`/reasoning.html`** — The Reasoning Lab (integration + logic, 20 days)
- **`/prep30.html`** — 30-Day EE Year-2 Prep Track

All three save progress through a real backend — a small Express API backed
by SQLite — instead of browser-only storage. Accounts, roles, and an admin
panel are included.

## How it's wired together

Each tracker's own JavaScript was written to call `window.storage.get / set /
delete / list(key, shared)` — the same interface Anthropic's Claude artifacts
use. Rather than rewrite the trackers, `public/js/storage-shim.js` replaces
that object with one that calls the real API (`/api/kv/...`) instead. That's
the whole integration: the trackers don't know the difference.

```
reasoning-hub/
├── server.js              Express app entrypoint
├── db.js                  SQLite setup (users + kv tables)
├── middleware/auth.js      JWT verification, admin gate
├── routes/
│   ├── auth.js             register / login / me
│   ├── kv.js                the storage API behind window.storage
│   └── admin.js             user list, role changes
└── public/
    ├── index.html          home hub (links + combined progress chart)
    ├── login.html / register.html
    ├── admin.html           user management
    ├── matrix.html / reasoning.html / prep30.html   the three trackers
    ├── css/theme.css        shared look (nav, cards, trend chart)
    └── js/
        ├── storage-shim.js  window.storage → real API
        ├── nav.js           shared top nav + auth guard
        └── trend-chart.js   the blue line-chart component
```

## Run it locally

Requires Node.js 18+.

```bash
cd reasoning-hub
npm install
cp .env.example .env
```

Open `.env` and set two things:

1. **`JWT_SECRET`** — any long random string. Generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **`ADMIN_EMAILS`** — your own email address.

Then:

```bash
npm start
```

Open **http://localhost:4000**, click "Create one," and register using the
exact email you put in `ADMIN_EMAILS`. You'll be an admin immediately —
check `/admin.html`. (If you registered before setting `ADMIN_EMAILS`, just
add your email and log out/in again — the role syncs on every login.)

## Deploying it for real

This is a normal Node + SQLite app, so it runs on any host that gives you a
persistent Node process and a persistent disk (SQLite is a single file —
without persistent storage, your data resets on every deploy).

**Render** (free tier available):
1. Push this folder to a GitHub repo.
2. New → Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add a **Disk** (Render's persistent storage add-on) mounted at, e.g.,
   `/data`, and set `DB_PATH=/data/data.db` in your environment variables.
5. Add `JWT_SECRET` and `ADMIN_EMAILS` in the Environment tab.
6. Deploy, then register with your admin email at your Render URL.

**Railway**: similar — new project from repo, add a volume, set the same
three environment variables, deploy.

**Fly.io**: works well with `fly volumes create` for the SQLite file, plus
`fly secrets set JWT_SECRET=... ADMIN_EMAILS=...`.

Any of these gives you a real URL, a real database, and real accounts —
exactly what's running locally, just reachable from anywhere.

## Notes on hardening before wider use

This is a solid working base, not a security audit. Before putting it in
front of strangers, consider adding: rate limiting on `/api/auth/login`,
email verification, password reset flow, and HTTPS enforcement (most hosts
above provide HTTPS automatically). None of that blocks using it yourself
or with a small trusted group right now.
