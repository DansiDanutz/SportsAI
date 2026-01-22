# OAuth Token Issue - Root Cause and Solution

## The Real Problem

After deep analysis of Auto Claude Desktop's source code, I've identified the exact issue:

### How Auto Claude Authentication Works

1. **Auto Claude Desktop UI** stores encrypted OAuth tokens in:
   - `C:\Users\dansi\AppData\Roaming\auto-claude-ui\config\claude-profiles.json`
   - Tokens are encrypted using Electron's `safeStorage` API (Windows Credential Manager/DPAPI)
   - Active profile: "Seme" (seme@kryptostack.com)

2. **Auto Claude Backend** (Python) looks for tokens in priority order:
   - Environment variable: `CLAUDE_CODE_OAUTH_TOKEN`
   - Windows credential files: `%USERPROFILE%\.claude\.credentials.json`
   - Environment variable: `ANTHROPIC_AUTH_TOKEN` (for enterprise/proxy setups)

3. **The Disconnect:**
   - UI has encrypted tokens but **doesn't write decrypted token to project `.env` file**
   - UI DOES decrypt and inject token when running agents through the UI
   - But when backend tries to run directly, it can't find the token

### Source Code Evidence

**File:** `Auto-Claude\apps\frontend\src\main\claude-profile-manager.ts:379`
```typescript
// Decrypt the token before putting in environment
const decryptedToken = decryptToken(profile.oauthToken);
if (decryptedToken) {
  env.CLAUDE_CODE_OAUTH_TOKEN = decryptedToken;  // ✅ Sets in memory for UI-launched agents
  console.warn('[ClaudeProfileManager] Using OAuth token for profile:', profile.name);
}
```

**File:** `Auto-Claude\apps\backend\core\auth.py:134`
```python
def get_auth_token() -> str | None:
    # Checks multiple sources in priority order:
    # 1. CLAUDE_CODE_OAUTH_TOKEN (env var) ❌ Empty in .env file
    # 2. ANTHROPIC_AUTH_TOKEN (CCR/proxy env var) ❌ Not set
    # 3. System credential store (Windows Credential Manager) ❌ Empty accessToken
```

## The Solution

You have **two options** to fix this:

### Option 1: Use Auto Claude Desktop UI (Recommended)

**Why it should work:** The UI decrypts tokens and injects them when launching agents.

**Steps:**
1. **Completely close** Auto Claude Desktop (right-click system tray, Exit)
2. **Restart** Auto Claude Desktop
3. Verify "Seme" profile is active in Integrations tab
4. **Important:** Always create tasks and start agents FROM THE UI
   - Don't run backend Python scripts directly
   - Let the UI handle authentication injection

**Current Status:** This should be working but errors suggest the UI might not be properly injecting the token. If this continues failing, try Option 2.

### Option 2: Authenticate Claude CLI Directly (Manual Workaround)

**This creates credential files that both Claude CLI and Auto Claude backend can read.**

**Steps:**

1. **Open PowerShell** (not Git Bash)

2. **Run Claude login:**
   ```powershell
   C:\Users\dansi\.local\bin\claude.exe auth login
   ```

3. **Follow the authentication flow:**
   - Browser will open
   - Log in with: **seme@kryptostack.com**
   - Complete the OAuth flow

4. **Verify credential file created:**
   ```powershell
   cat C:\Users\dansi\.claude\.credentials.json
   ```
   Should now contain:
   ```json
   {
     "claudeAiOauth": {
       "accessToken": "sk-ant-oat01-..."
     }
   }
   ```

5. **Test authentication:**
   ```powershell
   C:\Users\dansi\.local\bin\claude.exe auth status
   ```
   Should show: ✓ Authenticated

**Why this works:**
- Auto Claude backend's `auth.py` reads from `~/.claude/.credentials.json`
- This is the standard Claude Code credential location
- Both Claude CLI and Auto Claude backend can use this token

### Option 3: Manual Token Injection (Advanced)

If you can access the decrypted token somehow (through Auto Claude UI logs in debug mode), you could manually add it to the `.env` file:

```bash
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-xxxxxxxxx
```

**Note:** Tokens start with `sk-ant-oat01-` and are long strings.

## What I Fixed Already

✅ **Graphiti Memory Configuration**
- Enabled and configured with OpenAI provider
- API key configured
- Database settings configured

✅ **Git/Worktree Settings**
- Default branch set to `main`

✅ **GitHub Integration**
- Already properly configured

✅ **MCP Servers**
- All enabled and configured

## Remaining Blocker

❌ **OAuth Token** - Choose one of the 3 options above

⚠️ **Python Version** - Need 3.12+ for Graphiti memory (see below)

## Python 3.12 Upgrade (For Memory Features)

Your current Python version: **3.11.9**
Graphiti requires: **Python 3.12+**

**Impact:**
- Graphiti memory is configured but won't work until you upgrade
- All other Auto Claude features will work fine
- Memory features provide cross-session context retention

**To Upgrade:**

1. **Download Python 3.12+**
   - Go to: <https://www.python.org/downloads/>
   - Download latest Python 3.12.x or 3.13.x for Windows

2. **During Installation:**
   - ✓ Check "Add Python to PATH"
   - ✓ Check "Install for all users" (optional)
   - Select "Customize installation"
   - ✓ Check "pip"
   - ✓ Check "Add Python to environment variables"

3. **After Installation:**
   ```powershell
   python --version  # Should show 3.12.x or 3.13.x
   pip install real_ladybug graphiti-core pywin32
   ```

4. **Verify Installation:**
   ```powershell
   python -c "import real_ladybug; import graphiti_core; print('Graphiti ready!')"
   ```

**Alternative:** Disable memory features if you don't want to upgrade:
```bash
# In .auto-claude\.env
GRAPHITI_ENABLED=false
```

## Testing After Fix

Once OAuth token is working:

1. **Simple Test in Auto Claude Desktop:**
   - Open Auto Claude Desktop
   - Create new task: "List all files in this project"
   - Click "Start Agent"
   - Should see agent output (not "exit code 1")

2. **Verify Graphiti (if Python 3.12+ installed):**
   - Check logs for: "[Graphiti] Initialized memory layer"
   - Memory database should be created at: `~/.auto-claude/memories/`

3. **Create a Real Task:**
   - Try: "Add a README.md file to this project"
   - Agent should complete successfully

## Summary

**The core issue:** Auto Claude Desktop UI has your OAuth tokens but isn't making them available to the backend when it tries to run agents.

**The fix:** Use Option 2 (authenticate Claude CLI) to create credential files that the backend can read independently of the UI's encrypted token storage.

**After that:** Auto Claude should work fully, except Graphiti memory (requires Python 3.12+).
