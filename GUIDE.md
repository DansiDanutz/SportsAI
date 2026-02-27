# SportsAI - Complete Setup Guide

> Version: 5.0.0 | Last Updated: 2026-02-17

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Quick Start](#quick-start)
6. [API Reference](#api-reference)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

SportsAI is a professional sports betting arbitrage detection platform that scans 10+ sportsbooks in real-time to identify risk-free betting opportunities. Advanced algorithms calculate guaranteed profits and provide winning tips with high confidence scores.

**Key Features:**
- Real-time arbitrage detection
- 10+ sportsbook integration
- AI-powered predictions
- Professional odds comparison
- Value scoring algorithm
- Winning tips system

---

## Prerequisites

- **Node.js 20+ LTS**
- **npm or yarn**
- **PostgreSQL 16**
- **Redis**
- **OpenRouter API Key** (for AI features)
- **TheOdds API Key** (for odds data)

---

## Installation

### Step 1: Clone Repository

```bash
cd /home/Memo1981/SportsAI/Sports_Ai
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
cd backend
cp .env.example .env
nano .env
```

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sportsai
REDIS_URL=redis://localhost:6379

# API Keys
OPENROUTER_API_KEY=your-key
ODDS_API_KEY=your-key

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=4000
```

### Step 4: Initialize Database

```bash
npm run db:migrate
npm run db:seed
```

### Step 5: Start Services

```bash
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm run dev
```

---

## Quick Start

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs
- Live Demo: https://sports-ai-one.vercel.app

### Check Arbitrage Opportunities

```bash
curl http://localhost:4000/v1/arbitrage/opportunities
```

**Response:**
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

## API Reference

### Authentication

```bash
# Signup
curl -X POST "http://localhost:4000/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass"}'

# Login
curl -X POST "http://localhost:4000/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass"}'
```

### Arbitrage

```bash
# List opportunities
GET /v1/arbitrage/opportunities

# Unlock opportunity (requires credits)
POST /v1/arbitrage/opportunities/:id/unlock

# Get "Winning Tips"
GET /v1/arbitrage/winning-tips
```

### Odds

```bash
# Best odds per event
GET /v1/odds/best

# Odds history
GET /v1/odds/history

# Live odds
GET /v1/odds/live
```

---

## Usage Examples

### Example 1: Find High-Value Arbitrage

```bash
curl "http://localhost:4000/v1/arbitrage/opportunities?min_profit=2&min_confidence=0.95" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 2: Get Best Odds for Event

```bash
curl "http://localhost:4000/v1/odds/best?event_id=12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 3: Unlock Winning Tip

```bash
curl -X POST "http://localhost:4000/v1/arbitrage/opportunities/arb_123/unlock" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"use_credits": true}'
```

---

## Arbitrage Mathematics

### 2-Way Arbitrage

```
Arbitrage % = (1/Odds_A) + (1/Odds_B) - 1

If result < 0: ARBITRAGE OPPORTUNITY

Example:
Odds_A = 2.10 (home team)
Odds_B = 1.95 (away team)

Arbitrage % = (1/2.10) + (1/1.95) - 1
           = 0.476 + 0.513 - 1
           = -0.011 or -1.1%

GUARANTEED PROFIT: 1.1%
```

### 3-Way Arbitrage (1X2)

```
Arbitrage % = (1/Home) + (1/Draw) + (1/Away) - 1

If result < 0: ARBITRAGE OPPORTUNITY
```

### Confidence Score

Factors:
- Profit Margin (35%)
- Bookmaker Trust (20%)
- Odds Stability (20%)
- Market Liquidity (15%)
- Time Sensitivity (10%)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection failed | Check PostgreSQL is running |
| Odds not updating | Verify ODDS_API_KEY |
| AI predictions not working | Check OPENROUTER_API_KEY |
| Frontend build fails | Clear node_modules and reinstall |
| Port in use | Change PORT in .env |

---

## Advanced Features

### Docker Deployment

```bash
docker-compose up -d
```

### Custom Scrapers

Add new sportsbook scrapers in `backend/src/scrapers/`.

### AI Model Configuration

```env
# In backend/.env
AI_MODEL=zai/glm-4.7
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=1000
```

---

**Happy arbitrage hunting! 🏆**

---

<div align="center">

**SportsAI Platform** - Smarter Sports Intelligence

© 2026 MyWork-AI Marketplace | All rights reserved

</div>
