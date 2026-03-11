# spend-sentinel — Token Spend Controller

**Value Prop:** Stop surprise API bills. Set per-user budgets, get real-time alerts, enforce automatic limits.

**Audience:** Teams of 2-20 developers using Claude Code/Cursor with shared API keys

---

## MVP Scope (v1)

### Core Features
1. **API Proxy Gateway** — Sits between client and Anthropic API, tracks all requests
2. **Token Usage Logging** — SQLite DB storing requests, tokens, costs, timestamps
3. **Per-Key Budgets** — Set budget limits per API key (user)
4. **Budget Alerts** — Slack/Discord webhooks when approaching limit
5. **Auto-Cutoff** — Stop requests when budget exceeded (configurable)
6. **Dashboard** — Web UI showing spend by key, day, week, month

### Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3) for local storage
- Vercel deployment ready

### Endpoints
- `POST /api/proxy` — Anthropic API proxy with tracking
- `GET /api/usage` — Usage stats by key/timeframe
- `POST /api/keys` — Register API key with budget
- `GET /api/keys` — List keys with budgets
- `POST /api/webhooks` — Configure alert webhooks
- `POST /api/alerts/test` — Test webhook

---

## UI Pages

### `/` — Dashboard
- Total spend (today/week/month)
- Spend breakdown by API key
- Budget utilization bars
- Recent activity log

### `/keys` — Manage Keys
- Add/edit/delete API keys
- Set budget per key
- View per-key usage

### `/settings` — Configuration
- Webhook URLs (Slack/Discord)
- Budget warning threshold %
- Auto-cutoff toggle

---

## Monetization Note

- **Free tier:** 1 key, $50 budget limit, 7-day history
- **Pro ($29/mo):** Unlimited keys, custom budgets, 90-day history, Slack alerts
- **Enterprise ($99/mo):** Unlimited, SSO, custom retention, priority support
