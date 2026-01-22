#!/usr/bin/env python3
"""
Helper function to get default model from registry settings.
This is called at runtime after the registry is initialized.
"""

from registry import get_setting, VALID_MODELS
import os


def get_default_model() -> str:
    """
    Get the default model with full fallback chain.
    
    Priority:
    1. AUTOCODER_MODEL environment variable
    2. Global setting from registry (default_model)
    3. Auto-detect: glm-4 if ZAI_API_KEY is set, otherwise claude-opus-4-5-20251101
    """
    # Check environment variable first
    env_model = os.getenv("AUTOCODER_MODEL")
    if env_model and env_model in VALID_MODELS:
        return env_model
    
    # Check global setting from registry
    try:
        global_model = get_setting("default_model")
        if global_model and global_model in VALID_MODELS:
            return global_model
    except Exception:
        pass  # Registry not available, continue to auto-detect
    
    # Auto-detect based on ZAI_API_KEY
    if os.getenv("ZAI_API_KEY"):
        return "glm-4"
    
    return "claude-opus-4-5-20251101"
