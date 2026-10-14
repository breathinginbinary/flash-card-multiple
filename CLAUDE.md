# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Give concise responses and summaries without adding extraneous information.

When creating or updating the architecture or files, reference the @SPEC.md file.

## Project state

Routing skeleton in place: every page in SPEC §5.2 exists under `src/app/pages/` as a lazy-loaded placeholder (an `<h1>` plus a message), and stub shared components live in `src/app/shared/`. Built so far: environments + dev proxy (`proxy.conf.json` → `https://localhost:7001`), `API_BASE_URL`, card models, `CardService.createSeries`, the login and register forms (no submit logic yet), and the create-series form in `CardEditor` (`/cards/new`; edit mode is still a placeholder). `/cards` is a placeholder list with a New series button. Guards, `LoginService`, interceptors and the rest of `CardService` are not built yet.

## Commands

- `npm start` (`ng serve`) — dev server at http://localhost:4200 (development configuration by default)
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
