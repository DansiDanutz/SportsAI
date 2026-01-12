# 🚀 Render Shell - Database Migrations

## Once Shell Connects

You'll see a command prompt. Run these commands **one by one**:

---

## Step 1: Navigate to Backend Directory

```bash
cd Sports_Ai/backend
```

---

## Step 2: Run Prisma Migrations

```bash
npx prisma migrate deploy
```

**What this does:**
- Creates all database tables in Supabase
- Applies all migrations from `prisma/migrations/`
- Sets up your database schema

**Expected output:**
```
Prisma Migrate applied the following migration(s):
- 20260110221336_init
- 20260110224459_add_user_role
- 20260110231542_add_password_reset_tokens
- 20260111023955_add_cascade_delete
- 20260111045227_add_standing_model
```

---

## Step 3: Verify (Optional)

Check if tables were created:

```bash
npx prisma db pull
```

Or verify in Supabase Dashboard → Table Editor

---

## Troubleshooting

### Error: "Can't reach database server"
- Check `DATABASE_URL` is correct in Render Environment
- Verify Supabase project is active
- Check network restrictions in Supabase

### Error: "Migration failed"
- Check connection string format
- Verify password is correct
- Try direct connection instead of pooling

### Error: "Prisma schema not found"
- Make sure you're in `Sports_Ai/backend` directory
- Check `prisma/schema.prisma` exists

---

## After Migrations Complete

1. ✅ Check Supabase Dashboard → Table Editor
2. ✅ You should see tables: User, Sport, League, Team, Event, etc.
3. ✅ Check Render Logs for successful startup
4. ✅ Test API: `https://sportsapiai.onrender.com/health`

---

**Once the shell connects, run the commands above!** 🎯
