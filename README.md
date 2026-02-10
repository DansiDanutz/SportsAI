# 🏆 SportsAI - Sports Betting Arbitrage Platform

[![Version](https://img.shields.io/badge/version-5.0.0-blue.svg)](https://github.com/Sports-AI/SportsAI)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](#)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](#) 
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](#)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)
[![Demo](https://img.shields.io/badge/demo-live-green.svg)](https://sports-ai-one.vercel.app)

> **Professional Sports Betting Arbitrage Detection Platform** - Real-time opportunity discovery across 10+ sportsbooks with guaranteed profit calculations.

---

## 🎯 What is SportsAI?

SportsAI is a **next-generation sports intelligence platform** that specializes in **real-time arbitrage detection** and professional odds comparison. Our advanced algorithms scan 10+ sportsbooks simultaneously to identify risk-free betting opportunities with guaranteed profits.

**💰 Primary Value:** Detect sports betting arbitrage opportunities in real-time  
**📊 Secondary Value:** Professional odds comparison with AI-driven insights  
**🎖️ Target Users:** Professional bettors, arbitrage traders, sports analysts

---

## 📸 Screenshots

> *Screenshots coming soon - professional interface showcasing arbitrage opportunities and odds comparison*

---

## ✨ Key Features

### 🔥 Arbitrage Detection Engine
- **Real-time detection** of arbitrage opportunities using advanced mathematical formulas
- **2-way, 3-way, and multi-way** market support (Moneyline, Spread, Totals, 1X2)
- **Value scoring algorithm** considering profit margin, bookmaker trust, odds stability
- **"Winning Tips"** - high-confidence opportunities (>1% profit, >0.95 confidence)
- **Smart staking calculator** with recommended bet amounts

### 📈 Professional Odds Comparison  
- **Real-time odds ingestion** from 10+ premium sportsbooks
- **Best odds computation** per event/market/outcome
- **Multiple formats** - Decimal, American, Fractional
- **Line movement tracking** with historical charts
- **Direct betting links** to sportsbook pages

### 🏟️ Sports Coverage (10 Sports)
- ⚽ Soccer (Football) - Premier League, Champions League, World Cup
- 🏀 Basketball - NBA, EuroLeague, NCAA
- 🎾 Tennis - ATP, WTA, Grand Slams
- ⚾ Baseball - MLB, NPB
- 🏈 American Football - NFL, NCAA
- 🏒 Ice Hockey - NHL, KHL
- 🏏 Cricket - IPL, BBL, International
- 🏉 Rugby - Union & League
- 🥊 MMA/UFC - All major promotions
- 🎮 eSports - CS2, LoL, Dota 2, Valorant

### 🏪 Supported Sportsbooks (10+)
- Superbet, Betano, Unibet, Stake
- bet365, William Hill, Betfair
- Paddy Power, Ladbrokes, 888sport
- *And more premium operators*

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 20+ LTS
- **Framework:** NestJS + Fastify  
- **Language:** TypeScript
- **API:** REST + GraphQL hybrid
- **Auth:** OAuth2 + JWT
- **Database:** PostgreSQL 16 + Redis
- **Validation:** Zod + class-validator

### Frontend  
- **Framework:** React 18
- **Language:** TypeScript
- **State:** TanStack Query + Zustand
- **Styling:** Tailwind CSS
- **Components:** Radix UI
- **Charts:** Recharts
- **Real-time:** WebSockets + SSE

### Infrastructure
- **Containers:** Docker + Kubernetes
- **CI/CD:** GitHub Actions
- **Cloud:** GCP/AWS + CloudFlare CDN
- **Monitoring:** Prometheus + Grafana + Sentry

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 20+ LTS
Docker & Docker Compose
PostgreSQL 16
Redis
```

### Installation
```bash
# Clone the repository
git clone https://github.com/Sports-AI/SportsAI.git
cd SportsAI/Sports_Ai

# Run the automated setup script
./init.sh

# Or manually:
# 1. Start databases
cd docker && docker-compose up -d

# 2. Start backend
cd backend && npm install && npm run dev

# 3. Start frontend  
cd frontend && npm install && npm run dev
```

### Access Points
```
Frontend:    http://localhost:3000
Backend API: http://localhost:4000  
API Docs:    http://localhost:4000/api/docs
Live Demo:   https://sports-ai-one.vercel.app
```

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │◄──►│   NestJS API    │◄──►│  PostgreSQL     │
│   (Frontend)    │    │   (Backend)     │    │  (Primary DB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         └──────────────►│   (Cache)       │◄─────────────┘
                        └─────────────────┘              
                                 │
                        ┌─────────────────┐
                        │  Odds Scrapers  │
                        │  (10+ Sources)  │
                        └─────────────────┘
```

---

## 📊 Arbitrage Mathematics

Our proprietary algorithms use proven mathematical formulas:

**2-Way Arbitrage Detection:**
```
Arbitrage % = (1/Odds_A) + (1/Odds_B) - 1
If result < 0: ARBITRAGE OPPORTUNITY EXISTS
```

**3-Way Arbitrage (1X2 Markets):**
```  
Arbitrage % = (1/Home) + (1/Draw) + (1/Away) - 1
If result < 0: ARBITRAGE OPPORTUNITY EXISTS
```

**Confidence Score Calculation:**
- Profit Margin (35%)
- Bookmaker Trust (20%) 
- Odds Stability (20%)
- Market Liquidity (15%)
- Time Sensitivity (10%)

---

## 💰 Monetization Model

| Plan | Features | Price |
|------|----------|-------|
| **Free** | Basic odds comparison, arbitrage count only | $0 |
| **Premium** | Full odds access, low-confidence arbitrage details | $29.99/mo |
| **Pro** | All features + high-confidence "Winning Tips" | $59.99/mo |

**Credit Packages:**
- 50 Credits: $4.99
- 150 Credits: $12.99  
- 400 Credits: $29.99
- 1000 Credits: $59.99

---

## 📖 API Documentation

### Authentication Endpoints
```
POST /v1/auth/signup     - Create account
POST /v1/auth/login      - Obtain JWT token
POST /v1/auth/logout     - Invalidate session
POST /v1/auth/refresh    - Refresh token
```

### Core Endpoints
```
GET  /v1/arbitrage/opportunities     - List arbitrage opportunities
POST /v1/arbitrage/opportunities/:id/unlock - Unlock with credits
GET  /v1/events                      - List upcoming events
GET  /v1/odds/best                   - Best odds per outcome
GET  /v1/odds/history                - Line movement data
```

**📚 Full API Documentation:** [https://sports-ai-one.vercel.app/api/docs](https://sports-ai-one.vercel.app/api/docs)

---

## 🌟 Demo

**🔗 Live Demo:** [https://sports-ai-one.vercel.app](https://sports-ai-one.vercel.app)

Experience real-time arbitrage detection and professional odds comparison in action.

---

## 📈 Performance SLAs

- **API Latency:** <300ms (cached), <800ms (uncached) 
- **Odds Updates:** <10s (pre-match), <2s (live)
- **Uptime:** 99.9% monthly SLA
- **Arbitrage Detection:** <5s from odds change

---

## 🧾 License & Pricing

**License:** Proprietary - All rights reserved  
**Commercial Product:** $399 on marketplace  
**Enterprise Licensing:** Contact for pricing

This is a **premium commercial product**. Unauthorized distribution or modification is prohibited.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Fork the repo, then:
git clone https://github.com/your-username/SportsAI.git
cd SportsAI/Sports_Ai
./init.sh
```

### Code Quality
- TypeScript strict mode
- ESLint + Prettier configured
- 90%+ test coverage required
- All PRs need approval

---

## ⚠️ Responsible Gambling

**Important:** This platform provides analytical information only. We do not guarantee profits or "sure wins" - all predictions are probabilistic.

- Built-in session reminders
- Self-exclusion options available  
- Regional gambling help resources
- Risk management tools included

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/Sports-AI/SportsAI/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Sports-AI/SportsAI/discussions)
- **Email:** support@sportsai.pro

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

<div align="center">

**🏆 SportsAI Platform - Smarter Sports Intelligence**

[![Demo](https://img.shields.io/badge/🚀-Try_Live_Demo-success?style=for-the-badge)](https://sports-ai-one.vercel.app)

*Professional sports betting arbitrage detection for serious traders.*

</div>