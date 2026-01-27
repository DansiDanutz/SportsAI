# SportsAI - Sports Betting Arbitrage Platform

Real-time detection and delivery of sports betting arbitrage opportunities across 10+ sportsbooks.

## What You Get

A production-ready sports intelligence platform with:

- **Real-time Arbitrage Detection** - Mathematical detection of guaranteed profit opportunities
- **Multi-Sportsbook Odds Comparison** - Live odds from 10+ bookmakers
- **AI-Driven Insights** - Intelligent recommendations and predictions
- **Credit System** - Built-in monetization for premium "Winning Tips"
- **Mobile-Ready** - React Native frontend works on web and mobile

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native, TypeScript, TanStack Query, Tailwind CSS |
| Backend | Node.js, NestJS/Fastify, TypeScript |
| Database | PostgreSQL, Redis |
| APIs | The Odds API, API-Sports, TheSportsDB, OpenRouter AI |
| Deployment | Vercel (frontend), Render (backend) |

## Live Demo

- **Frontend**: https://sports-ai-one.vercel.app
- **Backend API**: https://sportsapiai.onrender.com
- **API Docs**: https://sportsapiai.onrender.com/api/docs

## Features (415/417 Passing - 99.5%)

### Core Features

- User authentication (OAuth2/JWT)
- Real-time arbitrage detection engine
- Multi-sportsbook odds comparison
- Line movement tracking
- AI-powered predictions and insights
- Credit-based "Winning Tips" system
- Personalized recommendations
- 10+ sports coverage

### Arbitrage Detection

The core algorithm detects guaranteed profit opportunities:

```
Arbitrage % = (1 / Odds_A) + (1 / Odds_B) - 1
If result is NEGATIVE = Guaranteed profit opportunity
```

Supports:
- 2-way markets (Win/Lose)
- 3-way markets (Win/Draw/Lose)
- Multi-way markets

### Value Scoring

Each opportunity is scored on:
- Profit margin (35%)
- Bookmaker trust (20%)
- Odds stability (20%)
- Market liquidity (15%)
- Confidence score (10%)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/DansiDanutz/SportsAI.git
cd SportsAI/Sports_Ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your API keys

# Run database migrations
npm run db:migrate

# Start development
npm run dev
```

### Required API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| The Odds API | Live odds data | https://the-odds-api.com |
| API-Sports | Sports fixtures | https://api-sports.io |
| TheSportsDB | Team logos/images | https://thesportsdb.com |
| OpenRouter | AI insights | https://openrouter.ai |

### Environment Variables

See `.env.example` for full list. Required:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
THE_ODDS_API_KEY=xxx
API_SPORTS_KEY=xxx
THE_SPORTS_DB_KEY=xxx
OPENROUTER_API_KEY=xxx
```

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

Set `VITE_API_URL` to your backend URL.

### Backend (Render)

1. Create Web Service on Render
2. Connect GitHub repo
3. Set environment variables
4. Deploy

## Project Structure

```
Sports_Ai/
├── backend/           # NestJS/Fastify API
│   ├── src/
│   │   ├── modules/   # Feature modules
│   │   ├── services/  # Business logic
│   │   └── utils/     # Helpers
│   └── prisma/        # Database schema
├── frontend/          # React Native app
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── hooks/
│   │   └── services/
│   └── public/
├── docker/            # Container configs
└── prompts/           # AI generation specs
```

## Support

- GitHub Issues: https://github.com/DansiDanutz/SportsAI/issues
- Email: support@mywork.ai

## License

MIT License - See LICENSE file

---

**Built with the MyWork Framework**
