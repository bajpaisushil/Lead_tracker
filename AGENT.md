# AGENT.md

How this project was built, which parts were AI-assisted, which were not, and
the decisions that shaped it.

## Tools

| Tool | Used for |
|---|---|
| Claude (Anthropic), via Claude Code in VS Code | Scaffolding, boilerplate, first drafts of components and tests, rubber-ducking trade-offs |
| GitHub Copilot (inline completions) | Line-level completion while editing |
| TypeScript compiler + ESLint | The actual arbiter of whether generated code was correct |
| Vitest | Same, for behaviour |

I treated the model as a fast pair, not an author. Everything it produced went
through `tsc --noEmit`, `eslint`, the test suite, and a read-through before it
was committed. Several things it produced did not survive that (see
[Where the AI was wrong](#where-the-ai-was-wrong)).

## How I worked

I planned the shape of the thing first — layering, the status state machine,
the repository seam, the error contract — and then used AI to fill in the
volume. The order was deliberate: backend contract → tests → frontend against
a working API → docs and deployment last.

A rough split of where the time went:

| Phase | Approach |
|---|---|
| Architecture, module boundaries, data model | Mine. Decided before prompting. |
| Express/TS scaffolding, config, tsconfig, ESLint setup | AI-generated, reviewed and trimmed |
| Mongoose schema + indexes | AI drafted, I chose the indexes and the lowercase-email approach |
| Repository interface + Mongo/in-memory implementations | My design, AI wrote the in-memory one from the interface |
| Service layer and domain rules | Mine. This is where the actual behaviour lives. |
| Zod schemas | AI-generated from the field rules I specified |
| Controllers, routes, middleware | AI-generated, I moved validation from middleware into the controllers |
| Test suite | AI wrote the bulk from a list of cases I specified; I added the edge cases |
| React components and Tailwind theming | AI-generated; the palette, layout and interaction model are mine |
| TanStack Query hooks, optimistic updates | AI-generated from my description of the rollback behaviour |
| README, this file | Mine, written after the fact from the actual commits |
| Deployment | Mine. Hosting choice, env wiring, serverless adaptation. |

## What was AI-generated vs hand-written

**Mostly AI, then reviewed:**

- `server/src/config/env.ts`, `logger.ts`, ESLint/tsconfig/Vitest configs
- `server/src/modules/leads/lead.schema.ts` (Zod)
- `server/src/modules/leads/lead.repository.memory.ts`
- `server/src/shared/middleware/*`
- Most `web/src/components/ui/*` primitives
- The first pass of every test file
- SVG icon paths (all inline, no icon dependency)

**Mostly mine:**

- `lead.types.ts` — the status union, the transition map, and the decision
  that `WON` is terminal
- `lead.service.ts` — duplicate handling, transition enforcement, the
  short-circuit when a status is re-applied
- `lead.repository.ts` — the interface, and the choice to have one at all
- `app.ts` — dependency injection so tests can supply a fake repository and a
  fake health probe
- `api/index.ts` and the `globalThis` connection cache
- The error taxonomy and the `{ data }` / `{ error: { code } }` envelope
- Interaction design: status pill as the control, four distinct empty states,
  one search box instead of three
- `README.md`, `AGENT.md`, every commit message

**Neither — mechanical:**

- `package-lock.json`, `next-env.d.ts`

## Representative prompts

Paraphrased; the real ones were longer and referenced files directly.

> Express + TypeScript API. Strict tsconfig, separate build config so tests
> stay out of `dist`. Parse env with Zod at import time and throw on a bad
> config rather than failing on the first request.

> Here's my `LeadRepository` interface. Write an in-memory implementation with
> identical semantics to the Mongo one — same filtering, sorting, pagination
> and stats — so the route tests can use it instead of a database.

> Write route tests with Supertest against the in-memory repo. Cover: partial
> search on each of the three fields, pagination totals, a `422` that lists
> allowed transitions, an empty result being `200` not `404`, and `/stats` not
> being matched as `/:id`.

> Tailwind v4, so no `tailwind.config`. Define the palette as CSS custom
> properties in oklch, declared twice for light and dark, mapped through
> `@theme inline`. Dark mode by `data-theme`, applied by a blocking script in
> `<head>` so there's no flash.

> The status pill should be the control itself. Build its menu from the
> client-side transition map so an illegal move is never offered. Optimistic
> update with rollback from a snapshot on error.

Prompts that did **not** work well were the vague ones — "build a leads
dashboard" produced something generic with a separate edit modal per row,
which I threw away. The useful prompts all carried a constraint I'd already
decided.

## Where the AI was wrong

Worth recording, because it's the honest answer to how much of this is the
model:

1. **A real bug in the modal.** The generated `Modal` had its focus-trap
   `useEffect` depend on `onClose`. That prop's identity changes on every
   render, so every keystroke tore the effect down and re-ran it, re-focusing
   the first field. Typing in the Phone input jumped you back to Name after
   one character. My own manual testing hadn't caught it — the dialog test
   did, and only because it typed into more than one field. Fixed by holding
   `onClose` in a ref so the effect depends only on `open`.

2. **A hallucinated Mongoose option.** The seed script was written with
   `LeadModel.insertMany(docs, { timestamps: false })`. That option isn't in
   Mongoose 8's `InsertManyOptions`; `tsc` rejected it. Replaced with
   per-document `save({ timestamps: false })`, which is real.

3. **A `rootDir` that broke typecheck.** The generated tsconfig set
   `rootDir: "src"` in the base config while also including `tests/` and
   `vitest.config.ts`. `tsc` refused. Moved `rootDir`/`outDir` into the build
   config only.

4. **`api/` silently untypechecked.** After adding the serverless entry,
   `tsc --noEmit` passed — because `api/**` wasn't in the tsconfig `include`.
   It was passing vacuously. Added it.

5. **Odd code that worked but read badly.** The first `env.ts` wrapped a
   string literal in a helper function to satisfy a Zod enum. It compiled and
   it was nonsense. Rewritten.

6. **Wrong hosting advice by default.** The first deployment plan was Render's
   free tier. Render sleeps after 15 minutes idle and takes ~50s to wake,
   which would mean a reviewer opening the link sees a spinner. I moved the
   API to a Vercel function instead, which needed two changes the model didn't
   volunteer: exporting the app rather than calling `listen()`, and caching
   the Mongoose connection on `globalThis` so warm containers reuse the pool
   instead of exhausting Atlas's connection cap.

## Key engineering decisions

**Repository interface in front of Mongoose.** The reason is the test suite.
The route tests run the real Express stack — real middleware, real error
handler, real controllers — against an in-memory repository, so 65 API tests
finish in ~2s with no database and no flakiness. Nothing else in the design
buys as much.

**Status as a state machine, not a string.** One `Record<LeadStatus,
LeadStatus[]>` in `lead.types.ts` drives the server's `422`, the client
dropdown's options, and its own unit tests. Skipping stages is the most common
real mistake in a pipeline UI and this makes it unrepresentable.

**Zod parsed in the controller, not in middleware.** Validation middleware
means the handler still reads `req.body` as `any` and casts. Parsing at the
top of the controller gives the inferred type directly — no cast, and the
schema is the single source of both the check and the type.

**Stable error codes.** The frontend branches on `error.code`, never on the
message. That's what lets a `409` land as an inline message on the email field
while a `500` becomes a toast.

**Errors thrown as domain types.** The service throws
`InvalidStatusTransitionError`; one middleware turns it into HTTP. The service
imports nothing from Express, which is what makes it unit-testable.

**Dependency injection in `createApp`.** It takes the repository and the
health probe as arguments. That's the whole reason the health check can be
tested in both its `200` and `503` states without touching a database.

**`_id` as a sort tiebreaker.** Sorting by a non-unique field like `status`
gives Mongo no deterministic order, so rows can repeat or vanish across pages.
Every sort appends `_id`.

**Email lowercased at the schema level.** Makes the unique index
case-insensitive without a collation-aware index.

**Validation duplicated deliberately.** Client-side rules are a copy of the
server's. Both are tested against the same inputs so they can't drift silently.

**Vercel functions over a long-lived container**, covered above — chosen to
avoid cold-start sleep on a free tier, accepting per-instance rate limiting
and the connection-pooling care that serverless requires.

## If I did it again

The in-memory repository was the highest-leverage thing I built, and I built
it third. Earlier would have been better — every test after that point was
cheap to write.

I'd also stop asking for components before deciding the interaction. The
generated dashboard I discarded was a fair response to a bad prompt. Once I
specified "the status pill *is* the control, and it only offers legal moves",
the output was close to what shipped.
