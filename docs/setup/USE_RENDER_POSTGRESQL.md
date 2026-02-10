# ✅ Use Render PostgreSQL Database

## ✅ Switch from Supabase to Render PostgreSQL

Much better choice! Render PostgreSQL works perfectly with Render services - no IPv6 issues!

---

## 🔍 Step 1: Get Render PostgreSQL Connection String

### In Render Dashboard:

1. Go to **Render Dashboard**
2. Find your **PostgreSQL** service (probably named `sportingpostgres` or similar)
3. Click on it
4. Go to **"Connections"** tab
5. Copy the **"Internal Database URL"** (for Render-to-Render connections)

**Format should be:**
```
postgresql://username:password@dpg-xxxxx-xxxxx/sportingpostgres
```

---

## ✅ Step 2: Update DATABASE_URL in Render Web Service

### In Render Dashboard:

1. Go to **Web Service** (`sportsapiai`)
2. **Environment** tab
3. Find `DATABASE_URL`
4. **Replace** with the Render PostgreSQL Internal Database URL
5. **Save changes** (triggers redeploy)

---

## ✅ Step 3: Run Migrations

After updating DATABASE_URL:

1. **Render Dashboard** → `sportsapiai` → **Shell**
2. **Run:**
   ```bash
   cd Sports_Ai/backend
   npx prisma migrate deploy
   ```

---

## ✅ Benefits of Render PostgreSQL:

- ✅ No IPv6 issues
- ✅ Same network (faster)
- ✅ No connection pooling needed
- ✅ Works perfectly with Render services
- ✅ Free tier available

---

**Get the Internal Database URL from Render PostgreSQL and update DATABASE_URL!**
