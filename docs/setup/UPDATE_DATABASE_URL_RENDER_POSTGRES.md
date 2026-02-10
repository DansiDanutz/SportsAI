# ✅ Update DATABASE_URL with Render PostgreSQL

## ✅ Connection String Found!

```
postgresql://sportingpostgres_user:7nJOUB0W5dTvmP4LjDQCHvq7dbkfmywa@dpg-d5ih1eshg0os738jia6g-a.virginia-postgres.render.com/sportingpostgres
```

---

## ✅ Step 1: Update DATABASE_URL in Render Web Service

### In Render Dashboard:

1. Go to **Web Service** (`sportsapiai`)
2. Click **"Environment"** tab
3. Find `DATABASE_URL`
4. **Replace** with the connection string above:
   ```
   postgresql://sportingpostgres_user:7nJOUB0W5dTvmP4LjDQCHvq7dbkfmywa@dpg-d5ih1eshg0os738jia6g-a.virginia-postgres.render.com/sportingpostgres
   ```
5. **Save changes** (will trigger redeploy)
6. **Wait for redeploy** to complete

---

## ✅ Step 2: Verify Connection String

After redeploy:

1. **Render Dashboard** → `sportsapiai` → **Shell**
2. **Run:**
   ```bash
   echo $DATABASE_URL
   ```
3. **Should show** the Render PostgreSQL connection string

---

## ✅ Step 3: Run Migrations

After verifying:

1. **In Render Shell:**
   ```bash
   cd Sports_Ai/backend
   npx prisma migrate deploy
   ```

**This should work now!** ✅

---

## ✅ Expected Result:

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "sportingpostgres"...

✅ Applied migration `20260110221336_init`
✅ Applied migration `20260110224459_add_user_role`
... (more migrations)

All migrations have been successfully applied.
```

---

**Update DATABASE_URL in Render Web Service now!**
