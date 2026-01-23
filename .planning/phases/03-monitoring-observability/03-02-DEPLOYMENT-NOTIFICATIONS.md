# Deployment Notifications Documentation

## Overview

Deployment notifications keep the team informed about the status of frontend deployments to Vercel. This document covers the GitHub Actions workflow and Vercel's built-in notification options.

**Project:** sports-ai-one
**Frontend URL:** https://sports-ai-one.vercel.app
**Repository:** https://github.com/DansiDanutz/SportsAI

## How Vercel-GitHub Integration Works

### Automatic Deployment Flow

1. **Code Push:** Developer pushes code to `main` branch
2. **GitHub Triggers Vercel:** Via GitHub integration, Vercel is notified
3. **Vercel Builds:** Vercel automatically builds and deploys the frontend
4. **Status Update:** Vercel posts deployment status back to GitHub
5. **Notifications:** GitHub Actions and Vercel send notifications

### GitHub Integration Status

- **Vercel Project:** Connected to `DansiDanutz/SportsAI` repository
- **Branch:** `main` branch auto-deploys on push
- **Environment:** Production
- **Deployment Type:** Preview (on PRs) and Production (on main)

## Deployment Notification Workflow

### GitHub Actions Workflow

**File:** `.github/workflows/vercel-deployment.yml`

This workflow triggers on deployment status changes and provides:

- **Success Notifications:** Confirms successful production deployments
- **Failure Notifications:** Alerts on deployment failures with error details
- **Cancellation Notifications:** Notifies when deployments are cancelled

### Workflow Features

- Triggers only on **Production** deployments
- Runs on **ubuntu-latest** runner
- Displays deployment details:
  - Deployment status (success/failure/cancelled)
  - Environment (Production)
  - Repository name
  - Triggering actor
  - Commit SHA
  - Deployment URL

### Viewing Workflow Results

1. Go to **GitHub Repository** -> **Actions** tab
2. Look for "Vercel Deployment Notification" workflow runs
3. Click on a run to see deployment details
4. Workflow runs automatically after each deployment

## How to Verify Deployment Notifications are Enabled

### Step 1: Check Vercel-GitHub Connection

1. Go to https://vercel.com
2. Select **sports-ai-one** project
3. Go to **Settings** -> **Git**
4. Verify:
   - GitHub repository is connected
   - Branch is set to `main`
   - "Production Branch" is enabled
   - Automatic deployments are enabled

### Step 2: Check GitHub Integration

1. Go to https://github.com/DansiDanutz/SportsAI
2. Navigate to **Settings** -> **Webhooks**
3. Look for "Vercel" webhook
4. Verify webhook is active (green checkmark)

### Step 3: Test Notifications

1. Make a small change to frontend code
2. Commit and push to `main` branch
3. Watch for:
   - Vercel deployment starts
   - GitHub Actions workflow runs
   - Status updates appear in GitHub

## Where to See Deployment Status in GitHub

### Repository Deployments Tab

1. Go to **GitHub Repository** -> **Deployments** tab
2. View all deployment history
3. Each deployment shows:
   - Deployment status (success/failure/active)
   - Commit SHA and message
   - Deployment environment
   - Creator and timestamp
   - Deployment log link

### Commit Status Checks

1. Go to any commit in the repository
2. Look for the **deployment** status check
3. Shows:
   - **deploy/sports-ai-one:** Production deployment status
   - **vercel/production:** Vercel build status

### Pull Request Deployments

1. For pull requests targeting `main`
2. Vercel creates **Preview deployments**
3. PR shows preview deployment URL
4. Comments show deployment status

## Alternative Notification Methods

### Vercel Dashboard Notifications

**Email Notifications:**
1. Go to Vercel Dashboard -> **Settings** -> **Notifications**
2. Enable/disable notification types:
   - Deployments
   - Comments
   - Errors (Pro plan)
3. Notifications sent to account email

**Configuration Options:**
- Deployment success/failure
- Deployment comments
- Project invitations
- Team activity

### Slack Integration

**Setup:**
1. Go to Vercel Dashboard -> **Settings** -> **Integrations**
2. Click **Add Integration** -> **Slack**
3. Authorize Vercel to access Slack
4. Select workspace and channels
5. Configure which projects send notifications

**Notification Types:**
- Deployment success/failure
- Build errors
- Comment mentions
- Team invitations

**Slack Message Format:**
```
Vercel Deployment: sports-ai-one
Status: Success
Environment: Production
Commit: abc1234 - Fix navigation bug
Author: dansi
View: https://sports-ai-one.vercel.app
```

### Discord Integration

**Setup:**
1. Go to Vercel Dashboard -> **Settings** -> **Integrations**
2. Click **Add Integration** -> **Discord**
3. Authorize Vercel to access Discord
4. Select server and channels
5. Configure notification preferences

**Notification Types:**
- Same as Slack integration
- Rich embeds with deployment details

### Custom Webhooks

For custom notification systems:

1. Go to Vercel Dashboard -> **Settings** -> **Git**
2. Scroll to **Deploy Hooks**
3. Create a new hook:
   - Name: `custom-notifications`
   - Type: `Custom`
   - URL: Your webhook endpoint
4. Vercel will POST to this URL on deployment events

**Webhook Payload:**
```json
{
  "type": "deployment",
  "status": "success",
  "project": "sports-ai-one",
  "url": "https://sports-ai-one.vercel.app",
  "commit": {
    "sha": "abc1234...",
    "message": "Fix navigation bug",
    "author": "dansi"
  }
}
```

## Deployment States Explained

### Production Deployment States

| State | Description | Action Required |
|-------|-------------|-----------------|
| **Building** | Vercel is building the frontend | None - wait for completion |
| **Queued** | Deployment queued (another deployment in progress) | None - wait in queue |
| **Success** | Deployment completed successfully | None - verify production |
| **Failed** | Deployment failed | Check logs, fix errors, retry |
| **Cancelled** | Deployment cancelled | Check why, retry if needed |
| **Ready** | Deployment ready and serving traffic | None - production live |

### Preview Deployment States

For pull requests:
- **Preview:** Available at unique URL
- **Ready:** Preview deployment live
- **Failed:** Preview build failed

## Troubleshooting Deployment Notifications

### Notifications Not Received

**Check:**
1. Vercel-GitHub integration is connected
2. GitHub webhook is active in repository
3. Email/Slack/Discord notifications enabled in Vercel settings
4. Workflow file exists in `.github/workflows/`

**Test:**
1. Push a small change to main branch
2. Trigger manual deployment in Vercel dashboard
3. Check GitHub Actions tab for workflow runs
4. Verify webhook delivery in GitHub repository settings

### Workflow Not Running

**Possible Causes:**
1. Workflow file not in default branch
2. GitHub Actions not enabled for repository
3. Deployment environment name doesn't match

**Solution:**
1. Ensure workflow is in `main` branch
2. Enable GitHub Actions in repository settings
3. Check `if: github.event.deployment_status.environment == 'Production'` condition

### Status Not Showing in GitHub

**Check:**
1. Vercel has permission to update commit status
2. GitHub integration is properly configured
3. Repository settings allow status updates from third parties

## Best Practices

### Monitoring Production Deployments

1. **Watch for failure notifications:** Act immediately on deployment failures
2. **Review success notifications:** Verify expected changes are live
3. **Track deployment frequency:** Monitor deployment patterns
4. **Monitor rollback events:** Check for emergency rollbacks

### Responding to Failures

1. **Check deployment logs** in Vercel dashboard
2. **Review error messages** in GitHub Actions logs
3. **Verify build passes locally** with `npm run build`
4. **Fix issues** and push new commit
5. **Verify deployment** succeeds

### Team Coordination

1. **Share notification channel** (Slack/Discord) with team
2. **Tag relevant team members** in deployment comments
3. **Use deployment comments** to communicate important changes
4. **Document incidents** for post-mortem analysis

## Resources

- **Vercel Dashboard:** https://vercel.com
- **GitHub Repository:** https://github.com/DansiDanutz/SportsAI
- **GitHub Actions:** https://github.com/DansiDanutz/SportsAI/actions
- **Vercel Integrations:** https://vercel.com/integrations
- **Vercel Git Docs:** https://vercel.com/docs/deployments//git

## Quick Reference

| Task | Location |
|------|----------|
| View deployment status | GitHub Repository -> Deployments tab |
| Check workflow runs | GitHub Repository -> Actions tab |
| Enable email notifications | Vercel Dashboard -> Settings -> Notifications |
| Add Slack integration | Vercel Dashboard -> Settings -> Integrations |
| View commit status | GitHub Commit page -> Checks section |
| Trigger manual deployment | Vercel Dashboard -> Deployments -> Deploy |
| Check build logs | Vercel Dashboard -> Deployments -> [deployment] -> Logs |
