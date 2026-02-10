# 🔧 Fix psql Command - Bash History Expansion Issue

## Problem:
Bash interprets `!` as history expansion, causing: `event not found`

## ✅ Solution: Use Single Quotes or Escape

### Option 1: Use Single Quotes (Easiest)

```bash
psql 'postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres' -c "SELECT * FROM connection_test;"
```

**Key:** Use **single quotes** `'...'` around the connection string to prevent bash expansion.

---

### Option 2: Escape the Exclamation Mark

```bash
psql "postgresql://postgres:Seme05041981\!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test;"
```

**Key:** Add backslash before `!` → `\!`

---

### Option 3: Use URL-Encoded Password

```bash
psql "postgresql://postgres:Seme05041981%21@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test;"
```

**Key:** Replace `!` with `%21` (URL encoding)

---

## ✅ Recommended: Use Option 1 (Single Quotes)

**Run this in Render Shell:**

```bash
psql 'postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres' -c "SELECT * FROM connection_test;"
```

---

## Expected Output:

```
 id |      test_message       |         created_at         
----+-------------------------+----------------------------
  1 | Connection test successful! | 2026-01-12 16:38:59.555314
(1 row)
```

---

**Use single quotes around the connection string to avoid bash expansion!**
