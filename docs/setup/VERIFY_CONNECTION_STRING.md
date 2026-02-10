# ✅ Verify Your Connection String

## Check What Render is Actually Using

The error shows it's still connecting to port **6543** (pooling), which means either:
1. The environment variable hasn't reloaded
2. Render needs to redeploy
3. The shell is using cached env vars

---

## Step 1: Verify DATABASE_URL in Shell

**In Render Shell, run:**

```bash
echo $DATABASE_URL
```

**This will show what connection string Render is actually using.**

---

## Step 2: Check What It Should Be

**Your connection string should be:**

```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**Key check:**
- ✅ Port should be `5432` (NOT `6543`)
- ✅ Host should be `db.nkaahfrobkvtskolhokj.supabase.co` (NOT `aws-0-us-east-1.pooler.supabase.com`)
- ✅ Username should be `postgres` (NOT `postgres.nkaahfrobkvtskolhokj`)

---

## Step 3: If It's Wrong

If `echo $DATABASE_URL` shows port 6543 or pooling URL:

1. **Go to Render Dashboard** → `sportsapiai` → **Environment**
2. **Verify** `DATABASE_URL` shows the direct connection (port 5432)
3. **If it's correct there**, but shell shows wrong:
   - **Close and reopen the shell** (env vars reload)
   - **Or wait for service to fully redeploy**

---

## Step 4: Test Connection Directly

**In Render Shell, test the connection:**

```bash
psql $DATABASE_URL -c "SELECT version();"
```

**If this works**, the connection string is correct and the issue is elsewhere.

---

## Step 5: If Password Has Special Characters

If connection still fails, try URL-encoding the password:

**In Render Environment, update DATABASE_URL to:**

```
postgresql://postgres:Seme05041981%21@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

(Note: `!` becomes `%21`)

---

**First, run `echo $DATABASE_URL` in the shell to see what it's actually using!**
