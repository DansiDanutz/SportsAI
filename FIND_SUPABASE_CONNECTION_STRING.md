# 🔍 Finding Supabase Connection String - Exact Steps

## What You're Seeing Now

You're in **Database Settings** which shows:
- Connection pooling configuration
- SSL settings
- Network restrictions

**But NOT the actual connection string!**

---

## ✅ Method 1: Find Connection String Section

### Step 1: Look for "Connection string" Tab/Button

On the same Database Settings page, look for:

1. **A tab or button** that says:
   - **"Connection string"**
   - **"Connection info"**
   - **"URI"**
   - **"Connection details"**

2. **OR** scroll to the **TOP** of the Database Settings page
   - There might be a section above "Reset database password"
   - Look for tabs like: `[Settings] [Connection string] [Configuration]`

### Step 2: Click on "Connection string" Tab

Once you find it, click it. You should see something like:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## ✅ Method 2: Get from Project Settings (Alternative)

If you can't find it in Database Settings:

1. **Go back** to Supabase Dashboard (main page)
2. Click **"Project Settings"** (gear icon, usually bottom left)
3. Click **"Database"** in the left sidebar
4. Look for **"Connection string"** section
5. Click **"Connection pooling"** tab
6. Copy the connection string

---

## ✅ Method 3: Construct from Connection Info

If you see connection details somewhere, you can construct it:

### What You Need:
- **Host:** Usually `db.[project-ref].supabase.co` or `aws-0-[region].pooler.supabase.com`
- **Port:** `6543` (for pooling) or `5432` (for direct)
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** From "Reset database password" section (click "Reveal" or "Show")

### Format for Connection Pooling (Recommended):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Format for Direct Connection:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## 🎯 What to Do Right Now

### Option A: Look for Connection String Tab
1. On the Database Settings page
2. Look at the **TOP** - are there tabs?
3. Look for **"Connection string"** or **"Connection info"** tab
4. Click it
5. Copy the string shown

### Option B: Check Project Settings
1. Click **"Project Settings"** (gear icon)
2. Click **"Database"**
3. Look for **"Connection string"** section
4. Click **"Connection pooling"** tab
5. Copy the string

### Option C: Get Project Reference
1. Look at your Supabase project URL
2. It's usually: `https://app.supabase.com/project/[PROJECT-REF]`
3. The `[PROJECT-REF]` is a long string like `abcdefghijklmnop`
4. Get your password from "Reset database password" section
5. I can help you construct it if you share:
   - Project reference (from URL)
   - Region (might be in the URL or settings)
   - Password (from reset password section)

---

## 📋 Quick Checklist

- [ ] Looked for "Connection string" tab on Database Settings page
- [ ] Checked Project Settings → Database → Connection string
- [ ] Found the connection string (starts with `postgresql://`)
- [ ] Copied the entire string
- [ ] Ready to paste in Render as `DATABASE_URL`

---

## 🆘 Still Can't Find It?

**Tell me:**
1. What's your Supabase project URL? (the part after `/project/`)
2. Can you see "Reset database password" section? (to get password)
3. Do you see any tabs at the top of Database Settings page?

Then I can help you construct the connection string manually!
