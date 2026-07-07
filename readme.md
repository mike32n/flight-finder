# ✈️ Flight Finder

Simple tool for finding cheap flights for short trips (e.g. weekend getaways).

## Features

- Multi-destination search
- Date generation (weekday + nights)
- Smart Flex (controlled ±1 day)
- Top 5 cheapest results
- Streaming results (live UI updates)
- Partial failure handling
- Playwright end-to-end test automation

## Flow

- generate trips
- build task list
- run with Promise Pool (concurrency limit)
- stream results (SSE)
- deduplicate
- sort by price
- keep top 5

## API

POST /search-stream

SSE events:

- data → flight data
- fail → failed request
- end → finished

## Stack

- Node.js + Express
- Amadeus API
- SerpApi
- Redis (cache + rate limit)
- Vanilla JS frontend
- Jest + Supertest
- Playwright

## Config (.env)

FLIGHT_PROVIDER=mock | amadeus-test | amadeus-prod | serpapi

## Limitations

- fixed origin (BUD)
- no database
- no authentication

## Run

- npm install
- npm start

## Testing

Run unit/integration tests:

- npm test

Install Playwright browsers (first time only):

- npx playwright install

Run Playwright end-to-end tests:

- npm run pw:test

Run Playwright in headed mode:

- npm run pw:headed

Open Playwright UI:

- npm run pw:ui

View Playwright report:

- npm run pw:report

## License

MIT License
