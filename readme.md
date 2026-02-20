# ✈️ Flight Finder

A lightweight flight search backend with provider abstraction, concurrency control, and upcoming caching + rate limiting support.

---

## 🚀 Features

* Provider abstraction layer (mock + Amadeus)
* Concurrent request handling (custom Promise Pool)
* Testable architecture (Jest + Supertest)
* Partial failure handling (fail-soft design)
* Environment-based provider switching
* Redis-ready (caching + rate limiting planned)

---

## 🏗 Architecture

```
config/
  providers.js

providers/
  AmadeusProvider.js
  MockProvider.js

routes/
  searchRoutes.js

services/
  flightService.js
  cacheService.js        # (WIP)
  rateLimitService.js    # (WIP)

utils/
  promisePool.js

app.js
server.js
```

---

## 🔌 Supported Providers

| Provider     | Description        | Hostname   |
| ------------ | ------------------ | ---------- |
| mock         | Local testing      | -          |
| amadeus-test | Amadeus sandbox    | test       |
| amadeus-prod | Amadeus production | production |

**Important:**
Hostname must be `"test"` or `"production"` — never `"api"`.

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

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

---

## ▶️ Getting Started

### Install dependencies

```
npm install
```

### Start Redis (Docker)

```
docker run -d -p 6379:6379 redis
```

### Run the server

```
npm start
```

Server runs on:
[http://localhost:3000](http://localhost:3000)

---

## 🔍 API Usage

### POST `/search`

#### Request

```json
{
  "destinations": ["BCN", "ROM"],
  "weekday": 2,
  "nights": 3
}
```

#### Response

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

* Partial failures are allowed
* Each provider response is independent

---

## ⚡ Concurrency Control

* Custom Promise Pool
* Prevents API overuse
* Supports provider-level limits

---

## 🧠 Caching (WIP)

Planned Redis-based caching:

* Key: hashed request parameters
* TTL-based expiration
* Reduces API calls and latency

---

## 🚧 Rate Limiting (WIP)

Planned Redis-based protection:

* Per IP or request fingerprint
* Configurable window and limits
* Prevents abuse and throttling issues

---

## 🧪 Testing

Run tests:

```
npm test
```

### Current coverage

* Route validation
* Basic service logic

### Planned

* Cache layer tests
* Rate limiting tests
* Provider mocking
* Error handling scenarios

---

## 🎨 Frontend (Experimental)

* Dark / Light mode support
* Mobile UX improvements in progress
* Keyboard navigation for dropdown

---

## 📌 Design Principles

* Provider-agnostic architecture
* Fail-soft behavior (no global crashes)
* Scalable foundation (Redis-ready)
* Minimal dependencies
* Clean modular structure

---

## 🚀 Roadmap

### High Priority

* Redis caching integration
* Rate limiting stabilization
* Test coverage expansion

### Backend

* Retry logic for providers
* Structured logging
* Request fingerprinting

### Frontend

* Mobile UX polish
* Loading states / skeletons
* Accessibility improvements

### Future

* Multi-provider aggregation
* Cheapest flight ranking
* Database integration
* User preferences / alerts

---

## 🧑‍💻 Author

Flight Finder backend prototype.

---

## 📄 License

MIT
