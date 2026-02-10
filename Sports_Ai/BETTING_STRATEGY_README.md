# Professional Betting Strategy & $10K Portfolio Tracker

## Overview

This system implements a professional betting strategy engine with **$10,000 USD starting capital** that analyzes real sports events, generates picks with proper money management, tracks results, and builds verifiable performance history starting from February 10, 2026.

## 💰 **PROFESSIONAL MONEY MANAGEMENT**
- **Starting Bankroll**: $10,000 USD
- **Stake Sizes**: 1-5% of current bankroll (max $500 per bet)
- **Risk Management**: Never risk more than 5% on a single pick
- **Conservative Approach**: Percentage-based sizing with bankroll protection

## System Components

### 1. Strategy Service (`backend/src/strategy/strategy.service.ts`)

The core strategy engine that:
- Fetches real sports events from TheSportsDB API
- Implements multiple betting strategies:
  - **Home Favorite Analysis**: Strong home teams in top leagues (win rate >60%)
  - **Over/Under Analysis**: Based on league goal/point averages 
  - **Value Betting**: When odds are higher than implied probability
  - **Arbitrage Detection**: Framework ready for guaranteed profit opportunities

### 2. History Service (`backend/src/strategy/history.service.ts`)

Manages the betting history with features:
- Stores all picks in JSON format (`data/betting_history.json`)
- Tracks pick outcomes (pending/won/lost/void)
- Calculates profit/loss for each pick
- Provides pagination and filtering
- Generates performance statistics

### 3. Strategy Controller (`backend/src/strategy/strategy.controller.ts`)

RESTful API endpoints:
- `GET /api/strategy/today` - Today's betting picks
- `GET /api/strategy/history` - All past picks with W/L record
- `GET /api/strategy/performance` - Win rate, ROI, streak, profit stats
- `GET /api/strategy/upcoming` - Picks for next 7 days
- `POST /api/strategy/resolve/:id` - Mark pick as won/lost
- `GET /api/strategy/arbitrage` - Arbitrage opportunities
- `GET /api/strategy/stats` - Detailed statistics breakdown
- `POST /api/strategy/generate-picks` - Force generate new picks

## Data Structure

Each betting pick contains real dollar amounts:
```json
{
  "id": "uuid",
  "date": "2026-02-10",
  "event": "Arsenal vs Chelsea",
  "league": "English Premier League",
  "pick": "Arsenal Win",
  "odds": 1.85,
  "confidence": 8,
  "stake_amount_usd": 400,
  "stake_percentage": 4,
  "strategy": "home_favorite",
  "status": "pending|won|lost|void",
  "result": null,
  "profit_loss_usd": null,
  "created_at": "ISO timestamp",
  "home_team": "Arsenal",
  "away_team": "Chelsea",
  "match_time": "15:00:00"
}
```

## Strategy Rules & Money Management

### 1. Stake Sizing (Percentage-Based)
- **Confidence 9-10**: 5% stake (max $500)
- **Confidence 8**: 4% stake (~$400)
- **Confidence 7**: 3% stake (~$300)
- **Confidence 6**: 2% stake (~$200)
- **Confidence 5 or below**: 1% stake (~$100)

### 2. Home Favorite Strategy
- Analyzes home win rates by league
- Targets leagues with >43% home win rate
- Confidence scoring based on historical data
- Conservative dollar-based stakes

### 3. Over/Under Strategy
- Uses league-specific goal/point averages
- Football: Over/Under 2.5 goals
- Basketball: Total points thresholds
- Risk-adjusted position sizing

### 4. Value Betting
- Identifies strong teams as potential underdogs
- Looks for market inefficiencies
- Conservative approach with safer bets (Win/Draw)
- Higher stakes for high-confidence value spots

### 5. Kelly Criterion (Alternative)
- Mathematical optimal sizing
- Capped at 5% for safety (quarter Kelly)
- Based on estimated probabilities

## Professional Performance Tracking

The system tracks real dollar metrics:
- **Current Bankroll**: Real-time USD balance
- **Total P&L**: Actual profit/loss in USD
- **Win Rate**: Percentage of successful picks
- **ROI**: Return on investment percentage
- **Total Return**: Portfolio return percentage
- **Current Streak**: Consecutive wins
- **Best Streak**: Historical best winning streak
- **Average Stake**: Average bet size in USD
- **Total Staked**: Total capital risked
- **Portfolio Health**: Risk assessment and status
- **Strategy Performance**: USD breakdown by strategy type

## Initial $10K Portfolio Allocation

Starting with 8 real picks totaling **$2,300 staked** from $10,000 bankroll:

1. **Stevenage vs Barnsley** (Feb 10) - Stevenage Win @ 2.05 | **$300 stake (3%)**
2. **Mansfield vs Peterborough** (Feb 10) - Over 2.5 Goals @ 1.95 | **$200 stake (2%)**
3. **Wigan Athletic vs Reading** (Feb 10) - Wigan Win @ 1.80 | **$400 stake (4%)**
4. **Barnsley vs AFC Wimbledon** (Feb 14) - Under 2.5 Goals @ 2.15 | **$100 stake (1%)**
5. **Blackpool vs Plymouth Argyle** (Feb 14) - Blackpool Win/Draw @ 1.45 | **$400 stake (4%)**
6. **Lincoln City vs Bolton Wanderers** (Feb 14) - Bolton Win @ 2.40 | **$200 stake (2%)**
7. **Reading vs Wycombe Wanderers** (Feb 14) - Over 2.5 Goals @ 1.85 | **$300 stake (3%)**
8. **Cardiff City vs Luton Town** (Feb 14) - Cardiff Win @ 1.75 | **$400 stake (4%)**

**Portfolio Status**: 23% of bankroll currently allocated across 8 positions

## Automation

### Daily Picks Script (`scripts/daily-picks.sh`)
- Automated daily pick generation
- Fetches events from TheSportsDB API
- Calls strategy API to generate picks
- Can be scheduled as cron job
- Includes error handling and logging

### Usage
```bash
# Manual execution
./scripts/daily-picks.sh

# Cron job (daily at 9 AM)
0 9 * * * /home/Memo1981/SportsAI/Sports_Ai/scripts/daily-picks.sh
```

## API Usage Examples

### Get Today's Picks
```bash
curl "http://localhost:3000/api/strategy/today"
```

### Get Performance Metrics
```bash
curl "http://localhost:3000/api/strategy/performance"
```

### Mark Pick as Won (Shows Real Profit)
```bash
curl -X POST "http://localhost:3000/api/strategy/resolve/0c8b2f4e-8c4a-4e8d-9a5b-1f2c3d4e5f6g" \
  -H "Content-Type: application/json" \
  -d '{"status": "won", "result": "Stevenage won 2-1"}'

# Response shows:
# stake_amount_usd: 300, odds: 2.05, profit_loss_usd: +315 (1.05 * 300)
```

### Get Betting History
```bash
curl "http://localhost:3000/api/strategy/history?page=1&limit=10&status=won"
```

## Future Enhancements

1. **Multiple Bookmaker Integration**: For true arbitrage detection
2. **Machine Learning**: Historical pattern analysis
3. **Real-time Odds**: Live odds monitoring
4. **Telegram Notifications**: Automated pick delivery
5. **Mobile App**: React Native betting tracker
6. **Advanced Analytics**: Heat maps, trend analysis
7. **Social Features**: Community picks, leaderboards

## 💼 Professional Money Management Features

### 1. **Dynamic Bankroll Management**
- Real-time bankroll calculation based on P&L
- Percentage-based stakes adjust with bankroll changes
- Conservative maximum 5% risk per position

### 2. **Kelly Criterion Implementation**
- Mathematical optimal sizing available
- Quarter-Kelly safety factor applied
- Probability-based stake calculation

### 3. **Portfolio Health Monitoring**
- **Excellent**: +20% returns or better
- **Good**: +10% to +20% returns
- **Fair**: 0% to +10% returns
- **Poor**: -10% to 0% returns
- **Critical**: Below -10% returns (urgent review needed)

### 4. **Risk Controls**
- Maximum 5% of bankroll per bet
- Total exposure monitoring
- Drawdown protection protocols

## Database Schema

Professional USD-based schema for PostgreSQL migration:

```sql
CREATE TABLE betting_picks (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  event VARCHAR(255) NOT NULL,
  league VARCHAR(100) NOT NULL,
  pick TEXT NOT NULL,
  odds DECIMAL(5,2) NOT NULL,
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  stake_amount_usd DECIMAL(10,2) NOT NULL,
  stake_percentage DECIMAL(4,2) NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  result TEXT,
  profit_loss_usd DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  match_time TIME
);

-- Portfolio tracking table
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  bankroll_usd DECIMAL(12,2) NOT NULL,
  total_staked_usd DECIMAL(12,2) NOT NULL,
  profit_loss_usd DECIMAL(12,2) NOT NULL,
  win_rate DECIMAL(5,2),
  roi DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd backend && npm install
   ```

2. **Start Backend**:
   ```bash
   npm run dev
   ```

3. **Generate Initial Picks**:
   ```bash
   ./scripts/daily-picks.sh
   ```

4. **Test API Endpoints**:
   ```bash
   curl http://localhost:3000/api/strategy/today
   ```

## 📊 Current Portfolio Status

```json
{
  "startingBankrollUsd": 10000,
  "currentBankrollUsd": 10000,
  "totalStakedUsd": 2300,
  "availableFundsUsd": 7700,
  "portfolioAllocation": "23%",
  "activePicks": 8,
  "pendingPicks": 8,
  "portfolioHealth": "fair - starting position"
}
```

**Risk Management**: 23% of portfolio currently allocated across 8 carefully selected positions. Conservative approach maintains 77% in reserve for future opportunities.

## Verification & Transparency

- All picks timestamped and immutable once created
- Real dollar amounts tracked and auditable
- Performance verifiable through JSON history
- Professional money management rules enforced
- Strategy logic open and transparent
- Real event data from trusted TheSportsDB API
- Mathematical profit/loss calculations
- Portfolio health monitoring

## Professional Features

✅ **$10,000 Real Money Tracking**  
✅ **Percentage-Based Position Sizing**  
✅ **Conservative Risk Management (Max 5%)**  
✅ **Kelly Criterion Implementation**  
✅ **Real-Time Bankroll Updates**  
✅ **Portfolio Health Monitoring**  
✅ **Professional P&L Reporting**  
✅ **Auditable Performance History**

This system provides a professional-grade betting strategy platform with institutional-quality money management and full transparency.