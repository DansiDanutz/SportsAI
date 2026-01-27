#!/usr/bin/env python3
"""
Setup Global Auto Coder Configuration with Z.AI

This script initializes the global Auto Coder configuration to use Z.AI.
"""

import os
from pathlib import Path
from registry import get_config_dir, set_setting, get_setting

# Z.AI Configuration
ZAI_API_KEY = "your-zai-api-key-here"
DEFAULT_MODEL = "glm-4"
CLI_COMMAND = "zai"


def setup_global_config():
    """Set up global Auto Coder configuration with Z.AI."""
    print("Setting up global Auto Coder configuration with Z.AI...")
    print()
    
    # Ensure config directory exists
    config_dir = get_config_dir()
    print(f"Config directory: {config_dir}")
    
    # Set global settings
    set_setting("default_model", DEFAULT_MODEL)
    set_setting("cli_command", CLI_COMMAND)
    set_setting("zai_api_key", ZAI_API_KEY)
    set_setting("zai_model", DEFAULT_MODEL)
    set_setting("preferred_provider", "zai")
    
    print("Global settings configured:")
    print(f"  Default Model: {DEFAULT_MODEL}")
    print(f"  CLI Command: {CLI_COMMAND}")
    print(f"  Preferred Provider: Z.AI")
    print()
    
    # Set environment variables (for current session)
    os.environ["ZAI_API_KEY"] = ZAI_API_KEY
    os.environ["AUTOCODER_MODEL"] = DEFAULT_MODEL
    os.environ["CLI_COMMAND"] = CLI_COMMAND
    os.environ["ZAI_MODEL"] = DEFAULT_MODEL
    
    print("Environment variables set for current session:")
    print(f"  ZAI_API_KEY={ZAI_API_KEY[:20]}...")
    print(f"  AUTOCODER_MODEL={DEFAULT_MODEL}")
    print(f"  CLI_COMMAND={CLI_COMMAND}")
    print()
    print("[OK] Global configuration complete!")
    print()
    print("Note: To make environment variables persistent, run:")
    print("  Windows: setup_autocoder_zai.bat")
    print("  macOS/Linux: ./setup_autocoder_zai.sh")
    print()
    print("Or add to your .env file:")
    print(f"  ZAI_API_KEY={ZAI_API_KEY}")
    print(f"  AUTOCODER_MODEL={DEFAULT_MODEL}")
    print(f"  CLI_COMMAND={CLI_COMMAND}")


if __name__ == "__main__":
    setup_global_config()
