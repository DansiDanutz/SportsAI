# 🔧 Fix Database Connection Error

## Error:
```
Can't reach database server at `db.nkaahfrobkvtskolhokj.supabase.co:5432`
```

---

## 🔴 Solution 1: Allow Render IPs in Supabase (Most Likely)

### Step 1: Check Network Restrictions
1. Go to **Supabase Dashboard**
2. **Settings** → **Database**
3. Scroll to **"Network Restrictions"** section
4. Check if there are any restrictions

### Step 2: Allow All IPs (For Testing)
1. In **Network Restrictions**, click **"Add restriction"**
2. Or if it says **"Restrict all access"**, make sure it's **NOT** restricted
3. For free tier, usually **"Your database can be accessed by all IP addresses"** is fine

### Step 3: If Restricted
- Remove restrictions temporarily
- Or add Render's IP ranges (but allowing all is easier for testing)

---

## 🔴 Solution 2: Use Connection Pooling URL

The direct connection (port 5432) might be blocked. Try connection pooling instead:

### Update DATABASE_URL in Render:

1. Go to **Render Dashboard** → `sportsapiai` → **Environment**
2. Find `DATABASE_URL`
3. **Replace** with connection pooling version:

```
postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Key differences:**
- Uses `postgres.nkaahfrobkvtskolhokj` (with dot)
- Uses `aws-0-us-east-1.pooler.supabase.com` (pooler)
- Uses port `6543` (pooling port)
- Has `?pgbouncer=true` at the end

4. **Save changes** (will trigger redeploy)
5. **Wait for redeploy** to complete
6. **Try migration again** in Shell

---

## 🔴 Solution 3: Check Supabase Project Status

1. Go to **Supabase Dashboard**
2. Check if project is **active** (not paused)
3. Free tier projects can pause after inactivity
4. If paused, **resume** the project

---

## 🔴 Solution 4: Verify Connection String

Double-check your `DATABASE_URL` in Render:
- Password is correct: `Seme05041981!`
- Project reference is correct: `nkaahfrobkvtskolhokj`
- No extra spaces or characters

---

## ✅ Recommended Action Order:

1. **First:** Check Supabase Network Restrictions (allow all IPs)
2. **Second:** Switch to connection pooling URL (port 6543)
3. **Third:** Verify Supabase project is active
4. **Fourth:** Try migration again

---

## After Fixing:

Run migration again:
```bash
npx prisma migrate deploy
```

---

**Start with Solution 1 (Network Restrictions) - that's usually the issue!**
