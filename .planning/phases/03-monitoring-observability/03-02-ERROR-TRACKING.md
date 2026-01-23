# Vercel Error Tracking Documentation

## Overview

Vercel Error Tracking is automatically enabled for all Vercel deployments at no additional cost. It provides real-time error monitoring, runtime logs, and build diagnostics for your frontend application.

**Project:** sports-ai-one
**Frontend URL:** https://sports-ai-one.vercel.app
**Backend URL:** https://sportsapiai.onrender.com (not covered by Vercel Error Tracking)

## How to Access Error Logs

### Via Vercel Dashboard

1. Go to https://vercel.com
2. Select the **sports-ai-one** project
3. Navigate to the **Deployments** tab
4. Click on any deployment to view detailed logs

### Log Types Available

**Build Logs:**
- Shows output from the build process
- Displays build errors and warnings
- Includes dependency installation logs
- Useful for debugging build failures

**Runtime Logs:**
- Real-time logs from your running application
- Shows console.log, console.error, console.warn output
- Displays uncaught exceptions and errors
- Updated in real-time as users interact with your app

**Function Logs:**
- Logs from serverless functions (if any)
- Shows function execution details
- Displays function errors and timeouts

## How to Filter and Search Errors

### By Deployment

1. Go to **Deployments** tab
2. Click on a specific deployment
3. Use the search bar in the logs viewer
4. Search by:
   - Error keywords (e.g., "error", "exception", "failed")
   - File names (e.g., "main.tsx", "App.tsx")
   - Component names
   - API endpoints

### By Log Level

Logs are automatically color-coded:
- **Red:** Errors and exceptions
- **Yellow:** Warnings
- **Blue/Grey:** Info and debug messages

### By Time Range

- Logs are timestamped in UTC
- Scroll through logs chronologically
- Use browser search (Ctrl+F) to find specific log entries

### Common Error Patterns

**React Errors:**
```
Error: Render failed
  at App (http://localhost:3000/src/App.tsx:15:23)
  at ...
```

**API Errors:**
```
GET https://sportsapiai.onrender.com/api/v1/odds 500 (Internal Server Error)
```

**Build Errors:**
```
Error: Failed to compile
Module not found: Can't resolve './components/MissingComponent'
```

## How to Set Up Alert Notifications

### Vercel Dashboard Notifications

1. Go to https://vercel.com
2. Select **sports-ai-one** project
3. Go to **Settings** -> **Notifications**
4. Enable notification types:
   - **Deployments:** Get notified on deployment success/failure
   - **Errors:** Get notified on new errors (Pro plan feature)
   - **Comments:** Get notified on deployment comments

### Notification Channels

**Email Notifications:**
- Automatically sent to your account email
- Configure in **Account Settings** -> **Notifications**
- Enable/disable specific notification types

**Slack Integration:**
1. Go to **Settings** -> **Integrations**
2. Add Slack workspace
3. Select channels for notifications
4. Configure which events trigger Slack alerts

**Discord Integration:**
1. Go to **Settings** -> **Integrations**
2. Add Discord server
3. Select channels for notifications
4. Configure webhook settings

**GitHub Status Checks:**
- Deployment status automatically posted to GitHub
- Check your repository's **Deployments** section
- Shows commit-to-deployment mapping

## Error Monitoring Best Practices

### Daily Monitoring

1. **Check Latest Deployment:**
   - Go to Deployments tab
   - Click on most recent deployment
   - Review Runtime Logs for errors

2. **Look for Red Flags:**
   - Red error messages in logs
   - Repeated error patterns
   - New exceptions that weren't present before

3. **Review Build Logs:**
   - Check for new warnings
   - Verify dependencies updated successfully
   - Look for deprecation notices

### Weekly Review

1. **Error Trends:**
   - Compare error rates week-over-week
   - Identify new error patterns
   - Track resolution of known issues

2. **Performance:**
   - Check for slow page loads in logs
   - Look for timeout errors
   - Monitor API response times

3. **User Impact:**
   - Correlate error spikes with user reports
   - Prioritize high-impact errors
   - Track resolution progress

## Common Error Scenarios

### React Component Errors

**Symptom:** Application crashes or shows blank screen

**Diagnosis:**
```
Error: Minified React error #130
```

**Steps:**
1. Check Runtime Logs for stack trace
2. Look for component name in error
3. Review recent code changes to that component
4. Check for null/undefined data being rendered

### API Connection Errors

**Symptom:** Data not loading, loading spinner stuck

**Diagnosis:**
```
GET https://sportsapiai.onrender.com/api/v1/odds
ERR_CONNECTION_REFUSED
```

**Steps:**
1. Check if backend is running (Render dashboard)
2. Verify API URL is correct
3. Check for CORS errors
4. Review backend logs in Render dashboard

### Build Failures

**Symptom:** Deployment fails to build

**Diagnosis:**
```
Error: Build failed with exit code 1
npm ERR! code ELIFECYCLE
```

**Steps:**
1. Review Build Logs in failed deployment
2. Check for TypeScript errors
3. Verify all dependencies installed
4. Test build locally: `npm run build`

## Integration with Backend Monitoring

### Current Setup

- **Frontend (Vercel):** Error tracking via Vercel Error Tracking (automatic)
- **Backend (Render):** Log monitoring via Render Dashboard (see 03-01-LOGGING.md)

### Correlating Frontend and Backend Errors

When investigating issues:

1. **Start with frontend error** in Vercel logs
2. **Check timestamp** of the error
3. **Cross-reference with backend logs** in Render dashboard
4. **Look for related errors** in both systems

**Example:**
```
Frontend (Vercel):  2024-01-23 10:30:45 GET /api/v1/odds 500
Backend (Render):   2024-01-23 10:30:46 [error] Database connection timeout
```

## Advanced Error Tracking (Future Enhancements)

### When to Consider Sentry

Consider upgrading to Sentry if you need:
- Backend error tracking (currently only frontend via Vercel)
- Rich error context (user info, breadcrumbs, session replay)
- Custom alerting rules and notifications
- Performance monitoring (APM)
- Release tracking and error regression detection

### Sentry Integration Path

If adding Sentry later:
1. Create Sentry account
2. Install `@sentry/react` package
3. Configure DSN in environment variables
4. Initialize Sentry in `main.tsx`
5. Add ErrorBoundary component
6. Keep Vercel Error Tracking as backup

## Resources

- **Vercel Dashboard:** https://vercel.com
- **Vercel Error Tracking Docs:** https://vercel.com/docs/deployments/troubleshooting/build-errors
- **Vercel Integrations:** https://vercel.com/integrations
- **Render Logging Docs:** See `.planning/phases/03-monitoring-observability/03-01-LOGGING.md`

## Quick Reference

| Task | Location |
|------|----------|
| View deployment logs | Vercel Dashboard -> Deployments -> [deployment] -> Logs |
| Enable notifications | Vercel Dashboard -> Settings -> Notifications |
| Add Slack integration | Vercel Dashboard -> Settings -> Integrations |
| Check backend logs | Render Dashboard -> sportsai-backend -> Logs |
| View GitHub status | GitHub Repository -> Deployments tab |
