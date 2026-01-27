@echo off
REM Setup Auto Coder with Z.AI Configuration (Windows)

echo ========================================
echo Auto Coder Z.AI Setup
echo ========================================
echo.

REM Set Z.AI environment variables for current session
setx ZAI_API_KEY "your-zai-api-key-here"
setx AUTOCODER_MODEL "glm-4"
setx CLI_COMMAND "zai"
setx ZAI_MODEL "glm-4"
setx ZAI_API_URL "https://api.z.ai/v1/chat/completions"
setx ZAI_TIMEOUT_MS "12000"

echo.
echo Environment variables set:
echo   ZAI_API_KEY=your-zai-api-key-here
echo   AUTOCODER_MODEL=glm-4
echo   CLI_COMMAND=zai
echo   ZAI_MODEL=glm-4
echo.
echo Note: You may need to restart your terminal for changes to take effect.
echo.
echo Verifying ZAI CLI installation...
where zai >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] ZAI CLI is installed
    zai --version
) else (
    echo [WARNING] ZAI CLI not found in PATH
    echo Install with: npm install -g @guizmo-ai/zai-cli
)
echo.
echo Setup complete!
echo.
pause
