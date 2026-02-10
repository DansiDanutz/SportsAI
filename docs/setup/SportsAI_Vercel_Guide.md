# 🚀 SportsAI Vercel Deployment Guide

To deploy **SportsAI** to Vercel, follow these steps to ensure both the Frontend (Vite) and Backend (NestJS) are correctly configured.

## Prerequisites
- A [Vercel](https://vercel.com) account.
- Your project pushed to GitHub: `https://github.com/DansiDanutz/SportsAI`.

## Step 1: Link your Repository
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project**.
3. Import the `SportsAI` repository.

## Step 2: Configure Environment Variables
You MUST add the following variables in the Vercel dashboard (**Settings > Environment Variables**):

| Key | Description |
| :--- | :--- |
| `DATABASE_URL` | Your PostgreSQL connection string (Supabase/Railway recommended). |
| `THE_ODDS_API_KEY` | Your key from The Odds API. |
| `API_SPORTS_KEY` | Your key from API-Sports. |
| `THE_SPORTS_DB_KEY` | Your key from TheSportsDB (or '1' for free). |
| `SPORTMONKS_KEY` | Your key from Sportmonks. |
| `OPENROUTER_API_KEY` | Your key from OpenRouter. |
| `JWT_SECRET` | A long random string for securing logins. |

## Step 3: Verify Build Settings
Vercel should automatically detect the `vercel.json` in the root. If asked:
- **Framework Preset**: Other (or Vite for frontend).
- **Root Directory**: `.` (root).

## Step 4: Database Migrations
Since Vercel is serverless, you need to run your database migrations manually or via a GitHub Action before deployment:
```bash
cd Sports_Ai/backend
npx prisma db push
```

## Step 5: Deploy!
Click **Deploy**. Vercel will build the frontend and set up the backend as a Serverless Function under the `/api` route.

---
**Bodd's Tip:** If you want absolute performance, I recommend deploying the Frontend and Backend as two separate Vercel projects pointing to their respective subdirectories. However, the root `vercel.json` I've provided is designed to handle them together.
