# 🔧 Construct Supabase DATABASE_URL

## What We Need

The service role key is for API access, but we need the **database connection string** which is different.

To construct `DATABASE_URL`, I need:

### Option 1: From Supabase Dashboard
1. **Project Reference** - From your Supabase URL:
   - URL: `https://app.supabase.com/project/abcdefghijklmnop`
   - The part after `/project/` is your project reference

2. **Database Password** - From Database Settings:
   - Go to "Reset database password" section
   - Click "Reveal" or "Show" to see current password
   - Copy it

3. **Region** - Usually in the URL or connection string:
   - Examples: `us-east-1`, `eu-west-1`, `ap-southeast-1`
   - Or check if you see it in any connection string preview

### Option 2: Share These Details

If you can share:
- **Project Reference** (from URL)
- **Database Password** (from reset password section)
- **Region** (if visible)

I'll construct the exact connection string for you!

---

## Format We'll Create

### Connection Pooling (Recommended for Render):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Direct Connection (Alternative):
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## Quick Steps

1. **Get Project Reference:**
   - Look at your Supabase URL
   - Copy the part after `/project/`

2. **Get Password:**
   - Database Settings → "Reset database password"
   - Click "Reveal" or "Show"
   - Copy the password

3. **Get Region (if visible):**
   - Check URL or any connection string preview
   - Common: `us-east-1`, `eu-west-1`

4. **Share with me** and I'll give you the exact `DATABASE_URL`!

---

## Alternative: Use Supabase API

If you prefer, I can create a script that uses your service role key to fetch the connection details, but it's easier to just construct it from the info above.

---

**Share the 3 pieces of info and I'll give you the exact connection string!**
