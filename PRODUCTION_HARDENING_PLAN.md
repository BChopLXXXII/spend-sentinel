# SpendSentinel Production Hardening Plan

## Current blockers (must-fix before real production)

1. **No user auth / tenant isolation yet**
   - Current app is single-tenant behind Basic Auth.
   - Not safe for multi-user SaaS.

2. **Secrets are stored in plaintext at rest**
   - API provider keys are persisted as raw values.
   - Requires encryption-at-rest strategy (KMS or Supabase Vault/pgsodium pattern).

3. **No managed database yet**
   - Local file persistence works for single node deployments only.
   - Horizontal scaling and HA need Supabase/Postgres.

4. **No RLS because no Supabase schema yet**
   - RLS policies are not in place until data is moved to Postgres.

5. **No observability/SLO stack**
   - Missing structured logs, uptime checks, alerting, and error tracking.

## Recommended production MVP path (Supabase-first)

### Phase 1 — Secure single-tenant launch (now)
- Keep Basic Auth enabled.
- Run on one node with mounted persistent volume.
- Enable HTTPS at reverse proxy.
- Rotate admin password and keep `.env` out of git.

### Phase 2 — Supabase migration (required for SaaS)
1. Create tables:
   - `api_keys`
   - `usage_logs`
   - `alert_settings`
2. Enable RLS on all tables.
3. Auth model:
   - `auth.users` + per-user ownership via `user_id` FK.
4. Policies:
   - Users can only CRUD their own keys/settings/logs.
5. Frontend:
   - Use Supabase client directly from Next.js.
   - Remove custom management API routes once RLS is enforced.

### Phase 3 — Key security uplift
- Encrypt provider keys before persistence.
- Add key-rotation UX and audit trail.
- Add optional provider key health checks.

### Phase 4 — Ops hardening
- Add structured logs and request IDs.
- Add error reporting (Sentry or equivalent).
- Add budget anomaly alerts and service health dashboards.

## Approval-required decisions

1. **Single-tenant vs multi-tenant scope now**
   - Multi-tenant requires Supabase auth + RLS before launch.
2. **Key encryption approach**
   - Need approval for KMS/provider choice and cost.
3. **Deployment target**
   - VPS single-node now vs managed platform after Supabase migration.
