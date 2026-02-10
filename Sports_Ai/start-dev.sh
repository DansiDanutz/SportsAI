#!/bin/bash

# SportsAI Platform - Development Server Startup
# Starts backend and frontend concurrently

set -e  # Exit on any error

# Color codes for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_backend() {
    echo -e "${CYAN}[BACKEND]${NC} $1"
}

print_frontend() {
    echo -e "${YELLOW}[FRONTEND]${NC} $1"
}

# Clear screen for better visibility
clear

echo "🏆 SportsAI Platform - Development Mode"
echo "======================================="
echo

# Check if setup was run
if [ ! -f ".env" ]; then
    print_error "Environment file (.env) not found!"
    print_info "Please run ./setup.sh first"
    exit 1
fi

if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    print_error "Dependencies not installed!"
    print_info "Please run ./setup.sh first"
    exit 1
fi

print_info "Starting SportsAI development servers..."
echo

# Function to handle graceful shutdown
cleanup() {
    print_info "Shutting down development servers..."
    kill $(jobs -p) 2>/dev/null || true
    wait
    echo
    print_success "Development servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Create log files for better output management
mkdir -p logs
BACKEND_LOG="logs/backend-dev.log"
FRONTEND_LOG="logs/frontend-dev.log"

# Clear previous logs
> "$BACKEND_LOG"
> "$FRONTEND_LOG"

# Start backend server
print_backend "Starting NestJS backend on port 4000..."
(
    cd backend
    echo "[$(date '+%H:%M:%S')] Backend server starting..." >> "../$BACKEND_LOG"
    npm run dev 2>&1 | while read line; do
        echo "[$(date '+%H:%M:%S')] $line" >> "../$BACKEND_LOG"
    done
) &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start frontend server
print_frontend "Starting React frontend on port 3000..."
(
    cd frontend
    echo "[$(date '+%H:%M:%S')] Frontend server starting..." >> "../$FRONTEND_LOG"
    npm run dev 2>&1 | while read line; do
        echo "[$(date '+%H:%M:%S')] $line" >> "../$FRONTEND_LOG"
    done
) &
FRONTEND_PID=$!

# Wait for servers to start
print_info "Initializing servers..."
sleep 5

echo
print_success "🚀 Development servers started!"
echo "=================================="
echo
print_backend "Backend API:  http://localhost:4000"
print_backend "API Docs:     http://localhost:4000/api/docs"
print_frontend "Frontend:     http://localhost:3000"
echo
print_info "📋 Real-time logs:"
print_backend "Backend:      tail -f logs/backend-dev.log"
print_frontend "Frontend:     tail -f logs/frontend-dev.log"
echo
print_info "💡 Tips:"
echo "   • Press Ctrl+C to stop all servers"
echo "   • Backend auto-reloads on file changes"
echo "   • Frontend supports hot module replacement"
echo "   • Check logs/backend-dev.log and logs/frontend-dev.log for detailed output"
echo

# Monitor both processes
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend server stopped unexpectedly!"
        print_info "Check logs/backend-dev.log for details"
        cleanup
    fi
    
    # Check if frontend is still running  
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend server stopped unexpectedly!"
        print_info "Check logs/frontend-dev.log for details"
        cleanup
    fi
    
    sleep 5
done