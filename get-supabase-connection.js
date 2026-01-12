/**
 * Script to help construct Supabase DATABASE_URL
 * 
 * Usage:
 * node get-supabase-connection.js [project-ref] [password] [region]
 * 
 * OR set environment variables:
 * SUPABASE_PROJECT_REF=xxx SUPABASE_PASSWORD=xxx SUPABASE_REGION=xxx node get-supabase-connection.js
 */

const projectRef = process.env.SUPABASE_PROJECT_REF || process.argv[2];
const password = process.env.SUPABASE_PASSWORD || process.argv[3];
const region = process.env.SUPABASE_REGION || process.argv[4] || 'us-east-1';

if (!projectRef || !password) {
  console.log(`
🔧 Supabase DATABASE_URL Constructor

Usage:
  node get-supabase-connection.js [project-ref] [password] [region]

Example:
  node get-supabase-connection.js abcdefghijklmnop your-password-here us-east-1

OR set environment variables:
  SUPABASE_PROJECT_REF=xxx SUPABASE_PASSWORD=xxx SUPABASE_REGION=xxx node get-supabase-connection.js

What you need:
  1. Project Reference: From Supabase URL (part after /project/)
  2. Password: From Database Settings → Reset database password → Reveal
  3. Region: Optional (defaults to us-east-1)

Common regions:
  - us-east-1 (US East)
  - us-west-1 (US West)
  - eu-west-1 (Europe)
  - ap-southeast-1 (Asia Pacific)
`);
  process.exit(1);
}

// Encode password for URL (handle special characters)
const encodedPassword = encodeURIComponent(password);

// Connection Pooling (Recommended for Render/serverless)
const connectionPooling = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;

// Direct Connection (Alternative)
const directConnection = `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Supabase DATABASE_URL Connection Strings                    ║
╚══════════════════════════════════════════════════════════════╝

📋 Project Reference: ${projectRef}
🌍 Region: ${region}

✅ RECOMMENDED: Connection Pooling (for Render/serverless)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${connectionPooling}

📋 Copy the above and use it as DATABASE_URL in Render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Alternative: Direct Connection (if pooling doesn't work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${directConnection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Next Steps:
1. Copy the Connection Pooling string above
2. Go to Render Dashboard → sportsapiai → Environment
3. Update DATABASE_URL with the copied string
4. Save changes

⚠️  Keep this password secret! Never commit to Git.
`);
