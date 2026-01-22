# Z.AI Environment Configuration Guide

## Overview

This project now supports Z.AI as a primary LLM provider alongside OpenRouter. The system automatically detects which provider is configured and uses it accordingly.

## Quick Setup

### Step 1: Get Your Z.AI API Key

1. Visit [Z.AI Platform](https://z.ai)
2. Register or log in to your account
3. Subscribe to a plan (if required)
4. Generate an API key from your account dashboard
5. Copy your API key

### Step 2: Add to Environment Variables

Add the following to your `.env` file (or Render environment variables):

```bash
# Z.AI Configuration (Primary LLM Provider)
ZAI_API_KEY=your-zai-api-key-here

# Optional: LLM Provider Selection
LLM_PROVIDER=auto  # Options: 'auto', 'zai', 'openrouter'
# 'auto' will use Z.AI if configured, otherwise OpenRouter

# Optional: Z.AI Model Configuration
ZAI_MODEL=glm-4  # Default model (can be changed)
ZAI_API_URL=https://api.z.ai/v1/chat/completions  # Default API endpoint
ZAI_TIMEOUT_MS=12000  # Request timeout in milliseconds
```

### Step 3: Verify Configuration

The system will automatically:

- Detect if Z.AI is configured
- Use Z.AI as the primary provider if `ZAI_API_KEY` is set
- Fall back to OpenRouter if Z.AI is not configured
- Log which provider is being used at startup

## Environment Variables Reference

| Variable | Required | Default | Description |
| ---------- | ---------- | --------- | ------------- |
| `ZAI_API_KEY` | Yes* | - | Your Z.AI API key from the dashboard |
| `LLM_PROVIDER` | No | `auto` | Provider selection: `auto`, `zai`, or `openrouter` |
| `ZAI_MODEL` | No | `glm-4` | Model to use for Z.AI requests |
| `ZAI_API_URL` | No | `https://api.z.ai/v1/chat/completions` | Z.AI API endpoint |
| `ZAI_TIMEOUT_MS` | No | `12000` | Request timeout in milliseconds |

*Required if you want to use Z.AI. If not set, the system will use OpenRouter (if configured).

## Provider Selection Logic

The `LLM_PROVIDER` environment variable controls which LLM provider is used:

- **`auto`** (default): Automatically selects the best available provider
  - Uses Z.AI if `ZAI_API_KEY` is configured
  - Falls back to OpenRouter if Z.AI is not configured
  - Logs a warning if neither is configured

- **`zai`**: Forces use of Z.AI (requires `ZAI_API_KEY`)
  - Falls back to OpenRouter if Z.AI is not configured

- **`openrouter`**: Forces use of OpenRouter (requires `OPENROUTER_API_KEY`)

## Usage in Code

The application uses the unified `LlmService` which automatically handles provider selection:

```typescript
// In your service
constructor(private llmService: LlmService) {}

// Generate advice
const advice = await this.llmService.generateAdvice(config, matches, 'en');

// Generate news
const news = await this.llmService.generateNews(['soccer'], 'en');

// Chat
const response = await this.llmService.chat(message, context);
```

## Migration from OpenRouter

If you're currently using OpenRouter and want to switch to Z.AI:

1. Add `ZAI_API_KEY` to your environment variables
2. Optionally set `LLM_PROVIDER=zai` to force Z.AI usage
3. Restart your application
4. The system will automatically use Z.AI for all LLM requests

You can keep `OPENROUTER_API_KEY` as a fallback by setting `LLM_PROVIDER=auto`.

## Troubleshooting

### "ZAI_API_KEY not configured" error

- Verify your API key is set in environment variables
- Check that the key is correct (no extra spaces or quotes)
- Restart your application after adding the key

### Provider not switching

- Check the application logs for provider selection messages
- Verify `LLM_PROVIDER` is set correctly
- Ensure the API key for your chosen provider is configured

### API errors

- Verify your Z.AI account has sufficient credits/quota
- Check the API endpoint URL is correct
- Review timeout settings if requests are timing out

## Additional Resources

- [Z.AI Developer Documentation](https://docs.z.ai)
- [Z.AI API Reference](https://docs.z.ai/api)
- [Z.AI Python SDK](https://docs.z.ai/guides/develop/python/introduction)
