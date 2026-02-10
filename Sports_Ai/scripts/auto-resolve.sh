#!/bin/bash

# SportsAI Autonomous Bet Resolver
# Runs every 2 hours via cron to resolve completed bets
# Usage: ./auto-resolve.sh [--force] [--test]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/data/resolve.log"

# Ensure data directory exists
mkdir -p "$PROJECT_DIR/data"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [RESOLVE] $1" | tee -a "$LOG_FILE"
}

# Function to check if autonomous system is enabled
check_autonomous_config() {
    local config_file="$PROJECT_DIR/data/autonomous_config.json"
    
    if [[ -f "$config_file" ]]; then
        local enabled=$(node -p "JSON.parse(require('fs').readFileSync('$config_file')).enabled" 2>/dev/null || echo "false")
        if [[ "$enabled" != "true" ]]; then
            log "INFO: Autonomous mode disabled - resolver skipped"
            exit 0
        fi
    fi
}

# Function to get active bets count
get_active_bets_count() {
    local history_file="$PROJECT_DIR/data/betting_history.json"
    
    if [[ -f "$history_file" ]]; then
        local count=$(node -p "JSON.parse(require('fs').readFileSync('$history_file')).filter(bet => bet.status === 'pending').length" 2>/dev/null || echo "0")
        echo "$count"
    else
        echo "0"
    fi
}

# Function to run bet resolution
run_resolution() {
    log "Starting bet resolution process..."
    
    local active_bets=$(get_active_bets_count)
    log "Found $active_bets active bets to check"
    
    if [[ "$active_bets" == "0" ]]; then
        log "INFO: No active bets to resolve"
        return 0
    fi
    
    cd "$PROJECT_DIR/backend"
    
    # Check if NestJS app is running
    if ! pgrep -f "nest start" > /dev/null; then
        log "ERROR: NestJS backend not running"
        exit 1
    fi
    
    # Run the resolution via HTTP API call to autonomous service
    local result=$(curl -s -X POST http://localhost:3001/api/autonomous/resolve \
        -H "Content-Type: application/json" \
        -w "%{http_code}" || echo "000")
    
    local http_code="${result: -3}"
    local response="${result%???}"
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        local resolved=$(echo "$response" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).data.resolved" 2>/dev/null || echo "0")
        local errors=$(echo "$response" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).data.errors" 2>/dev/null || echo "0")
        
        log "SUCCESS: Resolution completed - $resolved bets resolved, $errors errors"
        
        # Update resolution statistics
        echo "{\"lastResolve\": \"$(date -Iseconds)\", \"resolved\": $resolved, \"errors\": $errors, \"activeBetsBefore\": $active_bets}" > "$PROJECT_DIR/data/last_resolve_result.json"
        
        # If bets were resolved, update bankroll and check for martingale sequences
        if [[ "$resolved" -gt "0" ]]; then
            log "INFO: $resolved bets resolved - bankroll and martingale sequences updated"
            
            # Check for completed martingale sequences
            local martingale_file="$PROJECT_DIR/data/martingale.json"
            if [[ -f "$martingale_file" ]]; then
                local completed_sequences=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).completedSequences.length" 2>/dev/null || echo "0")
                log "INFO: $completed_sequences total completed martingale sequences"
            fi
        fi
    else
        log "ERROR: Resolution failed with HTTP $http_code"
        log "Response: $response"
        exit 1
    fi
}

# Function to generate resolution summary
generate_summary() {
    local bankroll_file="$PROJECT_DIR/data/bankroll.json"
    local history_file="$PROJECT_DIR/data/betting_history.json"
    
    if [[ -f "$bankroll_file" && -f "$history_file" ]]; then
        local current_bankroll=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).current_bankroll" 2>/dev/null || echo "0")
        local total_bets=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).total_bets" 2>/dev/null || echo "0")
        local wins=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).wins" 2>/dev/null || echo "0")
        local losses=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).losses" 2>/dev/null || echo "0")
        local total_profit=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).total_profit" 2>/dev/null || echo "0")
        
        log "SUMMARY: Bankroll: $current_bankroll USD | Total Bets: $total_bets | Wins: $wins | Losses: $losses | Profit: $total_profit USD"
        
        if [[ "$total_bets" -gt "0" ]]; then
            local win_rate=$(node -p "Math.round(($wins / $total_bets) * 100)" 2>/dev/null || echo "0")
            log "SUMMARY: Win Rate: ${win_rate}%"
        fi
        
        # Check for risk management alerts
        local frozen=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).frozen" 2>/dev/null || echo "false")
        if [[ "$frozen" == "true" ]]; then
            local freeze_reason=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).freeze_reason" 2>/dev/null || echo "unknown")
            log "WARNING: Bankroll is FROZEN - Reason: $freeze_reason"
        fi
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
            echo "  --force  Run resolver even if disabled"
            echo "  --test   Run in test mode (dry run)"
            exit 1
            ;;
    esac
done

# Start resolution
log "Auto-resolve starting (force=$FORCE_RUN, test=$TEST_MODE)"

# Check prerequisites unless forced
if [[ "$FORCE_RUN" != "true" ]]; then
    check_autonomous_config
fi

# Check if this is too soon after last resolution (unless forced)
if [[ "$FORCE_RUN" != "true" ]]; then
    last_resolve_file="$PROJECT_DIR/data/last_resolve_result.json"
    if [[ -f "$last_resolve_file" ]]; then
        last_resolve=$(node -p "JSON.parse(require('fs').readFileSync('$last_resolve_file')).lastResolve" 2>/dev/null || echo "")
        if [[ -n "$last_resolve" ]]; then
            last_resolve_epoch=$(date -d "$last_resolve" +%s 2>/dev/null || echo "0")
            current_epoch=$(date +%s)
            time_diff=$((current_epoch - last_resolve_epoch))
            
            # Don't run if last resolve was less than 60 minutes ago
            if [[ $time_diff -lt 3600 ]]; then
                log "INFO: Last resolve was $(($time_diff / 60)) minutes ago - skipping"
                exit 0
            fi
        fi
    fi
fi

if [[ "$TEST_MODE" == "true" ]]; then
    local active_bets=$(get_active_bets_count)
    log "TEST MODE: Would resolve $active_bets active bets"
    log "TEST MODE: Autonomous config: OK"
    log "TEST MODE: Resolution completed successfully"
else
    run_resolution
    generate_summary
fi

log "Auto-resolve completed successfully"