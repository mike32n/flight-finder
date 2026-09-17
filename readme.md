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
- Top cheapest results
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
4. Apply Smart Flex when required
5. Deduplicate and sort results
6. Return the configured number of cheapest results

Individual API failures do not stop the remaining searches.

## Smart Flex

Additional searches are triggered only when necessary:

- no suitable results, or
- the best price exceeds the configured threshold

Current variants:

- Departure −1 day, return unchanged
- Departure unchanged, return +1 day

## Authentication

The application includes:

- Registration with email verification
- Token-based login/logout
- Current-user session check
- Forgot-password flow
- One-hour password-reset tokens
- Password validation and bcrypt hashing

Email verification and password recovery use an isolated email service with Mailtrap for development/testing.

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

**Backend:** Node.js, Express, SQLite, Redis, SSE

**Frontend:** HTML, CSS, Vanilla JavaScript

**Flight data:** SerpApi / Google Flights

**Authentication:** bcrypt, crypto, validator, Nodemailer, Mailtrap

**Testing:** Jest, Supertest, Playwright, TypeScript

**Development:** Docker / Docker Compose

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
