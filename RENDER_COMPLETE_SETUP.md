# 🚀 Complete Render Setup for SportsAI Backend

## Step 1: Get Your Database Connection String

1. Go to Render Dashboard → Your PostgreSQL service (`sportingpostgres`)
2. Click on **"Connections"** tab
3. Copy the **"Internal Database URL"** (for Render-to-Render connections)
   - Format: `postgresql://username:password@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres`
4. **Save this URL** - you'll need it for the Web Service

## Step 2: Configure Render Web Service

### Basic Settings

**Name:** `sportsapiai`

**Source Code:**
- Repository: `DansiDanutz/SportsAI`
- Branch: `main`

**Environment:** `Production`

**Language:** ⚠️ **Node** (NOT Python!)

**Root Directory:** `Sports_Ai/backend`

**Region:** `Oregon (US West)` (same as your database)

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Instance Type:** `Starter ($7/month)` or `Standard ($25/month)` recommended

### Environment Variables

Add ALL of these in the Render Web Service:

#### Database (Required)
```
DATABASE_URL=postgresql://username:password@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres
```
⚠️ Replace `username:password` with your actual database credentials from Render!

#### Core Settings (Required)
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this
CORS_ORIGIN=https://sports-ai-one.vercel.app
```

#### Cache (Optional but Recommended)
```
REDIS_URL=redis://your-redis-url
```
(You can add Redis later if needed)

#### External APIs (Required for full functionality)
```
THE_ODDS_API_KEY=your-the-odds-api-key
API_SPORTS_KEY=your-api-sports-key
THE_SPORTS_DB_KEY=your-the-sports-db-key
SPORTMONKS_KEY=your-sportmonks-key
OPENROUTER_API_KEY=your-openrouter-key
```

#### Feature Flags
```
ENABLE_LIVE_ODDS=true
ENABLE_ARBITRAGE_DETECTION=true
ENABLE_AI_INSIGHTS=false
```

## Step 3: Deploy and Run Migrations

### After First Deployment

1. **Go to Render Dashboard → Your Web Service**
2. **Click "Shell"** (opens a terminal)
3. **Run these commands:**

```bash
cd Sports_Ai/backend
npx prisma migrate deploy
```

If migrations don't exist or fail, use:
```bash
npx prisma db push
```

This will create all the database tables.

### Verify Database Connection

After migrations, check logs to see if backend connected successfully.

## Step 4: Update Frontend (Vercel)

Once your Render backend is deployed:

1. **Get your Render backend URL:**
   - Format: `https://sportsapiai.onrender.com`

2. **Update Vercel Frontend:**
   - Go to Vercel Dashboard → Your project → Settings → Environment Variables
   - Add/Update: `VITE_API_URL=https://sportsapiai.onrender.com`
   - Redeploy frontend

## Step 5: Test Your Setup

### Backend Health Check
```
https://sportsapiai.onrender.com/health
```

### API Documentation (if Swagger enabled)
```
https://sportsapiai.onrender.com/api/docs
```

### Frontend Connection
- Open your Vercel app: `https://sports-ai-one.vercel.app`
- Check browser console for API connection status
- Try logging in or accessing API endpoints

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check that database is in same region
- Ensure you're using **Internal Database URL** (not External)
- Check Render logs for connection errors

### Migration Issues
- Run `npx prisma db push` if migrations fail
- Check Prisma schema is correct
- Verify database has proper permissions

### CORS Issues
- Ensure `CORS_ORIGIN` includes your Vercel frontend URL
- Check frontend is using correct `VITE_API_URL`
- Verify backend CORS settings allow your frontend domain

### Port Issues
- Render sets `PORT` automatically - don't override
- Backend reads `process.env.PORT || 4000`
- Check Render logs for port binding errors

## Quick Reference

**Database:** `sportingpostgres`  
**Service ID:** `dpg-d5ih1eshg0os738jia6g-a`  
**Backend URL:** `https://sportsapiai.onrender.com` (after deployment)  
**Frontend URL:** `https://sports-ai-one.vercel.app`

## Next Steps After Setup

1. ✅ Database created
2. ⏳ Web Service configured and deployed
3. ⏳ Migrations run
4. ⏳ Frontend connected to backend
5. ⏳ Test full application flow
