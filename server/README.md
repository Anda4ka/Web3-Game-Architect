# Frost Rush Backend

Validation and signing service for the Frost Rush game.

## Tech Stack
- **Runtime:** Node.js 20+
- **Framework:** Fastify
- **Web3:** ethers.js v6
- **Language:** TypeScript

## Setup
1. `cd frost-rush/server`
2. `npm install`
3. `cp .env.example .env` (and fill in the details)
4. `npm run dev`

## API Endpoints

### `POST /api/runs/submit`
Validates game logs and returns a signature for claiming $FROST.
**Body:**
```json
{
  "walletAddress": "0x...",
  "runId": 123,
  "runLogs": {
    "score": 5000,
    "crystals": 50,
    "durationMs": 60000,
    "telemetry": [...]
  }
}
```

### `POST /api/badges/authorize`
Checks if player is eligible for a season badge.
**Body:**
```json
{
  "walletAddress": "0x...",
  "seasonId": 1,
  "score": 12000
}
```

### `POST /api/tournament/resolve`
Signs tournament match results.
**Body:**
```json
{
  "matchId": 0,
  "score1": 1500,
  "score2": 1200
}
```
