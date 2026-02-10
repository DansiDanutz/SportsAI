# ✅ Try Working Connection String Format

## You Have a Working Format from Another Project

**Working format:**
```
postgresql://postgres:Seme05041981!@db.asjtxrmftmutcsnqgidy.supabase.co:5432/postgres
```

**Your current project:** `nkaahfrobkvtskolhokj`

---

## ✅ Option 1: Use Same Format with Your Project

**Update DATABASE_URL in Render to:**

```
postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres
```

**This is the same format, just with your project reference.**

---

## ⚠️ But We Know IPv6 Doesn't Work

The error showed IPv6 address, which Render can't reach. So this might still fail.

---

## ✅ Option 2: Use Connection Pooling (Recommended)

Since IPv6 doesn't work, use connection pooling (IPv4):

```
postgresql://postgres.nkaahfrobkvtskolhokj:Seme05041981!@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Key differences:**
- Username includes project ref: `postgres.nkaahfrobkvtskolhokj`
- Host is pooler: `aws-0-us-east-1.pooler.supabase.com`
- Uses IPv4 (works with Render)

---

## 🎯 Try Both:

1. **First:** Try Option 1 (same format as working project)
   - Update DATABASE_URL
   - Test: `psql '$DATABASE_URL' -c "SELECT * FROM connection_test;"`
   - If it works → Great!
   - If IPv6 error → Use Option 2

2. **If Option 1 fails:** Use Option 2 (connection pooling)
   - This definitely works with Render (IPv4)

---

## 🔍 Why Other Project Might Work

- Different region (might have better IPv4 support)
- Different Supabase configuration
- Different network setup

**But your current project needs IPv4-compatible connection!**

---

**Try Option 1 first, but Option 2 (pooling) is more reliable for Render!**
