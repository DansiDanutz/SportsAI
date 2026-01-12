-- ============================================
-- Test Table for Supabase Connection
-- ============================================
-- Run this in Supabase SQL Editor to create a test table
-- Then test connection from Render Shell

-- Step 1: Create test table
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  test_message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Insert test data
INSERT INTO connection_test (test_message) 
VALUES ('Connection test successful! Created from Supabase SQL Editor.');

-- Step 3: Verify data was inserted
SELECT * FROM connection_test;

-- ============================================
-- After running this, test from Render Shell:
-- ============================================
-- psql "postgresql://postgres:Seme05041981!@db.nkaahfrobkvtskolhokj.supabase.co:5432/postgres" -c "SELECT * FROM connection_test;"
