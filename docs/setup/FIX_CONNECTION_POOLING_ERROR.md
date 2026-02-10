# 🔧 Fix "Tenant or user not found" Error

## Error:
```
FATAL: Tenant or user not found
```

This means the connection pooling username format is incorrect.

---

## ✅ Solution: Get Exact Connection String from Supabase

### Step 1: Get Connection String from Supabase Dashboard

1. Go to **Supabase Dashboard**
2. **Project Settings** (gear icon) → **Database**
3. Look for **"Connection string"** section
4. Click **"Connection pooling"** tab
5. **Copy the EXACT connection string** shown there

**OR**

### Step 2: Use Direct Connection Format

If connection pooling doesn't work, try the direct connection:

**Update DATABASE_URL in Render to:**

```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**Key differences:**
- Uses `postgres` (not `postgres.nkaahfrobkvtskolhokj`)
- Uses `db.nkaahfrobkvtskolhokj.supabase.co` (direct host)
- Uses port `5432` (direct port)
- No `?pgbouncer=true` parameter

---

## 🔍 Alternative: Check Supabase Connection String Format

The connection pooling format might be different. Common formats:

### Format 1 (What we tried):
```
postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Format 2 (Try this):
```
postgresql://postgres:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Format 3 (Direct - Most Reliable):
```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

---

## ✅ Recommended Action:

1. **First:** Try Format 3 (Direct connection) - most reliable
2. **Update DATABASE_URL** in Render with Format 3
3. **Save and wait for redeploy**
4. **Try migration again**

---

## After Updating:

Run migration again:
```bash
npx prisma migrate deploy
```

---

**Try the direct connection format first - it's more reliable!**
