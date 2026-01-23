# Test API endpoints for SportsAI backend

$baseUrl = "https://sportsapiai.onrender.com"

Write-Host "=== SportsAI API Endpoint Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Data Health Endpoint
Write-Host "1. Testing /healthz/data endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/healthz/data" -UseBasicParsing -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "   Response:"
    Write-Host "   $($response.Content)"
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Sports Summary Endpoint
Write-Host "2. Testing /api/v1/events/summary/sports endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/events/summary/sports" -UseBasicParsing -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "   Response (first 500 chars):"
    $content = $response.Content
    if ($content.Length -gt 500) {
        Write-Host "   $($content.Substring(0, 500))..."
    } else {
        Write-Host "   $content"
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Arbitrage Opportunities Endpoint
Write-Host "3. Testing /api/v1/arbitrage/opportunities endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/arbitrage/opportunities" -UseBasicParsing -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "   Response (first 500 chars):"
    $content = $response.Content
    if ($content.Length -gt 500) {
        Write-Host "   $($content.Substring(0, 500))..."
    } else {
        Write-Host "   $content"
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Events Endpoint
Write-Host "4. Testing /api/v1/events endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/events" -UseBasicParsing -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "   Response (first 500 chars):"
    $content = $response.Content
    if ($content.Length -gt 500) {
        Write-Host "   $($content.Substring(0, 500))..."
    } else {
        Write-Host "   $content"
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
