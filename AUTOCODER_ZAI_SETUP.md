# Auto Coder Z.AI Configuration Guide

## Overview

This guide explains how to configure the Auto Coder (autonomous coding agent) to use Z.AI's GLM models instead of Claude models.

## Current Status

The Auto Coder system currently uses the Claude Agent SDK which connects to Claude's API via the Claude CLI. To use Z.AI, you have two options:

### Option 1: Use ZAI CLI (Recommended)

The ZAI CLI (`@guizmo-ai/zai-cli`) has been installed globally. However, the Claude Agent SDK may not be fully compatible with it yet.

### Option 2: Configure via Environment Variables

Set environment variables to configure Z.AI for the Auto Coder system.

## Global Configuration

### Step 1: Create Global Configuration Directory

The Auto Coder stores global settings in `~/.autocoder/`:

```bash
# Windows
mkdir C:\Users\dansi\.autocoder

# The directory is created automatically when you first run the agent
```

### Step 2: Set Environment Variables

Add these to your system environment variables or `.env` file:

```bash
# Z.AI Configuration for Auto Coder
ZAI_API_KEY=***REMOVED***
AUTOCODER_MODEL=glm-4
CLI_COMMAND=zai  # Use ZAI CLI instead of Claude CLI

# Optional: Z.AI Model Configuration
ZAI_MODEL=glm-4
ZAI_API_URL=https://api.z.ai/v1/chat/completions
```

### Step 3: Verify ZAI CLI Installation

```bash
# Check if ZAI CLI is installed
zai --version

# Or check npm global packages
npm list -g @guizmo-ai/zai-cli
```

## Model Selection

The Auto Coder now supports both Claude and GLM models:

### Available Models

**Claude Models:**

- `claude-opus-4-5-20251101` - Claude Opus 4.5 (default if Z.AI not configured)
- `claude-sonnet-4-5-20250929` - Claude Sonnet 4.5

**GLM Models (Z.AI):**

- `glm-4` - GLM-4 (default if ZAI_API_KEY is set)
- `glm-4-plus` - GLM-4 Plus
- `glm-4.6` - GLM-4.6 (latest)
- `glm-4.5` - GLM-4.5

### Auto-Detection

The system automatically:

- Uses `glm-4` if `ZAI_API_KEY` is configured
- Falls back to `claude-opus-4-5-20251101` if Z.AI is not configured
- Can be overridden via `AUTOCODER_MODEL` environment variable

## Usage

### Running with Z.AI

```bash
# Set environment variables
export ZAI_API_KEY=***REMOVED***
export AUTOCODER_MODEL=glm-4
export CLI_COMMAND=zai

# Run the agent
python start.py
# Or
python autonomous_agent_demo.py --project-dir my-project --model glm-4
```

### Running with Specific Model

```bash
# Use GLM-4.6
python autonomous_agent_demo.py --project-dir my-project --model glm-4.6

# Use Claude Opus (default)
python autonomous_agent_demo.py --project-dir my-project --model claude-opus-4-5-20251101
```

## Configuration Files

### Global Settings

Location: `~/.autocoder/registry.db`

The registry database stores:

- Registered projects
- Global settings (model preferences, etc.)

### Project Settings

Each project can have its own `.env` file with:

- `AUTOCODER_MODEL` - Override default model for this project
- `CLI_COMMAND` - Override CLI command for this project

## Troubleshooting

### ZAI CLI Not Found

```bash
# Install ZAI CLI globally
npm install -g @guizmo-ai/zai-cli

# Verify installation
zai --version
```

### Model Not Recognized

- Check that the model ID is in `AVAILABLE_MODELS` in `registry.py`
- Verify `AUTOCODER_MODEL` environment variable is set correctly
- Check logs for model validation errors

### API Key Issues

- Verify `ZAI_API_KEY` is set correctly
- Check that the API key has sufficient credits/quota
- Ensure the API key is valid at <https://z.ai>

## Next Steps

1. **Set Environment Variables:**

   ```bash
   # Add to your .env file or system environment
   ZAI_API_KEY=***REMOVED***
   AUTOCODER_MODEL=glm-4
   ```

2. **Test the Configuration:**

   ```bash
   python start.py
   # Select a project and verify it uses GLM-4
   ```

3. **Verify in Logs:**
   - Check the agent startup logs
   - Should show: "Model: glm-4"

## Notes

- The Claude Agent SDK may require additional configuration to fully support ZAI CLI
- If ZAI CLI is not compatible, you may need to use Claude models
- The system will automatically detect and use Z.AI when `ZAI_API_KEY` is configured
