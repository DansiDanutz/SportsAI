# ✅ Fix Render Auto-Deploy (No More Manual Redeploys)

Your Render service is configured with:
- **Branch**: `main`
- **Auto-Deploy**: `On Commit`
- **Root Directory**: `Sports_Ai/backend`

## Why it feels “broken”

When **Root Directory** is set, Render **only auto-deploys when files inside that directory change**.  
Commits that only touch repo root (docs, `vercel.json`, GitHub workflows, etc.) **will not trigger** an auto-deploy.

## Recommended fix (reliable)

Trigger Render deploys from GitHub Actions on every push to `main`.

### Step 1: Copy your Render Deploy Hook URL

Render → `sportsapiai` → Settings → **Deploy Hook** → copy the full URL.

### Step 2: Add GitHub Secret

GitHub → Repo → Settings → Environments → **Production** → Secrets → add:

- **Name**: `RENDER_DEPLOY_HOOK_URL`
- **Value**: *(paste the Render deploy hook URL)*

### Step 3: Done

The workflow `.github/workflows/render-deploy.yml` will run on every push to `main` and call the hook.

You can also trigger it manually:
GitHub → Actions → **Render Deployment** → Run workflow

## Alternative (not recommended)

If you want Render to auto-deploy on *any repo change* without GitHub Actions:
- Set **Root Directory** to empty (repo root)
- Change commands to:
  - Build: `cd Sports_Ai/backend && npm install && npm run build`
  - Start: `cd Sports_Ai/backend && npm start`

This works, but it will redeploy backend even for unrelated repo changes.

