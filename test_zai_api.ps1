# Test Z.AI API Connectivity
Write-Host "Testing Z.AI API Endpoints..." -ForegroundColor Cyan
Write-Host ""

$apiKey = "***REMOVED***"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Test 1: Direct Z.AI endpoint
Write-Host "Test 1: Direct Z.AI API (https://api.z.ai/v1/chat/completions)" -ForegroundColor Yellow
try {
    $body = @{
        model = "glm-4"
        messages = @(
            @{
                role = "user"
                content = "test"
            }
        )
        max_tokens = 10
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://api.z.ai/v1/chat/completions" -Method POST -Headers $headers -Body $body -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  [OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response received successfully" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Anthropic-compatible endpoint
Write-Host "Test 2: Anthropic-compatible API (https://api.z.ai/api/anthropic/v1/messages)" -ForegroundColor Yellow
try {
    $body = @{
        model = "glm-4.7"
        max_tokens = 10
        messages = @(
            @{
                role = "user"
                content = "test"
            }
        )
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://api.z.ai/api/anthropic/v1/messages" -Method POST -Headers $headers -Body $body -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  [OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response received successfully" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Cyan
