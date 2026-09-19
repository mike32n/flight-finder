# ✈️ Flight Finder

A lightweight web application for finding cheap short round-trip flights from Budapest (BUD), with multi-destination search, flexible dates, live results, caching, rate limiting, and user authentication.

## Features

- Multi-destination flight search from BUD
- Trip generation by weekday + number of nights
- Configurable search limits
- Smart Flex with controlled ±1 day expansion
- Live results via Server-Sent Events (SSE)
- Partial failure handling
- Result deduplication and price sorting
- Top 5 cheapest results (by default)
- Google Flights booking links
- Provider abstraction (`mock`, `serpapi`, legacy Amadeus)
- Redis caching and rate limiting
- User registration, email verification and login
- Forgot-password and secure password-reset flow
- Light/dark theme
- Jest/Supertest and Playwright test automation

## How It Works

1. Generate possible trip dates
2. Create and execute search tasks through a concurrency-limited Promise Pool
3. Stream results to the browser as they become available
4. Insert results into the UI in sorted order while the search is still running
5. Apply Smart Flex when required
6. Deduplicate and sort results
7. Return the configured number of cheapest results

Individual API failures do not stop the remaining searches.

## Smart Flex

Additional searches are triggered only when necessary:

- no suitable results, or
- the best price exceeds the configured threshold

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

**Testing:** Jest, Supertest, Playwright, TypeScript

**Development Tools:** Docker Compose

## Running Locally

```bash
npm install
docker compose -f docker-compose.redis.yml up -d
npm start
```

Open:

```text
http://localhost:3000
```

Configure the required API, Redis and email settings in `.env`.

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
