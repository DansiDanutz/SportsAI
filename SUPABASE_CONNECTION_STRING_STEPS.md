# 🔍 Step-by-Step: Get Supabase Connection String

## You're in the Right Place! ✅

You're in: **Settings → Database**

---

## Step 1: Find Connection String Section

1. **Scroll down** on the Database settings page
2. Look for a section called:
   - **"Connection string"** or
   - **"Connection info"** or
   - **"Connection pooling"**

It should be **below** the sections you listed (Schema Visualizer, Tables, etc.)

---

## Step 2: Look for These Options

You should see tabs or options like:
- **"URI"** 
- **"Connection pooling"**
- **"Session mode"**
- **"Transaction mode"**

---

## Step 3: Get the Connection String

### Option A: Connection Pooling (RECOMMENDED for Render)

1. Click on **"Connection pooling"** tab
2. You'll see a connection string that looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
3. **Copy this entire string** - this is your `DATABASE_URL`

### Option B: Session Mode (Alternative)

1. Click on **"Session mode"** tab
2. You'll see:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
3. Copy this string

### Option C: Connection Info (Manual)

If you see **"Connection info"** section, you'll see:
- **Host:** `db.xxxxx.supabase.co`
- **Database name:** `postgres`
- **Port:** `5432`
- **User:** `postgres`
- **Password:** (click "Reveal" to see it)

**Construct it manually:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## Step 4: What You Need to Copy

**Copy the ENTIRE connection string**, it should look like one of these:

```
postgresql://postgres.abcdefghijklmnop:your-password-here@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**OR**

```
postgresql://postgres:your-password-here@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## Step 5: Update Render

1. Go to **Render Dashboard** → Your service (`sportsapiai`)
2. Click **"Environment"** tab
3. Find **`DATABASE_URL`**
4. Click **"Edit"** or the pencil icon
5. **Paste** the connection string you copied
6. Click **"Save Changes"**
7. Choose **"Save, rebuild, and deploy"** (recommended)

---

## 🎯 Quick Checklist

- [ ] Found "Connection string" section in Supabase
- [ ] Selected "Connection pooling" tab (port 6543)
- [ ] Copied the entire connection string
- [ ] Updated `DATABASE_URL` in Render
- [ ] Saved changes in Render

---

## 📸 What to Look For

The connection string section usually looks like:

```
┌─────────────────────────────────────────┐
│ Connection string                       │
├─────────────────────────────────────────┤
│ [Connection pooling] [Session mode]     │
│                                         │
│ postgresql://postgres.xxx:xxx@...       │
│ [Copy] button                           │
└─────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Use Connection Pooling** (port 6543) - Better for Render/serverless
2. **Copy the ENTIRE string** - Don't miss any part
3. **Password is included** - Don't modify it
4. **Keep it secret** - Never share or commit to Git

---

## 🆘 Can't Find It?

If you don't see "Connection string" section:

1. **Try scrolling down** more on the Database settings page
2. **Look for "Connection info"** section instead
3. **Check "Configuration"** tab
4. **Alternative:** Go to **Project Settings** → **Database** (different location)

---

**Once you have it, paste it as `DATABASE_URL` in Render!**
