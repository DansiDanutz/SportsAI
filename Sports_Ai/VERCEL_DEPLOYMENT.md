# Vercel Deployment Instructions

This document provides quick-start instructions for deploying the SportsAI Platform to Vercel.

## Quick Deploy - Frontend Only

The frontend is fully configured for Vercel deployment. The backend is deployed separately on Render.

### Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Backend Deployed**: Backend must be deployed first (see `DEPLOYMENT_GUIDE.md`)
3. **GitHub Repository**: Code must be in a GitHub repository

### Deploy in 3 Steps

#### Step 1: Import Project to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your repository
4. Choose **"frontend"** as the root directory

#### Step 2: Configure Build Settings

Vercel should auto-detect Vite, but verify:

- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### Step 3: Add Environment Variable

Add one environment variable:

```
VITE_API_URL=https://your-backend.onrender.com
```

Replace `your-backend.onrender.com` with your actual backend URL.

#### Step 4: Deploy

Click **"Deploy"** and wait 2-3 minutes.

---

## Deploy via Vercel CLI

Alternative method using command line:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy to production
vercel --prod
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Select your account**
- Link to existing project? **No**
- What's your project's name? **sportsai-frontend**
- In which directory is your code located? **./frontend**
- Want to modify settings? **Yes**
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Development Command: `npm run dev`

Then add environment variable:
```bash
vercel env add VITE_API_URL production
# Enter: https://your-backend.onrender.com
```

---

## Verify Deployment

After deployment completes:

1. Click **"Visit"** button in Vercel dashboard
2. You should see the SportsAI homepage
3. Test core functionality:
   - Click "Get Started" → Should navigate to signup
   - Create account and login
   - Browse events, favorites, etc.

---

## Backend Deployment

The backend MUST be deployed separately. See `DEPLOYMENT_GUIDE.md` for complete instructions.

**Recommended Backend Hosting:**
- Render (https://render.com) - Easiest, includes free PostgreSQL
- Railway (https://railway.app) - Alternative with good DX
- AWS/GCP - For production scale

---

## Environment Variables

Only one environment variable is required for the frontend:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.onrender.com` |

**Important:** Do NOT include trailing slash in `VITE_API_URL`.

---

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your domain (e.g., `app.sportsai.com`)
3. Update DNS records as instructed by Vercel
4. Update backend `CORS_ORIGIN` to include custom domain

---

## Troubleshooting

### Issue: API calls fail with CORS error

**Solution:** Update backend `CORS_ORIGIN` environment variable to include Vercel URL:
```
CORS_ORIGIN=https://your-app.vercel.app
```

### Issue: Blank page after deployment

**Solution:**
1. Check Vercel build logs for errors
2. Verify `dist` directory was created
3. Check browser console for JavaScript errors
4. Ensure `VITE_API_URL` is set correctly

### Issue: 404 on page refresh

**Solution:** This is already handled by `vercel.json` rewrites. If you still see 404s:
1. Verify `vercel.json` exists in frontend directory
2. Check rewrites configuration is correct
3. Redeploy with: `vercel --prod --force`

---

## Monitoring

### View Logs

1. Go to Vercel dashboard → Your project
2. Click **"Deployments"** tab
3. Click on a deployment → View logs

### Analytics

Enable Vercel Analytics:
1. Go to project Settings → Analytics
2. Click **"Enable"**
3. Analytics will appear in dashboard

---

## Performance

Vercel automatically optimizes:

✅ **CDN caching** for static assets
✅ **Brotli compression** for smaller bundles
✅ **Image optimization** (if using Vercel Image)
✅ **Edge network** for global low latency

---

## CI/CD

Vercel automatically deploys:

- **Production:** Every push to `main` branch
- **Preview:** Every pull request gets preview URL

Disable auto-deploy:
1. Settings → Git → Production Branch
2. Uncheck "Automatic Deployments"

---

## Rollback

To rollback to previous version:

1. Go to Deployments tab
2. Find previous successful deployment
3. Click **"..."** → **"Promote to Production"**

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** support@vercel.com
- **Community:** https://vercel.com/discord

---

## Next Steps After Deployment

1. ✅ Test all core features in production
2. ✅ Set up custom domain (optional)
3. ✅ Enable Vercel Analytics
4. ✅ Configure caching headers in `vercel.json`
5. ✅ Set up preview deployments for PRs
6. ✅ Add error monitoring (Sentry)

---

**Document Version:** 1.0.0
**Last Updated:** January 14, 2026
**Status:** ✅ Ready to Deploy
