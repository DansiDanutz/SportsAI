# Create Custom Apify Actors for Betting Data

Yes, you can absolutely create custom Apify actors tailored to your specific betting data needs! This guide shows you how.

---

## What You Can Do

You can create Apify actors that:

- Scrape specific sportsbooks/websites
- Fetch odds from custom sources
- Get match data from any site
- Provide predictions from your chosen sources
- Aggregate data from multiple sources

---

## Required Data Formats

Your actors must return data in these formats (based on your backend code):

### 1. Odds Data Actor (APIFY_ACTOR_ODDS_API)

**Input Parameters:**

```javascript
{
  league: 'NFL' | 'NBA' | 'NHL' | 'UCL' | 'UFC' | 'College-Football' | 'College-Basketball',
  bookmakers?: ['BetMGM', 'DraftKings', 'FanDuel', 'Bet365', 'Caesars'],
  date?: '2024-01-15' // YYYY-MM-DD format
}
```

**Required Output Format:**

```javascript
[
  {
    team1: "Los Angeles Lakers",
    team2: "Boston Celtics",
    gameTime: "2024-01-15T20:00:00Z", // ISO 8601 format
    league: "NBA",
    moneyline: {
      team1: 1.85,      // Decimal odds
      team2: 2.10,
      draw: 3.50        // Optional (for sports with draws)
    },
    spread: {           // Optional
      team1: -5.5,      // Spread value
      team1Odds: 1.90,
      team2: 5.5,
      team2Odds: 1.90
    },
    total: {            // Optional
      over: 220.5,      // Total points/goals
      overOdds: 1.85,
      under: 220.5,
      underOdds: 1.85
    },
    bookmaker: "BetMGM", // Name of bookmaker
    timestamp: "2024-01-15T10:30:00Z" // When odds were fetched
  },
  // ... more results
]
```

### 2. SofaScore Match Data Actor (APIFY_ACTOR_SOFASCORE)

**Input Parameters:**

```javascript
{
  startUrls: [
    { url: "https://www.sofascore.com/match/123456" },
    { url: "https://www.sofascore.com/match/789012" }
  ]
}
```

**Required Output Format:**

```javascript
[
  {
    id: "123456",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    homeScore: 2,           // Optional (if match is live/finished)
    awayScore: 1,           // Optional (if match is live/finished)
    status: "live",         // 'scheduled' | 'live' | 'finished'
    startTime: "2024-01-15T15:00:00Z",
    tournament: "Premier League",
    sport: "soccer",
    statistics: {           // Optional
      possession: { home: 55, away: 45 },
      shots: { home: 12, away: 8 },
      // ... any other stats
    }
  },
  // ... more results
]
```

### 3. Predictions Actor (APIFY_ACTOR_PREDICTIONS)

**Input Parameters:**

```javascript
{
  maxItems: 100  // Maximum number of predictions to return
}
```

**Required Output Format:**

```javascript
[
  {
    event: "Manchester United vs Liverpool",
    prediction: "Home Win",  // Or "Away Win", "Draw", "Over 2.5", etc.
    confidence: 0.75,        // 0.0 to 1.0 (75% confidence)
    source: "AI Model",      // Name of prediction source
    odds: 2.10,              // Decimal odds for the prediction
    timestamp: "2024-01-15T10:00:00Z"
  },
  // ... more predictions
]
```

### 4. Sportsbook Odds Actor (APIFY_ACTOR_SPORTSBOOK_ODDS) - Optional

**Input Parameters:**

```javascript
{
  // Define your own input structure based on your needs
  league?: string,
  sport?: string,
  date?: string
}
```

**Output Format:**

```javascript
// Same format as ApifyOddsResult
[
  {
    team1: "...",
    team2: "...",
    // ... same structure as odds actor
  }
]
```

---

## How to Create Custom Actors

### Step 1: Set Up Apify Actor

1. **Go to Apify Console:**
   - Visit [https://console.apify.com](https://console.apify.com)
   - Sign in or create account

2. **Create New Actor:**
   - Click **"Actors"** in left sidebar
   - Click **"Create new"**
   - Choose **"Empty Actor"** or **"Web Scraper"** template
   - Name your actor (e.g., `my-custom-odds-scraper`)

### Step 2: Write Actor Code

Here's a template for an **Odds Scraper Actor**:

```javascript
// main.js
import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { gotScraping } from 'got-scraping';

await Actor.init();

const { league, bookmakers = [], date } = await Actor.getInput();

const results = [];

// Example: Scrape odds from a betting website
const crawler = new CheerioCrawler({
    async requestHandler({ $, request }) {
        // Your scraping logic here
        // Parse the HTML and extract odds data

        const matchData = {
            team1: $('.team1').text().trim(),
            team2: $('.team2').text().trim(),
            gameTime: $('.game-time').attr('data-time'),
            league: league,
            moneyline: {
                team1: parseFloat($('.odds-team1').text()),
                team2: parseFloat($('.odds-team2').text()),
            },
            bookmaker: request.userData.bookmaker || 'Unknown',
            timestamp: new Date().toISOString(),
        };

        results.push(matchData);
    },
});

// Example: Scrape multiple bookmakers
for (const bookmaker of bookmakers) {
    const url = `https://example-betting-site.com/${league}?bookmaker=${bookmaker}&date=${date}`;
    await crawler.run([{
        url: url,
        userData: { bookmaker: bookmaker }
    }]);
}

// Save results to dataset
await Actor.pushData(results);

await Actor.exit();
```

### Step 3: Test Your Actor

1. **In Apify Console:**
   - Click **"Run"** on your actor
   - Provide test input:

     ```json
     {
       "league": "NBA",
       "bookmakers": ["BetMGM"],
       "date": "2024-01-15"
     }
     ```

   - Check the output dataset
   - Verify the data format matches the required structure

### Step 4: Publish Your Actor

1. **Make Actor Public (Optional):**
   - Go to actor **"Settings"**
   - Set visibility to **"Public"** (if you want others to use it)
   - Or keep it **"Private"** (only you can use it)

2. **Get Actor ID:**
   - Your actor ID format: `your-username/your-actor-name`
   - Example: `myusername/my-custom-odds-scraper`

### Step 5: Connect to Your Backend

1. **Set Environment Variable in Render:**

   ```text
   APIFY_ACTOR_ODDS_API=your-username/your-actor-name
   ```

2. **Test It:**
   - Deploy your backend
   - Call the endpoint: `GET /v1/apify/odds?league=NBA`
   - Check if data is returned correctly

---

## Example: Complete Odds Scraper Actor

Here's a complete example actor that fetches odds from an API or scrapes a website:

```javascript
// main.js
import { Actor } from 'apify';

await Actor.init();

const { league, bookmakers = ['BetMGM'], date } = await Actor.getInput();

const results = [];

// Option 1: Fetch from API
try {
    const response = await fetch(`https://example-odds-api.com/v1/odds?league=${league}&date=${date}`);
    const apiData = await response.json();

    // Transform API data to required format
    for (const game of apiData.games) {
        results.push({
            team1: game.homeTeam,
            team2: game.awayTeam,
            gameTime: game.startTime,
            league: league,
            moneyline: {
                team1: game.odds.home,
                team2: game.odds.away,
            },
            spread: game.spread ? {
                team1: game.spread.homeLine,
                team1Odds: game.spread.homeOdds,
                team2: game.spread.awayLine,
                team2Odds: game.spread.awayOdds,
            } : undefined,
            total: game.total ? {
                over: game.total.line,
                overOdds: game.total.overOdds,
                under: game.total.line,
                underOdds: game.total.underOdds,
            } : undefined,
            bookmaker: bookmakers[0],
            timestamp: new Date().toISOString(),
        });
    }
} catch (error) {
    // Option 2: Scrape website if API fails
    Actor.log.warning(`API failed, falling back to scraping: ${error.message}`);
    // ... implement scraping logic here
}

// Save to dataset
await Actor.pushData(results);

await Actor.exit();
```

---

## What You Can Customize

### 1. Data Sources

- Scrape any betting website
- Use any odds API
- Combine multiple sources
- Filter by your criteria

### 2. Data Processing

- Normalize odds formats (American → Decimal)
- Calculate derived metrics
- Filter low-confidence odds
- Add custom metadata

### 3. Input Parameters

- Define your own parameters:

  ```javascript
  {
    league: string,
    sport: string,
    date: string,
    bookmakers: string[],
    minOdds?: number,
    maxOdds?: number,
    // ... any custom parameters
  }
  ```

### 4. Output Format

- Must match the interfaces defined above
- Can include additional fields (they'll be ignored by backend)
- Can filter/transform data before returning

---

## Tips for Creating Actors

### 1. Use Apify SDK

- Install: `apify` package (Python) or `apify` (JavaScript)
- Use built-in tools for scraping, parsing, handling

### 2. Handle Errors Gracefully

```javascript
try {
    // Your scraping logic
} catch (error) {
    Actor.log.error(`Failed to scrape: ${error.message}`);
    // Return empty array or fallback data
}
```

### 3. Rate Limiting

- Add delays between requests
- Respect website robots.txt
- Use Apify's request queue for automatic rate limiting

### 4. Test Locally First

- Use Apify CLI: `apify run`
- Test with sample input
- Verify output format matches

### 5. Monitor Performance

- Check actor run logs
- Monitor data quality
- Optimize for speed and accuracy

---

## Resources

- **Apify Documentation:** [https://docs.apify.com](https://docs.apify.com)
- **Actor SDK:** [https://sdk.apify.com](https://sdk.apify.com)
- **Apify Store Examples:** [https://apify.com/store](https://apify.com/store) (check existing actors for inspiration)
- **Apify Console:** [https://console.apify.com](https://console.apify.com)

---

## Checklist

- [ ] Created actor in Apify Console
- [ ] Wrote code that matches required output format
- [ ] Tested actor with sample input
- [ ] Verified output data structure
- [ ] Published actor (or kept private)
- [ ] Got actor ID: `username/actor-name`
- [ ] Set environment variable in Render
- [ ] Tested integration with backend

---

## Next Steps

1. **Create your actor** using the templates above
2. **Test it** with sample data
3. **Set it in Render** as environment variable
4. **Deploy** and verify it works
5. **Iterate** and improve based on your needs

---

**You now have full control to create custom actors that fetch exactly the betting data you need!**

Need help with a specific actor? Share what data source you want to scrape, and I can help you write the code!
