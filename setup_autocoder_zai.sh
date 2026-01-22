#!/bin/bash
# Setup Auto Coder with Z.AI Configuration (macOS/Linux)

echo "========================================"
echo "Auto Coder Z.AI Setup"
echo "========================================"
echo ""

# Detect shell and set appropriate config file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    SHELL_CONFIG="$HOME/.profile"
fi

# Add Z.AI environment variables to shell config
echo "" >> "$SHELL_CONFIG"
echo "# Z.AI Configuration for Auto Coder" >> "$SHELL_CONFIG"
echo "export ZAI_API_KEY=***REMOVED***" >> "$SHELL_CONFIG"
echo "export AUTOCODER_MODEL=glm-4" >> "$SHELL_CONFIG"
echo "export CLI_COMMAND=zai" >> "$SHELL_CONFIG"
echo "export ZAI_MODEL=glm-4" >> "$SHELL_CONFIG"
echo "export ZAI_API_URL=https://api.z.ai/v1/chat/completions" >> "$SHELL_CONFIG"
echo "export ZAI_TIMEOUT_MS=12000" >> "$SHELL_CONFIG"

echo "Environment variables added to $SHELL_CONFIG"
echo ""
echo "Set variables:"
echo "  ZAI_API_KEY=***REMOVED***"
echo "  AUTOCODER_MODEL=glm-4"
echo "  CLI_COMMAND=zai"
echo "  ZAI_MODEL=glm-4"
echo ""
echo "Verifying ZAI CLI installation..."
if command -v zai &> /dev/null; then
    echo "[OK] ZAI CLI is installed"
    zai --version
else
    echo "[WARNING] ZAI CLI not found in PATH"
    echo "Install with: npm install -g @guizmo-ai/zai-cli"
fi
echo ""
echo "Setup complete!"
echo "Run: source $SHELL_CONFIG (or restart terminal)"
