# 🚀 SportsAI Backend - Render Deployment Guide

## Render Web Service Configuration

Use these exact settings in the Render dashboard:

### Basic Settings

**Name:** `sportsapiai` (or your preferred name)

**Source Code:**
- Repository: `DansiDanutz/SportsAI`
- Branch: `main`

**Environment:** `Production`

**Language:** ⚠️ **Change from Python to Node**

**Root Directory:** `Sports_Ai/backend`

**Region:** `Oregon (US West)` (or your preferred region)

### Build & Start Commands

**Build Command:**
```bash
npm install && npm run build
```

This will:
1. Install all dependencies
2. Generate Prisma client (`prisma generate`)
3. Compile TypeScript (`tsc`)

**Start Command:**
```bash
npm start
```

This runs: `node dist/index.js`

### Instance Type

**Recommended:** `Starter ($7/month)` or higher
- Free tier may not have enough resources
- Backend needs at least 512 MB RAM
- For production: `Standard ($25/month)` recommended

### Environment Variables

Add these in the Render dashboard under "Environment Variables":

#### Required (Core)
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
CORS_ORIGIN=https://sports-ai-one.vercel.app,https://your-frontend-url.vercel.app
NODE_ENV=production
PORT=10000
```

#### Database & Cache
```
REDIS_URL=redis://host:port (optional but recommended)
TIMESCALE_URL=postgresql://... (optional, for time-series data)
```

#### External APIs (Required for full functionality)
```
THE_ODDS_API_KEY=your-the-odds-api-key
API_SPORTS_KEY=your-api-sports-key
THE_SPORTS_DB_KEY=your-the-sports-db-key (or '1' for free tier)
SPORTMONKS_KEY=your-sportmonks-key (optional)
OPENROUTER_API_KEY=your-openrouter-key (for AI features)
```

#### OAuth (Optional)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-render-url.onrender.com/auth/google/callback
```

#### Feature Flags
```
ENABLE_LIVE_ODDS=true
ENABLE_ARBITRAGE_DETECTION=true
ENABLE_AI_INSIGHTS=false
```

#### Payments (Optional)
```
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

### Important Notes

1. **Port:** Render sets `PORT` automatically. Your backend reads `process.env.PORT || 4000`, so it will use Render's port.

2. **CORS_ORIGIN:** Must include your Vercel frontend URL:
   ```
   https://sports-ai-one.vercel.app
   ```

3. **Database:** You'll need a PostgreSQL database. Render offers PostgreSQL as a separate service. Create one and use its connection string for `DATABASE_URL`.

4. **Prisma Migrations:** After deployment, you may need to run migrations:
   ```bash
   # Via Render Shell or locally
   cd Sports_Ai/backend
   npx prisma migrate deploy
   # Or
   npx prisma db push
   ```

5. **Health Check:** Render will check `https://your-service.onrender.com/health` (if you have a health endpoint)

### Step-by-Step Setup

1. **Create PostgreSQL Database on Render:**
   - Go to Render Dashboard → New → PostgreSQL
   - Name it (e.g., `sportsai-db`)
   - Copy the `Internal Database URL` or `External Database URL`
   - Use it for `DATABASE_URL`

2. **Create Web Service:**
   - Use the settings above
   - Set all environment variables
   - Click "Create Web Service"

3. **After First Deploy:**
   - Run database migrations via Render Shell:
     ```bash
     cd Sports_Ai/backend
     npx prisma migrate deploy
     ```

4. **Update Frontend:**
   - Update `VITE_API_URL` in Vercel to point to your Render backend URL
   - Example: `https://sportsapiai.onrender.com`

### Testing

Once deployed, test your backend:
- Health endpoint: `https://your-service.onrender.com/health`
- API docs: `https://your-service.onrender.com/api/docs` (if Swagger is enabled)

### Troubleshooting

**Build fails:**
- Check that Root Directory is set to `Sports_Ai/backend`
- Verify Node.js version (should be 20+)

**Database connection fails:**
- Verify `DATABASE_URL` is correct
- Check if database is accessible from Render
- Run migrations: `npx prisma migrate deploy`

**CORS errors:**
- Ensure `CORS_ORIGIN` includes your frontend URL
- Check that frontend is using correct API URL

**Port issues:**
- Render sets PORT automatically - don't override it
- Backend reads `process.env.PORT || 4000`
