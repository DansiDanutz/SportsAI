#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  Autonomous Coding Agent"
echo "========================================"
echo ""

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "[ERROR] Claude CLI not found"
    echo ""
    echo "Please install Claude CLI first:"
    echo "  curl -fsSL https://claude.ai/install.sh | bash"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "[OK] Claude CLI found"

# Note: Claude CLI no longer stores credentials in ~/.claude/.credentials.json
# We can't reliably check auth status without making an API call, so we just
# verify the CLI is installed and remind the user to login if needed
if [ -d "$HOME/.claude" ]; then
    echo "[OK] Claude CLI directory found"
    echo "     (If you're not logged in, run: claude login)"
else
    echo "[!] Claude CLI not configured"
    echo ""
    echo "Please run 'claude login' to authenticate before continuing."
    echo ""
    read -p "Press Enter to continue anyway, or Ctrl+C to exit..."
fi

echo ""

# Check if venv exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt --quiet

# Run the app
python start.py
