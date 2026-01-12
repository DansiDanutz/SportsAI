# 🔧 Fix IPv6 "Network is unreachable" Error

## Error:
```
connection to server at "db.nkaahfrobkvtskolhokj.supabase.co" (2a05:d018:135e:1671:8e43:522a:5678:a011), port 5432 failed: Network is unreachable
```

**Problem:** Render is trying to connect via **IPv6**, but Render doesn't support IPv6 or Supabase's IPv6 endpoint isn't accessible.

---

## ✅ Solution 1: Use Connection Pooling (IPv4 Compatible)

Connection pooling uses IPv4 and works better with Render.

### Update DATABASE_URL in Render to:

```
postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Key differences:**
- Username: `postgres.nkaahfrobkvtskolhokj` (with project ref)
- Host: `aws-0-us-east-1.pooler.supabase.com` (pooler - IPv4)
- Port: `5432` (session mode)
- Password: `Seme05041981!`

---

## ✅ Solution 2: Force IPv4 with Direct Connection

If you want to keep direct connection, try using the IPv4 hostname directly:

### Get IPv4 Hostname from Supabase:

1. **Supabase Dashboard** → **Project Settings** → **Database**
2. Look for **"Connection string"** → **"Direct connection"**
3. Check if there's an IPv4-specific hostname
4. Or use connection pooling (recommended)

---

## ✅ Solution 3: Use Session Pooler (Port 5432)

Session pooler behaves like direct connection but uses IPv4:

```
postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**This is the recommended format for Render!**

---

## 🎯 Action Plan:

1. **Update DATABASE_URL** in Render to connection pooling format (Solution 1)
2. **Save changes** (triggers redeploy)
3. **Close and reopen Shell** (to reload env vars)
4. **Verify:** `echo $DATABASE_URL` (should show pooler hostname)
5. **Test:** `psql '$DATABASE_URL' -c "SELECT * FROM connection_test;"`
6. **Run migration:** `npx prisma migrate deploy`

---

## 🔍 Why This Happens:

- Supabase's direct connection (`db.xxx.supabase.co`) resolves to IPv6
- Render's network doesn't support IPv6 or can't reach Supabase's IPv6
- Connection pooling (`aws-0-xxx.pooler.supabase.com`) uses IPv4
- IPv4 is more compatible with Render's infrastructure

---

## ✅ Expected After Fix:

**Test connection:**
```bash
psql 'postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:5432/postgres' -c "SELECT * FROM connection_test;"
```

**Should work now!** ✅

---

**Update DATABASE_URL to use connection pooling (IPv4 compatible)!**
