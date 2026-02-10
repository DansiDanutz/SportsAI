# 🔧 Fix Migration Provider Mismatch

## Error:
```
The datasource provider `postgresql` specified in your schema does not match the one specified in the migration_lock.toml, `sqlite`.
```

**Problem:** Migrations were created for SQLite, but we're using PostgreSQL.

---

## ✅ Solution 1: Use `prisma db push` (Quick Fix)

**This syncs schema without migrations:**

```bash
npx prisma db push
```

**This will:**
- ✅ Create all tables in PostgreSQL
- ✅ Skip migration history
- ✅ Works immediately

---

## ✅ Solution 2: Reset Migrations (Clean Start)

**If you want proper migration history:**

```bash
# Remove old migrations
rm -rf prisma/migrations

# Create new migration for PostgreSQL
npx prisma migrate dev --name init_postgresql
```

**Then deploy:**
```bash
npx prisma migrate deploy
```

---

## ✅ Solution 3: Fix migration_lock.toml

**Update the lock file:**

```bash
# Edit migration_lock.toml
echo 'provider = "postgresql"' > prisma/migrations/migration_lock.toml
```

**Then try deploy again:**
```bash
npx prisma migrate deploy
```

---

## 🎯 Recommended: Use Solution 1 (db push)

**In Render Shell:**

```bash
cd ~/project/src/Sports_Ai/backend
npx prisma db push
```

**This is fastest and will create all tables!**

---

**Try `npx prisma db push` first - it's the quickest solution!**
