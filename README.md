# 🛡️ SpendSentinel

> local-first token cost firewall for AI agent workflows.

Stop surprise API bills with per-key budgets, live usage tracking, warning alerts, and hard cutoff before spend runs away.

---

## Why SpendSentinel

- Track token spend per API key
- Set monthly budgets per key
- Enforce budget cutoffs before request execution
- View live dashboard totals (today/week/all-time)
- Manage keys (add, disable, delete, update budget)
- Send threshold alerts to Discord/Slack webhooks

---

## Screenshots

### Dashboard
![SpendSentinel dashboard](./screenshots/dashboard.png)

### Keys
![SpendSentinel keys page](./screenshots/keys.png)

### Settings
![SpendSentinel settings page](./screenshots/settings.png)

---

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:
- Dashboard: `http://localhost:3000`
- Keys: `http://localhost:3000/keys`
- Settings: `http://localhost:3000/settings`

---

## Proxy Usage

Point your AI tool at SpendSentinel:

```bash
export ANTHROPIC_BASE_URL=http://localhost:3000/api/proxy
```

Then send requests through `/api/proxy` using a key already added in `/keys`.

> API keys must be sent via `x-api-key` header only (not request body).

### Example request

```bash
curl -X POST http://localhost:3000/api/proxy \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-your-key" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role":"user","content":"hello"}],
    "max_tokens": 256
  }'
```

---

## API Endpoints

### Keys
- `GET /api/keys` → list tracked keys (masked)
- `POST /api/keys` → add key `{ name, key, budget }`
- `PATCH /api/keys` → update `{ id, enabled?, budget? }`
- `DELETE /api/keys?id=<id>` → delete key

### Proxy
- `POST /api/proxy` → enforce budget + forward (or demo response)
- `GET /api/proxy` → dashboard totals + recent usage

### Settings
- `GET /api/settings` → fetch alert + cutoff settings
- `PUT /api/settings` → persist alert + cutoff settings
- `POST /api/settings/test` → send test webhook notification

---

## Demo Mode vs Live Forwarding

By default:
- `SPEND_SENTINEL_DEMO_MODE=true`
- `/api/proxy` returns a simulated assistant response and still tracks spend

For live forwarding:
1. Set `SPEND_SENTINEL_DEMO_MODE=false` in `.env.local`
2. Use real Anthropic keys in `/keys`
3. SpendSentinel forwards calls to `https://api.anthropic.com/v1/messages`

---

## Security Notes

- Supports optional HTTP Basic Auth gate for dashboard + API
- Refuses to run unauthenticated in production mode
- Uses header-only key ingestion (`x-api-key`) to reduce accidental payload leaks
- Demo-key auto-seeding is dev/demo-only and can be disabled

See `PRODUCTION_HARDENING_PLAN.md` for the SaaS-ready migration path.

---

## License

MIT. Do whatever you want with this.

## About

Made by [@BChopLXXXII](https://x.com/BChopLXXXII)

Built for vibe coders who want compounding speed without cost chaos.

Ship it. 🚀

---

If this helped, [star the repo](https://github.com/BChopLXXXII/spend-sentinel) — it helps others find it.
