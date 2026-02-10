# Claude Code Timeout Fix

## Issue

Claude Code was "thinking too much" - taking a very long time to respond.

## Root Cause

The `API_TIMEOUT_MS` was set to `3000000` (50 minutes), which caused Claude Code to wait too long for API responses.

## Fix Applied

Reduced the timeout to `30000` (30 seconds) - a more reasonable timeout that will:

- Fail fast if the API is not responding
- Prevent long "thinking" periods
- Still allow enough time for normal API responses

## Configuration Change

**Before:**

```json
"API_TIMEOUT_MS": "3000000"  // 50 minutes - TOO LONG
```

**After:**

```json
"API_TIMEOUT_MS": "30000"  // 30 seconds - REASONABLE
```

## Next Steps

1. **Restart Claude Code:**
   - Close Claude Code completely
   - Reopen it to load the new timeout setting

2. **Test Response Time:**
   - Try a simple query in Claude Code
   - It should respond much faster now
   - If it times out, you'll get an error instead of waiting 50 minutes

3. **If Still Slow:**
   - The Z.AI API endpoint might not be responding
   - Check network connectivity
   - Verify the API key is valid
   - Consider temporarily switching back to Claude's API

## Alternative: Switch Back to Claude API

If Z.AI continues to have issues, you can temporarily switch back to Claude's API by removing or commenting out the `env` section in `~/.claude/settings.json`:

```json
{
  "autoUpdatesChannel": "latest",
  "hooks": { ... },
  "statusLine": { ... }
  // Remove or comment out the "env" section to use Claude's API
}
```

Then restart Claude Code.
