# Vercel Auto-Deploy Setup Guide

## Quick Fix: Enable Auto-Deploy in Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your SportsAI project**
3. **Go to Settings** → **Git**
4. **Ensure the following are enabled**:
   - ✅ **Production Branch**: Set to `main`
   - ✅ **Auto-deploy**: Enabled for Production
   - ✅ **GitHub Integration**: Connected and active
   - ✅ **Deploy Hooks**: Enabled

5. **Verify GitHub Integration**:
   - Go to **Settings** → **Git**
   - Make sure your GitHub repository is properly connected
   - If not connected, click "Connect Git Repository" and select `DansiDanutz/SportsAI`

6. **Check Deployment Settings**:
   - Go to **Settings** → **Deployments**
   - Ensure "Auto-deploy" is enabled for the `main` branch

## Alternative: Use GitHub Actions (Backup Method)

If Vercel auto-deploy still doesn't work, we've created a GitHub Actions workflow (`.github/workflows/vercel-deploy.yml`) that will deploy on every push.

**To use this method, you need to:**
1. Go to your GitHub repository: https://github.com/DansiDanutz/SportsAI
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add a new secret:
   - **Name**: `VERCEL_TOKEN`
   - **Value**: Your Vercel API token (get it from https://vercel.com/account/tokens)

## Verify Auto-Deploy is Working

After enabling auto-deploy:
1. Make a small change to any file
2. Commit and push: `git commit -am "Test auto-deploy" && git push`
3. Check Vercel dashboard - you should see a new deployment start automatically within seconds

## Troubleshooting

If auto-deploy still doesn't work:
- Check Vercel project logs for errors
- Verify GitHub webhook is active in Vercel
- Ensure the repository is public or you have proper access permissions
- Check if there are any deployment blocks or limits in your Vercel plan
