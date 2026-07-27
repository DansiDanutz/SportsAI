# ✅ Use Connection Pooling - IPv4 Compatible

## ⚠️ Direct Connection Failed (IPv6 Issue)

We already tried the direct connection format multiple times - it fails with IPv6.

**Time to use connection pooling!**

---

## ✅ Update DATABASE_URL to Connection Pooling

**In Render Dashboard → `sportsapiai` → Environment:**

**Change `DATABASE_URL` from:**
```
postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**To:**
```
postgresql://postgres.nkaahfrobkvtskolhokj:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Key changes:**
- Username: `postgres` → `postgres.nkaahfrobkvtskolhokj` (adds project ref)
- Host: `db.nkaahfrobkvtskolhokj.supabase.co` → `aws-0-us-east-1.pooler.supabase.com` (pooler)
- Port: `5432` (same - session mode)
- Password: `[PASSWORD]` (same)

---

## 📋 Steps:

1. **Render Dashboard** → `sportsapiai` → **Environment**
2. **Find `DATABASE_URL`**
3. **Replace** with connection pooling string above
4. **Save changes** (triggers redeploy)
5. **Wait for redeploy** to complete
6. **Close and reopen Shell**
7. **Verify:** `echo $DATABASE_URL` (should show pooler hostname)
8. **Test:** `psql '$DATABASE_URL' -c "SELECT * FROM connection_test;"`
9. **If works:** `npx prisma migrate deploy`

---

## ✅ Why This Will Work:

- ✅ Uses IPv4 (not IPv6)
- ✅ Connection pooling is designed for serverless/Render
- ✅ Same port 5432 (session mode)
- ✅ Recommended by Supabase for serverless environments

---

**Update to connection pooling format now - this is the solution!**
