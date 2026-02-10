# 🚀 Environment Variables Quick Reference

## ⚡ Start Here - Minimum Required (4 variables)

These are **absolutely required** for the backend to start:

| Variable | Where to Get | Quick Guide |
| ---------- | -------------- | ------------- |
| `DATABASE_URL` | Render Dashboard → PostgreSQL → Connections → Internal URL | [Full Guide](ENVIRONMENT_VARIABLES_GUIDE.md#database) |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | [Full Guide](ENVIRONMENT_VARIABLES_GUIDE.md#jwt) |
| `CORS_ORIGIN` | Your Vercel URL: `https://sports-ai-one.vercel.app` | [Full Guide](ENVIRONMENT_VARIABLES_GUIDE.md#cors) |
| `NODE_ENV` | Just type: `production` | - |

---

## 📊 Priority Order

### 🔴 Priority 1: Core (Required)

1. `DATABASE_URL` - From Render PostgreSQL
2. `JWT_SECRET` - Generate yourself
3. `CORS_ORIGIN` - Your Vercel frontend URL
4. `NODE_ENV` - Set to `production`

### 🟡 Priority 2: Essential APIs (Free tiers available)

1. `THE_ODDS_API_KEY` - [Get here](https://the-odds-api.com) - Free: 500 req/month
2. `API_SPORTS_KEY` - [Get here](https://rapidapi.com/api-sports/api/api-sports) - Free: 100 req/day
3. `THE_SPORTS_DB_KEY` - [Get here](https://www.thesportsdb.com) - Free: Unlimited
4. `ZAI_API_KEY` - [Get here](https://z.ai) - LLM provider (recommended)
5. `OPENROUTER_API_KEY` - [Get here](https://openrouter.ai) - LLM provider (fallback)

### 🟢 Priority 3: Optional Enhancements

1. `SPORTMONKS_API_KEY` - [Get here](https://www.sportmonks.com) - Paid: $29+/month
2. `APIFY_API_TOKEN` - [Get here](https://apify.com) - Free: $5 credits/month
3. `REDIS_URL` - From Render Redis or Upstash - Optional caching
4. Google OAuth - [Get here](https://console.cloud.google.com) - Optional login

---

## 🎯 Quick Setup Steps

### Step 1: Get Database URL (2 minutes)

1. Render Dashboard → PostgreSQL (`sportingpostgres`)
2. Click "Connections" tab
3. Copy "Internal Database URL"
4. Add to Render as `DATABASE_URL`

### Step 2: Generate JWT Secret (30 seconds)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output → Add to Render as `JWT_SECRET`

### Step 3: Set CORS (30 seconds)

Add to Render: `CORS_ORIGIN=https://sports-ai-one.vercel.app`

### Step 4: Set Environment (10 seconds)

Add to Render: `NODE_ENV=production`

### Step 5: Get API Keys (10-15 minutes each)

Follow the detailed guide in `ENVIRONMENT_VARIABLES_GUIDE.md` for each API.

---

## 📋 Copy-Paste Template for Render

```bash
# Core (Required)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-generated-secret-here
CORS_ORIGIN=https://sports-ai-one.vercel.app

# APIs (Get from websites - see full guide)
THE_ODDS_API_KEY=your-key-here
API_SPORTS_KEY=your-key-here
THE_SPORTS_DB_KEY=your-key-here
ZAI_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here

# LLM Provider Configuration (optional)
LLM_PROVIDER=auto  # Options: 'auto', 'zai', 'openrouter' (default: 'auto')
ZAI_MODEL=glm-4  # Optional: Override default z.ai model
ZAI_API_URL=https://api.z.ai/v1/chat/completions  # Optional: Override z.ai API URL
ZAI_TIMEOUT_MS=12000  # Optional: Request timeout in ms (default: 12000)

# Optional
SPORTMONKS_API_KEY=your-key-here
APIFY_API_TOKEN=your-token-here
REDIS_URL=redis://host:port
```

---

## 🔗 Quick Links

- **Full Detailed Guide:** `ENVIRONMENT_VARIABLES_GUIDE.md`
- **Render Setup:** `RENDER_COMPLETE_SETUP.md`
- **Database Setup:** `RENDER_DATABASE_SETUP.md`

---

## 💡 Pro Tips

1. **Start with minimum 4 variables** - Backend will start
2. **Add APIs one by one** - Test each as you add them
3. **Use free tiers first** - Upgrade only if needed
4. **Monitor usage** - Set up alerts to avoid overages
5. **Keep secrets safe** - Never commit to Git

---

**Need help?** Check `ENVIRONMENT_VARIABLES_GUIDE.md` for step-by-step instructions for each API key!
