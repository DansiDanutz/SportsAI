# SportsAI Platform
## Complete User Guide

---

<div align="center">

**Version 5.0.0** | February 2026

Professional Sports Betting Arbitrage Detection

</div>

---

## Table of Contents

| Section | Page |
|---------|------|
| 1. Introduction | 3 |
| 2. System Requirements | 4 |
| 3. Installation | 5 |
| 4. Configuration | 7 |
| 5. API Reference | 10 |
| 6. Usage Examples | 18 |
| 7. Arbitrage Mathematics | 22 |
| 8. Troubleshooting | 26 |

---

## 1. Introduction

SportsAI is a professional sports betting arbitrage detection platform that scans 10+ sportsbooks in real-time to identify risk-free betting opportunities.

### Key Features

- Real-time arbitrage detection
- 10+ sportsbook integration
- AI-powered predictions
- Professional odds comparison
- Value scoring algorithm
- "Winning Tips" system

### Sports Coverage

- ⚽ Soccer
- 🏀 Basketball
- 🎾 Tennis
- ⚾ Baseball
- 🏈 American Football
- 🏒 Ice Hockey
- 🏏 Cricket
- 🏉 Rugby
- 🥊 MMA/UFC
- 🎮 eSports

---

## 2. System Requirements

| Component | Minimum |
|-----------|---------|
| Node.js | 20+ LTS |
| PostgreSQL | 16 |
| Redis | 6+ |
| RAM | 4GB |
| Disk | 10GB |

---

## 3. Installation

```bash
cd /home/Memo1981/SportsAI/Sports_Ai

# Install dependencies
npm install

# Configure environment
cd backend
cp .env.example .env
nano .env

# Initialize database
npm run db:migrate
npm run db:seed

# Start services
cd backend && npm run dev
cd frontend && npm run dev
```

---

## 4. Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sportsai
REDIS_URL=redis://localhost:6379

# API Keys
OPENROUTER_API_KEY=your-key
ODDS_API_KEY=your-key

# JWT
JWT_SECRET=your-secret-key
```

---

## 5. API Reference

### POST /v1/auth/signup

```bash
curl -X POST "http://localhost:4000/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass"}'
```

### GET /v1/arbitrage/opportunities

```bash
curl "http://localhost:4000/v1/arbitrage/opportunities" \
  -H "Authorization: Bearer TOKEN"
```

Response:
```json
{
  "opportunities": [
    {
      "id": "arb_123",
      "sport": "basketball",
      "event": "Lakers vs Celtics",
      "profit_percentage": 2.3,
      "confidence": 0.97,
      "bookmakers": ["bet365", "stake"],
      "best_odds": {
        "home": 2.10,
        "away": 1.95
      }
    }
  ]
}
```

---

## 7. Arbitrage Mathematics

### 2-Way Formula

```
Arbitrage % = (1/Odds_A) + (1/Odds_B) - 1

If result < 0: GUARANTEED PROFIT
```

### Example

```
Odds_A = 2.10, Odds_B = 1.95

Arbitrage % = (1/2.10) + (1/1.95) - 1
           = 0.476 + 0.513 - 1
           = -0.011 = -1.1%

PROFIT: 1.1% guaranteed
```

---

<div align="center">

© 2026 MyWork-AI Marketplace

</div>
