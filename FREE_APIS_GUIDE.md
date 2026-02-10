# FREE Sports APIs Integration Guide

This guide covers all the FREE sports APIs integrated into SportsAI, allowing you to get started without any paid subscriptions.

## 🆓 Completely Free APIs (No Signup Required)

### 1. TheSportsDB
**Cost:** 100% Free, no signup needed  
**API Key:** Just use `"3"` as the key  
**Rate Limits:** Reasonable fair-use limits  
**Data Available:**
- All sports and leagues  
- Team information with logos and descriptions
- Upcoming events and fixtures
- Team players and statistics
- Event details and results

**Endpoints Used:**
```bash
# All sports
https://www.thesportsdb.com/api/v1/json/3/all_sports.php

# All leagues  
https://www.thesportsdb.com/api/v1/json/3/all_leagues.php

# Search teams
https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=Arsenal

# Events by date
https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2026-02-10

# Upcoming events for a league
https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328

# Event details
https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=XXX
```

**Setup:**
1. No signup required!
2. Set `THESPORTSDB_API_KEY=3` in your `.env`
3. Start using immediately

**Test it works:**
```bash
curl -s "https://www.thesportsdb.com/api/v1/json/3/all_leagues.php" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('leagues',[])))"
```

---

## 💰 Free Tier APIs (Signup Required)

### 2. The Odds API
**Cost:** Free tier with 500 credits/month  
**Signup:** https://the-odds-api.com  
**Rate Limits:** 500 requests/month (free tier)  
**Data Available:**
- Live odds from 40+ bookmakers
- All major sports (Soccer, Basketball, Football, Tennis, MMA, etc.)
- Multiple markets (Money Line, Spreads, Totals)
- Historical scores and results

**What 500 credits gets you:**
- ~500 odds requests 
- Perfect for testing and small-scale arbitrage detection
- Enough to demo the full product functionality

**Setup:**
1. Sign up at https://the-odds-api.com
2. Get your free API key from the dashboard
3. Set `THE_ODDS_API_KEY=your_key_here` in your `.env`
4. Already integrated in `the-odds-api.service.ts`

**Example Usage:**
```typescript
// Get all sports
await theOddsApiService.getSports();

// Get odds for Premier League
await theOddsApiService.getOdds('soccer_epl');

// Get scores
await theOddsApiService.getScores('soccer_epl');
```

### 3. OpenRouter AI
**Cost:** Free models available (Claude, GPT-4, Gemini, etc.)  
**Signup:** https://openrouter.ai  
**Rate Limits:** Varies by model (generous free tiers)  
**Data Available:**
- AI-powered insights and predictions
- Match analysis and betting recommendations
- Automated arbitrage opportunity explanations

**Free Models Available:**
- Google Gemini 2.0 Flash (free)
- Meta Llama models (free)
- Mistral models (free) 
- Some OpenAI models (limited free usage)

**Setup:**
1. Sign up at https://openrouter.ai
2. Get API key from https://openrouter.ai/keys
3. Set `OPENROUTER_API_KEY=your_key_here` in your `.env`
4. Use for AI insights and analysis

---

## 🚀 Implementation Details

### Integrated Services

1. **`FreeApisService`** - Unified service for all free APIs
   - TheSportsDB integration with caching
   - Error handling and fallbacks
   - Rate limit management
   - Health checks

2. **`DemoDataService`** - Realistic sample data
   - Sample arbitrage opportunities  
   - Rotating demo events
   - Multiple sports and leagues
   - Out-of-box functionality for buyers

### Caching Strategy
- **5 minutes TTL** for live data (events, odds)
- **15 minutes TTL** for upcoming events  
- **1 hour TTL** for static data (teams, leagues)
- In-memory cache to avoid rate limit issues

### Error Handling
- Graceful fallbacks to demo data
- Detailed error logging
- Service health monitoring
- Automatic retry logic

---

## 🔧 Getting Started

### Quick Setup (2 minutes)
1. **Clone and install:**
   ```bash
   git clone <repo>
   cd backend
   npm install
   ```

2. **Set environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and set:
   THESPORTSDB_API_KEY=3
   ```

3. **Start the server:**
   ```bash
   npm run start:dev
   ```

4. **Test the endpoints:**
   ```bash
   # Test TheSportsDB integration
   curl http://localhost:4000/api/sports
   curl http://localhost:4000/api/events/today
   
   # Test demo data (works without any API keys!)
   curl http://localhost:4000/api/demo/events
   curl http://localhost:4000/api/demo/arbitrage
   ```

### Adding More APIs (Optional)
1. **The Odds API (500 free credits):**
   - Signup: https://the-odds-api.com
   - Add `THE_ODDS_API_KEY=your_key` to `.env`

2. **OpenRouter AI (free models):**
   - Signup: https://openrouter.ai  
   - Add `OPENROUTER_API_KEY=your_key` to `.env`

---

## 📊 Data Coverage

### Sports Available (TheSportsDB)
- ⚽ Soccer (Premier League, La Liga, Champions League, etc.)
- 🏀 Basketball (NBA, EuroLeague)  
- 🏈 American Football (NFL, NCAA)
- 🎾 Tennis (ATP, WTA)
- 🥊 MMA (UFC, Bellator)
- And many more...

### Sample Data Available
- **50+ demo events** across multiple sports
- **15+ arbitrage opportunities** with real-looking odds
- **100+ teams** with logos and descriptions  
- **20+ leagues** across different countries
- **Real-time rotating data** that refreshes hourly

---

## 🎯 Perfect for Buyers

This setup gives potential buyers:

1. **Immediate functionality** - No API keys needed to see the product work
2. **Real data integration** - Live sports data from TheSportsDB  
3. **Scalable foundation** - Easy to add paid APIs later
4. **Professional quality** - Proper caching, error handling, monitoring
5. **Cost-effective start** - $0 to get started, <$10/month to scale

The demo data is so realistic that buyers can evaluate the full arbitrage detection system, user interface, and core functionality before committing to paid API subscriptions.

---

## 🔍 API Testing Commands

Test that everything works:

```bash
# Test TheSportsDB (should return number > 0)
curl -s "https://www.thesportsdb.com/api/v1/json/3/all_leagues.php" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('leagues',[])))"

# Test team search
curl -s "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=Arsenal" | python3 -c "import sys,json; data=json.load(sys.stdin); print('✅ Found:', data['teams'][0]['strTeam'] if data.get('teams') else '❌ No teams')"

# Test events for today  
curl -s "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=$(date +%Y-%m-%d)" | python3 -c "import sys,json; data=json.load(sys.stdin); print('✅ Events today:', len(data.get('events', [])))"
```

All should return positive results confirming the free APIs are working! 🎉

---

## 💡 Pro Tips

1. **Start with demo data** - Let buyers see the product working immediately
2. **Add The Odds API** - 500 free credits is enough for solid demos  
3. **Monitor usage** - Track API calls to stay within free limits
4. **Cache aggressively** - 5-minute caching prevents rate limit issues
5. **Fallback gracefully** - Always have demo data as backup

This gives you a professional sports arbitrage platform that works out-of-the-box with $0 in API costs! 🚀