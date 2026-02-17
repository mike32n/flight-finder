# ✈️ Flight Finder Backend

Node.js backend service for searching flight offers across multiple destinations and date combinations using a pluggable provider architecture.

---

## 🚀 Current Status

✅ Amadeus TEST environment supported  
✅ Amadeus PRODUCTION environment supported  
✅ Mock provider supported  
✅ Concurrency control per provider  
✅ Partial failure handling  
✅ Rate-limit aware architecture  
✅ Environment-based provider switching  

---

## 🏗 Architecture Overview

The backend uses a **provider abstraction layer**, allowing different flight data sources to be plugged in without modifying business logic.

### Supported Providers

| Provider Key     | Description |
|------------------|------------|
| `mock`           | Local mock data for development |
| `amadeus-test`   | Amadeus Sandbox API |
| `amadeus-prod`   | Amadeus Production API |

The active provider is selected via environment variable:

```
FLIGHT_PROVIDER=amadeus-prod
```

---

## ⚙️ Tech Stack

- Node.js
- Express
- Amadeus Node SDK
- Custom Promise Pool (Concurrency limiter)
- dotenv

---

## 📦 Installation

```bash
npm install
```

---

## ▶️ Running the Server

```bash
npm start
```

Server runs on:

```
http://localhost:3000
```

---

## 🔐 Environment Configuration

Create a `.env` file in the project root:

```env
PORT=3000
FLIGHT_PROVIDER=amadeus-prod

# Amadeus Test
AMADEUS_TEST_CLIENT_ID=your_test_client_id
AMADEUS_TEST_CLIENT_SECRET=your_test_client_secret

# Amadeus Production
AMADEUS_PROD_CLIENT_ID=your_prod_client_id
AMADEUS_PROD_CLIENT_SECRET=your_prod_client_secret
```

---

## 🌍 Amadeus Configuration Details

The system automatically maps environment mode to the correct API hostname:

| Mode             | Hostname value | API Endpoint |
|------------------|---------------|-------------|
| `amadeus-test`   | `test`        | https://test.api.amadeus.com |
| `amadeus-prod`   | `production`  | https://api.amadeus.com |

⚠️ Important:  
The Amadeus SDK expects `hostname` to be either:

```
"test"
"production"
```

Using `"api"` will cause:

```
host: null
NetworkError
```

---

## 🔄 Concurrency Control

Each provider defines its own concurrency limit:

```js
concurrencyLimit: 1   // test (safe mode)
concurrencyLimit: 5   // production
```

This prevents:

- API rate limit violations
- Burst request overload
- Resource exhaustion

---

## 🧪 Example Request Flow

1. Frontend sends multiple route/date combinations
2. Backend:
   - Creates tasks per combination
   - Runs them via Promise Pool
   - Collects results
   - Returns aggregated response
3. Partial failures do NOT crash the request

Example result structure:

```json
[
  { "success": true, "data": {...} },
  { "success": false }
]
```

---

## 🛠 Troubleshooting

### 401 Unauthorized

Check:

- Correct CLIENT_ID / CLIENT_SECRET
- Using correct provider (`amadeus-test` vs `amadeus-prod`)
- Production credentials are approved

---

### NetworkError / host: null

Cause:
```
hostname: "api"
```

Fix:
```
hostname: "production"
```

The SDK only accepts:
- `"test"`
- `"production"`

---

### Frontend shows "Error occurred"

Check backend logs for:

- Amadeus error codes
- Token fetch failures
- Rate limit errors

---

## 📁 Project Structure (Simplified)

```
/config
  providers.js

/providers
  AmadeusProvider.js
  MockProvider.js

/routes
  searchRoutes.js

app.js
server.js
```

---

## 🎯 Design Goals

- Provider-agnostic architecture
- Easy expansion to Skyscanner / Kiwi / other APIs
- Production-ready concurrency handling
- Clean separation of config and business logic
- Environment-driven deployment

---

## 🔮 Possible Next Steps

- Caching layer (Redis)
- Request deduplication
- Price tracking
- Multi-provider aggregation
- Observability (Winston / structured logging)
- Docker support
- CI pipeline

---

## 📄 License

MIT
