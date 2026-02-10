# How to Check if VERCEL_TOKEN is Set in GitHub

## Method 1: Check via GitHub Web Interface (Easiest)

1. **Go to your repository secrets page**:
   ```
   https://github.com/DansiDanutz/SportsAI/settings/secrets/actions
   ```

2. **Look for `VERCEL_TOKEN` in the "Repository secrets" section**
   - ✅ If you see `VERCEL_TOKEN` listed → Secret is set
   - ❌ If you don't see it → Secret is NOT set

3. **To add/update the secret**:
   - Click "New repository secret"
   - Name: `VERCEL_TOKEN`
   - Value: Your Vercel API token (get it from https://vercel.com/account/tokens)
   - Click "Add secret"

## Method 2: Check via GitHub Actions Run

1. **Go to Actions tab**: https://github.com/DansiDanutz/SportsAI/actions

2. **Look for recent workflow runs**:
   - If you see "Test Vercel Token" workflow → Check its logs
   - If workflows are failing with "VERCEL_TOKEN not found" → Secret is missing

3. **Run the test workflow**:
   - Go to Actions → "Test Vercel Token" workflow
   - Click "Run workflow" → Select branch "main" → Click "Run workflow"
   - Check the logs to see if the token is set and valid

## Method 3: Get Your Vercel Token

If you need to create or get a new Vercel token:

1. **Go to Vercel Account Settings**:
   ```
   https://vercel.com/account/tokens
   ```

2. **Create a new token**:
   - Click "Create Token"
   - Give it a name (e.g., "GitHub Actions Deploy")
   - Set expiration (or leave as "No expiration")
   - Click "Create Token"
   - **Copy the token immediately** (you won't see it again!)

3. **Add it to GitHub**:
   - Go to: https://github.com/DansiDanutz/SportsAI/settings/secrets/actions
   - Click "New repository secret"
   - Name: `VERCEL_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

## Quick Test

After setting up the token, you can test it by:

1. Making a small change to any file
2. Committing and pushing
3. Checking if the Vercel deployment workflow runs successfully

If the workflow fails, check the logs to see if it's a token issue or something else.
