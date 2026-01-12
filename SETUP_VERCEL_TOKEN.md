# Setup VERCEL_TOKEN Secret - Quick Guide

## ✅ Status: VERCEL_TOKEN is NOT set

The GitHub API confirms: **No secrets are configured** in your repository.

## Step 1: Get Your Vercel Token

1. **Go to Vercel Account Tokens**:
   ```
   https://vercel.com/account/tokens
   ```

2. **Create a new token**:
   - Click **"Create Token"**
   - **Name**: `GitHub Actions Deploy` (or any name you prefer)
   - **Expiration**: Choose "No expiration" or set a date
   - Click **"Create Token"**
   - **⚠️ IMPORTANT**: Copy the token immediately - you won't see it again!

## Step 2: Add Token to GitHub Secrets

### Option A: Using GitHub CLI (Recommended - I can do this for you)

Run this command (I'll need the token):
```bash
gh secret set VERCEL_TOKEN --repo DansiDanutz/SportsAI
```
Then paste your token when prompted.

### Option B: Using GitHub Web Interface

1. **Go to Repository Secrets**:
   ```
   https://github.com/DansiDanutz/SportsAI/settings/secrets/actions
   ```

2. **Add New Secret**:
   - Click **"New repository secret"**
   - **Name**: `VERCEL_TOKEN`
   - **Value**: Paste your Vercel token
   - Click **"Add secret"**

## Step 3: Verify It's Set

After adding the secret, I can verify it's set by running:
```bash
gh api repos/DansiDanutz/SportsAI/actions/secrets
```

You should see `"total_count":1` instead of `0`.

## Step 4: Test the Workflow

After setting the token, the next push will trigger the Vercel deployment workflow. You can also manually trigger the "Test Vercel Token" workflow to verify it works.
