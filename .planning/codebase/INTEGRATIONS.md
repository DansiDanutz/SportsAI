# External Integrations

**Analysis Date:** 2024-01-22

## APIs & External Services

**Sports Data APIs:**
- The Odds API - Sports betting odds and data
  - SDK: Custom axios client in `Sports_Ai/backend/src/integrations/the-odds-api.service.ts`
  - Auth: `THE_ODDS_API_KEY` environment variable
- API Sports - Sports data and statistics
  - SDK: Custom service in `Sports_Ai/backend/src/integrations/api-sports.service.ts`
  - Auth: `API_SPORTS_KEY` environment variable
- The Sports DB - Sports information and data
  - SDK: Custom service in `Sports_Ai/backend/src/integrations/the-sports-db.service.ts`
  - Auth: `THE_SPORTS_DB_KEY` environment variable
- SportMonks - Comprehensive sports data
  - SDK: Custom service in `Sports_Ai/backend/src/integrations/sportmonks.service.ts`
  - Auth: `SPORTMONKS_KEY` environment variable

**News APIs:**
- News API - Sports news and updates
  - SDK: Custom service in `Sports_Ai/backend/src/integrations/news.service.ts`
  - Auth: `NEWS_API_KEY` environment variable

**Web Scraping Services:**
- Apify - Web scraping platform for odds and sports data
  - SDK: Custom service in `Sports_Ai/backend/src/apify/apify.service.ts`
  - Auth: `APIFY_API_TOKEN` environment variable
  - Actors: odds-api, sofascore, predictions, flashscore
- Playwright - Browser automation for data collection
  - SDK: Playwright npm package
  - Used for: Flashscore scraper as fallback

## Data Storage

**Databases:**
- PostgreSQL 16 - Primary relational database
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM
  - Purpose: User data, sports data, odds, arbitrage opportunities
- TimescaleDB - Time-series database (optional)
  - Connection: `timescaledb` service in docker-compose.yml
  - Purpose: Historical odds and time-series data
- Redis 7 - Caching and session management
  - Connection: `REDIS_URL` environment variable
  - Client: ioredis
  - Purpose: API response caching, session storage

**File Storage:**
- Local filesystem - Profile picture uploads
- Google Cloud Storage (potential future implementation)

**Caching:**
- Redis - Primary caching layer for API responses and session data
- Application-level caching in services

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
- OAuth with Google (user management)
  - Implementation: Google OAuth flow in auth module
- Two-Factor Authentication (TOTP)
  - Implementation: otplib for 2FA codes
  - Backup codes for account recovery

**Session Management:**
- JWT tokens for API authentication
- Refresh tokens for session continuity
- Device session tracking
  - Implementation: `DeviceSession` model in Prisma schema

## Monitoring & Observability

**Error Tracking:**
- Not currently implemented (potential integration area)

**Logs:**
- Console logging for development
- Structured logging in production (planned)

**Health Checks:**
- Health endpoint in backend (`/health`)
- Docker health checks for services

## CI/CD & Deployment

**Hosting:**
- Render - Backend API hosting
- Vercel - Frontend hosting
- Docker - Containerized deployment

**CI Pipeline:**
- GitHub Actions (potential implementation)
- Automated testing and deployment

## Environment Configuration

**Required env vars:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Frontend URL for CORS
- `LLM_PROVIDER` - LLM service provider (auto/zai/claude)
- `ZAI_API_KEY` - Z.AI API key
- `ZAI_MODEL` - Z.AI model to use
- `ZAI_API_URL` - Z.AI API endpoint
- `THE_ODDS_API_KEY` - The Odds API key
- `APIFY_API_TOKEN` - Apify API token
- `OPENROUTER_API_KEY` - OpenRouter API key (optional)

**Secrets location:**
- Local development: .env files
- Production: Render/Vercel environment variables
- Docker: Environment variables in docker-compose.yml

## Webhooks & Callbacks

**Incoming:**
- Not currently implemented

**Outgoing:**
- Not currently implemented

---

*Integration audit: 2024-01-22*