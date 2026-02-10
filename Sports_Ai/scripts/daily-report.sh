#!/bin/bash

# SportsAI Daily Report Generator
# Generates comprehensive daily P&L and performance summary
# Usage: ./daily-report.sh [date] [--email] [--save]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_DIR/data/reports"
LOG_FILE="$PROJECT_DIR/data/daily_report.log"

# Ensure directories exist
mkdir -p "$REPORTS_DIR"
mkdir -p "$PROJECT_DIR/data"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [REPORT] $1" | tee -a "$LOG_FILE"
}

# Function to format currency
format_currency() {
    local amount="$1"
    printf "$%.2f" "$amount"
}

# Function to format percentage
format_percentage() {
    local pct="$1"
    printf "%.2f%%" "$pct"
}

# Function to generate daily report
generate_daily_report() {
    local report_date="$1"
    local report_file="$REPORTS_DIR/daily_report_${report_date}.txt"
    
    log "Generating daily report for $report_date"
    
    # Start report
    cat > "$report_file" << EOF
================================================================================
                            SportsAI DAILY REPORT
                                $report_date
================================================================================

EOF

    # Read data files
    local bankroll_file="$PROJECT_DIR/data/bankroll.json"
    local history_file="$PROJECT_DIR/data/betting_history.json"
    local martingale_file="$PROJECT_DIR/data/martingale.json"
    local autonomous_file="$PROJECT_DIR/data/autonomous_config.json"
    local fund_file="$PROJECT_DIR/data/fund_state.json"

    # BANKROLL SUMMARY
    echo "BANKROLL SUMMARY" >> "$report_file"
    echo "=================" >> "$report_file"
    
    if [[ -f "$bankroll_file" ]]; then
        local current_bankroll=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).current_bankroll" 2>/dev/null || echo "0")
        local starting_bankroll=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).starting_bankroll" 2>/dev/null || echo "10000")
        local total_profit=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).total_profit" 2>/dev/null || echo "0")
        local total_bets=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).total_bets" 2>/dev/null || echo "0")
        local wins=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).wins" 2>/dev/null || echo "0")
        local losses=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).losses" 2>/dev/null || echo "0")
        local frozen=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).frozen" 2>/dev/null || echo "false")
        
        local roi=$(node -p "Math.round((($current_bankroll - $starting_bankroll) / $starting_bankroll) * 100 * 100) / 100" 2>/dev/null || echo "0")
        local win_rate=$(node -p "$total_bets > 0 ? Math.round(($wins / $total_bets) * 100 * 100) / 100 : 0" 2>/dev/null || echo "0")
        
        echo "Current Bankroll:     \$$(format_currency "$current_bankroll")" >> "$report_file"
        echo "Starting Bankroll:    \$$(format_currency "$starting_bankroll")" >> "$report_file"
        echo "Total Profit/Loss:    \$$(format_currency "$total_profit")" >> "$report_file"
        echo "ROI:                  $(format_percentage "$roi")" >> "$report_file"
        echo "Total Bets:           $total_bets" >> "$report_file"
        echo "Wins:                 $wins" >> "$report_file"
        echo "Losses:               $losses" >> "$report_file"
        echo "Win Rate:             $(format_percentage "$win_rate")" >> "$report_file"
        echo "Status:               $([ "$frozen" == "true" ] && echo "FROZEN" || echo "Active")" >> "$report_file"
        
        if [[ "$frozen" == "true" ]]; then
            local freeze_reason=$(node -p "JSON.parse(require('fs').readFileSync('$bankroll_file')).freeze_reason" 2>/dev/null || echo "Unknown")
            echo "Freeze Reason:        $freeze_reason" >> "$report_file"
        fi
    else
        echo "Error: Bankroll file not found" >> "$report_file"
    fi

    # DAILY PERFORMANCE
    echo -e "\nDAILY PERFORMANCE" >> "$report_file"
    echo "===================" >> "$report_file"
    
    if [[ -f "$bankroll_file" ]]; then
        local daily_entry=$(node -e "
            const data = JSON.parse(require('fs').readFileSync('$bankroll_file'));
            const entry = data.daily_pnl.find(d => d.date === '$report_date');
            if (entry) {
                console.log(JSON.stringify(entry));
            } else {
                console.log('{}');
            }
        " 2>/dev/null || echo "{}")
        
        if [[ "$daily_entry" != "{}" ]]; then
            local daily_pnl=$(echo "$daily_entry" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).pnl" 2>/dev/null || echo "0")
            local daily_bets=$(echo "$daily_entry" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).bets_placed" 2>/dev/null || echo "0")
            local daily_wins=$(echo "$daily_entry" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).wins" 2>/dev/null || echo "0")
            local daily_losses=$(echo "$daily_entry" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).losses" 2>/dev/null || echo "0")
            local starting_balance=$(echo "$daily_entry" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).starting_balance" 2>/dev/null || echo "0")
            local ending_balance=$(echo "$daily_entry" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin')).ending_balance" 2>/dev/null || echo "0")
            
            local daily_roi=$(node -p "$starting_balance > 0 ? Math.round(($daily_pnl / $starting_balance) * 100 * 100) / 100 : 0" 2>/dev/null || echo "0")
            local daily_win_rate=$(node -p "$daily_bets > 0 ? Math.round(($daily_wins / $daily_bets) * 100 * 100) / 100 : 0" 2>/dev/null || echo "0")
            
            echo "Daily P&L:            \$$(format_currency "$daily_pnl")" >> "$report_file"
            echo "Daily ROI:            $(format_percentage "$daily_roi")" >> "$report_file"
            echo "Bets Placed:          $daily_bets" >> "$report_file"
            echo "Wins:                 $daily_wins" >> "$report_file"
            echo "Losses:               $daily_losses" >> "$report_file"
            echo "Win Rate:             $(format_percentage "$daily_win_rate")" >> "$report_file"
            echo "Starting Balance:     \$$(format_currency "$starting_balance")" >> "$report_file"
            echo "Ending Balance:       \$$(format_currency "$ending_balance")" >> "$report_file"
        else
            echo "No trading activity for this date" >> "$report_file"
        fi
    fi

    # MARTINGALE STATUS
    echo -e "\nMARTINGALE STATUS" >> "$report_file"
    echo "==================" >> "$report_file"
    
    if [[ -f "$martingale_file" ]]; then
        local active_sequences=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).activeSequences.length" 2>/dev/null || echo "0")
        local total_sequences=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).totalSequences" 2>/dev/null || echo "0")
        local successful_sequences=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).successfulSequences" 2>/dev/null || echo "0")
        local recovery_sequences=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).activeSequences.filter(s => s.recoveryMode).length" 2>/dev/null || echo "0")
        local martingale_enabled=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).enabled" 2>/dev/null || echo "false")
        local martingale_mode=$(node -p "JSON.parse(require('fs').readFileSync('$martingale_file')).mode" 2>/dev/null || echo "HYBRID")
        
        local success_rate=$(node -p "$total_sequences > 0 ? Math.round(($successful_sequences / $total_sequences) * 100 * 100) / 100 : 0" 2>/dev/null || echo "0")
        
        echo "Status:               $([ "$martingale_enabled" == "true" ] && echo "Enabled" || echo "Disabled")" >> "$report_file"
        echo "Mode:                 $martingale_mode" >> "$report_file"
        echo "Active Sequences:     $active_sequences" >> "$report_file"
        echo "In Recovery Mode:     $recovery_sequences" >> "$report_file"
        echo "Total Sequences:      $total_sequences" >> "$report_file"
        echo "Successful Sequences: $successful_sequences" >> "$report_file"
        echo "Success Rate:         $(format_percentage "$success_rate")" >> "$report_file"
    else
        echo "Martingale system not initialized" >> "$report_file"
    fi

    # AUTONOMOUS ENGINE STATUS
    echo -e "\nAUTONOMOUS ENGINE" >> "$report_file"
    echo "==================" >> "$report_file"
    
    if [[ -f "$autonomous_file" ]]; then
        local autonomous_enabled=$(node -p "JSON.parse(require('fs').readFileSync('$autonomous_file')).enabled" 2>/dev/null || echo "false")
        local last_scan=$(node -p "JSON.parse(require('fs').readFileSync('$autonomous_file')).lastScan" 2>/dev/null || echo "null")
        local last_resolve=$(node -p "JSON.parse(require('fs').readFileSync('$autonomous_file')).lastResolve" 2>/dev/null || echo "null")
        local scan_interval=$(node -p "JSON.parse(require('fs').readFileSync('$autonomous_file')).scanIntervalHours" 2>/dev/null || echo "1")
        local max_active_bets=$(node -p "JSON.parse(require('fs').readFileSync('$autonomous_file')).maxActiveBets" 2>/dev/null || echo "10")
        local risk_mode=$(node -p "JSON.parse(require('fs').readFileSync('$autonomous_file')).riskMode" 2>/dev/null || echo "HYBRID")
        
        echo "Status:               $([ "$autonomous_enabled" == "true" ] && echo "Enabled" || echo "Disabled")" >> "$report_file"
        echo "Risk Mode:            $risk_mode" >> "$report_file"
        echo "Max Active Bets:      $max_active_bets" >> "$report_file"
        echo "Scan Interval:        ${scan_interval}h" >> "$report_file"
        echo "Last Scan:            $([ "$last_scan" != "null" ] && date -d "${last_scan//\"/}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Never")" >> "$report_file"
        echo "Last Resolve:         $([ "$last_resolve" != "null" ] && date -d "${last_resolve//\"/}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Never")" >> "$report_file"
    else
        echo "Autonomous engine not configured" >> "$report_file"
    fi

    # FUND MANAGEMENT
    echo -e "\nFUND MANAGEMENT" >> "$report_file"
    echo "================" >> "$report_file"
    
    if [[ -f "$fund_file" ]]; then
        local total_aum=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).totalAUM" 2>/dev/null || echo "0")
        local total_users=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).totalUsers" 2>/dev/null || echo "0")
        local active_users=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).activeUsers" 2>/dev/null || echo "0")
        local total_deposited=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).totalDeposited" 2>/dev/null || echo "0")
        local total_profit_generated=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).totalProfitGenerated" 2>/dev/null || echo "0")
        local total_profit_distributed=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).totalProfitDistributed" 2>/dev/null || echo "0")
        local total_platform_fees=$(node -p "JSON.parse(require('fs').readFileSync('$fund_file')).totalPlatformFees" 2>/dev/null || echo "0")
        
        echo "Total AUM:            \$$(format_currency "$total_aum")" >> "$report_file"
        echo "Total Users:          $total_users" >> "$report_file"
        echo "Active Users:         $active_users" >> "$report_file"
        echo "Total Deposited:      \$$(format_currency "$total_deposited")" >> "$report_file"
        echo "Profit Generated:     \$$(format_currency "$total_profit_generated")" >> "$report_file"
        echo "Profit Distributed:   \$$(format_currency "$total_profit_distributed")" >> "$report_file"
        echo "Platform Fees:        \$$(format_currency "$total_platform_fees")" >> "$report_file"
    else
        echo "Fund management not initialized" >> "$report_file"
    fi

    # RECENT BETS
    echo -e "\nRECENT BETS ($report_date)" >> "$report_file"
    echo "=================================" >> "$report_file"
    
    if [[ -f "$history_file" ]]; then
        local todays_bets=$(node -e "
            const data = JSON.parse(require('fs').readFileSync('$history_file'));
            const todaysBets = data.filter(bet => bet.date === '$report_date');
            console.log(JSON.stringify(todaysBets));
        " 2>/dev/null || echo "[]")
        
        if [[ "$todays_bets" != "[]" ]]; then
            echo "$todays_bets" | node -e "
                const bets = JSON.parse(require('fs').readFileSync('/dev/stdin'));
                bets.forEach((bet, i) => {
                    console.log(\`\${i+1}. \${bet.event} - \${bet.pick}\`);
                    console.log(\`   Odds: \${bet.odds} | Stake: $\${bet.stake_amount_usd.toFixed(2)} | Status: \${bet.status}\`);
                    if (bet.profit_loss_usd !== null) {
                        console.log(\`   P&L: $\${bet.profit_loss_usd.toFixed(2)}\`);
                    }
                    console.log(\`   Strategy: \${bet.strategy} | Time: \${bet.created_at}\`);
                    console.log('');
                });
            " >> "$report_file"
        else
            echo "No bets placed on this date" >> "$report_file"
        fi
    else
        echo "Betting history file not found" >> "$report_file"
    fi

    # FOOTER
    echo -e "\n================================================================================" >> "$report_file"
    echo "Report generated on: $(date)" >> "$report_file"
    echo "SportsAI Autonomous Betting Fund - Confidential" >> "$report_file"
    echo "================================================================================" >> "$report_file"

    log "Daily report generated: $report_file"
    echo "$report_file"
}

# Function to send email report (placeholder)
send_email_report() {
    local report_file="$1"
    local report_date="$2"
    
    log "Email functionality not implemented yet"
    log "Report file: $report_file"
    
    # Placeholder for email integration
    # In real implementation, send email via sendmail, mailgun, etc.
}

# Parse arguments
REPORT_DATE=$(date '+%Y-%m-%d')
SEND_EMAIL=false
SAVE_REPORT=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --email)
            SEND_EMAIL=true
            shift
            ;;
        --save)
            SAVE_REPORT=true
            shift
            ;;
        --no-save)
            SAVE_REPORT=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [date] [--email] [--save] [--no-save]"
            echo "  date       Report date (YYYY-MM-DD), defaults to today"
            echo "  --email    Send report via email"
            echo "  --save     Save report to file (default)"
            echo "  --no-save  Don't save report to file"
            exit 0
            ;;
        *)
            # Assume it's a date
            if [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
                REPORT_DATE="$1"
            else
                echo "Invalid date format: $1"
                echo "Use YYYY-MM-DD format"
                exit 1
            fi
            shift
            ;;
    esac
done

log "Generating daily report for $REPORT_DATE (email=$SEND_EMAIL, save=$SAVE_REPORT)"

# Generate the report
report_file=$(generate_daily_report "$REPORT_DATE")

# Print to console
cat "$report_file"

# Send email if requested
if [[ "$SEND_EMAIL" == "true" ]]; then
    send_email_report "$report_file" "$REPORT_DATE"
fi

# Remove file if not saving
if [[ "$SAVE_REPORT" == "false" ]]; then
    rm -f "$report_file"
    log "Report file deleted (not saved)"
fi

log "Daily report completed successfully"