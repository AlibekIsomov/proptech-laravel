# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A multi-tenant PropTech platform. One Laravel 12 backend, **two parallel domains** and **three Telegram-facing surfaces**.

- **Property Management (PM) portal** — the live product. `App\Models\PM\Project/Building/Apartment` (tables `pm_*`), plus residents, maintenance, billing, utilities, polls, inventory, vendors. Routes under `/pm/*`, `/dispatcher/*`, `/vendor/*`, `/resident/*`.
- **Sales CRM** — `App\Models\Project/Building/Apartment/Client`, lead/unit pipeline. **Currently switched off**: `App\Http\Middleware\SalesDisabled` (alias `sales.disabled`) `abort(404)`s unconditionally, so `/dashboard`, `/projects`, `/apartments`, `/clients`, `/companies`, `/users` all 404. The code, models, and tests still exist and are maintained — don't delete them — but don't assume a sales page is reachable. `/` and `/login` redirect to `pm.login`.

Same real-world concepts (project/building/apartment) exist in both domains with **separate models, tables, and route trees**. Importing one where the other is meant is the most common bug in this repo.

**Model layout gotcha**: only Project/Building/Apartment are namespaced `App\Models\PM\*`. The rest of the PM domain lives in `App\Models` root — `Resident`, `MaintenanceRequest`, `MaintenancePhoto`, `PMInvoice`, `PMAsset`, `Poll`, `PollVote`, `UtilityMeter`, `UtilityRate`, `MeterReading`, `CommunalAsset`, `InventoryItem`, `Vendor`, `TelegramSession`, `CityReport` — alongside the Sales models. Check the namespace, not the name.

Frontends / API surfaces:
1. **Inertia + React SPA** (`routes/web.php`) — role-gated page trees under `resources/js/Pages`.
2. **Telegram Mini App for residents & vendors** — page `/telegram-app`, API `telegram-app/api/*`, auth via `Middleware\Telegram\AuthenticateWebApp` validating Telegram `initData`.
3. **Mahalla Fix Mini App** — citizen reporting of city/mahalla infrastructure problems (roads, lighting, water/gas). **Separate bot, separate webhook, separate page**: `/mahalla-fix`, API `mahalla-fix/api/*`, auth via `AuthenticateMahallaWebApp`. `CityReport` model; photos are classified by Claude Vision (`ClaudeService::analyzeImage`) at submit time.
4. **Resident mobile JSON API** (`routes/api.php`, prefix `api/resident/*`) — custom token auth, no Sanctum.

## Commands

```
composer dev                          # serve + queue:listen + pail (logs) + vite, concurrently — local dev
npm run dev / npm run build           # Vite only (frontend is React, not Vue)
php artisan test                      # all tests (plain PHPUnit — Pest is NOT installed)
php artisan test --filter=TestName    # single test/class
php artisan test tests/Feature/ResidentTest.php
php artisan test --parallel           # what CI runs (paratest)
composer test                         # config:clear + artisan test
./vendor/bin/pint                     # code style (Pint, default ruleset)
php artisan db:seed --class=RolesAndSuperAdminSeeder --force   # required after fresh migrate (CI does this)
php artisan db:push-to-supabase [--force] [--chunk=200] [--tables=]   # push local Postgres → Supabase mirror
php artisan db:seed-from-supabase [--force] [--chunk=200]             # pull Supabase → local (initial setup)
php artisan telegram:webhook {url?} [--delete]     # resident/vendor bot webhook
php artisan telegram:menu-button [--text=]         # resident/vendor bot Mini App menu button
php artisan mahalla:setup {url?} [--delete] [--menu-text=]   # Mahalla Fix bot webhook + menu button
php artisan mahalla:reanalyze                      # re-run Claude Vision over existing city reports
```

`telegram:menu-button` runs on every deploy (see `.github/workflows/deploy.yml`); `mahalla:setup` does not — run it manually when that bot's URL changes.

**DB note**: `.env.example` defaults to `DB_CONNECTION=sqlite`, but tests, CI, and production all run on **Postgres** (`phpunit.xml` and `deploy.yml` force `pgsql`). Several migrations use Postgres-specific SQL — don't assume sqlite works.

Deploy: GitHub Actions → tests → Docker image to GHCR → SSH to VPS, `docker compose` zero-downtime (db container is never recreated; the DB password is enforced in-place with `ALTER USER`; `app`/`queue`/`web` are `--force-recreate`d, then `migrate --force` + `optimize`). Prod compose also runs Prometheus/Grafana/exporters.

## Testing conventions

- Plain PHPUnit classes extending `Tests\TestCase`. **No Pest**, no `RefreshDatabase`.
- Feature tests use **`DatabaseTransactions`** against a real, already-migrated Postgres database, so they must not assume an empty DB: create fixtures with `firstOrCreate` on stable keys (see `SalesDisabledTest`), not blind `create`.
- Only `UserFactory` exists — everything else is built by hand in `setUp()`.
- The base `TestCase` seeds all eight roles and flushes Spatie's permission cache on every test, so `assignRole()` works with no seeder step.
- Telegram tests sign `initData` with `Tests\Support\TelegramInitDataHelper::buildInitData()`.

## Architecture

- **Logic lives in controllers**, not Services/Actions/Repositories. Controllers validate inline, query, and hand-shape response arrays — there's no Form Request or API Resource layer anywhere. Service classes only wrap external integrations: `ClaudeService` (request categorization, image analysis, insights, email gen; model from `services.anthropic.model`), `Services/Telegram/*`, `TelegramAlert`.
- **Side effects go through Observers + queued Jobs**, not inline controller code: `MaintenanceRequestObserver` dispatches `Jobs/Telegram/NotifyVendorAssigned` and `NotifyResidentStatusChanged` on create/status-change; `NotifyCityReportCreated` is dispatched from the Mahalla Fix controller.
- **Multi-tenancy**: `App\Models\Scopes\CompanyScope` is a global scope auto-filtering every query by `company_id` (bypassed for `super_admin`). Code running outside an authenticated web session — resident API, Telegram bot/Mini Apps/jobs — has no `auth()->user()`, so it must explicitly call `withoutGlobalScopes()`. That pattern in `Api/Resident/*`, `Telegram/*`, and jobs is intentional, not a bug.
- **Supabase sync**: models using the `SyncsToSupabase` trait auto-dispatch `Jobs\SyncModelToSupabase` on `saved`/`deleted`, gated by `SYNC_TO_SUPABASE` (forced off in `phpunit.xml` and CI). One-way local→Supabase mirror, queued.
- **Resident mobile auth**: not Sanctum — a random token is written to `residents.api_token` on login and checked by `ResidentApiAuth`, which attaches the resident to `$request->attributes->get('resident')`.
- **Telegram bots — there are three tokens** in `config/services.php`:
  - `telegram.bot_token` / `chat_id` — ops alert bot only (`TelegramAlert`).
  - `telegram.user_bot_token` — resident/vendor bot. Webhook `POST /telegram/webhook` → `Telegram\WebhookController` → `Services/Telegram/UpdateHandler` → per-role flows (`ResidentFlow`, `VendorFlow`, `RegistrationService`).
  - `telegram.mahalla.*` — Mahalla Fix bot. Webhook `POST /mahalla-fix/webhook` → `Telegram\MahallaFix\WebhookController`. Use `TelegramBotApi::mahalla()` for this bot; the default instance talks to the user bot.
  All four Telegram paths are CSRF-exempt in `bootstrap/app.php`.
- **Production errors are pushed to Telegram**: `bootstrap/app.php` reports every throwable via `TelegramAlert::error()`, skipping a list of ordinary exceptions (auth, validation, 404, CSRF) and only when `app()->isProduction()`.
- **Marketing landing** at `/` is registered only when `LANDING_DOMAIN` is set (`Route::domain(...)`, view `landing`); without it `/` just redirects to `pm.login`.
- Authorization uses Spatie `laravel-permission` via `role:` route middleware. Roles: `super_admin`, `company_admin`, `manager`, `viewer`, `property_manager`, `dispatcher`, `vendor`, `resident`.
- Frontend: React 19 + Inertia, TypeScript, pages under `resources/js/Pages` mirroring the role split (`PM/`, `TelegramApp/`, `MahallaFix/`, plus the disabled sales trees); Tailwind v4 via `@tailwindcss/vite`, i18n via `i18next`/`react-i18next`, charts via `recharts`, maps via `leaflet`.
- Most UI/system strings, validation messages, and code comments are in **Uzbek** (Latin script) — match this for new user-facing text.
