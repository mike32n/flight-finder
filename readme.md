# ✈️ Flight Finder

Simple tool for finding cheap flights for short trips (e.g. weekend getaways).

## Features

- Multi-destination search
- Date generation (weekday + nights)
- Smart Flex (controlled ±1 day)
- Top 5 cheapest results
- Streaming results (live UI updates)
- Partial failure handling

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
- Redis (cache + rate limit)
- Vanilla JS frontend

## Config (.env)

FLIGHT_PROVIDER=mock | amadeus-test | amadeus-prod

## Limitations

- fixed origin (BUD)
- no database
- no authentication

## Run

- npm install
- npm start

## License

MIT License
