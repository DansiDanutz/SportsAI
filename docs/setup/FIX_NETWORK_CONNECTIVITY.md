# 🔧 Fix "Can't reach database server" Error

## Error:
```
P1001: Can't reach database server at `db.nkaahfrobkvtskolhokj.supabase.co:5432`
```

This is a **network connectivity issue**, not a connection string format issue.

---

## ✅ Solution 1: Check Supabase Network Restrictions

### Step 1: Verify Network Access
1. Go to **Supabase Dashboard**
2. **Settings** → **Database**
3. Scroll to **"Network Restrictions"** section
4. **Check if it says:**
   - ✅ "Your database can be accessed by all IP addresses" → Good!
   - ❌ "Restrict all access" or has IP restrictions → Problem!

### Step 2: Allow All IPs (If Restricted)
1. If restricted, click **"Add restriction"** or **"Allow all"**
2. Make sure **all IP addresses** are allowed
3. Save changes

---

## ✅ Solution 2: URL-Encode Password

The `!` character in your password might need encoding. Try:

**Update DATABASE_URL in Render to:**

```
postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**Key change:** `[PASSWORD]` → `[PASSWORD]`

---

## ✅ Solution 3: Test Connection Directly

**In Render Shell, test the connection:**

```bash
psql "postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT version();"
```

**If this fails**, it confirms network/connectivity issue.

---

## ✅ Solution 4: Check Supabase Project Status

1. **Supabase Dashboard** → Your project
2. **Check if project is active** (not paused)
3. Free tier projects can pause after inactivity
4. **If paused**, resume the project

---

## ✅ Solution 5: Use Connection Pooling (Port 5432 Session Mode)

Try session pooler instead of direct connection:

**Update DATABASE_URL in Render to:**

```
postgresql://postgres.nkaahfrobkvtskolhokj:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Key differences:**
- Username: `postgres.nkaahfrobkvtskolhokj` (with project ref)
- Host: `aws-0-us-east-1.pooler.supabase.com` (pooler)
- Port: `5432` (session mode)
- Password: `[PASSWORD]` (or try `[PASSWORD]`)

---

## 🎯 Action Plan (Try in Order):

1. **First:** Check Supabase Network Restrictions (allow all IPs)
2. **Second:** Try URL-encoding password (`%21` instead of `!`)
3. **Third:** Test connection with `psql` command
4. **Fourth:** Verify Supabase project is active
5. **Fifth:** Try session pooler format

---

## 🔍 Debugging Commands

**In Render Shell:**

```bash
# Test if host is reachable
ping db.nkaahfrobkvtskolhokj.supabase.co

# Test port connectivity
nc -zv db.nkaahfrobkvtskolhokj.supabase.co 5432

# Test connection
psql "postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT 1;"
```

---

**Start with Solution 1 (Network Restrictions) - that's usually the issue!**
