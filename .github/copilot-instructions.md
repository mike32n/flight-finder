# Flight Finder -- Copilot instructions

## 1. Project overview

Flight Finder is a Node.js/Express application with a browser UI in
`public/` and APIs for flight search, authentication, administration,
and search access.

- `server.js` is the entry point. It loads environment variables,
  initializes SQLite through `initDb()`, loads destinations, and
  starts Express on port 3000.
- `app.js` mounts the route groups: search (`/`), config (`/config`),
  authentication (`/api/auth`), administration (`/api/admin`), and
  search access (`/api/search-access`).
- `routes/` contains HTTP route handlers. Middleware handles
  validation and access checks before controller logic runs.
- `controllers/` handles request/response flow, including the
  `/search-stream` SSE endpoint and airport enrichment.
- `services/flightSearchService.js` contains the flight-search logic:
  trip combinations, concurrency limits, provider requests, Smart
  Flex, and fallback behavior.
- `providers/providerFactory.js` and `config/providerConfig.js` select
  and initialize the provider. `FLIGHT_PROVIDER` supports `mock`,
  `serpapi`, and `amadeus-*`.
- `db.js` initializes SQLite tables, migrations, and destination data.
  Destinations are loaded from the `destinations` table and cached in
  memory at startup.
- `config/appConfig.js` centralizes search limits, the default
  departure airport, authentication defaults, and other application
  settings.
- Redis is used for caching and rate limiting. It must be running for
  local search flows.

## 2. Project conventions and source of truth

- The application uses JavaScript and CommonJS
  (`require`/`module.exports`). Playwright tests use TypeScript.
  Follow the conventions of the area being changed.
- The frontend is in `public/`. The backend handles validation,
  authentication, access control, and provider orchestration.
- Jest tests are in `__tests__/`; Playwright tests are in
  `playwright/tests/`. Route tests commonly use `supertest` with a
  minimal Express app.
- Search requests are validated by `middlewares/validateSearch.js`
  before reaching business logic. Validation covers origin,
  destinations, weekday, nights, and `startDate`.
- Search results are deduplicated by origin, destination, departure
  date, and return date, then sorted by price.
- Live search updates use Server-Sent Events. The stream ends with
  `event: end\ndata: done\n\n` or an error event.
- `db.js` also seeds destination rows and runs setup/migrations for
  user access and plan policies; it does more than create the schema.
- `readme.md` is the main product documentation. Use it for local
  setup and feature behavior.
- `.env.example` lists the required environment variables, including
  provider credentials, JWT secret, Redis settings, and email
  settings.
- The default configuration uses BUD as the departure airport, allows
  up to 3 destinations, returns up to 5 results, and enables Smart
  Flex.
- Local Jest and Playwright tests use `FLIGHT_PROVIDER=mock` by
  default to avoid external flight API dependencies.

**When investigating or changing the project:** - Inspect the current
repository before making assumptions. - Treat the current code as the
source of truth for what is implemented. - Treat agreed requirements and
`readme.md` as the source of truth for intended behavior. - If
implementation and intended behavior differ, investigate before deciding
whether code, tests, or documentation need to change. - Do not assume
that a feature, setting, dependency, or script exists unless the
repository confirms it.

## 3. Build, test, and validation commands

- Install dependencies: `npm install`
- Start the app: `npm start`
- Start Redis: `docker compose -f docker-compose.redis.yml up -d`
- Run all Jest tests: `npm test`
- Run one Jest file:
  `npx jest __tests__/routes/configRoutes.test.js --runInBand`
- Run one Jest test by name:
  `npx jest __tests__/routes/configRoutes.test.js --runInBand -t "should return public frontend configuration"`
- Run all Playwright tests: `npm run pw:test`
- Run one Playwright spec:
  `npx playwright test playwright/tests/login.spec.ts --project=chromium`
- Open the Playwright HTML report: `npm run pw:report`

CI uses Node 20 and runs `npm install` followed by `npm test`. There is
currently no dedicated lint script in `package.json`.

## 4. Playwright conventions

- Use Playwright with TypeScript and follow the existing Page Object
  Model.
- Page objects belong in `playwright/pages/`; test specs belong in
  `playwright/tests/`.
- Define and maintain locators in page object classes.
- Keep all Playwright `expect()` assertions inside page object
  methods, including assertions in cross-page flows.
- Specs must use page object methods for interactions and assertions.
  Do not put direct assertions, locators, or raw Playwright `page`
  operations in spec files.
- Keep setup and navigation inside page objects or the project's
  established fixtures; do not bypass the POM in a spec.
- Prefer reusable page object methods. Passing a locator to a reusable
  method is acceptable when it avoids unnecessary duplication.
- Keep test cases in ascending TC-ID order within each `test.describe`
  block.
- Avoid arbitrary `waitForTimeout()` calls. Prefer Playwright
  auto-waiting and reliable user-facing conditions.
- After a resize or another asynchronous layout change, wait for the
  relevant layout condition before measuring.
- Preserve the existing test isolation, fixtures, and setup
  conventions.

### Test assertions and responsive layout

- Assert agreed product requirements and observable behavior, not
  incidental implementation details or historical measurements.
- Use exact pixel values only when they are explicit product
  requirements.
- Do not assume that Chromium, Firefox, and WebKit render identical
  dimensions. Account for scrollbar gutters, font metrics, and
  fractional-pixel rounding.
- Derive expected geometry from the actual viewport, container, and
  rendered elements. Use justified tolerances; do not widen tolerances
  just to hide a layout defect.
- Prefer behavioral checks over indirect proxies. For example, verify
  that the intended element actually scrolls instead of inferring
  scrollability from card count or content height.
- Keep implementation-specific assertions when they protect an
  explicit requirement.

### Failure diagnosis and coverage

- Start with the first failing assertion. Check its expected and
  actual values, then trace the relevant page-object and helper calls.
- Group failures that share a root cause. A shared helper can cause
  failures in several unrelated-looking tests.
- Classify the cause before changing anything: application regression,
  outdated expectation, browser-specific rendering, or
  timing/synchronization issue.
- Do not change production code unless there is evidence of an
  application defect.
- When changing or replacing an assertion, preserve the behavior and
  scenarios it originally covered.
- Do not remove coverage or weaken an assertion just to make a test
  pass. If coverage must change, explain why and get approval first.
- Check both overflow and actual scroll movement, and verify that the
  correct scroll container is being tested.

## 5. Jest conventions

- Follow the existing Jest structure and naming conventions.
- Reuse existing helpers and fixtures where appropriate.
- Keep tests independent; avoid shared mutable state.
- Cover positive, negative, boundary, and error scenarios.
- Add regression tests for bug fixes.
- Do not change production code solely to satisfy an incorrect test
  expectation.

## 6. Implementation and UI changes

- Prefer small, focused changes. Avoid broad rewrites, unnecessary
  dependencies, and unnecessary architectural complexity.
- Preserve existing behavior unless the user explicitly requests a
  change.
- Do not modify unrelated files.
- Reuse existing utilities, methods, DOM elements, containers, event
  handlers, and rendering mechanisms where they already meet the
  requirement.
- Before adding a UI element or implementation, search for an existing
  one that can be extended or reused.
- For UI changes, inspect the relevant HTML, CSS, and JavaScript
  together. Check DOM structure, rendering, state management, and
  event handling.
- Reusing CSS classes does not mean two elements share the same
  implementation. If reuse is required, verify that the actual DOM
  element and rendering mechanism are shared.
- If multiple events or states can update the same UI element,
  identify their interactions and define the expected priority,
  replacement, dismissal, and persistence behavior.
- Do not hide duplicate elements with CSS as a substitute for fixing
  duplicate rendering or state management.
- When reusing an existing UI element, preserve its position,
  dimensions, alignment, styling, accessibility, and dismissal
  behavior unless the requirement says otherwise.
- For responsive layout issues, inspect actual rendered bounds,
  computed styles, viewport dimensions, and relevant application
  states before changing CSS.
- Distinguish explicit design requirements from measurements observed
  during earlier tests. A historical pixel value is not a permanent
  requirement unless explicitly agreed.
- Verify the rendered UI after the change. Confirm that the intended
  behavior works and that duplicate elements or conflicting messages
  are not present.

### Scroll-container sizing

- Keep content dimensions separate from the dimensions allocated to a
  scroll container.
- Use actual content extents for content-driven layout calculations.
- Use `scrollHeight` and `clientHeight` for overflow calculations
  where appropriate; do not treat them as interchangeable with actual
  content dimensions.
- Avoid sizing an ancestor from viewport-expanded scroll measurements
  if that can create a layout feedback loop.

## 7. Diagnostics

- After changing code, inspect available IDE diagnostics, including
  the VS Code Problems panel, for issues related to the changed files.
- Check for errors, warnings, TypeScript diagnostics, unresolved
  imports, and invalid references introduced by the change.
- Fix issues introduced by the current task, even if tests pass.
- Before fixing a reported issue, classify it as:
  - introduced by the current changes;
  - pre-existing in an affected file or feature; or
  - unrelated to the task.
- Do not silently expand the task to include pre-existing or unrelated
  issues. Report them and ask for approval before changing them.
- If IDE diagnostics are unavailable, run the relevant compiler,
  TypeScript checker, tests, or other project validation. Do not claim
  to have inspected diagnostics that were not accessible.
- Do not fix existing warnings blindly. First establish their
  relevance and risk.
- After fixing a diagnostic, recheck it and run the relevant tests.
- Report remaining relevant diagnostics, including file locations and
  why they were not fixed.

## 8. Workflow and approval

For a simple, clearly specified task, make the focused change directly.

For a complex task --- one affecting multiple unrelated modules,
architecture, data flow, authentication/authorization, or significant
refactoring:

1.  Inspect the current implementation and relevant tests.
2.  Identify affected files and dependencies.
3.  Present a concise plan.
4.  Wait for the user's approval before implementation.
5.  Implement in small, logically grouped steps.
6.  Run the relevant tests and inspect diagnostics.
7.  Report the changed files and actual results.

If a new issue appears during implementation, first decide whether it
belongs to the approved task. Fix issues introduced by the current
changes. Ask before changing pre-existing or unrelated code.

For UI work, verify the actual user-visible behavior, not just the
presence of CSS classes or DOM elements. Passing tests alone does not
make the task complete if relevant diagnostics or visible defects
remain.

## 9. Git and change management

- Never commit, push, or create a branch without explicit user
  approval.
- Do not overwrite, revert, reset, or discard existing user changes
  unless explicitly requested.
- Preserve untracked files. Do not add or modify them unless the user
  asks.
- Review the final diff before reporting completion.
- Keep unrelated changes in separate logical groups. Tell the user
  before doing additional work outside the agreed scope.
- Do not claim that tests or checks passed unless they were actually
  run.
- Report failing or skipped tests explicitly.
- At completion, list the exact files changed and distinguish
  current-task changes from pre-existing working-tree changes.
