# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Freshly generated Angular CLI 22 app (single commit). `src/app/app.html` is still the CLI placeholder page and `app.routes.ts` is empty — no flash-card features exist yet.

## Commands

- `npm start` (`ng serve`) — dev server at http://localhost:4200 (development configuration by default)
- `npm run build` (`ng build`) — production build to `dist/` (production is the default build configuration)
- `npm run watch` — development build in watch mode
- `npm test` (`ng test`) — unit tests via Vitest with jsdom, through the `@angular/build:unit-test` builder
- Single spec file: `ng test --include src/app/app.spec.ts`; one-shot (no watch): add `--watch=false`
- Formatting: Prettier (`npx prettier --write <files>`) — 100-col print width, single quotes, Angular parser for `.html`. No linter is configured.

## Architecture & conventions

- Standalone components only (no NgModules); bootstrap is `src/main.ts` → `bootstrapApplication(App, appConfig)`, with app-wide providers in `src/app/app.config.ts` and routes in `src/app/app.routes.ts`.
- Zoneless: `zone.js` is not a dependency — rely on signals (as `App` does) rather than zone-triggered change detection.
- File naming follows the Angular 20+ style guide: `app.ts` / `app.html` / `app.css` / `app.spec.ts` (no `.component` suffix), class name `App`. Component selector prefix is `app`.
- Specs live next to their source as `*.spec.ts` and use `TestBed` with Vitest globals (`describe`/`it`/`expect`).
- `src/app/app.spec.ts` asserts the placeholder `<h1>` text "Hello, flash-card-multiple" — update or remove that test when replacing `app.html`.
- Production budgets in `angular.json`: initial bundle warns at 500kB / errors at 1MB; per-component styles warn at 4kB / error at 8kB.
- Static assets go in `public/` (copied to the build root).
