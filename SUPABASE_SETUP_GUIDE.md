# 🗄️ Supabase Database Setup for Render

## ⚠️ Important: DATABASE_URL Configuration

Your backend uses **Prisma** which expects `DATABASE_URL` (not `SUPABASE_URL`).

You need to:
1. **Get the PostgreSQL connection string from Supabase**
2. **Set it as `DATABASE_URL` in Render**
3. **Keep `SUPABASE_URL` and `SUPABASE_KEY`** if you plan to use Supabase client SDK later

---

## Step 1: Get Supabase Connection String

### Method 1: From Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll down to **"Connection string"** section
5. Find **"Connection pooling"** tab (recommended for serverless)
6. Copy the **"URI"** connection string
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Or use **"Session mode"** if you prefer:
     - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`

### Method 2: From Connection Info

1. Supabase Dashboard → **Settings** → **Database**
2. Under **"Connection info"**, you'll see:
   - **Host:** `db.[project-ref].supabase.co`
   - **Database name:** `postgres`
   - **Port:** `5432`
   - **User:** `postgres`
   - **Password:** (click "Reveal" to see it)

3. **Construct the connection string:**
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Method 3: Using Connection Pooling (Recommended for Render)

For better performance with serverless/Render, use **connection pooling**:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Benefits:**
- Better for serverless environments
- Handles connection limits better
- More efficient resource usage

---

## Step 2: Update Render Environment Variables

### Required Changes:

1. **Update `DATABASE_URL`:**
   - Go to Render Dashboard → Your Service → Environment
   - Find `DATABASE_URL`
   - Replace with your Supabase connection string
   - **Use connection pooling format** (recommended)

2. **Keep `SUPABASE_URL` and `SUPABASE_KEY`:**
   - These are for Supabase client SDK (if you use it later)
   - Not required for Prisma, but keep them if set

### Example DATABASE_URL Format:

```
postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Replace:**
- `abcdefghijklmnop` → Your Supabase project reference
- `[YOUR-PASSWORD]` → Your database password
- `us-east-1` → Your Supabase region

---

## Step 3: Run Database Migrations

After updating `DATABASE_URL`, you need to run Prisma migrations:

1. **Go to Render Dashboard** → Your Service (`sportsapiai`)
2. **Click "Shell"** tab
3. **Run these commands:**

```bash
cd Sports_Ai/backend
npx prisma migrate deploy
```

**Or if migrations don't exist:**

```bash
cd Sports_Ai/backend
npx prisma db push
```

This will create all your database tables in Supabase.

---

## Step 4: Verify Connection

### Check Logs:

1. Render Dashboard → Your Service → **Logs**
2. Look for:
   - ✅ `DATABASE_URL: ✅ set`
   - ✅ `🚀 Starting SportsAI Backend...`
   - ✅ `Server running on http://localhost:XXXX`

### Test Database Connection:

1. Go to Supabase Dashboard → **Table Editor**
2. You should see tables created:
   - `User`
   - `Sport`
   - `League`
   - `Team`
   - `Event`
   - `OddsQuote`
   - `ArbitrageOpportunity`
   - etc.

---

## 🔍 Troubleshooting

### Error: "Connection refused" or "Connection timeout"

**Solution:**
- Check if you're using **connection pooling** URL (port 6543)
- Verify password is correct
- Check Supabase project is active
- Ensure IP allowlist allows Render IPs (Supabase free tier allows all by default)

### Error: "Too many connections"

**Solution:**
- Use **connection pooling** URL (port 6543 with `?pgbouncer=true`)
- This is better for serverless environments

### Error: "Relation does not exist"

**Solution:**
- Run migrations: `npx prisma migrate deploy`
- Or push schema: `npx prisma db push`

---

## 📋 Current Environment Variables Checklist

Based on what you have set:

✅ **Core (Required):**
- [x] `NODE_ENV=production`
- [x] `DATABASE_URL` ← **Update this with Supabase connection string**
- [x] `JWT_SECRET`
- [x] `CORS_ORIGIN`

✅ **APIs (All Set):**
- [x] `THE_ODDS_API_KEY`
- [x] `API_SPORTS_KEY`
- [x] `THE_SPORTS_DB_KEY`
- [x] `OPENROUTER_API_KEY`
- [x] `SPORTMONKS_KEY`

✅ **Supabase (Optional - for future use):**
- [x] `SUPABASE_URL` (keep for Supabase client SDK)
- [x] `SUPABASE_KEY` (keep for Supabase client SDK)

---

## 🚀 Next Steps After Setup

1. ✅ Update `DATABASE_URL` with Supabase connection string
2. ✅ Run migrations via Render Shell
3. ✅ Check deployment logs for success
4. ✅ Test API endpoints
5. ✅ Update frontend `VITE_API_URL` to point to Render backend

---

## 💡 Pro Tips

1. **Use Connection Pooling:** Always use port `6543` with `?pgbouncer=true` for Render
2. **Password Security:** Never commit passwords to Git
3. **Backup:** Supabase provides automatic backups (check your plan)
4. **Monitoring:** Check Supabase Dashboard → Database → Logs for connection issues

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/database/connecting-to-postgres
- Prisma + Supabase: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase
