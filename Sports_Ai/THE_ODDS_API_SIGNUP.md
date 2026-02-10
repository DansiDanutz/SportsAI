# The Odds API - Free Signup Instructions

## Quick Setup (2 minutes)

The Odds API provides **500 FREE credits per month** with real odds from 40+ bookmakers worldwide.

### Step 1: Visit The Odds API
Go to: https://the-odds-api.com

### Step 2: Choose FREE Plan
- Look for the "Starter" plan section
- Click the "START" button under "FREE" (500 credits per month)

### Step 3: Sign Up
- Enter your email address
- Create a password
- Verify your email (check inbox/spam)

### Step 4: Get Your API Key
- Log in to your dashboard
- Copy your API key
- Add it to your `.env` file:

```env
THE_ODDS_API_KEY=your_api_key_here
```

### Step 5: Test It Works
Visit: `GET /api/odds/soccer` or `GET /api/status` to verify your integration.

## What You Get (FREE Tier)
- ✅ 500 API credits per month
- ✅ All major sports (NFL, NBA, MLB, EPL, etc.)
- ✅ 40+ bookmakers (DraftKings, FanDuel, Bet365, etc.)
- ✅ Multiple betting markets (moneyline, spreads, totals)
- ✅ Real-time odds updates
- ✅ Historical odds data

## Features Available
- **US Bookmakers:** DraftKings, FanDuel, BetMGM, Caesars, Bovada
- **UK Bookmakers:** Unibet, William Hill, Ladbrokes, Betfair 
- **EU Bookmakers:** 1xBet, Pinnacle, Betfair
- **Sports:** NFL, NBA, MLB, NHL, EPL, Bundesliga, Serie A, and 70+ more

## What Happens Without API Key?
If you don't configure THE_ODDS_API_KEY:
- ❌ No live odds data
- ✅ Event data still works (from TheSportsDB - completely free)
- ✅ App functions normally, just without betting odds

## Cost After Free Tier?
- **20K credits:** $30/month
- **100K credits:** $59/month
- Most users stay on the free tier for testing and small apps.

---

**Total setup time:** ~2 minutes  
**Credit card required:** No (for free tier)  
**Works immediately:** Yes