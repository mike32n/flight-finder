# ✈️ Flight Finder

A lightweight web application for finding cheap short round-trip flights (e.g. weekend getaways), with multi-destination search, flexible date expansion, live result streaming, caching, rate limiting, and automated testing.

## Features

- Multi-destination flight search
- Short-trip date generation based on weekday and number of nights
- Smart Flex mode with controlled ±1 day date expansion
- Top 5 cheapest results
- Live result streaming through Server-Sent Events (SSE)
- Partial failure handling — one failed search does not stop the whole process
- Result deduplication and price sorting
- Clickable flight results that open the corresponding Google Flights search/booking page in a new tab
- Provider abstraction supporting multiple flight-data providers
- Redis caching and rate limiting
- Jest + Supertest automated API/unit tests
- Playwright end-to-end test automation

## How it works

The application generates possible trips from the selected weekday and number of nights, creates the required flight-search tasks, and executes them through a concurrency-limited Promise Pool.

Results are streamed to the browser as soon as individual searches finish instead of waiting for the complete search to finish.

The final result pipeline is:

1. Generate possible trips
2. Build flight-search tasks
3. Execute tasks with a concurrency limit
4. Stream successful results through SSE
5. Handle failed searches without stopping the whole process
6. Apply Smart Flex when required
7. Deduplicate results
8. Sort by price
9. Keep the cheapest results

## Smart Flex

Smart Flex expands the search only when necessary.

It is triggered when:

- no suitable results are found, or
- the current price is above the configured threshold compared with the best result

The controlled flexibility currently checks:

- Departure: -1 day, return date unchanged
- Return: +1 day, departure date unchanged

This keeps the number of additional API requests under control while still allowing the application to discover cheaper alternatives.

## Live Search API

### POST `/search-stream`

The frontend starts a search with a POST request and receives results through an SSE stream.

Typical SSE events:

- `data` — successful flight result
- `fail` — individual search failure
- `end` — all searches completed

Example result:

```json
{
  "success": true,
  "data": {
    "destination": "LCA",
    "departure": "2026-10-09",
    "return": "2026-10-11",
    "price": 79601,
    "currency": "HUF",
    "bookingUrl": "https://www.google.com/travel/flights/..."
  }
}
```

## Provider Architecture

Flight data access is separated from the application logic through a provider abstraction.

Available provider implementations:

- `mock` — local development and testing
- `serpapi` — currently supported provider
- `amadeus-test` — legacy/deprecated
- `amadeus-prod` — legacy/deprecated

### Amadeus Provider Status

The Amadeus Self-Service API provider is retained in the project for architectural and testing purposes, but is currently deprecated for this application.

Access is not available to individual/private users under the current Amadeus Self-Service API offering.

**SerpApi / Google Flights is therefore the currently supported provider for real flight searches.**

The active provider can be selected through the environment configuration.

This makes it possible to switch providers without changing the main search flow.

## Caching and Rate Limiting

Redis is used for:

- API response caching
- rate limiting
- reducing unnecessary external API requests

This is especially useful when multiple generated trip combinations result in similar searches.

## Frontend

The frontend is implemented with vanilla JavaScript and provides:

- destination autocomplete
- destination selection
- configurable maximum number of destinations
- live search progress
- dynamically sorted flight results
- clickable flight cards
- light/dark theme support

Search results are inserted into the UI while the backend is still processing other search combinations.

## Tech Stack

### Backend

- Node.js
- Express
- SQLite
- Redis
- REST API
- Server-Sent Events (SSE)

### Flight APIs

- SerpApi / Google Flights
- Amadeus API (deprecated)

### Frontend

- HTML
- CSS
- Vanilla JavaScript

### Testing

- Jest
- Supertest
- Playwright / Typescript

## Configuration

Create a `.env` file and configure the flight provider:

```env
FLIGHT_PROVIDER=serpapi
```

Supported values:

```text
mock
amadeus-test (deprecated)
amadeus-prod (deprecated)
serpapi
```

API credentials and other environment-specific configuration are kept outside the source code.

## Running Locally

1. Install dependencies:

```bash
npm install
```

2. Start Redis with Docker

Make sure Docker Desktop is running, then start the Redis container:

```bash
docker compose -f docker-compose.redis.yml up -d
```

Check that the container is running:

```bash
docker ps
```

Redis should be available on the configured Redis port.

3. Configure the required environment variables in `.env`.

4. Start the application:

```bash
npm start
```

5. Then open:

```text
http://localhost:3000
```

## Testing

The project includes unit and integration tests using Jest and Supertest.

Run unit/integration tests:

```bash
npm test
```

End-to-end tests are implemented with Playwright.

Install Playwright browsers (first time only):

```bash
npx playwright install
```

Run Playwright end-to-end tests:

```bash
npm run pw:test
```

Run Playwright in headed mode:

```bash
npm run pw:headed
```

Open Playwright UI:

```bash
npm run pw:ui
```

View Playwright report:

```bash
npm run pw:report
```

## License

MIT License
