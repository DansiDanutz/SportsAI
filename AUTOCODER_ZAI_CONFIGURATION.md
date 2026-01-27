# Auto Coder Z.AI Configuration - Complete Setup

## ✅ Configuration Complete

Auto Coder has been configured to use Z.AI's GLM models globally.

## What Was Done

### 1. Installed ZAI CLI Globally

- ✅ Installed `@guizmo-ai/zai-cli` globally via npm
- ✅ Available as `zai` command in PATH

### 2. Added GLM Models to Registry

- ✅ Added GLM models to `AVAILABLE_MODELS` in `registry.py`:
  - `glm-4` (default when Z.AI is configured)
  - `glm-4-plus`
  - `glm-4.6`
  - `glm-4.5`

### 3. Auto-Detection Logic

- ✅ System automatically uses `glm-4` if `ZAI_API_KEY` is set
- ✅ Falls back to `claude-opus-4-5-20251101` if Z.AI is not configured
- ✅ Can be overridden via `AUTOCODER_MODEL` environment variable

### 4. Global Configuration

- ✅ Created global settings in `~/.autocoder/registry.db`
- ✅ Set default model to `glm-4`
- ✅ Set CLI command to `zai`
- ✅ Configured Z.AI API key

### 5. Updated Client Configuration

- ✅ `client.py` auto-detects ZAI CLI when `ZAI_API_KEY` is set
- ✅ Uses `zai` CLI command when available
- ✅ Falls back to `claude` CLI if ZAI CLI not found

## Current Configuration

### Global Settings (Stored in Registry)

- **Default Model:** `glm-4`
- **CLI Command:** `zai`
- **Preferred Provider:** Z.AI
- **Z.AI API Key:** Configured

### Environment Variables (Set for Current Session)

```bash
ZAI_API_KEY=your-zai-api-key-here
AUTOCODER_MODEL=glm-4
CLI_COMMAND=zai
ZAI_MODEL=glm-4
```

## How to Use

### Option 1: Use Setup Scripts (Recommended)

**Windows:**

```bash
setup_autocoder_zai.bat
```

**macOS/Linux:**

```bash
chmod +x setup_autocoder_zai.sh
./setup_autocoder_zai.sh
```

### Option 2: Set Environment Variables Manually

Add to your `.env` file or system environment:

```bash
ZAI_API_KEY=your-zai-api-key-here
AUTOCODER_MODEL=glm-4
CLI_COMMAND=zai
ZAI_MODEL=glm-4
ZAI_API_URL=https://api.z.ai/v1/chat/completions
ZAI_TIMEOUT_MS=12000
```

### Option 3: Use Global Settings (Already Configured)

The global settings are already configured. Just run:

```bash
python start.py
# Or
python autonomous_agent_demo.py --project-dir my-project
```

The system will automatically:

- Detect `ZAI_API_KEY` from environment or global settings
- Use `glm-4` as the default model
- Use `zai` CLI command

## Verification

### Check Current Configuration

```bash
# Check if ZAI CLI is installed
zai --version

# Check default model (should show glm-4 if ZAI_API_KEY is set)
python -c "from registry import DEFAULT_MODEL; print(DEFAULT_MODEL)"

# Check available models
python -c "from registry import AVAILABLE_MODELS; print([m['name'] for m in AVAILABLE_MODELS])"
```

### Test Auto Coder

```bash
# Start Auto Coder
python start.py

# Select a project - it should use GLM-4 automatically
```

## Model Selection

### Available Models

**Claude Models:**

- `claude-opus-4-5-20251101` - Claude Opus 4.5
- `claude-sonnet-4-5-20250929` - Claude Sonnet 4.5

**GLM Models (Z.AI):**

- `glm-4` - GLM-4 (default when Z.AI configured)
- `glm-4-plus` - GLM-4 Plus
- `glm-4.6` - GLM-4.6 (latest)
- `glm-4.5` - GLM-4.5

### Override Model

```bash
# Use specific model
python autonomous_agent_demo.py --project-dir my-project --model glm-4.6

# Use Claude instead
python autonomous_agent_demo.py --project-dir my-project --model claude-opus-4-5-20251101
```

## Files Created/Modified

### New Files

- `setup_autocoder_global.py` - Global configuration setup script
- `setup_autocoder_zai.bat` - Windows environment setup
- `setup_autocoder_zai.sh` - macOS/Linux environment setup
- `get_default_model.py` - Runtime model selection helper
- `AUTOCODER_ZAI_SETUP.md` - Setup guide
- `AUTOCODER_ZAI_CONFIGURATION.md` - This file
- `.autocoder/config.json` - Global config file

### Modified Files

- `registry.py` - Added GLM models, auto-detection logic
- `client.py` - Auto-detects ZAI CLI, supports Z.AI configuration
- `autonomous_agent_demo.py` - Uses get_default_model() for runtime model selection

## Troubleshooting

### ZAI CLI Not Found

```bash
# Install ZAI CLI
npm install -g @guizmo-ai/zai-cli

# Verify installation
zai --version
```

### Model Not Switching

1. **Check Environment Variables:**

   ```bash
   # Windows PowerShell
   $env:ZAI_API_KEY
   $env:AUTOCODER_MODEL

   # Verify they're set
   ```

2. **Check Global Settings:**

   ```python
   from registry import get_setting
   print(get_setting("default_model"))
   print(get_setting("cli_command"))
   ```

3. **Restart Terminal:**
   - Environment variables set via `setx` require a new terminal session

### Claude Agent SDK Compatibility

**Note:** The Claude Agent SDK is designed for Claude's API. The ZAI CLI may not be fully compatible. If you encounter issues:

1. **Try using Claude models:**

   ```bash
   python autonomous_agent_demo.py --project-dir my-project --model claude-opus-4-5-20251101
   ```

2. **Check ZAI CLI compatibility:**

   ```bash
   zai --help
   # Verify it supports the same commands as Claude CLI
   ```

3. **Use environment variables:**
   - Set `CLI_COMMAND=claude` to use Claude CLI
   - The system will still use Z.AI API for other services (backend LLM)

## Next Steps

1. **Make Environment Variables Persistent:**
   - Run `setup_autocoder_zai.bat` (Windows) or `./setup_autocoder_zai.sh` (macOS/Linux)
   - Or add to your `.env` file

2. **Test the Configuration:**

   ```bash
   python start.py
   # Create or select a project
   # Verify it uses GLM-4 in the logs
   ```

3. **Verify in Logs:**
   - When starting the agent, you should see: `Model: glm-4`
   - CLI command should show: `Using system CLI: [path to zai]`

## Summary

✅ **ZAI CLI:** Installed globally  
✅ **GLM Models:** Added to registry  
✅ **Auto-Detection:** Configured  
✅ **Global Settings:** Set up  
✅ **Client Configuration:** Updated  
✅ **Environment Variables:** Configured  

The Auto Coder is now configured to use Z.AI's GLM models when `ZAI_API_KEY` is set. The system will automatically detect and use Z.AI for all autonomous coding tasks.
