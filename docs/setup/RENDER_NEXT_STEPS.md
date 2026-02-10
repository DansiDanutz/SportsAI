# ✅ Render Deployment - Next Steps Checklist

## Current Status

You have **all environment variables set** ✅

**Environment Variables Configured:**
- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL` (needs Supabase connection string)
- ✅ `JWT_SECRET`
- ✅ `CORS_ORIGIN`
- ✅ `THE_ODDS_API_KEY`
- ✅ `API_SPORTS_KEY`
- ✅ `THE_SPORTS_DB_KEY`
- ✅ `OPENROUTER_API_KEY`
- ✅ `SPORTMONKS_KEY`
- ✅ `SUPABASE_URL` (optional)
- ✅ `SUPABASE_KEY` (optional)

---

## 🔴 CRITICAL: Update DATABASE_URL

### Action Required:

1. **Get Supabase Connection String:**
   - Go to: https://app.supabase.com
   - Select your project
   - Settings → Database → Connection string
   - Copy **"Connection pooling"** URI (port 6543)

2. **Update in Render:**
   - Render Dashboard → `sportsapiai` → Environment
   - Find `DATABASE_URL`
   - Replace with Supabase connection string
   - Format: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`

3. **Save Changes** (will trigger redeploy)

---

## 📋 Complete Setup Checklist

### Step 1: Database Configuration ✅
- [x] Supabase project created
- [ ] **DATABASE_URL updated with Supabase connection string** ← DO THIS NOW
- [ ] Run migrations (after DATABASE_URL is set)

### Step 2: Run Database Migrations
After `DATABASE_URL` is updated:

1. Render Dashboard → `sportsapiai` → **Shell**
2. Run:
   ```bash
   cd Sports_Ai/backend
   npx prisma migrate deploy
   ```
3. Wait for completion

### Step 3: Verify Deployment
- [ ] Check Render logs for successful startup
- [ ] Look for: `Server running on http://localhost:XXXX`
- [ ] Check for any errors

### Step 4: Test Backend
- [ ] Health check: `https://sportsapiai.onrender.com/health`
- [ ] Should return: `{"status":"ok"}` or similar

### Step 5: Update Frontend
- [ ] Go to Vercel Dashboard
- [ ] Add/Update: `VITE_API_URL=https://sportsapiai.onrender.com`
- [ ] Redeploy frontend

### Step 6: Test Full Stack
- [ ] Open frontend: `https://sports-ai-one.vercel.app`
- [ ] Test login/registration
- [ ] Test API calls
- [ ] Check browser console for errors

---

## 🔍 How to Check Render Status

### Check Build Status:
1. Render Dashboard → `sportsapiai`
2. Look at **"Events"** tab
3. Check latest deployment status:
   - ✅ Green = Success
   - ⚠️ Yellow = Building
   - ❌ Red = Failed

### Check Logs:
1. Render Dashboard → `sportsapiai` → **Logs**
2. Look for:
   - `🚀 Starting SportsAI Backend...`
   - `DATABASE_URL: ✅ set`
   - `Server running on...`
   - Any error messages

### Check Service Health:
1. Visit: `https://sportsapiai.onrender.com/health`
2. Should return JSON response

---

## 🐛 Common Issues & Solutions

### Issue: Build Failed
**Check:**
- Build logs in Render
- TypeScript errors?
- Missing dependencies?

**Solution:**
- Check recent commits
- Verify `package.json` is correct
- Check build command: `npm install && npm run build`

### Issue: Service Won't Start
**Check:**
- Environment variables are set
- `DATABASE_URL` is correct
- Port is available

**Solution:**
- Verify all required env vars
- Check DATABASE_URL format
- Review startup logs

### Issue: Database Connection Failed
**Check:**
- `DATABASE_URL` format is correct
- Supabase project is active
- Password is correct

**Solution:**
- Use connection pooling URL (port 6543)
- Verify Supabase credentials
- Check Supabase Dashboard → Database → Logs

### Issue: CORS Errors
**Check:**
- `CORS_ORIGIN` includes frontend URL
- Frontend `VITE_API_URL` matches backend URL

**Solution:**
- Update `CORS_ORIGIN` with exact frontend URL
- Ensure no trailing slashes
- Check frontend API configuration

---

## 📊 Current Configuration Summary

**Backend URL:** `https://sportsapiai.onrender.com`  
**Frontend URL:** `https://sports-ai-one.vercel.app`  
**Database:** Supabase PostgreSQL  
**Status:** ⚠️ Waiting for DATABASE_URL update

---

## 🎯 Priority Actions

1. **🔴 HIGH:** Update `DATABASE_URL` with Supabase connection string
2. **🟡 MEDIUM:** Run database migrations
3. **🟢 LOW:** Test endpoints and update frontend

---

**Need Help?**
- Supabase Setup: See `SUPABASE_SETUP_GUIDE.md`
- Environment Variables: See `ENVIRONMENT_VARIABLES_GUIDE.md`
- Render Setup: See `RENDER_COMPLETE_SETUP.md`
