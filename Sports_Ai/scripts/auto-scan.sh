#!/bin/bash

# SportsAI Autonomous Scanner
# Runs every hour via cron to scan for new betting opportunities
# Usage: ./auto-scan.sh [--force] [--test]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/data/scan.log"

# Ensure data directory exists
mkdir -p "$PROJECT_DIR/data"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SCAN] $1" | tee -a "$LOG_FILE"
}

# Function to check if bankroll is frozen
check_bankroll_status() {
    local bankroll_file="$PROJECT_DIR/data/bankroll.json"
    
    if [[ -f "$bankroll_file" ]]; then
        local frozen=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).frozen" 2>/dev/null || echo "false")
        if [[ "$frozen" == "true" ]]; then
            log "ERROR: Bankroll is frozen - scanner disabled"
            exit 1
        fi
    fi
}

# Function to check autonomous config
check_autonomous_config() {
    local config_file="$PROJECT_DIR/data/autonomous_config.json"
    
    if [[ -f "$config_file" ]]; then
        local enabled=$(node -p "JSON.parse(require('fs').readFileSync('$config_file')).enabled" 2>/dev/null || echo "false")
        if [[ "$enabled" != "true" ]]; then
            log "INFO: Autonomous mode disabled - scanner skipped"
            exit 0
        fi
    fi
}

# Function to run the autonomous scan
run_scan() {
    log "Starting autonomous scan..."
    
    cd "$PROJECT_DIR/backend"
    
    # Check if NestJS app is running
    if ! pgrep -f "nest start" > /dev/null; then
        log "ERROR: NestJS backend not running"
        exit 1
    fi
    
    # Run the scan via HTTP API call to autonomous service
    local result=$(curl -s -X POST http://localhost:3001/api/autonomous/scan \
        -H "Content-Type: application/json" \
        -w "%{http_code}" || echo "000")
    
    local http_code="${result: -3}"
    local response="${result%???}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        local bets_placed=$(echo "$response" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).data.betsPlaced" 2>/dev/null || echo "0")
        local bets_analyzed=$(echo "$response" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).data.betsAnalyzed" 2>/dev/null || echo "0")
        local errors=$(echo "$response" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).data.errors" 2>/dev/null || echo "0")
        
        log "SUCCESS: Scan completed - $bets_placed bets placed, $bets_analyzed analyzed, $errors errors"
        
        # Update scan statistics
        echo "{\"lastScan\": \"$(date -Iseconds)\", \"betsPlaced\": $bets_placed, \"betsAnalyzed\": $bets_analyzed, \"errors\": $errors}" > "$PROJECT_DIR/data/last_scan_result.json"
    else
        log "ERROR: Scan failed with HTTP $http_code"
        log "Response: $response"
        exit 1
    fi
}

# Parse command line arguments
FORCE_RUN=false
TEST_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_RUN=true
            shift
            ;;
        --test)
            TEST_MODE=true
            shift
            ;;
        *)
            echo "Usage: $0 [--force] [--test]"
            echo "  --force  Run scan even if disabled"
            echo "  --test   Run in test mode (dry run)"
            exit 1
            ;;
    esac
done

# Start scan
log "Auto-scan starting (force=$FORCE_RUN, test=$TEST_MODE)"

# Check prerequisites unless forced
if [[ "$FORCE_RUN" != "true" ]]; then
    check_bankroll_status
    check_autonomous_config
fi

# Check if this is too soon after last scan (unless forced)
if [[ "$FORCE_RUN" != "true" ]]; then
    last_scan_file="$PROJECT_DIR/data/last_scan_result.json"
    if [[ -f "$last_scan_file" ]]; then
        last_scan=$(node -p "JSON.parse(require('fs').readFileSync('$last_scan_file')).lastScan" 2>/dev/null || echo "")
        if [[ -n "$last_scan" ]]; then
            last_scan_epoch=$(date -d "$last_scan" +%s 2>/dev/null || echo "0")
            current_epoch=$(date +%s)
            time_diff=$((current_epoch - last_scan_epoch))
            
            # Don't run if last scan was less than 30 minutes ago
            if [[ $time_diff -lt 1800 ]]; then
                log "INFO: Last scan was $(($time_diff / 60)) minutes ago - skipping"
                exit 0
            fi
        fi
    fi
fi

if [[ "$TEST_MODE" == "true" ]]; then
    log "TEST MODE: Would run autonomous scan now"
    log "TEST MODE: Bankroll status: OK"
    log "TEST MODE: Autonomous config: OK"
    log "TEST MODE: Scan completed successfully"
else
    run_scan
fi

log "Auto-scan completed successfully"