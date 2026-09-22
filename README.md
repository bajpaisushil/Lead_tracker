# Lead Tracker

A small CRM-style app for capturing inbound leads and moving them through a
sales pipeline. Create a lead, search the book, and advance each one through
`New → Contacted → Qualified → Won`, or write it off as `Lost`.

| | |
|---|---|
| **Web app** | https://lead-tracker-web-chi.vercel.app |
| **API** | https://lead-tracker-api-eight.vercel.app |
| **Health check** | https://lead-tracker-api-eight.vercel.app/api/health |

---

## Contents

- [Features](#features)
- [Stack](#stack)
- [Architecture](#architecture)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Trade-offs](#trade-offs)
- [Future improvements](#future-improvements)

---

## Features

- **Create lead** — name, email, phone. Validated on both ends, duplicate
  emails rejected.
- **Update status** — the status pill on each row is the control. It only
  offers moves the pipeline allows, and the change is applied optimistically.
- **Search** — one box, matched against name, email and phone, debounced at
  300ms.
- **List** — filter by any combination of statuses, sort by created date, last
  update or name, paginated.
- **Pipeline summary** — live counts per stage, leads added this week, and a
  won/(won+lost) conversion rate.
- Light and dark themes, responsive down to phone width, keyboard accessible.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript | Assignment asked for React + TS; Next gives routing, bundling and a first-class Vercel deploy with no config |
| Styling | Tailwind CSS v4 | v4 is CSS-first, so the palette lives in custom properties and theming is one attribute swap |
| Server state | TanStack Query v5 | Caching, background refetch and optimistic updates with rollback, none of which I wanted to hand-roll |
| Backend | Express 4 + TypeScript | Small, explicit, and the layering is easy to show |
| Database | MongoDB (Mongoose 8) | Lead records are a single flat document with no joins; the flexible schema also makes adding fields later cheap |
| Validation | Zod | One schema produces both the runtime check and the TS type |
| Tests | Vitest, Supertest, Testing Library | One runner across both packages |

## Architecture

Two standalone packages. Neither imports from the other — the only contract
between them is HTTP.

```
                  browser
                     │
        ┌────────────▼────────────┐
        │  web  (Next.js)         │   Vercel static + edge
        │  components → hooks     │
        │  → TanStack Query       │
        │  → typed api client     │
        └────────────┬────────────┘
                     │  JSON over HTTPS
        ┌────────────▼────────────┐
        │  server (Express)       │   Vercel serverless function
        │                         │
        │  routes                 │   path → handler
        │    └─ controller        │   zod parse, HTTP status, envelope
        │        └─ service       │   business rules, no express imports
        │            └─ repository│   interface
        │                 ├ mongo │     production
        │                 └ memory│     tests
        └────────────┬────────────┘
                     │
              MongoDB Atlas
```

Each layer only knows the one beneath it:

- **Controller** parses the request with Zod and shapes the response. Parsing
  happens here rather than in middleware so the handler gets the type inferred
  from the schema instead of a cast off `req.body`.
- **Service** holds the rules — duplicate email, status transitions, phone
  normalisation. It imports nothing from Express, so it can be unit tested
  directly.
- **Repository** is an interface with two implementations. Mongo in
  production, in-memory for tests. This is the decision the whole test setup
  rests on: the route suite runs the real Express stack against the in-memory
  repository and finishes in ~2s with no database.

Errors are thrown as domain types (`DuplicateEmailError`,
`InvalidStatusTransitionError`, …) and a single middleware maps them — plus
`ZodError` and Mongo's duplicate-key error — onto the HTTP response. Every
error carries a stable machine-readable `code`, because the UI needs to branch
on something more reliable than message text.

### Status transitions

Status is a state machine rather than a free-text field:

```
NEW ──────► CONTACTED ──────► QUALIFIED ──────► WON
 │               │                  │          (terminal)
 └───────────────┴──────────────────┴─────────► LOST
                                                  │
                                                  └──► NEW  (reopen)
```

Skipping stages is rejected with `422`, and the response lists what was
allowed. `WON` is deliberately terminal: reversing a closed deal is a
different business process, not a status edit. The frontend keeps a copy of
this map so the dropdown only ever shows legal moves — the server is still the
authority, the client copy is purely so the user never sees an avoidable error.

### Folder layout

```
server/
  api/index.ts            serverless entry, exports the app
  src/
    config/               env parsing, mongo connection
    modules/
      leads/              model, types, schema, repository ×3, service,
                          controller, routes
      health/
    shared/
      errors/  middleware/  types/  utils/
    app.ts                express app factory (takes deps as arguments)
    server.ts             listen + graceful shutdown, for local/container use
  tests/
    unit/  integration/  helpers/

web/
  src/
    app/                  layout, providers, page
    components/ui/        button, field, modal, badge, toast, skeleton…
    features/leads/
      api.ts              HTTP calls
      hooks/              TanStack Query hooks
      components/         table, filters, dialog, status select, stats
      validation.ts
    lib/                  api client, theme, helpers
    types/                the lead contract
  tests/
```

## API reference

Base URL: `https://lead-tracker-api-eight.vercel.app`

Every success is `{ "data": … }`. Lists add a `meta` block. Every failure is
`{ "error": { "code", "message", "details"? } }`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness + database connectivity |
| `GET` | `/api/leads` | List, search, filter, sort, paginate |
| `POST` | `/api/leads` | Create a lead |
| `GET` | `/api/leads/:id` | Fetch one |
| `PATCH` | `/api/leads/:id/status` | Move it through the pipeline |
| `GET` | `/api/leads/stats` | Pipeline counts and conversion |

### `GET /api/leads`

| Query param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | – | Case-insensitive partial match on name, email, phone |
| `status` | string | – | `NEW,WON` or repeated `?status=NEW&status=WON` |
| `page` | number | `1` | |
| `pageSize` | number | `10` | Capped at 100 |
| `sortBy` | enum | `createdAt` | `createdAt \| updatedAt \| name \| status` |
| `sortDirection` | enum | `desc` | `asc \| desc` |

```bash
curl "https://lead-tracker-api-eight.vercel.app/api/leads?search=nair&pageSize=5"
```

```json
{
  "data": [
    {
      "id": "6ab2602fae42fef7bc83e76f",
      "name": "Priya Nair",
      "email": "priya.nair@zenith.dev",
      "phone": "+1 (415) 555-0142",
      "status": "CONTACTED",
      "createdAt": "2026-09-20T06:00:00.000Z",
      "updatedAt": "2026-09-20T06:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1, "pageSize": 5, "total": 1,
    "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false
  }
}
```

### `POST /api/leads`

```bash
curl -X POST https://lead-tracker-api-eight.vercel.app/api/leads \
  -H 'content-type: application/json' \
  -d '{"name":"Ananya Rao","email":"ananya@northwind.co","phone":"+91 98200 11223"}'
```

Returns `201` with a `Location` header. `status` is optional and defaults to
`NEW`.

### `PATCH /api/leads/:id/status`

```bash
curl -X PATCH https://lead-tracker-api-eight.vercel.app/api/leads/<id>/status \
  -H 'content-type: application/json' -d '{"status":"CONTACTED"}'
```

An illegal move returns `422` and tells you what was permitted:

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot move a lead from 'NEW' to 'WON'",
    "details": { "from": "NEW", "to": "WON", "allowed": ["CONTACTED", "LOST"] }
  }
}
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bad payload. `details` is a list of `{ field, message }` |
| `NOT_FOUND` | 404 | No such lead, or unknown route |
| `DUPLICATE_EMAIL` | 409 | A lead already exists on that email |
| `INVALID_STATUS_TRANSITION` | 422 | Move not allowed by the state machine |
| `RATE_LIMITED` | 429 | More than 100 requests/minute from one IP |
| `SERVICE_UNAVAILABLE` | 503 | Database unreachable |
| `INTERNAL_ERROR` | 500 | Unhandled — stack included outside production |

## Data model

```ts
{
  _id:       ObjectId,
  name:      string,    // 2–120 chars
  email:     string,    // stored lowercase, unique
  phone:     string,    // 7–15 digits, formatting preserved
  status:    'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST',
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

| Index | Purpose |
|---|---|
| `uniq_lead_email` (unique) | The dedupe rule, enforced in the database so two concurrent creates can't both win |
| `status_created_at` | Covers the default view and its status-filtered variants |
| `created_at_desc` | Unfiltered newest-first listing |

Email is stored lowercased so the unique index is effectively case-insensitive
without needing a collation-aware index.

## Running it locally

**Prerequisites:** Node 20+, and Docker (or a local/Atlas MongoDB).

```bash
git clone git@github.com:bajpaisushil/Lead_tracker.git
cd lead-tracker

npm run install:all          # root + server + web
npm run db:up                # mongo on :27017 via docker compose

cp server/.env.example server/.env
cp web/.env.example web/.env.local

npm run seed                 # 14 demo leads across all stages (optional)
npm run dev                  # api on :4000, web on :3000
```

Open http://localhost:3000.

Useful scripts, all runnable from the repo root:

| Command | Does |
|---|---|
| `npm run dev` | Both services together |
| `npm run build` | Production build of both |
| `npm test` | Full suite, both packages |
| `npm run lint` / `npm run typecheck` | Across both |
| `npm run db:up` / `npm run db:down` | Mongo container |
| `npm run seed` | Demo data (`-- --force` to wipe and reseed) |

## Environment variables

**`server/.env`**

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `4000` | Ignored on serverless |
| `MONGODB_URI` | – | **Required.** Boot fails fast without it |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated. `*` allows any |
| `LOG_LEVEL` | `info` | `trace`…`fatal`, `silent` |
| `RATE_LIMIT_WINDOW_MS` | `60000` | |
| `RATE_LIMIT_MAX` | `100` | Per IP per window |

**`web/.env.local`**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL, no trailing slash. Inlined at build time |

Config is parsed through Zod at import time, so a missing or malformed value
crashes on boot rather than surfacing as a confusing 500 on the first request.

## Testing

```bash
npm test                 # everything
npm run test:api         # 65 tests
npm run test:web         # 49 tests
```

**API — 65 tests.** Transition rules, the Zod schemas, the service, and the
full Express stack through Supertest. The HTTP tests run against the in-memory
repository, so the suite needs no database and finishes in about two seconds.
Covered: partial search across all three fields, pagination totals, the `422`
body listing allowed transitions, an empty result being `200` rather than
`404`, `/stats` not being swallowed by `/:id`, and unknown fields in a create
payload being ignored rather than persisted.

**Web — 49 tests.** Form validation, the status menu, the table, the API
client's error mapping, and the date/initials helpers.

Two of these earned their keep:

- The dialog test caught a real bug. `Modal`'s focus-trap effect depended on
  `onClose`, whose identity changes every render, so each keystroke tore the
  effect down and re-focused the first field — typing in Phone bounced you
  back to Name after one character. `onClose` now lives in a ref.
- Client and server validation are asserted against the same inputs, so the
  two copies of the rules can't quietly drift apart.

CI runs lint, typecheck, tests and build for both packages on every push.

## Deployment

Both halves are on Vercel, and the database is MongoDB Atlas (M0, free).

**Why not Render for the API:** its free tier sleeps after 15 minutes idle and
takes roughly 50 seconds to wake. Anyone opening the link cold would get a
spinner. Running the same Express app as a Vercel function avoids that — no
sleep, sub-second cold start — at the cost of the two adjustments below.

### API

`server/api/index.ts` exports the app instead of calling `listen()`, and
`vercel.json` rewrites every path into that one function. `server.ts` is still
there and is what the Docker image and local dev use.

```bash
cd server
vercel link --project lead-tracker-api
printf '%s' '<atlas-uri>'  | vercel env add MONGODB_URI production
printf '%s' '<web-origin>' | vercel env add CORS_ORIGINS production
printf '%s' 'info'         | vercel env add LOG_LEVEL production
vercel deploy --prod
```

### Web

```bash
cd web
vercel link --project lead-tracker-web
printf '%s' 'https://lead-tracker-api-eight.vercel.app' \
  | vercel env add NEXT_PUBLIC_API_URL production
vercel deploy --prod
```

Deploy the API first — the web build inlines `NEXT_PUBLIC_API_URL`, so it has
to exist before the frontend is built. Then set `CORS_ORIGINS` on the API to
the web origin and redeploy it.

### Atlas

Create a free M0 cluster, add a database user with read/write, and allow
`0.0.0.0/0` under Network Access — Vercel's function IPs are not static.

### Container alternative

A `Dockerfile` (multi-stage, non-root, production deps only) and a
`docker-compose.yml` are in the repo for anyone who'd rather run this as a
long-lived process on Render, Fly or their own box:

```bash
docker compose --profile full up --build
```

## Trade-offs

**A repository interface in front of Mongoose.** Costs an extra layer and a
document→domain mapper. Buys a test suite that runs the real HTTP stack
without a database, in seconds, deterministically. At this size the interface
is arguably more indirection than the app needs; I kept it because the payoff
in test speed and clarity was immediate.

**Regex search, not a text index.** `GET /api/leads?search=…` does a
case-insensitive regex across three fields. This supports the partial matching
people actually expect — typing `9820` finds a phone number — which a Mongo
text index can't, since it only matches whole tokens. The cost is that a
leading-wildcard regex can't use a B-tree index, so it degrades to a collection
scan. Fine for thousands of leads; past that this wants Atlas Search.

**Offset pagination.** `skip`/`limit` is simple and supports jumping to a page
number, which the UI does. It gets slower the deeper you go and can skip or
repeat rows if data changes between requests. Sorting always appends `_id` as a
tiebreaker so pages stay stable when sorting on a non-unique field like
`status`. Cursor pagination would be correct at scale but rules out page
numbers.

**Validation rules exist twice.** Zod on the server, a hand-written copy on the
client. Duplication I'd normally avoid, but round-tripping every keystroke for
validation is worse UX, and a shared package for four rules is overkill here.
Mitigated by testing both against the same cases.

**Status as a state machine.** Prevents the most common real-world mistake —
dragging the wrong row to Won — but makes correcting a genuine mis-click
harder. `WON` being terminal is a product opinion; if it's wrong, it's one map
in `lead.types.ts`.

**Optimistic status updates.** The pill repaints immediately and rolls back
from a snapshot on failure. Snappy, but it means the UI can briefly show a
state the server hasn't accepted.

**Rate limiting is per-instance.** `express-rate-limit`'s default memory store
doesn't span serverless instances, so 100/min is approximate under load. A
shared Redis store would make it exact; it isn't worth an extra dependency for
this.

**No authentication.** Out of scope for the assignment, so every lead is
visible to everyone. It's the first thing this would need to be real, and the
repository/service split means it'd slot in at the middleware layer without
touching business logic.

## Future improvements

- **Auth and ownership** — sessions, then scope leads to a user or team.
- **Lead detail view** — notes, an activity timeline, who changed what and
  when. `updatedAt` is already tracked; this needs an events collection.
- **Atlas Search** — typo tolerance and relevance ranking, replacing the regex
  scan.
- **Bulk actions and CSV import/export** — the realistic way leads arrive.
- **Soft delete with an audit trail** rather than the current no-delete model.
- **E2E coverage** — Playwright over the create → search → advance flow, which
  is currently only tested at the unit and API layers.
- **Cursor pagination** for the leads list once it outgrows page numbers.
- **Observability** — the API already emits structured pino logs; they want
  shipping somewhere with request tracing.
