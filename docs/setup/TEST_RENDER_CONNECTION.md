# ✅ Test Render Connection to Supabase

## ✅ Step 1 Complete: Table Created in Supabase

You successfully created the `connection_test` table! ✅

---

## 🧪 Step 2: Test Connection from Render Shell

### Test 1: Query the Table

**In Render Shell, run:**

```bash
psql "postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test;"
```

**Expected output:**
```
 id |      test_message       |         created_at         
----+-------------------------+----------------------------
  1 | Connection test successful! | 2026-01-12 16:38:59.555314
(1 row)
```

---

### Test 2: Insert New Row from Render

**If Test 1 works, try inserting:**

```bash
psql "postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "INSERT INTO connection_test (test_message) VALUES ('Render connection works!');"
```

**Expected output:**
```
INSERT 0 1
```

---

### Test 3: Verify Insert

```bash
psql "postgresql://postgres:[PASSWORD]@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test ORDER BY id DESC LIMIT 5;"
```

**Should show both rows:**
- Row 1: "Connection test successful!" (from Supabase)
- Row 2: "Render connection works!" (from Render)

---

## ✅ Success Indicators:

- ✅ `psql` command connects without errors
- ✅ Can see the row you created in Supabase
- ✅ Can insert new rows from Render
- ✅ Data appears in Supabase Dashboard → Table Editor

---

## 🔴 If Connection Fails:

### Error: "Can't reach database server"
- Check Supabase Network Restrictions (allow all IPs)
- Try URL-encoding password: `[PASSWORD]`

### Error: "password authentication failed"
- Verify password is correct: `[PASSWORD]`
- Check if password was reset correctly

### Error: "relation does not exist"
- Make sure table name is correct: `connection_test`
- Check you're connected to the right database

---

**Run Test 1 in Render Shell now to verify the connection works!**
