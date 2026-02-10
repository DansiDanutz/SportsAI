#!/bin/bash

# Daily Picks Generator Script
# This script fetches today's events and generates betting picks
# Can be run as a cron job

# Set the base directory
BASE_DIR="/home/Memo1981/SportsAI/Sports_Ai"
cd "$BASE_DIR" || exit 1

# Log file
LOG_FILE="$BASE_DIR/data/daily-picks.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting daily picks generation..." >> "$LOG_FILE"

# Function to log messages
log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
    echo "$1"
}

# Check if backend is available
check_backend() {
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
            log "Backend is available"
            return 0
        fi
        
        log "Backend not available, attempt $attempt/$max_attempts"
        sleep 10
        ((attempt++))
    done
    
    log "ERROR: Backend not available after $max_attempts attempts"
    return 1
}

# Fetch today's events from TheSportsDB
fetch_todays_events() {
    local today=$(date '+%Y-%m-%d')
    log "Fetching events for $today from TheSportsDB..."
    
    # Try to get today's events
    local events=$(curl -s "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=$today" | jq '.events // []')
    
    if [ "$events" = "[]" ] || [ "$events" = "null" ]; then
        log "No events found for today, fetching upcoming events from major leagues..."
        
        # Fetch upcoming events from Premier League (4328)
        local pl_events=$(curl -s "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328" | jq '.events[:5] // []')
        
        # Fetch upcoming events from Champions League (4480) 
        local cl_events=$(curl -s "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4480" | jq '.events[:3] // []')
        
        # Combine events
        events=$(echo "$pl_events $cl_events" | jq -s 'add')
    fi
    
    local event_count=$(echo "$events" | jq 'length')
    log "Found $event_count events"
    
    echo "$events"
}

# Generate picks via API
generate_picks() {
    log "Calling strategy API to generate picks..."
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        "http://localhost:3000/api/strategy/generate-picks" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        local pick_count=$(echo "$response" | jq '.count // 0' 2>/dev/null)
        if [ "$pick_count" -gt 0 ]; then
            log "Successfully generated $pick_count new picks"
            return 0
        else
            log "No new picks were generated"
            return 1
        fi
    else
        log "ERROR: Failed to call strategy API"
        return 1
    fi
}

# Get current picks for today
get_todays_picks() {
    log "Fetching today's existing picks..."
    
    local response=$(curl -s "http://localhost:3000/api/strategy/today" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        local pick_count=$(echo "$response" | jq 'length // 0' 2>/dev/null)
        log "Found $pick_count existing picks for today"
        echo "$pick_count"
    else
        log "ERROR: Failed to fetch today's picks"
        echo "0"
    fi
}

# Main execution
main() {
    log "=== Daily Picks Generation Started ==="
    
    # Check if jq is installed
    if ! command -v jq > /dev/null 2>&1; then
        log "ERROR: jq is not installed. Please install it first."
        exit 1
    fi
    
    # Check if backend is running
    if ! check_backend; then
        log "ERROR: Cannot proceed without backend"
        exit 1
    fi
    
    # Check if we already have picks for today
    local existing_picks=$(get_todays_picks)
    
    if [ "$existing_picks" -gt 0 ]; then
        log "Already have $existing_picks picks for today. Skipping generation."
        log "=== Daily Picks Generation Completed ==="
        exit 0
    fi
    
    # Fetch today's events
    local events=$(fetch_todays_events)
    
    # Generate picks
    if generate_picks; then
        log "Picks generation successful!"
    else
        log "Picks generation failed!"
        exit 1
    fi
    
    # Get performance metrics
    log "Fetching performance metrics..."
    local performance=$(curl -s "http://localhost:3000/api/strategy/performance" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$performance" ]; then
        local total_picks=$(echo "$performance" | jq '.performance.totalPicks // 0' 2>/dev/null)
        local win_rate=$(echo "$performance" | jq '.performance.winRate // 0' 2>/dev/null)
        local bankroll=$(echo "$performance" | jq '.performance.bankroll // 100' 2>/dev/null)
        
        log "Performance Summary: $total_picks total picks, $win_rate% win rate, $bankroll units bankroll"
    fi
    
    log "=== Daily Picks Generation Completed ==="
}

# Error handling
set -e
trap 'log "ERROR: Script failed at line $LINENO"' ERR

# Run main function
main "$@"