# ✈️ Flight Finder

A lightweight web application for finding cheap short round-trip flights, with multi-destination search, flexible dates, live results, caching, rate limiting, and user authentication. Choose your departure airport, destinations, departure weekday and number of nights you wanna stay — Flight Finder searches the upcoming weeks and streams the cheapest options.

## Features

- Multi-destination flight search
- One departure airport and up to three destinations per search
- Trip generation by weekday + number of nights
- Search from today or a selected future date
- Search settings and results preserved across page reloads
- Smart Flex with controlled nearby-date search
- Live, price-sorted results via Server-Sent Events (SSE)
- Top 5 cheapest results (by default) with Google Flights booking links
- User registration, email verification, login and password recovery
- Plan-based search permissions configurable through an admin dashboard
- Light/dark theme

## Under the Hood

A concurrency-limited Promise Pool runs searches, while results are streamed, deduplicated and sorted as they arrive.
Individual provider failures do not stop the remaining searches.

- Redis provides caching and rate limiting.
- Search limits and date flexibility are configurable.
- A provider abstraction separates flight access from the application:
  - SerpApi / Google Flights powers real searches
  - Mock provider for development and testing

## Smart Flex

When enabled, Smart Flex checks controlled nearby date variants and shows them when they are cheaper than the original dates.
If disabled, nearby dates are searched only as a fallback when no flights are found for the original dates.
Smart Flex and fallback searches are available according to the active plan’s permissions.

Current variants:

- Departure −1 day, return unchanged
- Departure unchanged, return +1 day

## Flight Provider

Flight access is separated from the main application through a provider abstraction.

**Currently supported for real searches:**

- SerpApi / Google Flights

**Also available:**

- Mock provider for development/testing
- Amadeus providers retained as legacy/deprecated implementations

Provider selection is controlled through `.env`:

```env
FLIGHT_PROVIDER=serpapi
```

## Tech Stack

**Backend:** Node.js, Express, SQLite, Redis  
**Frontend:** HTML, CSS, Vanilla JavaScript  
**Flight data:** SerpApi / Google Flights  
**Authentication:** bcrypt, crypto, validator  
**Email:** Nodemailer, Mailtrap  
**Testing:** Playwright + TypeScript, Jest, Supertest  
**CI:** GitHub Actions  
**Local infrastructure:** Docker Compose for Redis

## Test Automation

- Playwright + TypeScript E2E tests
- Page Object Model (POM) with reusable page objects and helpers
- Authentication, flight search, persistence, plan permissions, admin workflows and UI coverage
- Jest/Supertest unit and integration tests cover backend behavior
- Automated Jest and Playwright execution in GitHub Actions
- Playwright HTML reports available as CI artifacts

## Running Locally

Configure API, Redis and email settings in `.env`, then:

```bash
npm install
docker compose -f docker-compose.redis.yml up -d
npm start
```

Open:

```text
http://localhost:3000
```

## Testing

Unit/integration tests:

```bash
npm test
```

Playwright E2E tests:

```bash
npx playwright install
npm run pw:test
```

## License

MIT License
