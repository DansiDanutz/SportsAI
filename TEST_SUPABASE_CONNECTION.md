# 🧪 Test Supabase Connection

## Step 1: Create Test Table in Supabase

### Via Supabase Dashboard:

1. Go to **Supabase Dashboard**
2. Click **"SQL Editor"** (in left sidebar)
3. Click **"New query"**
4. **Paste this SQL:**

```sql
-- Create test table
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  test_message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO connection_test (test_message) 
VALUES ('Connection test successful!');

-- Verify data
SELECT * FROM connection_test;
```

5. Click **"Run"** (or press Ctrl+Enter)
6. You should see the table created and data inserted

---

## Step 2: Test Connection from Render Shell

### Test 1: Connect and Query

**In Render Shell, run:**

```bash
psql "postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test;"
```

**Expected output:**
```
 id |      test_message       |         created_at         
----+-------------------------+----------------------------
  1 | Connection test successful! | 2026-01-12 16:XX:XX.XXX
(1 row)
```

### Test 2: Insert New Row

```bash
psql "postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "INSERT INTO connection_test (test_message) VALUES ('Render connection works!');"
```

### Test 3: Verify Insert

```bash
psql "postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test ORDER BY id DESC LIMIT 5;"
```

---

## Step 3: Test with Prisma

**In Render Shell:**

```bash
cd Sports_Ai/backend
npx prisma db execute --stdin <<< "SELECT * FROM connection_test;"
```

**Or create a simple Prisma test:**

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT * FROM connection_test\`.then(r => {
  console.log('✅ Connection works!', r);
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Error:', e.message);
  prisma.\$disconnect();
});
"
```

---

## ✅ Success Indicators:

- ✅ `psql` command connects without errors
- ✅ Can query the `connection_test` table
- ✅ Can insert new rows
- ✅ Data appears in Supabase Dashboard → Table Editor

---

## 🔴 If Connection Fails:

### Error: "Can't reach database server"
- Check Supabase Network Restrictions (allow all IPs)
- Verify Supabase project is active
- Try URL-encoding password: `Seme05041981%21`

### Error: "password authentication failed"
- Verify password is correct: `Seme05041981!`
- Check if password was reset correctly in Supabase

### Error: "relation does not exist"
- Make sure you created the table first in Supabase SQL Editor
- Check table name spelling: `connection_test`

---

## 🎯 Quick Test Commands:

**All-in-one test:**

```bash
# Test connection and query
psql "postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT 'Connection successful!' as status, COUNT(*) as table_count FROM connection_test;"
```

**Expected output:**
```
      status           | table_count 
-----------------------+-------------
 Connection successful! |           1
(1 row)
```

---

**Create the table in Supabase first, then test the connection!**
