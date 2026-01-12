# Complete Environment Variables & Secrets Guide

This guide shows you **exactly where to get each API key and secret** needed for SportsAI backend deployment on Render.

---

## Table of Contents

1. [Required Core Variables](#1-required-core-variables)
2. [Database Configuration](#2-database-configuration)
3. [External API Keys](#3-external-api-keys)
4. [OAuth Configuration](#4-oauth-configuration-optional)
5. [Feature Flags](#5-feature-flags)
6. [Optional Services](#6-optional-services)

---

## 1. Required Core Variables

### `NODE_ENV`

**Value:** `production`
**Where to get:** Just type `production`
**Purpose:** Sets the application environment
**Required:** Yes

---

### `PORT`

**Value:** `10000` (or leave empty - Render sets automatically)
**Where to get:** Render sets this automatically, but you can specify `10000`
**Purpose:** Port for the backend server
**Required:** Optional (Render sets automatically)

---

### `JWT_SECRET`

**Value:** A long random string (minimum 32 characters)
**Where to get:** Generate your own secure secret
**How to generate:**

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://randomkeygen.com/
# Use "CodeIgniter Encryption Keys" - copy one
```

**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
**Purpose:** Secret key for JWT token encryption
**Required:** Yes
**IMPORTANT:** Never share this key publicly!

---

### `CORS_ORIGIN`

**Value:** Your frontend URL(s), comma-separated
**Where to get:** Your Vercel frontend URL
**Example:** `https://sports-ai-one.vercel.app`
**Multiple origins:** `https://sports-ai-one.vercel.app,https://your-custom-domain.com`
**Purpose:** Allows frontend to communicate with backend
**Required:** Yes

---

## 2. Database Configuration

### `DATABASE_URL`

**Value:** PostgreSQL connection string from Render
**Where to get:**

1. Go to **Render Dashboard** → Your PostgreSQL service (`sportingpostgres`)
2. Click on **"Connections"** tab
3. Copy the **"Internal Database URL"** (for Render-to-Render)
   - Format: `postgresql://username:password@host:port/database`
   - Example: `postgresql://sportsai:abc123@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres`

**Purpose:** Database connection for Prisma
**Required:** Yes
**Use Internal URL** (not External) for Render services

---

## 3. External API Keys

### `THE_ODDS_API_KEY`

**Service:** The Odds API
**Website:** <https://the-odds-api.com>
**Where to get:**

1. Visit: <https://the-odds-api.com>
2. Click **"Get API Key"** or **"Sign Up"**
3. Create a free account (or login)
4. Go to **Dashboard** → **API Keys**
5. Copy your API key
6. **Free tier:** 500 requests/month
7. **Paid tiers:** Start at $10/month for more requests

**Purpose:** Fetches live sports odds from multiple bookmakers
**Required:** Optional (but needed for odds features)
**Free tier limits:** 500 requests/month

---

### `API_SPORTS_KEY`

**Service:** API-Sports (RapidAPI)
**Website:** <https://rapidapi.com/api-sports/api/api-sports>
**Where to get:**

1. Visit: <https://rapidapi.com/api-sports/api/api-sports>
2. Click **"Subscribe to Test"** or **"Subscribe"**
3. Sign up/login to RapidAPI (free account works)
4. Choose a plan:
   - **Basic:** Free - 100 requests/day
   - **Pro:** $10/month - 10,000 requests/month
   - **Ultra:** $50/month - 100,000 requests/month
5. After subscribing, go to **"Endpoints"** tab
6. Find **"Headers"** section
7. Copy the value of `x-rapidapi-key` (this is your API_SPORTS_KEY)

**Purpose:** Fetches football, basketball, baseball fixtures and standings
**Required:** Optional (but needed for fixtures/standings)
**Free tier limits:** 100 requests/day

---

### `THE_SPORTS_DB_KEY`

**Service:** TheSportsDB
**Website:** <https://www.thesportsdb.com>
**Where to get:**

1. Visit: <https://www.thesportsdb.com>
2. Click **"API"** in the menu
3. Click **"Get API Key"**
4. Fill out the form:
   - Email address
   - Project name (e.g., "SportsAI")
   - Project description
5. Submit the form
6. Check your email for the API key
7. **Free tier:** Unlimited requests (with rate limits)

**Alternative:** Use `1` as a test key (limited functionality)
**Purpose:** Team logos, player data, league information
**Required:** Optional (but recommended for team logos)
**Free tier:** Unlimited (with rate limits)

---

### `SPORTMONKS_API_KEY`

**Service:** Sportmonks
**Website:** <https://www.sportmonks.com>
**Where to get:**

1. Visit: <https://www.sportmonks.com>
2. Click **"Sign Up"** or **"Get Started"**
3. Choose a plan:
   - **Free:** Limited requests
   - **Starter:** $29/month - 10,000 requests/month
   - **Professional:** $99/month - 50,000 requests/month
4. After signup, go to **Dashboard** → **API Keys**
5. Copy your API token

**Purpose:** Advanced football and cricket data
**Required:** Optional (fallback for fixtures)
**Note:** Can be expensive, use only if needed

---

### `OPENROUTER_API_KEY`

**Service:** OpenRouter
**Website:** <https://openrouter.ai>
**Where to get:**

1. Visit: <https://openrouter.ai>
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with email or GitHub
4. Go to **Dashboard** → **Keys**
5. Click **"Create Key"**
6. Copy your API key
7. **Free tier:** Uses free models (limited)
8. **Paid:** Pay-as-you-go for premium models

**Purpose:** AI-powered betting insights and advice
**Required:** Optional (needed for AI features)
**Free tier:** Uses free models like Llama 3.2

---

### `APIFY_API_TOKEN`

**Service:** Apify
**Website:** <https://apify.com>
**Where to get:**

1. Visit: <https://apify.com>
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with email or GitHub
4. Go to **Settings** → **Integrations** → **API Tokens**
5. Click **"Create token"**
6. Copy your token
7. **Free tier:** $5 free credits/month

**Purpose:** Web scraping for odds and match data
**Required:** Optional (advanced scraping features)
**Free tier:** $5 credits/month

---

## 4. OAuth Configuration (Optional)

### `GOOGLE_CLIENT_ID`

**Service:** Google Cloud Console
**Where to get:**

1. Visit: <https://console.cloud.google.com>
2. Sign in with your Google account
3. Click **"Create Project"** or select existing project
4. Name it (e.g., "SportsAI")
5. Go to **"APIs & Services"** → **"Credentials"**
6. Click **"Create Credentials"** → **"OAuth client ID"**
7. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: SportsAI
   - Support email: your email
   - Authorized domains: your domain
8. Application type: **"Web application"**
9. Name: "SportsAI Web Client"
10. Authorized redirect URIs:
    - `https://your-render-url.onrender.com/auth/google/callback`
    - `http://localhost:4000/auth/google/callback` (for local dev)
11. Click **"Create"**
12. Copy the **Client ID**

**Purpose:** Google OAuth login
**Required:** Optional

---

### `GOOGLE_CLIENT_SECRET`

**Where to get:**

1. Same place as `GOOGLE_CLIENT_ID`
2. After creating OAuth client, you'll see **Client Secret**
3. Copy it immediately (can only see once)
4. If lost, delete and recreate the client

**Purpose:** Google OAuth authentication
**Required:** Optional (only if using Google login)

---

### `GOOGLE_CALLBACK_URL`

**Value:** `https://your-render-url.onrender.com/auth/google/callback`
**Where to get:** Replace `your-render-url` with your actual Render service URL
**Example:** `https://sportsapiai.onrender.com/auth/google/callback`
**Purpose:** OAuth callback endpoint
**Required:** Optional (only if using Google login)

---

### `FRONTEND_URL`

**Value:** Your Vercel frontend URL
**Example:** `https://sports-ai-one.vercel.app`
**Purpose:** Redirect URL after OAuth login
**Required:** Optional (only if using OAuth)

---

## 5. Feature Flags

### `ENABLE_LIVE_ODDS`

**Value:** `true` or `false`
**Default:** `true`
**Purpose:** Enable/disable live odds fetching
**Required:** Optional (defaults to true)

---

### `ENABLE_ARBITRAGE_DETECTION`

**Value:** `true` or `false`
**Default:** `true`
**Purpose:** Enable/disable arbitrage opportunity detection
**Required:** Optional (defaults to true)

---

### `ENABLE_AI_INSIGHTS`

**Value:** `true` or `false`
**Default:** `false`
**Purpose:** Enable AI-powered betting insights (requires OPENROUTER_API_KEY)
**Required:** Optional

---

## 6. Optional Services

### `REDIS_URL`

**Service:** Redis (for caching)
**Where to get:**

1. **Option 1:** Use Render Redis (recommended)
   - Render Dashboard → New → Redis
   - Create Redis instance
   - Copy connection string from "Connections" tab
   - Format: `redis://username:password@host:port`

2. **Option 2:** Use Upstash Redis (free tier)
   - Visit: <https://upstash.com>
   - Sign up for free
   - Create Redis database
   - Copy REST URL or Redis URL

3. **Option 3:** Use Redis Cloud (free tier)
   - Visit: <https://redis.com/try-free/>
   - Sign up
   - Create database
   - Copy connection string

**Purpose:** Caching and session storage
**Required:** Optional (improves performance)

---

### `DEV_COUNTRY_CODE`

**Value:** ISO country code (e.g., `US`, `GB`, `RO`)
**Purpose:** Default country for development/testing
**Required:** Optional

---

## Quick Setup Checklist

### Minimum Required (Backend will start)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (from Render PostgreSQL)
- [ ] `JWT_SECRET` (generate your own)
- [ ] `CORS_ORIGIN` (your Vercel frontend URL)

### Recommended for Full Functionality

- [ ] `THE_ODDS_API_KEY` (free tier available)
- [ ] `API_SPORTS_KEY` (free tier available)
- [ ] `THE_SPORTS_DB_KEY` (free tier available)
- [ ] `OPENROUTER_API_KEY` (free tier available)

### Optional Enhancements

- [ ] `SPORTMONKS_API_KEY` (paid)
- [ ] `APIFY_API_TOKEN` (free credits)
- [ ] `REDIS_URL` (caching)
- [ ] Google OAuth (if using social login)

---

## How to Add to Render

1. Go to **Render Dashboard** → Your Web Service (`sportsapiai`)
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Enter **Key** and **Value**
5. Click **"Save Changes"**
6. Render will automatically redeploy

---

## Cost Summary

| Service | Free Tier | Paid Plans |
| ------- | --------- | ---------- |
| The Odds API | 500 req/month | $10+/month |
| API-Sports | 100 req/day | $10+/month |
| TheSportsDB | Unlimited | Free |
| Sportmonks | Limited | $29+/month |
| OpenRouter | Free models | Pay-as-you-go |
| Apify | $5 credits/month | Pay-as-you-go |
| Redis | - | $7+/month (Render) |

**Total Free Tier:** ~$0/month (with limitations)
**Recommended Paid:** ~$20-30/month for production use

---

## Security Best Practices

1. **Never commit** `.env` files to Git
2. **Use strong secrets** (32+ characters for JWT_SECRET)
3. **Rotate keys** periodically
4. **Use different keys** for dev/staging/production
5. **Monitor API usage** to avoid unexpected charges
6. **Set rate limits** in your code

---

## Need Help?

- **The Odds API:** <https://the-odds-api.com/liveapi/guides/v4/>
- **API-Sports:** <https://www.api-sports.io/documentation>
- **TheSportsDB:** <https://www.thesportsdb.com/api.php>
- **Sportmonks:** <https://docs.sportmonks.com/>
- **OpenRouter:** <https://openrouter.ai/docs>
- **Apify:** <https://docs.apify.com/>

---

**Last Updated:** 2026-01-12
