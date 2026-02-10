#!/bin/bash

# SportsAI Platform - Setup Script
# Automated setup for development environment

set -e  # Exit on any error

echo "🏆 SportsAI Platform - Development Setup"
echo "========================================"
echo

# Color codes for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

# Check Node.js version
echo "📋 Checking prerequisites..."
echo

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version $NODE_VERSION detected. Please install Node.js 20+ LTS"
    print_info "Current version: $(node -v)"
    print_info "Required: v20.0.0 or higher"
    exit 1
fi

print_success "Node.js $(node -v) detected"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm"
    exit 1
fi

print_success "npm $(npm -v) detected"
echo

# Create .env file if it doesn't exist
echo "🔧 Setting up environment configuration..."
echo

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "IMPORTANT: Add your API keys to .env file before starting"
    else
        print_error ".env.example file not found"
        exit 1
    fi
else
    print_info ".env file already exists"
fi
echo

# Install backend dependencies
echo "📦 Installing backend dependencies..."
echo

cd backend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_info "Running npm install for backend..."
    npm install
    print_success "Backend dependencies installed"
else
    print_info "Backend dependencies already installed"
fi

# Generate Prisma client
echo
echo "🗃️  Setting up database schema..."
echo

print_info "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

cd ..

# Install frontend dependencies
echo
echo "📦 Installing frontend dependencies..."
echo

cd frontend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_info "Running npm install for frontend..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_info "Frontend dependencies already installed"
fi

cd ..

# Verify builds
echo
echo "🔨 Verifying project builds..."
echo

# Test backend TypeScript compilation
print_info "Checking backend TypeScript compilation..."
cd backend
if npx tsc --noEmit > /dev/null 2>&1; then
    print_success "Backend TypeScript compilation passed"
else
    print_warning "Backend TypeScript compilation has issues (check with 'npm run typecheck')"
fi
cd ..

# Test frontend build
print_info "Checking frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
    print_success "Frontend build passed"
    # Clean up build artifacts after verification
    rm -rf dist > /dev/null 2>&1 || true
else
    print_warning "Frontend build has issues (check with 'npm run build')"
fi
cd ..

echo
echo "🎉 Setup completed successfully!"
echo "==============================="
echo
print_info "Next steps:"
echo
echo "1. 🔑 Add your API keys to .env file:"
echo "   - THE_ODDS_API_KEY (get from: https://the-odds-api.com/)"
echo "   - APIFY_API_TOKEN (get from: https://console.apify.com/account/integrations)"
echo "   - STRIPE_SECRET_KEY (for payments, optional for development)"
echo
echo "2. 🗄️  Set up your database:"
echo "   - Start Docker containers: cd docker && docker-compose up -d"
echo "   - Run migrations: cd backend && npm run db:migrate"
echo "   - Seed database: cd backend && npm run db:seed"
echo
echo "3. 🚀 Start development:"
echo "   - Run: ./start-dev.sh"
echo "   - Or manually:"
echo "     • Backend: cd backend && npm run dev"
echo "     • Frontend: cd frontend && npm run dev"
echo
echo "📚 Useful commands:"
echo "   - ./start-dev.sh       - Start both backend and frontend"
echo "   - npm run typecheck    - Check TypeScript (in backend/frontend)"
echo "   - npm run test         - Run tests (in backend/frontend)"
echo "   - npm run lint         - Check code style (in backend/frontend)"
echo
print_success "Happy coding! 🏆"