# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A multi-tenant PropTech platform with **two parallel domains** sharing one backend:
- **Sales CRM** — `App\Models\Project/Building/Apartment/Client`, lead/unit sales pipeline.
- **Property Management (PM) portal** — `App\Models\PM\Project/Building/Apartment` (tables `pm_*`), residents, maintenance, billing, vendors.

Same real-world concepts (project/building/apartment), but separate models, tables, and route trees (`/companies|projects|clients|apartments` vs `/pm/*`). Don't import one where the other is meant — it's the most common source of bugs here.

Three frontends consume this one Laravel backend:
1. Inertia + **React** SPA (`web.php`) — role-gated: sales, `pm/*`, `dispatcher/*`, `vendor/*`, `resident/*`.
2. Telegram Mini App (`telegram-app/api/*` in `web.php`) — auth via `Telegram\AuthenticateWebApp` middleware validating Telegram `initData`.
3. Resident mobile JSON API (`api.php`, prefix `resident/*`) — custom token auth (no Sanctum).

A Telegram **bot** also runs through this app via a single webhook.

## Commands

```
composer dev                          # serve + queue:listen + pail (logs) + vite, concurrently — use this for local dev
npm run dev / npm run build           # Vite only (frontend is React, not Vue)
php artisan test                      # run all tests (Pest/PHPUnit, tests/Feature + tests/Unit)
php artisan test --filter=TestName    # run a single test/class
php artisan test tests/Feature/ResidentTest.php
php artisan test --parallel           # what CI runs (paratest installed)
composer test                         # config:clear + artisan test
./vendor/bin/pint                     # code style (Pint, default ruleset)
php artisan db:seed --class=RolesAndSuperAdminSeeder --force   # required after fresh migrate (CI does this)
php artisan db:push-to-supabase [--force] [--chunk=200] [--tables=]   # push local Postgres → Supabase mirror
php artisan db:seed-from-supabase [--force] [--chunk=200]             # pull Supabase → local (initial setup)
php artisan telegram:webhook {url} [--delete]   # set/clear the bot webhook
php artisan telegram:menu-button [--text=]      # set Mini App menu button; run on every deploy (see .github/workflows/deploy.yml)
```

**DB note**: `.env.example` defaults to `DB_CONNECTION=sqlite`, but tests, CI, and production all run on **Postgres** (`phpunit.xml` and `deploy.yml` force `pgsql`). Several migrations use Postgres-specific SQL — don't assume sqlite works.

Deploy is via Docker/GHCR, pushed to a VPS with `docker compose`, zero-downtime (db container isn't recreated; password enforced in-place); see `.github/workflows/deploy.yml`.

## Architecture

- **Logic lives in controllers**, not Services/Actions/Repositories. Controllers validate inline, query, and hand-shape response arrays — there's no Form Request or API Resource layer anywhere in the app. Real Service classes only wrap external integrations: `ClaudeService` (AI categorization/insights/email gen), `Services/Telegram/*` (bot flows, keyboards, webapp auth), `TelegramAlert`.
- **Side effects go through Observers + queued Jobs**, not inline controller code: `MaintenanceRequestObserver` dispatches `Jobs/Telegram/NotifyVendorAssigned` and `NotifyResidentStatusChanged` on create/status-change.
- **Multi-tenancy**: `App\Models\Scopes\CompanyScope` is a global scope auto-filtering every query by `company_id` (bypassed for role `super_admin`). Code running outside an authenticated web session — the resident API, Telegram bot/jobs — has no `auth()->user()`, so it must explicitly call `withoutGlobalScopes()`. That pattern in `Api/Resident/*` and PM/Telegram code is intentional, not a bug.
- **Supabase sync**: models using the `SyncsToSupabase` trait auto-dispatch `Jobs\SyncModelToSupabase` on `saved`/`deleted` (gated by `SYNC_TO_SUPABASE` env, disabled in tests/CI). One-way local→Supabase mirror, queued so it doesn't block requests.
- **Resident mobile auth**: not Sanctum — a random token is written to `residents.api_token` on login and checked by `ResidentApiAuth` middleware, which attaches the resident to `$request->attributes->get('resident')`.
- **Telegram bot**: single webhook `POST /telegram/webhook` (CSRF-exempt, see `bootstrap/app.php`) → `Services/Telegram/UpdateHandler` → per-role flow classes (`ResidentFlow`, `VendorFlow`, `RegistrationService`).
- Authorization/roles use Spatie `laravel-permission` (`role:` route middleware); RBAC roles seen: `super_admin`, `company_admin`, `manager`, `viewer`, `property_manager`, `dispatcher`, `vendor`, `resident`.
- Frontend: React via Inertia, pages under `resources/js/Pages` mirror the role split (`PM/`, `Apartments/`, `Clients/`, `TelegramApp/`, etc.); Tailwind v4 + `@tailwindcss/vite`, i18n via `i18next`/`react-i18next`.
- Most UI/system strings and validation messages are written in **Uzbek** (Latin script) — match this for new user-facing text.
