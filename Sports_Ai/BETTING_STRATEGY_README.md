# Betting Strategy & History System

## Overview

This system implements a comprehensive betting strategy engine that analyzes real sports events, generates picks, tracks results, and builds verifiable performance history starting from February 10, 2026.

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

Each betting pick contains:
```json
{
  "id": "uuid",
  "date": "2026-02-10",
  "event": "Arsenal vs Chelsea",
  "league": "English Premier League",
  "pick": "Arsenal Win",
  "odds": 1.85,
  "confidence": 8,
  "stake_recommendation": "2 units",
  "strategy": "home_favorite",
  "status": "pending|won|lost|void",
  "result": null,
  "profit_loss": null,
  "created_at": "ISO timestamp",
  "home_team": "Arsenal",
  "away_team": "Chelsea",
  "match_time": "15:00:00"
}
```

## Strategy Rules

### 1. Home Favorite Strategy
- Analyzes home win rates by league
- Targets leagues with >43% home win rate
- Confidence scoring based on historical data
- Recommends 1-2 units based on confidence

### 2. Over/Under Strategy
- Uses league-specific goal/point averages
- Football: Over/Under 2.5 goals
- Basketball: Total points thresholds
- Confidence based on deviation from average

### 3. Value Betting
- Identifies strong teams as potential underdogs
- Looks for market inefficiencies
- Conservative approach with safer bets (Win/Draw)
- Higher confidence for recognized value

## Performance Tracking

The system tracks:
- **Total Picks**: All generated picks
- **Win Rate**: Percentage of successful picks
- **ROI**: Return on investment percentage
- **Current Streak**: Consecutive wins
- **Best Streak**: Historical best winning streak
- **Bankroll**: Starting 100 units + profit/loss
- **Strategy Performance**: Breakdown by strategy type

## Initial Data

Starting with 8 real picks based on actual English League 1 fixtures for February 10-14, 2026:

1. **Stevenage vs Barnsley** (Feb 10) - Stevenage Win @ 2.05
2. **Mansfield Town vs Peterborough United** (Feb 10) - Over 2.5 Goals @ 1.95
3. **Wigan Athletic vs Reading** (Feb 10) - Wigan Win @ 1.80
4. **Barnsley vs AFC Wimbledon** (Feb 14) - Under 2.5 Goals @ 2.15
5. **Blackpool vs Plymouth Argyle** (Feb 14) - Blackpool Win/Draw @ 1.45
6. **Lincoln City vs Bolton Wanderers** (Feb 14) - Bolton Win @ 2.40
7. **Reading vs Wycombe Wanderers** (Feb 14) - Over 2.5 Goals @ 1.85
8. **Cardiff City vs Luton Town** (Feb 14) - Cardiff Win @ 1.75

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

### Mark Pick as Won
```bash
curl -X POST "http://localhost:3000/api/strategy/resolve/pick-id" \
  -H "Content-Type: application/json" \
  -d '{"status": "won", "result": "Arsenal won 2-1"}'
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

## Database Schema

The system currently uses JSON file storage but can be easily migrated to PostgreSQL:

```sql
CREATE TABLE betting_picks (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  event VARCHAR(255) NOT NULL,
  league VARCHAR(100) NOT NULL,
  pick TEXT NOT NULL,
  odds DECIMAL(5,2) NOT NULL,
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  stake_recommendation VARCHAR(50),
  strategy VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  result TEXT,
  profit_loss DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  match_time TIME
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

## Verification & Transparency

- All picks are timestamped and immutable once created
- Historical performance is verifiable through the JSON history
- Strategy logic is open and auditable
- Real event data from trusted TheSportsDB API
- Performance metrics calculated mathematically

This system provides a solid foundation for professional betting strategy management with full transparency and accountability.