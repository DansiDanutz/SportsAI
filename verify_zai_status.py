#!/usr/bin/env python3
"""
Verify Z.AI Configuration Status
Checks if Z.AI is configured and running in all systems
"""

import os
import json
from pathlib import Path

def check_claude_code_config():
    """Check Claude Code configuration"""
    print("=" * 60)
    print("1. CLAUDE CODE CONFIGURATION")
    print("=" * 60)
    
    settings_path = Path.home() / ".claude" / "settings.json"
    if settings_path.exists():
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
            
            env = settings.get("env", {})
            if env.get("ANTHROPIC_BASE_URL") == "https://api.z.ai/api/anthropic":
                print("[OK] Claude Code is configured to use Z.AI")
                print(f"   API URL: {env.get('ANTHROPIC_BASE_URL')}")
                print(f"   Opus Model: {env.get('ANTHROPIC_DEFAULT_OPUS_MODEL', 'Not set')}")
                print(f"   Sonnet Model: {env.get('ANTHROPIC_DEFAULT_SONNET_MODEL', 'Not set')}")
                print(f"   Haiku Model: {env.get('ANTHROPIC_DEFAULT_HAIKU_MODEL', 'Not set')}")
                return True
            else:
                print("[X] Claude Code is NOT configured for Z.AI")
                print(f"   Current API URL: {env.get('ANTHROPIC_BASE_URL', 'Not set')}")
                return False
        except Exception as e:
            print(f"[ERROR] Error reading Claude Code settings: {e}")
            return False
    else:
        print("[X] Claude Code settings file not found")
        return False

def check_environment_variables():
    """Check environment variables"""
    print("\n" + "=" * 60)
    print("2. ENVIRONMENT VARIABLES")
    print("=" * 60)
    
    zai_key = os.getenv("ZAI_API_KEY")
    if zai_key:
        print("[OK] ZAI_API_KEY is set")
        print(f"   Key: {zai_key[:20]}...{zai_key[-10:]}")
    else:
        print("[X] ZAI_API_KEY is NOT set")
    
    autocoder_model = os.getenv("AUTOCODER_MODEL")
    if autocoder_model:
        print(f"[OK] AUTOCODER_MODEL: {autocoder_model}")
    else:
        print("[!] AUTOCODER_MODEL not set (will use default)")
    
    cli_command = os.getenv("CLI_COMMAND")
    if cli_command:
        print(f"[OK] CLI_COMMAND: {cli_command}")
    else:
        print("[!] CLI_COMMAND not set (will use default)")
    
    return bool(zai_key)

def check_autocoder_config():
    """Check Auto Coder global configuration"""
    print("\n" + "=" * 60)
    print("3. AUTO CODER CONFIGURATION")
    print("=" * 60)
    
    try:
        from registry import get_setting
        
        default_model = get_setting("default_model")
        cli_command = get_setting("cli_command")
        
        if default_model:
            print(f"[OK] Default Model: {default_model}")
        else:
            print("[!] Default model not set in registry")
        
        if cli_command:
            print(f"[OK] CLI Command: {cli_command}")
        else:
            print("[!] CLI command not set in registry")
        
        return True
    except Exception as e:
        print(f"[!] Could not check Auto Coder config: {e}")
        return False

def check_backend_config():
    """Check backend configuration"""
    print("\n" + "=" * 60)
    print("4. BACKEND SERVICE CONFIGURATION")
    print("=" * 60)
    
    backend_env = Path("Sports_Ai/backend/.env")
    docker_env = Path("Sports_Ai/docker/.env")
    
    configs_found = []
    
    if backend_env.exists():
        configs_found.append(backend_env)
    
    if docker_env.exists():
        configs_found.append(docker_env)
    
    if not configs_found:
        print("[!] No .env files found (checking environment variables)")
        zai_key = os.getenv("ZAI_API_KEY")
        if zai_key:
            print("[OK] ZAI_API_KEY found in environment")
            print("   Backend will use Z.AI if LLM_PROVIDER is 'auto' or 'zai'")
        else:
            print("[X] ZAI_API_KEY not found in environment")
        return bool(zai_key)
    
    for env_file in configs_found:
        print(f"\n[FILE] Checking {env_file}:")
        try:
            with open(env_file, 'r') as f:
                content = f.read()
                if "ZAI_API_KEY" in content:
                    print("   [OK] ZAI_API_KEY found")
                else:
                    print("   [X] ZAI_API_KEY not found")
                
                if "LLM_PROVIDER" in content:
                    for line in content.split('\n'):
                        if line.startswith("LLM_PROVIDER"):
                            print(f"   [OK] {line.strip()}")
                else:
                    print("   [!] LLM_PROVIDER not set (will use 'auto')")
        except Exception as e:
            print(f"   [ERROR] Error reading file: {e}")
    
    return True

def main():
    """Run all checks"""
    print("\n" + "=" * 60)
    print("Z.AI CONFIGURATION STATUS CHECK")
    print("=" * 60)
    print()
    
    results = {
        "Claude Code": check_claude_code_config(),
        "Environment Variables": check_environment_variables(),
        "Auto Coder": check_autocoder_config(),
        "Backend": check_backend_config(),
    }
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, status in results.items():
        status_icon = "[OK]" if status else "[X]"
        print(f"{status_icon} {name}: {'Configured' if status else 'Not Configured'}")
    
    print("\n" + "=" * 60)
    print("HOW TO VERIFY IT'S WORKING")
    print("=" * 60)
    print()
    print("1. Claude Code:")
    print("   - Restart Claude Code completely")
    print("   - Type '/status' in Claude Code to see active model")
    print("   - You should see GLM models being used")
    print()
    print("2. Backend Service:")
    print("   - Check backend logs on startup")
    print("   - Look for: 'Using Z.AI as LLM provider (auto-detected)'")
    print("   - Or check /admin/env-status endpoint")
    print()
    print("3. Auto Coder:")
    print("   - Run: python start.py")
    print("   - Check logs for model selection")
    print("   - Should show: 'Model: glm-4'")
    print()

if __name__ == "__main__":
    main()
