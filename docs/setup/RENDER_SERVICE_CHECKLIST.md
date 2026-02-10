# ✅ Render Web Service Configuration Checklist

## Service Details
- **Name:** sportsapiai
- **URL:** https://sportsapiai.onrender.com
- **Service ID:** srv-d5ih2qd6ubrc738kh8s0
- **Language:** Node ✅
- **Instance:** Starter ✅

## Required Configuration

### 1. Source Code ✅
- Repository: `DansiDanutz/SportsAI`
- Branch: `main`

### 2. Root Directory ⚠️ MUST SET
```
Sports_Ai/backend
```

### 3. Build Command ⚠️ MUST SET
```bash
npm install && npm run build
```

### 4. Start Command ⚠️ MUST SET
```bash
npm start
```

### 5. Environment Variables ⚠️ MUST ADD ALL

#### Database (CRITICAL)
```
DATABASE_URL=postgresql://username:password@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres
```
**Get this from:** Render Dashboard → PostgreSQL → Connections → Internal Database URL

#### Core Settings (REQUIRED)
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
CORS_ORIGIN=https://sports-ai-one.vercel.app
```

#### External APIs (Add your keys)
```
THE_ODDS_API_KEY=your-key-here
API_SPORTS_KEY=your-key-here
THE_SPORTS_DB_KEY=your-key-here
SPORTMONKS_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here
```

#### Feature Flags
```
ENABLE_LIVE_ODDS=true
ENABLE_ARBITRAGE_DETECTION=true
ENABLE_AI_INSIGHTS=false
```

## How to Configure in Render Dashboard

1. **Go to:** Render Dashboard → Your Web Service (`sportsapiai`)

2. **Settings Tab:**
   - Scroll to "Root Directory"
   - Set: `Sports_Ai/backend`
   - Scroll to "Build Command"
   - Set: `npm install && npm run build`
   - Scroll to "Start Command"
   - Set: `npm start`

3. **Environment Tab:**
   - Click "Add Environment Variable"
   - Add each variable from the list above
   - **Most Important:** `DATABASE_URL` (get from PostgreSQL service)

4. **Save Changes:**
   - Render will auto-deploy after saving

## After Configuration

### Step 1: Wait for Build
- Check "Events" or "Logs" tab
- Wait for build to complete

### Step 2: Run Database Migrations
1. Go to Render Dashboard → Your Service
2. Click "Shell" tab
3. Run:
   ```bash
   cd Sports_Ai/backend
   npx prisma migrate deploy
   ```

### Step 3: Verify Deployment
- Check URL: https://sportsapiai.onrender.com/health
- Should return: `{"status":"ok"}` or similar

### Step 4: Update Frontend
- Go to Vercel Dashboard
- Add environment variable:
  ```
  VITE_API_URL=https://sportsapiai.onrender.com
  ```
- Redeploy frontend

## Troubleshooting

### Build Fails
- Check Root Directory is `Sports_Ai/backend`
- Verify Build Command: `npm install && npm run build`
- Check logs for specific errors

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Use Internal Database URL (not External)
- Check database is running

### Service Won't Start
- Check Start Command: `npm start`
- Verify `dist/index.js` exists after build
- Check PORT is set (Render sets automatically)

### CORS Errors
- Verify `CORS_ORIGIN` includes frontend URL
- Check frontend `VITE_API_URL` matches backend URL

## Quick Test Commands

After deployment, test these endpoints:
- Health: `https://sportsapiai.onrender.com/health`
- API Docs: `https://sportsapiai.onrender.com/api/docs` (if enabled)
