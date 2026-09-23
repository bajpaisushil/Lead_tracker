AGENT.md

How this project was built, which parts were AI-assisted, which were not, and the decisions that shaped it.

Tools

Tool| Used for
Claude (Anthropic), via Claude Code in VS Code| Scaffolding, boilerplate, first drafts of components and tests, code review and checking edge cases
GitHub Copilot (inline completions)| Line-level completion while editing
TypeScript compiler + ESLint| The actual arbiter of whether generated code was correct
Vitest| Same, for behaviour

I treated the AI tools as a development assistant, not as the author of the project. I made the main architecture and behaviour decisions myself. Everything generated or suggested by AI was reviewed before being used and was checked with "tsc --noEmit", ESLint, tests, and manual testing.

How I worked

I planned the main shape of the application first — architecture, status flow, repository boundary, validation and error handling. After that I used AI mainly for implementation, tests, reviewing edge cases and finding improvements.

The order was deliberate:

backend contract → tests → frontend against a working API → final review → documentation and deployment

A rough split of where the work went:

Phase| Approach
Architecture, module boundaries, data model| Mine. Decided before prompting
Express/TypeScript scaffolding, config, tsconfig, ESLint setup| AI-generated, reviewed and trimmed
Mongoose schema + indexes| AI drafted, I chose the indexes and lowercase-email approach
Repository interface + Mongo/in-memory implementations| My design, AI helped with implementation
Service layer and domain rules| Mine. This is where the main behaviour lives
Zod schemas| AI-generated from the validation rules I specified
Controllers, routes, middleware| AI-generated, reviewed and modified
Test suite| AI helped with the first pass; I specified and added important edge cases
React components and Tailwind theming| AI-generated in parts; layout, interaction model and visual decisions are mine
TanStack Query hooks and optimistic updates| AI-assisted from the rollback behaviour I specified
README, AGENT.md and commit messages| Written and reviewed by me
Deployment| Mine. Hosting choice, environment variables and serverless adaptation

What was AI-generated vs hand-written

Mostly AI-assisted, then reviewed

- "server/src/config/env.ts"
- "logger.ts"
- ESLint/tsconfig/Vitest configuration
- "server/src/modules/leads/lead.schema.ts" (Zod)
- "server/src/modules/leads/lead.repository.memory.ts"
- Shared middleware
- Some React UI primitives
- First pass of several test files
- Some SVG icon paths
- Parts of the frontend data-fetching layer

Mostly mine

- "lead.types.ts" — status union, transition map and the decision that "WON" is terminal
- "lead.service.ts" — duplicate handling, transition enforcement and same-status short-circuit
- "lead.repository.ts" — repository interface and the decision to have the abstraction
- "app.ts" — dependency injection so tests can provide a fake repository and health probe
- "api/index.ts" and the "globalThis" connection cache
- Error taxonomy and "{ data }" / "{ error: { code } }" response envelope
- Interaction design — status pill as the control, different empty states and a single search input
- README and AGENT.md
- Git commit messages
- Deployment approach and environment configuration

Mechanical

- "package-lock.json"
- "next-env.d.ts"

Representative prompts

These are representative prompts from the development process. Some prompts were shorter and some included the relevant file/code context. I normally first decided what I wanted and then used Claude for implementation, testing or review.

1. Initial project review and architecture

«I have attached/provided the Lead Tracker assignment document. Please first understand the requirements properly and review the current project structure/code.

I want React + TypeScript frontend, Node/Express + TypeScript backend and MongoDB. Before making changes, check if the current architecture is good for the requirements. Focus on clean separation between routes/controllers/service/repository and keep it simple, not over engineered.

Also identify important edge cases from the assignment which we should handle. Don't make big changes without explaining why.»

2. Lead status and edge cases

«Review the current lead status implementation against the assignment and current code. I want status changes to follow a proper flow and invalid transitions should not be allowed.

Check edge cases like same status update, skipping a status, invalid status, WON being final, duplicate lead email and invalid lead id.

Please suggest the smallest changes required and add/update tests for these cases. Don't change unrelated code.»

3. API and test review

«Review the backend API and existing tests carefully. Find important cases which are missing for a real lead tracker.

Check search by name/email/phone, empty search result, pagination, invalid input, duplicate email, status transition errors, 404 cases and route conflicts like /stats and /:id.

Add only meaningful tests. Keep the current architecture and test style. After changes make sure TypeScript and tests pass.»

4. Final review and improvements

«Do a final review of the complete project using the original assignment requirements. Check frontend, backend, database usage, validation, error handling, TypeScript, tests and deployment related issues.

I don't want a rewrite. Find bugs or important improvements which can affect evaluation or real usage. For each issue explain the reason and suggest a small fix. I will decide which changes to apply.»

How I used the responses

I did not directly accept generated changes. I checked the diff, understood the change, ran the relevant tests and manually tested the affected flow.

For larger changes I preferred asking AI to review or suggest a change rather than allowing it to redesign the existing implementation.

The final implementation therefore contains a mix of AI-assisted code and manually designed/modified code.

Where the AI was wrong

The AI output was useful but not always correct. Some examples that I caught during development:

1. A real bug in the modal. The generated "Modal" had its focus-trap "useEffect" depend on "onClose". That prop's identity changes on every render, so every keystroke could cause the effect to run again and refocus the first field. This was caught during testing and fixed by keeping "onClose" in a ref so the effect does not rerun unnecessarily.

2. A Mongoose option that was not valid. The seed script used "LeadModel.insertMany(docs, { timestamps: false })". TypeScript rejected the option for the installed Mongoose version. I changed the implementation to save documents individually with the supported option.

3. A "rootDir" configuration problem. The generated TypeScript configuration had "rootDir: "src"" while also including tests and the Vitest configuration. TypeScript rejected this setup. I moved the build-specific settings into the build configuration.

4. "api/" was initially not included in typechecking. After adding the serverless entry point, "tsc --noEmit" was passing without actually checking the new "api/**" code. I found this by checking the TypeScript configuration and added the directory to the included files.

5. Some generated code was unnecessarily complicated. In one case the generated environment configuration used a helper around a simple string value only to satisfy a type. It worked but was not useful. I simplified it.

6. Initial deployment suggestion was not suitable for the reviewer experience. The first suggestion was a traditional free backend hosting setup. I changed the approach to a Vercel function so the API would not depend on a sleeping free server. This also required exporting the Express app instead of calling "listen()" and caching the MongoDB connection so warm serverless instances can reuse the connection.

These were good examples of why I used AI as an assistant and still relied on the compiler, tests, manual testing and my own review.

Key engineering decisions

Repository interface in front of Mongoose

The repository abstraction makes the service independent from MongoDB and also makes the API tests much faster.

The route tests can run the real Express stack with an in-memory repository instead of requiring a database for every test. This keeps the tests deterministic and avoids unnecessary database setup.

Status as a state machine

Lead status is represented as a defined set of allowed transitions rather than treating status as an arbitrary string.

A transition map in "lead.types.ts" is used to determine which statuses can follow the current status. This is also used by the frontend so the UI does not offer transitions that the backend will reject.

"WON" is treated as a terminal state.

The backend remains the source of truth, so the frontend restriction is mainly for better UX and early prevention of invalid actions.

Zod validation

Request data is validated using Zod before it reaches the service layer.

This keeps the validation rules explicit and gives the application typed data after parsing instead of relying on casts from "req.body".

Stable error codes

The API uses structured error codes instead of making the frontend depend on error message strings.

For example, the frontend can handle a duplicate email differently from a generic server error without checking the exact message text.

Domain errors

Business rules such as invalid status transitions are handled in the service layer through domain-level errors.

The service does not need to know about Express or HTTP response objects. The HTTP layer converts those errors into the appropriate response.

Dependency injection

"createApp" accepts dependencies such as the repository and health probe.

This allows tests to provide in-memory implementations and also makes the application less tightly coupled to a particular database implementation.

Deterministic sorting

When sorting by a field that can contain duplicate values, "_id" is also used as a tiebreaker.

This makes pagination more deterministic and reduces the chance of records moving between pages when multiple records have the same primary sort value.

Email normalization

Email addresses are normalized to lowercase before storage.

This makes duplicate checking consistent for values such as:

"Example@Email.com"

and

"example@email.com"

and allows the unique constraint to behave consistently without relying on case-sensitive input.

Client and server validation

Some validation is intentionally present on both sides.

Client validation gives immediate feedback to the user, while server validation remains authoritative because API requests cannot trust the client.

The same important cases are covered by tests to reduce the chance of the two sides behaving differently.

Serverless deployment

The API is adapted to run as a serverless function rather than relying on a permanently running server.

The Express app is exported instead of starting its own listener, and the MongoDB connection is cached so warm function instances can reuse the existing connection.

This keeps the deployment simple while avoiding a separate always-running backend server for the assignment.

If I did it again

The in-memory repository was one of the highest-leverage decisions in the project. It made the API tests fast and allowed most backend behaviour to be tested without depending on a running database.

I would probably introduce that boundary even earlier so that more tests could be written before connecting the application to MongoDB.

I would also spend more time defining the interaction before asking AI to generate UI components. An earlier generated dashboard was too generic because the prompt did not specify the interaction clearly enough, so I discarded it.

Once I decided that the status pill itself should be the control and should only show valid next states, the generated implementation was much closer to what I wanted.

Overall, AI reduced the amount of boilerplate I had to write, but the architecture, domain rules, important edge cases, debugging and final decisions remained under my review.