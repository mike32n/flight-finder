# Flight Finder Copilot instructions

## Build, test, and validation commands

- Install dependencies: `npm install`
- Start the local app: `npm start`
- Start Redis for local development: `docker compose -f docker-compose.redis.yml up -d`
- Run all Jest tests: `npm test`
- Run a single Jest file: `npx jest __tests__/routes/configRoutes.test.js --runInBand`
- Run one Jest test name: `npx jest __tests__/routes/configRoutes.test.js --runInBand -t "should return public frontend configuration"`
- Run all Playwright E2E tests: `npm run pw:test`
- Run a single Playwright spec: `npx playwright test playwright/tests/login.spec.ts --project=chromium`
- Open the Playwright HTML report: `npm run pw:report`
- CI runs Node 20 and executes `npm install` followed by `npm test`.
- There is no dedicated lint script in `package.json` right now.

## High-level architecture

This repository is a Node.js/Express app that serves a browser UI from `public/` and exposes search/auth/admin APIs.

- `server.js` is the entry point: it loads environment variables, initializes SQLite via `initDb()`, loads destinations, and starts Express on port 3000.
- `app.js` mounts the main route groups: search routes at `/`, config routes under `/config`, auth under `/api/auth`, admin under `/api/admin`, and search-access under `/api/search-access`.
- Route files in `routes/` are thin HTTP adapters. Validation and access checks are handled by middleware before the controller logic runs.
- Controller logic in `controllers/` orchestrates request/response flow, including the SSE search stream (`/search-stream`) and airport enrichment used for UI output.
- Business logic for searches lives in `services/flightSearchService.js`: it generates trip combinations, enforces concurrency limits, runs provider requests, and applies Smart Flex/fallback behavior.
- Providers are abstracted behind `providers/providerFactory.js` and `config/providerConfig.js`. `FLIGHT_PROVIDER` selects the active backend (`mock`, `serpapi`, or `amadeus-*`), while the factory instantiates the matching implementation.
- The database layer is centered in `db.js` and initializes SQLite tables and migrations; search destination data is loaded from the SQLite `destinations` table and cached in memory at startup.
- `config/appConfig.js` centralizes search limits, default departure airport, auth defaults, and other operational settings; those values are consumed across routes/controllers and tests.
- Redis is part of the runtime for cache/rate limiting, and the app expects it to be running for local search flows.

## Key conventions in this codebase

- Search requests are validated before business logic. `middlewares/validateSearch.js` checks origin, destination list, weekday, nights, and `startDate` rules before the controller executes.
- Search results are deduplicated by origin/destination/departure/return and then sorted by price before sending the final response.
- The app uses server-sent events for live search updates. `searchStream` writes `data:` chunks and ends with `event: end\ndata: done\n\n` or an error event on failure.
- Local testing and Playwright E2E runs use the mock provider by default (`FLIGHT_PROVIDER=mock`) to avoid external flight API dependencies.
- The project is CommonJS-based (`require`/`module.exports`), not TypeScript; keep new code aligned with the existing file layout and module style.
- `public/` contains the browser UI, while the backend mostly handles validation, auth, access control, and provider orchestration.
- Tests are split between Jest (`__tests__/`) and Playwright (`playwright/tests/`), and route tests commonly use `supertest` with a minimal Express app.
- Database initialization is not just schema creation; `db.js` also seeds destination rows and runs migration/setup scripts for user access and plan policies.

## Repo-specific notes

- `readme.md` is the main product documentation; use it as the source of truth for local setup and feature behavior.
- The app expects `.env` values for provider credentials, JWT secret, Redis config, and email settings; see `.env.example` for the variable list.
- The default app configuration is intentionally opinionated: one departure airport (`BUD`), max 3 destinations, max 5 results returned, and smart-flex enabled by default.

## Playwright E2E testing conventions

- Use Playwright with TypeScript.
- Follow the existing Page Object Model (POM).
- Page objects are located in `playwright/pages/`.
- Test specifications are located in `playwright/tests/`.
- Declare and maintain locators in page object classes.
- Keep all Playwright `expect()` assertions inside page object methods.
- All Playwright `expect()` assertions must be implemented inside page object methods, including cross-page flows.
- Spec files must not contain direct Playwright assertions.
- Spec files must not use the raw Playwright `page` API or define locators directly.
- Specs should use page object methods for interactions and assertions.
- Prefer reusable page object methods over feature-specific duplicated methods.
- Passing a locator to a reusable page object method is acceptable when it avoids unnecessary duplication.
- Keep test cases in ascending TC-ID order within each `test.describe` block (e.g. TC-01 before TC-02).
- Avoid arbitrary `waitForTimeout()` calls.
- Prefer Playwright auto-waiting and reliable user-facing locators.
- Preserve existing test isolation and setup conventions.
- Do not introduce unnecessary abstractions or duplicate existing helpers.

## Jest testing conventions

- Follow the existing Jest test structure and naming conventions.
- Reuse existing test helpers and fixtures where appropriate.
- Keep tests independent and avoid shared mutable state.
- Cover positive, negative, boundary, and error scenarios.
- Add regression tests for bug fixes.
- Do not change production code just to make a test pass.

## Implementation and refactoring rules

- Always inspect the existing implementation before proposing changes.
- Treat the current repository code as the source of truth.
- Do not assume functionality, configuration, or dependencies that are not present.
- Preserve existing behavior unless explicitly requested otherwise.
- Prefer small, focused changes over broad rewrites.
- Avoid unnecessary dependencies and architectural complexity.
- Do not modify unrelated files.
- Reuse existing utilities, methods, and patterns where possible.
- If requirements are unclear, ask before making assumptions.

## Existing UI and implementation reuse

- Before implementing a new feature or UI element, search the existing codebase for functionality, components, DOM elements, containers, utilities, or rendering mechanisms that could already serve the same purpose.
- Prefer extending or reusing existing implementations over creating parallel or duplicate implementations.
- Do not create a new DOM element, container, component, event handler, or state-management mechanism when an existing one can fulfil the requirement.
- When a requirement says that something must appear in the same place or behave like an existing element, interpret this as a requirement to investigate and reuse the existing implementation, not merely to reproduce its visual appearance.
- For UI changes, inspect the relevant HTML structure, CSS rules, and JavaScript rendering and state-management logic together.
- Reusing the same CSS classes or visual styling does not mean that two elements share the same implementation. Verify the actual DOM element and rendering mechanism when reuse is required.
- When multiple events or application states can update the same UI element, identify their interactions and define the expected priority, replacement, dismissal, and persistence behavior.
- Do not solve duplicate rendering or state-management problems merely by hiding one of the duplicate elements with CSS. Fix the underlying rendering or state-management logic.
- Preserve existing positioning, dimensions, alignment, styling, accessibility, and dismissal behavior when reusing an existing UI element, unless the task explicitly requires a change.
- Before considering a UI issue fixed, verify the actual rendered result and confirm that no duplicate elements or conflicting messages remain.

## Proactive diagnostics and problem resolution

- After making code changes, inspect the available IDE diagnostics, including the VS Code Problems panel, for errors and warnings related to modified files.
- Pay particular attention to newly introduced errors, warnings, TypeScript diagnostics, unresolved imports, invalid references, and other problems caused by the current changes.
- Fix issues introduced by the current changes as part of the current task, without waiting for the user to report them.
- Before fixing an issue, determine whether it is:
  - Introduced by the current changes.
  - A pre-existing issue in an affected file or feature.
  - Unrelated to the current task.
- Do not silently expand the scope of a task to fix unrelated issues.
- If a diagnostic points to code modified by the current task, investigate and fix it even if the relevant tests are passing.
- For pre-existing or unrelated issues, report the findings and ask the user for approval before making changes.
- If the IDE diagnostics or Problems panel are not accessible, use the available compiler, TypeScript checker, test runner, or other relevant project validation commands.
- Never claim that the Problems panel was inspected if it was not actually accessible.
- Do not attempt to fix every existing warning blindly. First establish whether it is relevant, introduced by the current work, or potentially risky.
- After fixing a diagnostic, recheck the affected diagnostics and run the appropriate tests.
- Report remaining diagnostics, including their file locations and why they were not addressed.

## Working workflow

For complex tasks:

1. Analyze the current implementation.
2. Identify affected files and dependencies.
3. Propose a concise implementation plan.
4. Wait for approval before making changes.
5. Implement in small, logically grouped steps.
6. Run relevant tests after implementation.
7. Report modified files and actual test results.

- A task is considered complex if it affects multiple unrelated modules, changes architecture or data flow, modifies authentication/authorization behavior, or requires significant refactoring.

For simple, clearly specified tasks, implementation can proceed directly.

Additional workflow rules:

- Before proposing a new implementation, inspect existing functionality and identify reusable components, utilities, and patterns.
- For complex UI changes, inspect the HTML, CSS, and JavaScript implementation together before making changes.
- If a new issue is discovered during implementation, determine whether it belongs to the current task before changing anything.
- Fix issues introduced by the current changes as part of the current task.
- Ask for approval before fixing pre-existing or unrelated issues.
- After implementation, inspect available IDE diagnostics and address relevant issues introduced by the changes.
- Do not consider a task complete solely because tests pass if relevant diagnostics still indicate problems.
- Verify the actual user-visible behavior for UI changes, not just the presence of expected CSS classes or DOM elements.

## Git and change management

- Never commit, push, or create branches without explicit approval.
- Do not overwrite unrelated user changes.
- Review the final diff before reporting completion.
- Do not claim tests passed unless they were actually executed.
- Report any failing or skipped tests explicitly.

Additional Git and change management rules:

- Do not revert, reset, or discard existing user changes unless explicitly requested.
- Keep changes logically grouped so that unrelated fixes can be committed separately.
- If a change belongs to a separate logical task or commit, tell the user before proceeding with additional work.
- Preserve untracked files and do not include them in changes unless explicitly requested.
- Report the exact files modified and distinguish current-task changes from pre-existing working-tree changes.
