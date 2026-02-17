# Flight Finder Backend

Node.js backend service for searching flight offers across multiple destinations and date combinations using a pluggable provider architecture (Mock / Amadeus Test / Amadeus Production).

## Features

🔁 Concurrency control (rate-limit aware)

🧩 Provider abstraction layer

🧪 Mock provider for local testing

🌍 Amadeus Test & Production support

⚠️ Partial failure handling

🧵 Custom Promise Pool implementation

## Architecture

The backend uses a provider-based architecture:

Frontend → /search → Provider → External API


### Supported providers:

mock

amadeus-test

amadeus-prod

### Active provider is selected via environment variable:

ACTIVE_PROVIDER=amadeus-prod

## Tech Stack
- Node.js
- Express
- Amadeus Node SDK
- Custom Promise Pool (concurrency limiter)
- dotenv

## Installation
```bash
npm install
npm start
```

Server runs at:

http://localhost:3000

## Environment Configuration

Create a .env file in the root:

PORT=3000

ACTIVE_PROVIDER=amadeus-prod

### Test credentials
AMADEUS_TEST_CLIENT_ID=your_test_id
AMADEUS_TEST_CLIENT_SECRET=your_test_secret

### Production credentials
AMADEUS_PROD_CLIENT_ID=your_prod_id
AMADEUS_PROD_CLIENT_SECRET=your_prod_secret

## Amadeus Configuration

The SDK requires the correct hostname mapping:

Mode	hostname value	API URL
Test	test	https://test.api.amadeus.com

Production	production	https://api.amadeus.com

## Concurrency Control

Each provider defines its own concurrency limit:

concurrencyLimit: 5


This protects against:

API rate limits

Burst request overload

Token flooding

The Promise Pool ensures:

Controlled parallelism

Partial failure resilience

All requests resolved before response aggregation

## Example Search Flow

Frontend sends multiple route/date combinations

Backend distributes requests through Promise Pool

Provider executes API calls

Results are aggregated

Partial failures are preserved

Response structure:

[
  { "success": true, "data": {...} },
  { "success": false }
]

## Mock Mode

For local testing without API calls:

ACTIVE_PROVIDER=mock


No external requests are made.

## Troubleshooting
❌ 401 Unauthorized

Check client ID / secret

Verify you are using the correct credentials for the selected environment

Confirm production access is enabled in Amadeus dashboard

❌ NetworkError / host: null

#### Cause:
Invalid hostname value.

#### Fix:
Use only:

hostname: "test"
hostname: "production"


#### Never:

hostname: "api"

❌ Frontend shows "Error occurred"

#### Check backend logs for:

Token request failure

Missing environment variables

Provider mismatch

## Current Status

✅ Mock provider working

✅ Amadeus Test working

✅ Amadeus Production working

✅ OAuth2 token handling verified

✅ Provider switching via env working

🔜 Next: caching layer / pricing normalization
