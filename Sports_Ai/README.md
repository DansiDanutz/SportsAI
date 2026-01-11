# SportsAI Platform

**Version 5.0.0 - Arbitrage Priority**

A next-generation sports intelligence platform with real-time arbitrage detection, multi-sportsbook odds comparison, AI-driven insights, and personalized recommendations across 10+ sports.

## Core Value Proposition

**Primary:** Real-time detection and delivery of sports betting arbitrage opportunities
**Secondary:** Professional odds comparison across 10+ sportsbooks with AI-driven insights

## Features

### Arbitrage Detection Engine
- Real-time arbitrage opportunity detection using mathematical formulas
- Support for 2-way, 3-way (Win/Draw/Loss), and multi-way markets
- Value scoring algorithm (profit margin, bookmaker trust, odds stability, liquidity)
- "Winning Tips" - high-confidence arbitrage opportunities (>1% profit, >0.95 confidence)
- Staking recommendations within sportsbook limits

### Odds Comparison
- Real-time odds ingestion from 10+ sportsbooks
- Best odds computation per event/market/outcome
- Support for Decimal, American, and Fractional odds formats
- Line movement tracking and historical charts
- Deep links to sportsbook betting pages

### Sports Coverage (10 Sports)
- Soccer (Football)
- Basketball
- Tennis
- Baseball
- American Football
- Ice Hockey
- Cricket
- Rugby (Union/League)
- MMA / UFC
- eSports (CS2, LoL, Dota 2, Valorant)

### Sportsbook Integrations
- Superbet
- Betano
- Unibet
- Stake
- bet365
- William Hill
- Betfair (Exchange + Sportsbook)
- Paddy Power
- Ladbrokes
- 888sport

### Monetization Model
- **Free Tier:** Basic odds comparison, arbitrage count only (no details)
- **Premium Subscription:** Full odds comparison, low-confidence arbitrage details, advanced features
- **Winning Tips (Credits):** High-confidence arbitrage opportunities unlocked with credits

## Technology Stack

### Frontend
- React Native / React (TypeScript)
- TanStack Query + Zustand (State Management)
- Tailwind CSS / NativeWind (Styling)
- Radix UI primitives (Components)
- Recharts / Victory Native (Charts)
- WebSocket + Server-Sent Events (Real-time)

### Backend
- Node.js 20+ LTS (Runtime)
- NestJS / Fastify (Framework)
- TypeScript (Language)
- REST + GraphQL hybrid (API)
- OAuth2 / JWT (Authentication)
- Zod / class-validator (Validation)

### Databases
- PostgreSQL 16 (Primary - entities, users, favorites, presets)
- Redis (Cache - hot queries, odds cache, sessions)
- TimescaleDB / ClickHouse (Time-series - odds history, line movement)
- OpenSearch / Elasticsearch (Search - teams, leagues, fuzzy matching)

### Infrastructure
- Docker + Kubernetes (Container orchestration)
- GitHub Actions (CI/CD)
- GCP / AWS (Cloud)
- CloudFlare (CDN)
- Prometheus + Grafana + Sentry (Monitoring)
- Apache Kafka / Google Pub/Sub (Event streaming)

## Quick Start

### Prerequisites
- Node.js 20+ LTS
- Docker & Docker Compose (for databases)
- npm or yarn

### Setup
```bash
# Run the setup script
./init.sh

# Or manually:
# 1. Start databases
cd docker && docker-compose up -d

# 2. Start backend
cd backend && npm install && npm run dev

# 3. Start frontend
cd frontend && npm install && npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

## Project Structure

```
Sports_Ai/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── controllers/       # API controllers
│   │   ├── services/          # Business logic
│   │   │   ├── arbitrage/     # Arbitrage detection engine
│   │   │   ├── odds/          # Odds ingestion & normalization
│   │   │   ├── credits/       # Credit management
│   │   │   ├── identity/      # Authentication
│   │   │   └── ...            # Other services
│   │   ├── models/            # Database models
│   │   ├── middlewares/       # Express middlewares
│   │   └── utils/             # Utilities
│   └── tests/                 # Backend tests
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── screens/           # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API clients
│   │   ├── store/             # State management
│   │   └── styles/            # Global styles
│   └── assets/                # Static assets
│
├── shared/                    # Shared types
├── database/                  # Migrations & seeds
├── docker/                    # Docker configuration
├── docs/                      # Documentation
│
├── app_spec.txt              # Full specification
├── features.db               # Feature tracking database
├── init.sh                   # Setup script
└── README.md                 # This file
```

## API Endpoints (v1)

### Authentication
- `POST /v1/auth/signup` - Create account
- `POST /v1/auth/login` - Obtain JWT
- `POST /v1/auth/logout` - Invalidate session
- `POST /v1/auth/refresh` - Refresh token

### Arbitrage
- `GET /v1/arbitrage/opportunities` - List opportunities (tier-filtered)
- `POST /v1/arbitrage/opportunities/{id}/unlock` - Unlock with credits
- `GET /v1/arbitrage/opportunities/{id}` - Get opportunity details

### Credits
- `GET /v1/credits/balance` - Get balance
- `POST /v1/credits/purchase` - Buy credits
- `GET /v1/credits/transactions` - Transaction history

### Events & Odds
- `GET /v1/events` - List events
- `GET /v1/events/{id}` - Event detail
- `GET /v1/odds` - Odds snapshots
- `GET /v1/odds/best` - Best odds per outcome
- `GET /v1/odds/history` - Line movement

### Users
- `GET /v1/users/me` - Current user profile
- `PATCH /v1/users/me` - Update profile
- `GET /v1/users/me/preferences` - Preferences
- `GET /v1/users/me/favorites` - Favorites
- `GET /v1/users/me/presets` - Saved filter presets

## Arbitrage Formula

```
Arbitrage % = (1 / Odds_A) + (1 / Odds_B) - 1

If result is NEGATIVE, arbitrage opportunity exists.
```

For 3-way markets (1X2):
```
Arbitrage % = (1 / Home) + (1 / Draw) + (1 / Away) - 1
```

## Confidence Score Calculation

| Factor | Weight |
|--------|--------|
| Profit Margin | 0.35 |
| Bookmaker Trust | 0.20 |
| Odds Stability | 0.20 |
| Market Liquidity | 0.15 |
| Confidence Score | 0.10 |

**Winning Tip Threshold:** Confidence > 0.95

## Credit Packages

| Credits | Price |
|---------|-------|
| 50 | $4.99 |
| 150 | $12.99 |
| 400 | $29.99 |
| 1000 | $59.99 |

## Performance SLAs

- Public API p95 latency: <300ms (cached), <800ms (uncached)
- Pre-match odds update latency: <10 seconds
- Live odds update latency: <2 seconds
- Uptime: 99.9% monthly

## Development

### Running Tests
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Linting
```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

### Type Checking
```bash
# Backend
cd backend && npm run typecheck

# Frontend
cd frontend && npm run typecheck
```

## Responsible Gambling

This platform provides analytical information only. We do not guarantee profits or "sure wins" - all predictions are probabilistic.

- Session reminders available
- Self-exclusion options
- Regional help resources linked

## License

Proprietary - All rights reserved

---

**SportsAI Platform** - Smarter Sports Intelligence
