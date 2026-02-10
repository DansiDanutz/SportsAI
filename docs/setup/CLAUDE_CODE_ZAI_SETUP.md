# Claude Code Z.AI Configuration

## Overview

This guide explains how to configure Claude Code (the desktop application) to use Z.AI's GLM models instead of Claude's API.

## Configuration Complete ✅

Claude Code has been configured to use Z.AI's GLM models. The configuration is stored in `~/.claude/settings.json`.

## What Was Configured

### Environment Variables Added to settings.json

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-zai-api-key-here",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air"
  }
}
```

### Model Mappings

- **Opus** → GLM-4.7
- **Sonnet** → GLM-4.7
- **Haiku** → GLM-4.5-Air

## How to Use

1. **Restart Claude Code:**
   - Close Claude Code completely
   - Reopen Claude Code
   - The configuration will be loaded automatically

2. **Verify Configuration:**
   - In Claude Code, type `/status` to see which model is active
   - You should see GLM models instead of Claude models

3. **Check Model Selection:**
   - When you see "Opus 4.5" in Claude Code, it's actually using GLM-4.7
   - The model names are mapped automatically

## Configuration Details

### API Endpoint

- **Z.AI API Base URL:** `https://api.z.ai/api/anthropic`
- This endpoint provides Claude-compatible API for Claude Code

### API Key

- **Z.AI API Key:** Configured in settings.json
- The key is stored in the `ANTHROPIC_AUTH_TOKEN` environment variable

### Timeout

- **API Timeout:** 3000000ms (50 minutes)
- This allows for long-running operations

## Troubleshooting

### Model Not Showing as GLM

1. **Restart Claude Code:**
   - Close and reopen Claude Code completely
   - Settings are loaded on startup

2. **Check Settings File:**
   - Verify `~/.claude/settings.json` contains the `env` section
   - Ensure the JSON is valid

3. **Verify API Key:**
   - Check that your Z.AI API key is valid
   - Visit <https://z.ai/manage-apikey/apikey-list> to verify

4. **Check Network:**
   - Ensure you can reach `https://api.z.ai`
   - Check firewall settings if needed

### API Errors

If you see API errors:

1. **Verify API Key:**

   ```bash
   # Test the API key
   curl -H "Authorization: Bearer your-zai-api-key-here" \
        https://api.z.ai/api/anthropic/v1/models
   ```

2. **Check API Endpoint:**
   - Ensure `ANTHROPIC_BASE_URL` is set to `https://api.z.ai/api/anthropic`
   - This is the Claude-compatible endpoint

3. **Review Logs:**
   - Check Claude Code's debug logs in `~/.claude/debug/`
   - Look for API-related errors

## Model Availability

### Available GLM Models

- **GLM-4.7** - Latest model (mapped to Opus/Sonnet)
- **GLM-4.6** - Previous version
- **GLM-4.5-Air** - Lightweight model (mapped to Haiku)
- **GLM-4.5** - Standard version
- **GLM-4** - Base version

### Changing Model Mappings

To use different GLM models, update the model mapping environment variables:

```json
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.6",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5"
  }
}
```

## Next Steps

1. **Restart Claude Code:**
   - Close the application completely
   - Reopen it to load the new configuration

2. **Verify:**
   - Type `/status` in Claude Code
   - Check that GLM models are being used

3. **Test:**
   - Try a coding task
   - Verify the responses are coming from Z.AI

## Summary

✅ **Claude Code configured** to use Z.AI  
✅ **API endpoint** set to Z.AI  
✅ **Model mappings** configured  
✅ **API key** added to settings  

Claude Code will now use Z.AI's GLM models instead of Claude's API. Restart Claude Code to apply the changes.
