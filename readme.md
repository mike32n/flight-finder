# ✈️ Flight Finder

Flight Finder is a lightweight backend service for searching flights using pluggable providers.  
It is designed to be simple, modular, and easy to extend.

---

## Features

- Provider abstraction (Mock + Amadeus)
- Environment-based provider switching
- Concurrency control
- Redis-ready (caching & rate limiting support)
- Fully testable architecture (Jest + Supertest)

---

## Requirements

- Node.js 18+
- npm
- (Optional) Docker for Redis

---

## Environment Configuration

Create a `.env` file in the project root with the following structure:

```
FLIGHT_PROVIDER=

AMADEUS_TEST_CLIENT_ID=
AMADEUS_TEST_CLIENT_SECRET=

AMADEUS_PROD_CLIENT_ID=
AMADEUS_PROD_CLIENT_SECRET=

REDIS_HOST=
REDIS_PORT=
CACHE_TTL=

AMADEUS_RATE_LIMIT=
AMADEUS_RATE_WINDOW=
```

### Description

- `FLIGHT_PROVIDER` — `mock` or `amadeus`
- `CACHE_TTL` — Cache duration in seconds
- `AMADEUS_RATE_LIMIT` — Max allowed requests per window
- `AMADEUS_RATE_WINDOW` — Rate limit window in seconds

---

## Installation

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

The API will run on:

```
http://localhost:3000
```

---

## Running Redis (Optional)

You can run Redis using Docker:

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

Or use the included docker-compose configuration:

### `docker-compose.redis.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: flightfinder-redis
    ports:
      - "6379:6379"
    restart: unless-stopped
```

Run with:

```bash
docker compose -f docker-compose.redis.yml up -d
```

---

## API

### POST `/search`

Search for flights.

### Request Example

```json
{
  "destinations": ["BCN", "ROM"],
  "weekday": 2,
  "nights": 3
}
```

### Response Example

```json
[
  {
    "success": true,
    "data": {}
  },
  {
    "success": false,
    "error": "Provider error"
  }
]
```

Each provider call is handled independently. Partial failures are allowed.

---

## Testing

Run tests:

```bash
npm test
```

---

## Project Status

Current state:

- Core flight search endpoint implemented
- Provider abstraction working
- Redis support configurable via environment
- Rate limiting configuration prepared

---

## License

MIT License
