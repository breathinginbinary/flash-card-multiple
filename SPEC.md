# Flash Card Multiple — Front-End Specification

|              |                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| **App**      | `flash-card-multiple` (Angular front end)                                                                   |
| **Back end** | ASP.NET Core (C#) Web API — separate project                                                                |
| **Status**   | Draft v1 — 2026-10-05                                                                                       |
| **Stack**    | Angular 22 (standalone, zoneless, signals), TypeScript 6, Vitest + jsdom, Node.js (tooling/dev server only) |

---

## 1. Overview

Flash Card Multiple is a study tool in which **one source topic is associated with several cards**. A normal flashcard app shows a single card you flip. This app shows a **source topic at the top of the screen with three cards beneath it**. Each card has a front and a back and **flips on its own**, so a learner can show one, two or all three answers for the same topic.

A topic and its cards together are called a **card series**.

The Angular app handles everything the user sees. It talks to a separate ASP.NET Core Web API that handles:

- User registration and login (token-based authentication)
- Create, read, update and delete (CRUD) for card series and their cards

### 1.1 Goals

1. Let a user register, log in and log out.
2. Let a logged-in user create, edit and delete card series, each with one topic and three cards.
3. Let a logged-in user study their series: topic at the top, three cards that each flip on their own, and controls to move between series.
4. Keep the client thin: the API holds all data and enforces all rules. The client validates input only to give fast feedback.

---

## 2. Glossary

| Term                           | Meaning                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Card series** (`CardSeries`) | One source topic plus its ordered cards. The unit you create, edit, study and delete.                       |
| **Source topic** (`topic`)     | The heading shown at the top of the study screen, for example "Photosynthesis".                             |
| **Card** (`Card`)              | One flippable card with `front` and `back` text, in a fixed position (0–2) in its series.                   |
| **Flip**                       | Switching one card between its front and its back. Flip state exists only in the client and is never saved. |
| **Access token**               | The JWT the API returns at login and that the client sends as `Authorization: Bearer <token>`.              |

---

## 3. Users and core flows

### 3.1 Primary flows

```
Unauthenticated                     Authenticated
───────────────                     ─────────────
/register ──success──▶ /login ──success──▶ /study ◀──▶ /cards (list)
    ▲                     │                   │            │
    └──── link ───────────┘                   │            ├─▶ /cards/new
                                              │            └─▶ /cards/:id/edit
                                              └──▶ /logout ──▶ /login
```

---

## 4. Functional requirements

IDs use FR-_area_-_n_ so tests and PRs can refer to them.

### 4.1 Registration page — `/register`

| ID       | Requirement                                                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-REG-1 | The form has fields **Email**, **Display name**, **Password** and **Confirm password**.                                                                                                                                                                                                                |
| FR-REG-2 | Client-side validation: email is required and well-formed; display name is required, 1–50 characters; password is required, 8–100 characters, with at least one letter and one digit; confirm password must match. The API is the final authority, and the client shows any errors the server returns. |
| FR-REG-3 | The submit button is disabled while the form is invalid or a request is in flight, and shows a busy indicator while waiting.                                                                                                                                                                           |
| FR-REG-4 | On `201 Created`, go to `/login?registered=1`. The login page then shows a success banner.                                                                                                                                                                                                             |
| FR-REG-5 | On `409 Conflict` (email already registered), show an error on the Email field.                                                                                                                                                                                                                        |
| FR-REG-6 | On `400` validation problem details, map each `errors[field]` entry to its form control, and show any unmapped errors in a form-level alert.                                                                                                                                                           |
| FR-REG-7 | The page links to `/login` ("Already have an account?").                                                                                                                                                                                                                                               |
| FR-REG-8 | A user who is already logged in and opens `/register` is redirected to `/study`.                                                                                                                                                                                                                       |

### 4.2 Login page — `/login`

| ID       | Requirement                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-LOG-1 | The form has fields **Email** and **Password**, plus a show/hide password toggle.                                                                                      |
| FR-LOG-2 | On success, save the session (§7.2) and go to the `returnUrl` query parameter if it is a safe in-app path (it starts with `/` but not `//`). Otherwise go to `/study`. |
| FR-LOG-3 | On `401`, show the generic message "Email or password is incorrect." Never say which of the two was wrong.                                                             |
| FR-LOG-4 | Show a success banner when `?registered=1` is present, and an info banner when `?expired=1` is present ("Your session expired, please log in again").                  |
| FR-LOG-5 | The page links to `/register`.                                                                                                                                         |
| FR-LOG-6 | A user who is already logged in and opens `/login` is redirected to `/study`.                                                                                          |

### 4.3 Logout page — `/logout`

| ID       | Requirement                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-OUT-1 | Opening the route calls `LoginService.logout()`. This clears the stored token and user, resets the in-memory card cache, and (optionally) tells the API with `POST /api/auth/logout`. |
| FR-OUT-2 | The page shows "You have been logged out" and a link/button to `/login`.                                                                                                              |
| FR-OUT-3 | The page works even if the API call fails or the session has already expired. Clearing the local session is always enough.                                                            |
| FR-OUT-4 | The page does not require login, so opening it a second time is harmless.                                                                                                             |

### 4.4 Edit cards — list page — `/cards`

| ID       | Requirement                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-LST-1 | List the current user's card series, showing the topic, a preview of the first card's front, and the last-updated date.                      |
| FR-LST-2 | Sort newest-updated first by default. A client-side text filter matches the topic.                                                           |
| FR-LST-3 | Each row has **Edit**, **Delete** and **Study this** (`/study?series=<id>`) actions.                                                         |
| FR-LST-4 | Delete asks for confirmation in an in-page dialog (not `window.confirm`). After a `204`, remove the row and show a toast.                    |
| FR-LST-5 | An empty list shows "No card series yet" and a "Create your first series" button.                                                            |
| FR-LST-6 | A **New series** button goes to `/cards/new`.                                                                                                |
| FR-LST-7 | Paging: v1 loads every series in one request. If the API adds paging later, the service signature in §6.2 leaves room for `page`/`pageSize`. |

### 4.5 Edit cards — editor page — `/cards/new` and `/cards/:id/edit`

| ID       | Requirement                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-EDT-1 | One form contains: **Source topic** (required, 1–200 characters), then **three card panels** labeled Card 1–3. Each panel has **Front** (required, 1–500 characters) and **Back** (required, 1–1000 characters) as textareas. |
| FR-EDT-2 | Each card panel shows a live preview of the flippable card, using the same component as the study page (§4.6).                                                                                                                |
| FR-EDT-3 | `/cards/:id/edit` loads the series with `CardService.getSeries(id)`. On `404`, show "Series not found" with a link back to `/cards`.                                                                                          |
| FR-EDT-4 | **Save**: a new series is sent with `POST`, an existing one with `PUT`. On success, go to `/cards` and show a "Saved" toast.                                                                                                  |
| FR-EDT-5 | **Cancel** returns to `/cards`.                                                                                                                                                                                               |
| FR-EDT-6 | **Unsaved-changes guard:** leaving a dirty form by any route change asks for confirmation (`CanDeactivateFn`). Closing or reloading a dirty form sets `beforeunload`.                                                         |
| FR-EDT-7 | On `409 Conflict` (the series was changed elsewhere; see the concurrency stamp in §6.1), show "This series was changed elsewhere" with **Reload** and **Overwrite** options.                                                  |
| FR-EDT-8 | Card order is fixed to the panel position (0, 1, 2). Reordering is out of scope for v1.                                                                                                                                       |

### 4.6 Study page — `/study`

| ID        | Requirement                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-STD-1  | Layout: the **source topic** is a heading at the top. **Three cards** sit beneath it in one row on wide screens (≥ 768 px) and stack vertically on narrow screens.                              |
| FR-STD-2  | Each card starts showing its **front**. Clicking or tapping a card, or pressing **Enter**/**Space** while it has focus, flips **only that card**.                                               |
| FR-STD-3  | The flip is animated with a 3D CSS rotate (`transform: rotateY(180deg)`, about 400 ms). Under `prefers-reduced-motion: reduce`, it changes instantly or cross-fades instead.                    |
| FR-STD-4  | Each card is a `<button>` with `aria-pressed` set to its flipped state and an accessible label such as "Card 2 of 3, showing back". Only the visible face is exposed to assistive technology.   |
| FR-STD-5  | Controls: **Previous**, **Next**, **Flip all**, **Reset** (all back to front) and **Shuffle**, which randomizes the series order for this session. A position indicator reads "Series 3 of 12". |
| FR-STD-6  | Keyboard shortcuts while focus is not in an input: `1`/`2`/`3` flip that card, `←`/`→` go to the previous/next series, `F` flips all, `R` resets.                                               |
| FR-STD-7  | Moving to another series resets all three cards to their fronts.                                                                                                                                |
| FR-STD-8  | `?series=<id>` opens that series first. An unknown id shows a notice and falls back to the first series.                                                                                        |
| FR-STD-9  | If the user has no series, show an empty state that links to `/cards/new`.                                                                                                                      |
| FR-STD-10 | The current position goes into the URL (`?series=<id>`) with `replaceUrl`, so reloading the page keeps your place.                                                                              |

### 4.7 App shell and navigation

| ID       | Requirement                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-NAV-1 | A top nav bar holds the app name. Logged out, it shows **Log in** and **Register**. Logged in, it shows **Study**, **Edit cards**, the user's display name and **Log out**. |
| FR-NAV-2 | The active route is highlighted (`routerLinkActive`) and marked with `aria-current="page"`.                                                                                 |
| FR-NAV-3 | A global toast/notification area shows success and error messages from any page.                                                                                            |
| FR-NAV-4 | A thin global progress bar shows while any HTTP request is in flight. This is optional and can be driven by an interceptor counter.                                         |
| FR-NAV-5 | Unknown routes (`**`) show a 404 page with a link home.                                                                                                                     |

---

## 5. Architecture

### 5.1 Principles (from the existing project setup)

- **Standalone components only.** There are no NgModules. Bootstrap stays `src/main.ts` → `bootstrapApplication(App, appConfig)`.
- **Zoneless.** `zone.js` is not a dependency. All view state lives in **signals** (`signal`, `computed`, `linkedSignal`), and HTTP results become signals through `toSignal`, `httpResource`/`resource`, or explicit `.set()` calls. Never depend on zone-triggered change detection.
- **`ChangeDetectionStrategy.OnPush`** on every component.
- **Angular 20+ file naming:** `login.ts` / `login.html` / `login.css` / `login.spec.ts`, with class names without a `Component` suffix (for example `Login`). Selector prefix: `app-`.
- **Lazy loading:** each page is loaded with `loadComponent` to keep the initial bundle under the 500 kB warning budget.
- **Functional APIs:** `HttpInterceptorFn`, `CanActivateFn`, `CanDeactivateFn` and `ResolveFn`, plus `inject()` instead of constructor injection.
- **Forms:** Reactive Forms (`@angular/forms`, already a dependency) with typed `FormGroup`s. If the Signal Forms API is stable in the Angular version in use, it may be used instead, but use one approach across the app.
- **Styles:** Bootstrap 5.3 (Sass, CSS only, no Bootstrap JS) is the design system. `src/styles.scss` imports only the Bootstrap partials and utility groups the app uses, and holds any app-wide custom styles. Prefer Bootstrap classes in templates over component CSS. Component styles must stay under the **4 kB warning / 8 kB error** budget per component, so shared styles belong in the global stylesheet.

### 5.2 Folder structure

```
src/
├── main.ts
├── styles.scss                    # trimmed Bootstrap Sass imports + app-wide styles
├── environments/
│   ├── environment.ts             # production: apiBaseUrl
│   └── environment.development.ts # dev: apiBaseUrl ('/api' through the proxy)
└── app/
    ├── app.ts / app.html / app.css / app.spec.ts   # shell: nav, <router-outlet>, toasts
    ├── app.config.ts              # providers (router, http + interceptors, API_BASE_URL)
    ├── app.routes.ts
    ├── core/
    │   ├── api/
    │   │   ├── api-config.ts           # API_BASE_URL InjectionToken
    │   │   └── problem-details.ts      # ProblemDetails type + parser helpers
    │   ├── auth/
    │   │   ├── login-service.ts        # LoginService (register/login/logout/session signals)
    │   │   ├── token-storage.ts        # wraps localStorage; safe if storage is unavailable
    │   │   ├── auth-interceptor.ts     # adds Bearer token; handles 401
    │   │   ├── auth-guard.ts           # authGuard: CanActivateFn
    │   │   └── guest-guard.ts          # guestGuard: send logged-in users away from /login, /register
    │   ├── cards/
    │   │   ├── card-service.ts         # CardService (CRUD for card series)
    │   │   └── card.models.ts          # CardSeries, Card, DTOs
    │   ├── http/
    │   │   ├── error-interceptor.ts    # maps network/5xx errors to toasts
    │   │   └── loading-interceptor.ts  # optional global progress counter
    │   ├── notify/
    │   │   └── notification-service.ts # toast queue (signal of messages)
    │   └── theme/
    │       └── theme-service.ts        # light/dark color mode (signal, saved in localStorage)
    ├── shared/
    │   ├── flip-card/                  # <app-flip-card> — reused by study and editor preview
    │   ├── confirm-dialog/             # <app-confirm-dialog> built on <dialog>
    │   ├── form-error/                 # <app-form-error> shows a control's errors
    │   └── unsaved-changes-guard.ts    # CanDeactivateFn for components that have isDirty()
    └── pages/
        ├── login/
        ├── register/
        ├── logout/
        ├── study/
        ├── card-list/                  # /cards
        ├── card-editor/                # /cards/new and /cards/:id/edit
        └── not-found/
```

### 5.3 Routes — `app.routes.ts`

| Path | Guard | Component |
| --- | --- | --- |
| `` (redirect) | — | → `study` |
| `login` | `guestGuard` | `Login` |
| `register` | `guestGuard` | `Register` |
| `logout` | — | `Logout` |
| `study` | `authGuard` | `Study` |
| `cards` | `authGuard` | `CardList` |
| `cards/new` | `authGuard` + `unsavedChangesGuard` | `CardEditor` |
| `cards/:id/edit` | `authGuard` + `unsavedChangesGuard` | `CardEditor` |
| `**` | — | `NotFound` |

`authGuard` returns `router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })` when no session exists. Use `withComponentInputBinding()` in `provideRouter` so `:id` and `?series` bind to component `input()`s.

---

## 6. Data model and API contract

> The back end is a separate ASP.NET Core project. This section is the **contract the front end expects**. Any change to it must be agreed by both sides. JSON uses **camelCase**, which is the ASP.NET Core `System.Text.Json` web default. Ids are GUID strings. Timestamps are ISO-8601 UTC strings.

### 6.1 TypeScript models

**`core/cards/card.models.ts`** — `CARDS_PER_SERIES = 3`; `Card` (id, position 0–2, front, back); `CardSeries` (id, topic, cards[], createdAt, updatedAt, concurrencyStamp); `CardSeriesSummary` (id, topic, firstCardFront, updatedAt); `CardInput` (position, front, back); `CreateCardSeriesRequest` (topic, cards[]); `UpdateCardSeriesRequest` extends Create + concurrencyStamp.

**`core/auth/`** — `RegisterRequest` (email, displayName, password); `LoginRequest` (email, password); `LoginResponse` (accessToken, expiresAt, user: CurrentUser); `CurrentUser` (id, email, displayName).

**Errors** follow RFC 9457 `ProblemDetails` (type?, title?, status?, detail?, instance?, `errors?: Record<string, string[]>`).

### 6.2 Endpoints

Base URL: `environment.apiBaseUrl`, for example `https://api.example.com` in production. In development it is `/api` through the dev proxy (§9.2). Every path below is relative to that base. Every endpoint except register and login needs `Authorization: Bearer <token>`.

#### Authentication — consumed by `LoginService`

| Method | Path             | Body              | Success                             | Errors                                           |
| ------ | ---------------- | ----------------- | ----------------------------------- | ------------------------------------------------ |
| `POST` | `/auth/register` | `RegisterRequest` | `201 Created` (body: `CurrentUser`) | `400` validation, `409` email taken              |
| `POST` | `/auth/login`    | `LoginRequest`    | `200` `LoginResponse`               | `400`, `401` bad credentials, `429` rate-limited |
| `POST` | `/auth/logout`   | —                 | `204`                               | `401` (ignored by the client)                    |
| `GET`  | `/auth/me`       | —                 | `200` `CurrentUser`                 | `401`                                            |

#### Card series — consumed by `CardService`

| Method   | Path                         | Body                      | Success                                             | Errors                                 |
| -------- | ---------------------------- | ------------------------- | --------------------------------------------------- | -------------------------------------- |
| `GET`    | `/card-series`               | —                         | `200` `CardSeriesSummary[]`                         | `401`                                  |
| `GET`    | `/card-series?include=cards` | —                         | `200` `CardSeries[]` (full; used by the study page) | `401`                                  |
| `GET`    | `/card-series/{id}`          | —                         | `200` `CardSeries`                                  | `401`, `404`                           |
| `POST`   | `/card-series`               | `CreateCardSeriesRequest` | `201` `CardSeries`, `Location` header               | `400`, `401`                           |
| `PUT`    | `/card-series/{id}`          | `UpdateCardSeriesRequest` | `200` `CardSeries`                                  | `400`, `401`, `404`, `409` stale stamp |
| `DELETE` | `/card-series/{id}`          | —                         | `204`                                               | `401`, `404`                           |

Server rules the client mirrors (the server still enforces them):

- `cards.length === 3`, and the positions are exactly `{0,1,2}`.
- `topic` 1–200 characters; `front` 1–500; `back` 1–1000, all after trimming.
- A user can only read or change their own series. Another user's id returns **`404`, not `403`**, so the API does not reveal that the id exists.

### 6.3 Services

#### `LoginService` — `core/auth/login-service.ts`

`@Injectable({ providedIn: 'root' })`

| Member                 | Type                          | Description                                                                                                                             |
| ---------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `currentUser`          | `Signal<CurrentUser \| null>` | Read-only. Restored from storage at startup.                                                                                            |
| `isLoggedIn`           | `Signal<boolean>`             | `computed`: there is a user and the token has not expired.                                                                              |
| `token()`              | `string \| null`              | Read by the interceptor. Returns `null` if the token has expired.                                                                       |
| `register(req)`        | `Observable<CurrentUser>`     | `POST /auth/register`.                                                                                                                  |
| `login(req)`           | `Observable<CurrentUser>`     | `POST /auth/login`. On success it saves the session and sets the signals.                                                               |
| `logout()`             | `void`                        | Clears storage and signals, calls `CardService.clearCache()`, and sends `POST /auth/logout` without waiting for or checking the result. |
| `handleUnauthorized()` | `void`                        | Called by the interceptor on a `401`: runs `logout()`, then goes to `/login?expired=1&returnUrl=…`.                                     |

When the token is restored at startup, also schedule an automatic logout at `expiresAt` with a `setTimeout`, cleared on logout.

#### `CardService` — `core/cards/card-service.ts`

`@Injectable({ providedIn: 'root' })`

| Member                  | Type                              | Description                                                                                    |
| ----------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `listSeries()`          | `Observable<CardSeriesSummary[]>` | `GET /card-series`.                                                                            |
| `listSeriesWithCards()` | `Observable<CardSeries[]>`        | `GET /card-series?include=cards`.                                                              |
| `getSeries(id)`         | `Observable<CardSeries>`          | `GET /card-series/{id}`.                                                                       |
| `createSeries(req)`     | `Observable<CardSeries>`          | `POST`.                                                                                        |
| `updateSeries(id, req)` | `Observable<CardSeries>`          | `PUT`.                                                                                         |
| `deleteSeries(id)`      | `Observable<void>`                | `DELETE`.                                                                                      |
| `clearCache()`          | `void`                            | Clears any cached list. Called on logout so the next user never sees the previous user's data. |

Pages turn these observables into signals, for example `toSignal`, or a `loading`/`error`/`data` signal trio. As an alternative, `CardService` can expose `httpResource` getters for read operations, but the same pattern should be used everywhere.

The services must not route or show toasts; that belongs to pages and interceptors. The one exception is `handleUnauthorized()`.

### 6.4 Interceptors

- **`authInterceptor`**: for requests whose URL starts with `API_BASE_URL`, adds `Authorization: Bearer <token>` when a token exists. It never adds the header to third-party URLs. If an authenticated request gets a `401`, it calls `LoginService.handleUnauthorized()`. A `401` from `/auth/login` itself is left alone, because that just means wrong credentials.
- **`errorInterceptor`**: status `0` (network/CORS) shows a toast: "Cannot reach the server." A `5xx` shows a toast: "Something went wrong (ref: `traceId`)", using `traceId` from ProblemDetails when it is present. It **re-throws** every error so pages can handle `400`/`404`/`409` themselves.

---

## 7. Security

### 7.1 Transport and CORS

- Production must use HTTPS only.
- In development, use the Angular dev-server proxy, so the browser sees same-origin requests and no CORS is needed. In production, the API must allow the front-end origin with a CORS policy that permits `Authorization` and `Content-Type` headers. Credentials are only needed if cookies are adopted (see §13.2 Q1).

### 7.2 Token storage

v1 default: save `{ accessToken, expiresAt, user }` under one `localStorage` key, `fcm.session`, so a reload keeps the user logged in. Wrap every read and write in `try/catch` in `token-storage.ts`.

Known trade-off: any XSS on the page can read `localStorage`. Mitigations:

- Never bind untrusted HTML. Card text is rendered with `{{ }}` interpolation only, with **no `[innerHTML]`**.
- Ship a strict Content-Security-Policy from the hosting layer.
- Keep token lifetime short (for example 60 minutes).

### 7.3 Other

- Validate `returnUrl` so it cannot redirect to another site (FR-LOG-2).
- Never log the token or password to the console.
- Password fields use `autocomplete="current-password"` / `"new-password"`. The email field uses `autocomplete="email"`.

---

## 8. UI and UX

### 8.1 Flip card component — `shared/flip-card/`

Inputs: `front`, `back`, `index` (required); `total` (default `CARDS_PER_SERIES`); `flipped` (two-way `model`, default `false`).

- Markup: a `<button type="button" class="flip-card" [class.is-flipped]="flipped()" [attr.aria-pressed]="flipped()" (click)="flipped.set(!flipped())">` with two faces. The hidden face gets `aria-hidden="true"` and `inert`.
- Styling: `perspective` on the container, `transform-style: preserve-3d` and `backface-visibility: hidden` on the faces, and a fixed aspect ratio (for example 3:2). Long text scrolls inside the face. Keep this stylesheet small because of the component budget.
- The study page owns the flip state as `flipped = signal<boolean[]>([false,false,false])` and binds `[(flipped)]` per card. That makes Flip all, Reset and series changes simple.

### 8.2 Layout and visuals

- Responsive breakpoints: < 768 px stacks cards in one column; ≥ 768 px puts three columns in a CSS grid.
- Light and dark themes use Bootstrap color modes (`data-bs-theme` on `<html>`). The app starts in the light theme. A toggle button at the top right of the nav switches between light and dark. `ThemeService` (`core/theme/theme-service.ts`) owns the theme as a signal and saves the choice in `localStorage` under `fcm.theme`.
- Front and back faces have visibly different backgrounds, and the back face carries a small "Answer" label, so the side being shown is clear without relying only on color.
- Focus outlines are always visible (`:focus-visible`).

### 8.3 Accessibility (target: WCAG 2.2 AA)

- Every form control has a `<label>`. Errors are linked with `aria-describedby` and announced through `aria-live="polite"`.
- On route change, move focus to the page `<h1>` and set the document title from the route `title`.
- Dialogs use the native `<dialog>` element with `showModal()`, return focus to the trigger when closed, and close on Esc.
- Color contrast is ≥ 4.5:1 for text.
- Every study shortcut also has an on-screen control.

### 8.4 Loading, empty and error states

Every data-driven page handles four states: **loading** (skeleton or spinner), **empty**, **error** (message plus Retry) and **loaded**. Model them as a signal, not with zone-dependent flags.

---

## 9. Environment and tooling

### 9.1 Configuration

- `src/environments/environment.ts` → `{ production: true, apiBaseUrl: 'https://<api-host>/api' }`
- `src/environments/environment.development.ts` → `{ production: false, apiBaseUrl: '/api' }`
- Register them with `fileReplacements` in `angular.json` (development configuration).
- `proxy.conf.json` at the repo root, wired in through `angular.json` → `serve.options.proxyConfig`:

```json
{ "/api": { "target": "https://localhost:7100", "secure": false, "changeOrigin": true } }
```

---

## 10. Testing strategy

Every FR-* has at least one test referencing its ID in the `describe`/`it` text. Keep specs zoneless; use `await fixture.whenStable()` instead of `fakeAsync`.

- **Services** (`TestBed` + `HttpTestingController`): correct URLs/methods/bodies; session save/restore; expiry; `clearCache` on logout.
- **Interceptors**: Bearer header only for API URLs; `401` → `handleUnauthorized` (not on login); `0`/`5xx` → toast.
- **Guards** (`TestBed.runInInjectionContext`): `authGuard` with `returnUrl`; `guestGuard`; `unsavedChangesGuard` when dirty.
- **Components**: `FlipCard` flip on click/Enter/Space; Study controls/shortcuts/nav reset; Editor create vs. edit, `409`; List delete flow.
- **Shell**: update `app.spec.ts` nav assertions.

---

## 11. Non-functional requirements

| Area            | Requirement                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Performance     | Initial bundle < 500 kB (production budget warning); pages are lazy-loaded; LCP < 2.5 s on a mid-range device over 4G. |
| Browser support | The browsers in Angular 22's default `browserslist` (latest two versions of evergreen browsers).                       |
| Responsiveness  | Usable from 320 px wide upwards; no horizontal scroll.                                                                 |
| Resilience      | API outages produce a visible error with Retry, never a blank page.                                                    |
| Code quality    | Prettier formatting; strict TypeScript (already enabled); no `any` in models; services and guards tested.              |

---

## 12. Future enhancements (not in v1)

- Refresh tokens through an HttpOnly cookie and silent renewal
- Password reset and email confirmation
- A configurable number of cards per series (`CARDS_PER_SERIES` is already a constant)
- Reordering cards with drag-and-drop
- Tags, folders and search across series
- Study statistics and spaced repetition ("got it" / "again" per card)
- Sharing series with other users; importing and exporting (CSV/JSON)
- Markdown or images on card faces (needs sanitization)

---

## 13. Decisions and open questions

### 13.1 Decisions

| #   | Decision                                                                                               | Date       |
| --- | ------------------------------------------------------------------------------------------------------ | ---------- |
| D1  | Every series has **exactly three** cards (`CARDS_PER_SERIES = 3`), enforced by both client and server. | 2026-10-05 |
| D2  | Registration does **not** log the user in. It redirects to `/login?registered=1`.                      | 2026-10-05 |

### 13.2 Open questions

| #   | Question                                                                                                  | Default assumption in this spec                                     |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Q1  | What token strategy does the API use: JWT bearer only, or a refresh-token cookie as well?                 | JWT bearer saved in `localStorage`, no refresh.                     |
| Q2  | Does `GET /card-series?include=cards` exist, or should the study page fetch each series one at a time?    | `include=cards` exists.                                             |
| Q3  | Does the API support optimistic concurrency (`concurrencyStamp` / ETag)?                                  | Yes, through a `concurrencyStamp` field. Without it, drop FR-EDT-7. |
