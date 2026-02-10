# 🏆 SportsAI Platform - Application Directory

**Version 5.0.0 - Arbitrage Priority**

This directory contains the main SportsAI application - a next-generation sports intelligence platform with real-time arbitrage detection, multi-sportsbook odds comparison, AI-driven insights, and personalized recommendations across 10+ sports.

## 📁 Directory Overview

This `/Sports_Ai/` directory contains the **complete application** including:
- **Backend:** NestJS API server with arbitrage detection engine
- **Frontend:** React web application with real-time odds display  
- **Database:** PostgreSQL schema and migrations
- **Docker:** Container configuration for local development
- **Documentation:** Setup guides and API documentation

## 🚀 Quick Setup Guide

### Prerequisites
```bash
Node.js 20+ LTS          # Download from nodejs.org
Docker & Docker Compose  # For databases
PostgreSQL 16           # Primary database  
Redis                   # Caching layer
Git                     # Version control
```

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

## 🔧 Complete Installation Guide

### Step 1: Clone and Navigate
```bash
# If you haven't already cloned the main repo:
git clone https://github.com/Sports-AI/SportsAI.git
cd SportsAI/Sports_Ai
```

### Step 2: Environment Configuration  
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration:
# - Database credentials
# - JWT secrets  
# - Sportsbook API keys
# - Redis connection
```

### Step 3: Database Setup
```bash
# Start PostgreSQL and Redis via Docker
cd docker
docker-compose up -d

# Wait for databases to be ready (30-60 seconds)
docker-compose logs -f postgres redis
```

### Step 4: Backend Setup
```bash
# Navigate to backend directory
cd ../backend

# Install dependencies
npm install

# Generate Prisma client and push schema
npm run db:generate
npm run db:push

# Optional: Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

### Step 5: Frontend Setup  
```bash
# Open new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Step 6: Verify Installation
```bash
# Check backend health
curl http://localhost:4000/health

# Check frontend access
open http://localhost:3000
```

## 🌐 Access Points
- **Frontend App:** http://localhost:3000
- **Backend API:** http://localhost:4000  
- **API Documentation:** http://localhost:4000/api/docs
- **Database Admin:** http://localhost:5432 (via pgAdmin)
- **Redis CLI:** `docker exec -it redis redis-cli`

## ⚡ Quick Start (Automated)
```bash
# Run the automated setup script
./init.sh

# This script will:
# 1. Check prerequisites
# 2. Start Docker services  
# 3. Install all dependencies
# 4. Set up databases
# 5. Start both backend and frontend
```

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

## 🛠️ Development Workflow

### Running Tests
```bash
# Backend tests (unit + integration)
cd backend
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# Frontend tests  
cd frontend
npm test                    # Run tests
npm run test:coverage       # With coverage
```

### Code Quality
```bash
# Linting
cd backend && npm run lint           # Check backend
cd frontend && npm run lint          # Check frontend
npm run lint:fix                     # Auto-fix issues

# Type checking
cd backend && npm run typecheck      # TypeScript validation
cd frontend && npm run typecheck     # Frontend types
```

### Database Management
```bash
# Prisma commands
npm run db:migrate          # Create new migration  
npm run db:generate         # Regenerate client
npm run db:push             # Push schema to DB
npm run db:seed             # Populate with sample data

# Manual database access
docker exec -it postgres psql -U sportsai -d sportsai_db
```

### Building for Production
```bash
# Backend build
cd backend
npm run build               # Compile TypeScript
npm start                   # Run production build

# Frontend build  
cd frontend
npm run build               # Build static assets
npm run preview             # Preview build locally
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database services
cd docker && docker-compose restart postgres redis

# Verify connection string in .env file
```

**Port Already in Use:**
```bash
# Check what's using the port
lsof -i :3000  # Frontend port
lsof -i :4000  # Backend port  

# Kill the process
kill -9 <PID>
```

**Prisma Client Issues:**
```bash
# Regenerate Prisma client
cd backend
npm run db:generate
rm -rf node_modules/.prisma
npm install
```

**Node Version Issues:**
```bash
# Use Node Version Manager
nvm install 20
nvm use 20
node --version  # Should be 20.x.x
```

**Build Errors:**
```bash
# Clear all caches
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/dist
npm install  # In both directories
```

## 📊 Performance Monitoring

### Development Metrics
```bash
# Backend performance  
curl http://localhost:4000/metrics    # Prometheus metrics

# Database performance
docker exec postgres pg_stat_activity

# Redis monitoring
docker exec redis redis-cli monitor
```

### Logging
```bash
# Backend logs
cd backend && npm run dev | bunyan    # Formatted logs

# Frontend logs  
# Check browser DevTools console

# Database logs
docker logs postgres
docker logs redis
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
