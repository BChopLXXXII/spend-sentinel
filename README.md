# 🛡️ SpendSentinel

> your token cost firewall for agent teams.

Stop surprise API bills with per-key budgets, live usage tracking, and hard cutoff before spend runs away.

---

## What it does

- Track token spend per API key
- Set monthly budgets per key
- Enforce budget cutoffs before request execution
- View live dashboard totals (today/week/all-time)
- Manage keys (add, disable, delete, update budget)

## Who this is for

- Solo builders using Claude Code/Cursor heavily
- Small teams sharing AI API keys
- Agencies needing cost guardrails per client/project

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

## Hardening Notes (2026-03-11)

- Added file-backed persistence for keys, budgets, usage logs, and settings (`SPEND_SENTINEL_DATA_FILE`)
- Added optional HTTP Basic Auth gate for all pages + API (`SPEND_SENTINEL_ADMIN_USER` / `SPEND_SENTINEL_ADMIN_PASS`)
- Refuses to run unauthenticated in production mode
- API key ingestion is now header-only (`x-api-key`) to reduce accidental secret leakage in payload logs
- Demo key auto-seeding is now dev/demo-only and can be disabled
- Settings sanitization now constrains webhook URL to HTTPS and enforces max length

---

## License

MIT. Do whatever you want with this.

## About

Made by [@BChopLXXXII](https://x.com/BChopLXXXII)

Built for vibe coders who want compounding speed without cost chaos.

Ship it. 🚀

---

If this helped, [star the repo](https://github.com/BChopLXXXII/spend-sentinel) — it helps others find it.
