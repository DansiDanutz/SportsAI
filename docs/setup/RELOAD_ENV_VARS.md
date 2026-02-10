# ✅ DATABASE_URL is Correct - Reload Environment Variables

## ✅ Your DATABASE_URL is Correct!

I can see in Render it's set to:
```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

This is **perfect** - direct connection on port 5432.

---

## 🔴 Problem: Shell is Using Old Environment Variables

The shell session was started **before** you updated the DATABASE_URL, so it's still using the old value (port 6543).

---

## ✅ Solution: Reload Environment Variables

### Option 1: Close and Reopen Shell (Easiest)

1. **Close** the Render Shell (click X or close tab)
2. **Reopen** Shell from Render Dashboard
3. **Run:** `echo $DATABASE_URL` to verify it shows port 5432
4. **Then run:** `npx prisma migrate deploy`

### Option 2: Restart Service

1. Render Dashboard → `sportsapiai` → **Manual Deploy**
2. Click **"Deploy latest commit"** or **"Redeploy"**
3. Wait for deployment to complete
4. **Open new Shell** after deployment
5. **Run:** `npx prisma migrate deploy`

### Option 3: Source Environment Variables (If Available)

In the shell, try:
```bash
source ~/.bashrc
# or
export $(cat .env | xargs)
```

Then check:
```bash
echo $DATABASE_URL
```

---

## ✅ After Reloading

**Verify it's correct:**
```bash
echo $DATABASE_URL
```

**Should show:**
```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**Then run migration:**
```bash
cd Sports_Ai/backend
npx prisma migrate deploy
```

---

**Your connection string is correct! Just need to reload it in the shell.** ✅
