# Apify Actor Setup Guide

This guide helps you find and configure Apify actors for your Sports AI application.

## Required Actors

Your application needs these Apify actors (set as environment variables in Render):

1. **APIFY_ACTOR_ODDS_API** - Fetches sports betting odds data
2. **APIFY_ACTOR_SOFASCORE** - Scrapes SofaScore for match data, stats, and scores
3. **APIFY_ACTOR_FLASHSCORE** - (Optional fallback) Scrapes Flashscore for match data/scores when SofaScore is unavailable
3. **APIFY_ACTOR_PREDICTIONS** - Gets match predictions
4. **APIFY_ACTOR_SPORTSBOOK_ODDS** - (Optional) Additional sportsbook odds

---

## Step-by-Step Setup

### Step 1: Access Apify Console

1. Go to [https://console.apify.com](https://console.apify.com)
2. Log in to your Apify account
3. If you don't have an account, sign up (free tier includes $5 credits/month)

---

### Step 2: Find or Create Actors

You have two options:

- **Option A:** Use existing actors from the Apify Store (easiest)
- **Option B:** Create your own custom actors (advanced, recommended for specific needs)

**Want to create custom actors tailored to your betting needs?** See: [CREATE_CUSTOM_APIFY_ACTORS.md](./CREATE_CUSTOM_APIFY_ACTORS.md)

#### Option A: Use Actors from Apify Store (Recommended for getting started)

1. Click on **"Store"** in the top navigation (or go to [https://apify.com/store](https://apify.com/store))
2. Search for actors by functionality:

##### For APIFY_ACTOR_ODDS_API

- Search terms: `sports odds`, `betting odds`, `odds API`
- Look for actors like:
  - `yourusername/sports-odds-scraper`
  - `apify/sports-odds`
  - Any actor that fetches betting odds

##### For APIFY_ACTOR_SOFASCORE

- Search terms: `sofascore`, `soccer scores`, `football scores`
- Example mentioned: `azzouzana/sofascore-scraper-pro` (if it exists)
- Look for actors that scrape SofaScore data

##### For APIFY_ACTOR_FLASHSCORE (optional fallback)
- Purpose: provide a **backup provider** for match/scores if the SofaScore actor fails or is blocked.
- Recommended approach: create/host your own Apify actor based on an open-source Flashscore scraper (see "Open-source baselines" below).
- Then set:
  - `APIFY_ACTOR_FLASHSCORE=yourusername/your-flashscore-actor`

##### For APIFY_ACTOR_PREDICTIONS

- Search terms: `sports predictions`, `match predictions`, `football predictions`
- Look for actors that provide match predictions

##### For APIFY_ACTOR_SPORTSBOOK_ODDS (Optional)

- Search terms: `sportsbook odds`, `bookmaker odds`
- Look for actors that aggregate odds from multiple sportsbooks

---

### Step 3: Get Actor ID Format

For each actor you find:

1. **Click on the actor** in the store to open its page
2. **Look at the URL** - it will be something like:

   ```text
   https://apify.com/username/actor-name
   ```

3. **The Actor ID is:** `username/actor-name`
   - Example: `azzouzana/sofascore-scraper-pro`
   - Example: `apify/sports-odds`

**Important:**

- Format: `username/actor-name` (forward slash)
- The code will automatically convert `/` to `~` for API calls
- Both formats work: `username/actor-name` or `username~actor-name`

---

### Step 4: Test Actors (Optional but Recommended)

Before setting them in Render, you can test actors in Apify Console:

1. Go to **"Actors"** in the left sidebar
2. If you're using store actors, you may need to **"Add to account"** first
3. Click on an actor to open it
4. Click **"Run"** to test it with sample input
5. Check if the output matches what your application expects

---

### Step 5: Set Actor IDs in Render

1. Go to your Render dashboard: [https://dashboard.render.com](https://dashboard.render.com)
2. Select your **backend service** (the one running your Sports AI backend)
3. Click on **"Environment"** tab
4. Add the following environment variables:

```env
APIFY_ACTOR_ODDS_API=yourusername/your-odds-actor
APIFY_ACTOR_SOFASCORE=yourusername/your-sofascore-actor
APIFY_ACTOR_PREDICTIONS=yourusername/your-predictions-actor
APIFY_ACTOR_SPORTSBOOK_ODDS=yourusername/your-sportsbook-actor
```

**Example:**

```env
APIFY_ACTOR_ODDS_API=apify/sports-odds
APIFY_ACTOR_SOFASCORE=azzouzana/sofascore-scraper-pro

# Optional fallback
APIFY_ACTOR_FLASHSCORE=yourusername/your-flashscore-actor
APIFY_ACTOR_PREDICTIONS=mypredictions/ai-predictions
```

**Important:**

- Replace `yourusername/actor-name` with the actual actor IDs you found
- If an actor is optional (like SPORTSBOOK_ODDS), you can leave it empty
- Don't include quotes around the values
- Click **"Save Changes"** - Render will automatically redeploy your service

---

### Step 6: Verify Configuration

After deployment:

1. Check your application logs in Render
2. The logs should show Apify actors are configured
3. Test the Apify integration in your application admin panel
4. Check the `/v1/apify/status` endpoint to verify actor IDs are set correctly

---

## Finding Your Apify Username

If you need to know your Apify username:

1. Go to [https://console.apify.com](https://console.apify.com)
2. Click on your **profile icon** (top right)
3. Click **"Settings"** or **"Account"**
4. Your username is shown there (e.g., `myusername`)

---

## Tips

### Using Public Actors from Store

- Many actors in the Apify Store are free to use
- Check actor pricing on the actor's page
- Some actors have usage limits on free tier

### Creating Your Own Actors

- If you can't find suitable actors, you can create your own custom actors
- **Full guide:** [CREATE_CUSTOM_APIFY_ACTORS.md](./CREATE_CUSTOM_APIFY_ACTORS.md)
- Go to **"Actors"** → **"Create new"** in Apify Console
- Build actors using Apify's SDK (JavaScript or Python)
- Once created, use format: `yourusername/your-actor-name`
- **Benefits:** Tailor actors to your specific betting data needs, scrape any source, custom filtering

### Actor Input Requirements

- Check each actor's documentation for required input parameters
- Your code in `apify.service.ts` already handles common inputs
- Adjust input parameters in the service if needed

### Cost Considerations

- Apify charges based on compute time and data transfer
- Monitor usage in **"Usage & Billing"** section
- Free tier: $5 credits/month
- Set budget alerts if needed

---

## Troubleshooting

### Actor Not Found Error

- **Problem:** `404 Actor not found`
- **Solution:**
  - Verify the actor ID format is correct (`username/actor-name`)
  - Check if the actor exists in Apify Store
  - Ensure the actor is public or you have access

### Permission Denied

- **Problem:** `403 Forbidden` or `Permission denied`
- **Solution:**
  - Verify your `APIFY_API_TOKEN` is set correctly
  - Check if you have access to the actor
  - Some actors may require payment/subscription

### Actor ID Not Set

- **Problem:** Error: `Apify actor id is not configured`
- **Solution:**
  - Verify environment variables are set in Render
  - Check variable names match exactly (case-sensitive)
  - Ensure you saved changes and service redeployed

### Testing Locally

- For local development, set these variables in your `.env` file:

  ```env
  APIFY_ACTOR_ODDS_API=yourusername/actor-name
  APIFY_ACTOR_SOFASCORE=yourusername/actor-name
  APIFY_ACTOR_PREDICTIONS=yourusername/actor-name
  ```

---

## Additional Resources

- [Apify Documentation](https://docs.apify.com)
- [Apify Store](https://apify.com/store)
- [Apify Console](https://console.apify.com)
- [Render Environment Variables Guide](https://render.com/docs/environment-variables)

---

## Quick Checklist

- [ ] Logged into Apify Console
- [ ] Found/created actor for **APIFY_ACTOR_ODDS_API**
- [ ] Found/created actor for **APIFY_ACTOR_SOFASCORE**
- [ ] (Optional) Found/created actor for **APIFY_ACTOR_FLASHSCORE**

## Open-source baselines (GitHub)
These are good starting points for building your own Flashscore actor:
- `gustavofariaa/FlashscoreScraping` (Python + Playwright): tends to be the most practical baseline for live pages.
- `chiruleonard/flashscore-scraper` (Python; packaged on PyPI): useful for simpler match extraction flows.

Note: Flashscore pages can be protected/blocked; an Apify actor is usually more reliable than running browser automation inside our API server.
- [ ] Found/created actor for **APIFY_ACTOR_PREDICTIONS**
- [ ] (Optional) Found/created actor for **APIFY_ACTOR_SPORTSBOOK_ODDS**
- [ ] Got actor IDs in format: `username/actor-name`
- [ ] Set environment variables in Render
- [ ] Saved changes and service redeployed
- [ ] Verified configuration works

---

**Next Steps:** After setting up actors, your backend commit (54dd4cd) will use these actor IDs instead of hardcoded values. The application will fetch data from your configured Apify actors!
