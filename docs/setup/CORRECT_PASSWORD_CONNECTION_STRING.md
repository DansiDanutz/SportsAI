# ✅ Correct Password Connection String

## Password: `Seme05041981!`

---

## ✅ Connection String (Without Encoding):

```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

---

## ✅ Connection String (With URL Encoding - Try This If First Doesn't Work):

```
postgresql://postgres:Seme05041981%21@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**Note:** `!` is encoded as `%21`

---

## 📋 Update in Render:

1. **Render Dashboard** → `sportsapiai` → **Environment**
2. Find `DATABASE_URL`
3. **Replace** with the connection string above (try without encoding first)
4. **Save changes** (will trigger redeploy)
5. **Wait for redeploy** to complete
6. **Close and reopen Shell** (to reload env vars)
7. **Verify:** `echo $DATABASE_URL`
8. **Run migration:** `npx prisma migrate deploy`

---

## 🔧 If Still Doesn't Work:

Try session pooler format:

```
postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

**Update DATABASE_URL in Render with the correct password!**
