# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Give concise responses and summaries without adding extraneous information.

When creating or updating the architecture or files, reference the @SPEC.md file.

## Project state

Routing skeleton in place: every page in SPEC §5.2 exists under `src/app/pages/` as a lazy-loaded placeholder (an `<h1>` plus a message), and stub shared components live in `src/app/shared/`. Built so far: environments + dev proxy (`proxy.conf.json` → `https://localhost:7100`), `API_BASE_URL`, card models, `CardService.createSeries`, authentication (`src/app/core/auth/`: `LoginService` with session signals and expiry timer, `TokenStorage` under `fcm.session`, `authInterceptor`, `authGuard`, `guestGuard`; login, register and logout pages are wired to it, and the nav switches on `isLoggedIn`), and `CardEditor`, which both creates (`/cards/new`, `createSeries`) and edits (`/cards/:id/edit`: `getSeries` fills the form with loading / "Series not found" (FR-EDT-3) / error-and-retry views, `updateSeries` sends the `concurrencyStamp`, and a `409` shows Reload / Overwrite (FR-EDT-7)). After a save the editor stays on the page showing "Saved." rather than going to `/cards` (no toast service yet), and the image picker is a local preview only (the API has no image upload). `/cards` (`CardList`) loads `listSeries()` with loading/error/empty states, filter, sort and delete; `/study` loads `listSeriesWithCards()` (`GET /card-series?include=cards`) with loading, error-and-retry and empty states (FR-STD-9). `/study`, `/cards*` need login; `/login` and `/register` are guest-only. Not built yet: `errorInterceptor`/toasts (login and register show their own errors), `unsavedChangesGuard` (FR-EDT-6) and `CardService.clearCache` (nothing is cached yet). Specs use `src/app/testing/auth-testing.ts` (`authTestProviders`, `seedSession`) and `card-testing.ts` (`makeSeries`, `makeSummary`, `sampleDeck`), and answer HTTP with `HttpTestingController`; the API contract is the sibling `flash-cards-multiple-api` project.

## Commands

- `npm start` (`ng serve`) — dev server at http://localhost:4200 (development configuration by default). `/api` is proxied to `https://localhost:7100`, so the API must be running with its **https** launch profile (`dotnet run --project flash-cards-multiple-api --launch-profile https`); the API's first launch profile is `https`, so plain `dotnet run` works too, but the `http` profile only listens on :5228 and the proxy then answers 502.
- `npm run build` (`ng build`) — production build to `dist/` (production is the default build configuration)
- `npm run watch` — development build in watch mode
- `npm test` (`ng test`) — unit tests via Vitest with jsdom, through the `@angular/build:unit-test` builder
- Single spec file: `ng test --include src/app/app.spec.ts`; one-shot (no watch): add `--watch=false`
- Formatting: Prettier (`npx prettier --write <files>`) — 100-col print width, single quotes, Angular parser for `.html`. No linter is configured.

## Architecture & conventions

- Standalone components only (no NgModules); bootstrap is `src/main.ts` → `bootstrapApplication(App, appConfig)`, with app-wide providers in `src/app/app.config.ts` and routes in `src/app/app.routes.ts`.
- Zoneless: `zone.js` is not a dependency — rely on signals rather than zone-triggered change detection.
- File naming follows the Angular 20+ style guide: `app.ts` / `app.html` / `app.css` / `app.spec.ts` (no `.component` suffix), class name `App`. Component selector prefix is `app`.
- Specs live next to their source as `*.spec.ts` and use `TestBed` with Vitest globals (`describe`/`it`/`expect`).
- `src/app/app.spec.ts` checks the nav links and that each route renders its page `<h1>` — update it when headings or nav change.
- Production budgets in `angular.json`: initial bundle warns at 500kB / errors at 1MB; per-component styles warn at 4kB / error at 8kB.
- Static assets go in `public/` (copied to the build root).
- Styling uses Bootstrap 5.3 Sass, trimmed in `src/styles.scss` to the partials and utility groups the app uses. When you use a new Bootstrap component or utility, add its `@import` or remove it from the `$utilities` null-list there, or the classes won't exist. No Bootstrap JS. Sass `@import` deprecation warnings are silenced in `angular.json`. Prefer Bootstrap classes over component CSS. Light/dark mode is set by `ThemeService` (`src/app/core/theme/`) through `<html data-bs-theme>` and saved in `localStorage` under `fcm.theme`.
