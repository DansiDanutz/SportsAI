# Render PostgreSQL Database Setup

## Your Database Details

**Database Name:** `sportingpostgres`
**Service ID:** `dpg-d5ih1eshg0os738jia6g-a`

## Getting the Connection String

In Render Dashboard, go to your PostgreSQL service and look for:

1. **Internal Database URL** (for services in same region):
   ```
   postgresql://sportsai:password@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres
   ```

2. **External Database URL** (for local/other services):
   ```
   postgresql://sportsai:password@dpg-d5ih1eshg0os738jia6g-a.oregon-postgres.render.com/sportingpostgres
   ```

## For Render Web Service (Use Internal URL)

Since your backend will be on Render too, use the **Internal Database URL**:

```
DATABASE_URL=postgresql://sportsai:password@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres
```

**Note:** Replace `sportsai:password` with your actual database username and password from Render.

## Steps to Get Connection String

1. Go to Render Dashboard
2. Click on your PostgreSQL service (`sportingpostgres`)
3. Go to the "Connections" tab
4. Copy the **Internal Database URL** (for Render services)
5. Or copy **External Database URL** (for local/Vercel connections)

## Environment Variable for Render Web Service

Add this to your Render Web Service environment variables:

```
DATABASE_URL=postgresql://username:password@dpg-d5ih1eshg0os738jia6g-a/sportingpostgres
```

Replace `username:password` with your actual database credentials.

## After Setting DATABASE_URL

1. Deploy your backend service
2. Run migrations via Render Shell:
   ```bash
   cd Sports_Ai/backend
   npx prisma migrate deploy
   ```
   
   Or if migrations don't exist:
   ```bash
   npx prisma db push
   ```

## Security Note

- Never commit database URLs with passwords to Git
- Use Render's environment variables
- The Internal URL is only accessible from Render services
- External URL can be accessed from anywhere (use with caution)
