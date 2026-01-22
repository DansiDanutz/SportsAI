#!/bin/bash
# SportsAI Platform - Development Environment Setup
# Version: 5.0.0 (Arbitrage Priority)

set -e

echo "========================================"
echo "  SportsAI Platform - Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo -e "${BLUE}Checking requirements...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        echo "Please install Node.js 20+ LTS from https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${RED}Error: Node.js version 20+ required (found v$(node -v))${NC}"
        exit 1
    fi
    echo -e "${GREEN}  Node.js $(node -v)${NC}"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}  npm $(npm -v)${NC}"

    # Check Docker (optional but recommended)
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}  Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)${NC}"
        DOCKER_AVAILABLE=true
    else
        echo -e "${YELLOW}  Docker not found (optional - needed for PostgreSQL/Redis)${NC}"
        DOCKER_AVAILABLE=false
    fi

    echo ""
}

# Create project structure
create_structure() {
    echo -e "${BLUE}Creating project structure...${NC}"

    # Backend directories
    mkdir -p backend/src/{config,controllers,services,models,middlewares,utils,validators}
    mkdir -p backend/src/services/{arbitrage,odds,credits,identity,billing,notification,fixtures,news,favorites,ai}
    mkdir -p backend/tests/{unit,integration,e2e}

    # Frontend directories (React Native / Web)
    mkdir -p frontend/src/{components,screens,hooks,services,store,utils,styles,types}
    mkdir -p frontend/src/components/{common,forms,navigation,charts}
    mkdir -p frontend/src/screens/{auth,onboarding,home,arbitrage,sports,events,settings,credits}
    mkdir -p frontend/assets/{images,fonts,icons}

    # Shared types
    mkdir -p shared/types

    # Database
    mkdir -p database/{migrations,seeds}

    # Docker
    mkdir -p docker

    # Docs
    mkdir -p docs/{api,architecture}

    echo -e "${GREEN}  Project structure created${NC}"
    echo ""
}

# Initialize backend
init_backend() {
    echo -e "${BLUE}Initializing backend...${NC}"

    cd backend

    if [ ! -f "package.json" ]; then
        # Initialize package.json
        cat > package.json << 'EOF'
{
  "name": "sportsai-backend",
  "version": "5.0.0",
  "description": "SportsAI Platform Backend - Arbitrage Priority",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "typecheck": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-fastify": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "zod": "^3.22.0",
    "ioredis": "^5.3.0",
    "kafkajs": "^2.2.0",
    "bcryptjs": "^2.4.3",
    "passport-jwt": "^4.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0",
    "prisma": "^5.0.0"
  }
}
EOF
    fi

    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

    # Create basic entry point
    mkdir -p src
    cat > src/index.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`SportsAI Backend running on http://localhost:${port}`);
}

bootstrap();
EOF

    # Create app module
    cat > src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
EOF

    echo -e "${GREEN}  Backend initialized${NC}"
    cd ..
    echo ""
}

# Initialize frontend
init_frontend() {
    echo -e "${BLUE}Initializing frontend...${NC}"

    cd frontend

    if [ ! -f "package.json" ]; then
        cat > package.json << 'EOF'
{
  "name": "sportsai-frontend",
  "version": "5.0.0",
  "description": "SportsAI Platform Frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    "@radix-ui/react-tooltip": "^1.0.0",
    "recharts": "^2.8.0",
    "socket.io-client": "^4.6.0",
    "axios": "^1.5.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0",
    "vitest": "^0.34.0"
  }
}
EOF
    fi

    # Create Vite config
    cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
EOF

    # Create Tailwind config
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        arbitrage: {
          high: '#22c55e',
          medium: '#eab308',
          low: '#f97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
EOF

    # Create index.html
    cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SportsAI - Smart Sports Intelligence Platform</title>
    <meta name="description" content="Real-time arbitrage detection and odds comparison across 10+ sportsbooks" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

    # Create main entry
    mkdir -p src
    cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
EOF

    # Create App component
    cat > src/App.tsx << 'EOF'
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Routes>
        <Route path="/" element={<div className="p-8 text-center"><h1 className="text-3xl font-bold text-gray-900 dark:text-white">SportsAI Platform</h1><p className="mt-4 text-gray-600 dark:text-gray-400">Coming soon...</p></div>} />
      </Routes>
    </div>
  );
}

export default App;
EOF

    # Create global styles
    mkdir -p src/styles
    cat > src/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 142 76% 36%;
    --primary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --ring: 142 76% 36%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 142 76% 36%;
    --primary-foreground: 0 0% 100%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --border: 217.2 32.6% 17.5%;
    --ring: 142 76% 36%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
EOF

    # Create tsconfig
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

    cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

    echo -e "${GREEN}  Frontend initialized${NC}"
    cd ..
    echo ""
}

# Create Docker Compose
create_docker() {
    echo -e "${BLUE}Creating Docker configuration...${NC}"

    cat > docker/docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL - Primary database
  postgres:
    image: postgres:16-alpine
    container_name: sportsai-postgres
    environment:
      POSTGRES_DB: sportsai
      POSTGRES_USER: sportsai
      POSTGRES_PASSWORD: sportsai_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sportsai"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis - Caching and sessions
  redis:
    image: redis:7-alpine
    container_name: sportsai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # TimescaleDB for odds history (optional)
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: sportsai-timescale
    environment:
      POSTGRES_DB: sportsai_timeseries
      POSTGRES_USER: sportsai
      POSTGRES_PASSWORD: sportsai_dev
    ports:
      - "5433:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data

  # Kafka (optional - for event streaming)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: sportsai-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    profiles:
      - kafka

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: sportsai-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    profiles:
      - kafka

volumes:
  postgres_data:
  redis_data:
  timescale_data:
EOF

    echo -e "${GREEN}  Docker configuration created${NC}"
    echo ""
}

# Create environment files
create_env() {
    echo -e "${BLUE}Creating environment files...${NC}"

    cat > .env.example << 'EOF'
# SportsAI Platform Environment Configuration

# Environment
NODE_ENV=development

# Backend
BACKEND_PORT=4000
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://sportsai:sportsai_dev@localhost:5432/sportsai
REDIS_URL=redis://localhost:6379
TIMESCALE_URL=postgresql://sportsai:sportsai_dev@localhost:5433/sportsai_timeseries

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

# External APIs (add your API keys)
THE_ODDS_API_KEY=
API_SPORTS_KEY=
THE_SPORTS_DB_KEY=
SPORTMONKS_KEY=
NEWS_API_KEY=

# Z.AI Configuration (Primary LLM Provider)
ZAI_API_KEY=***REMOVED***
LLM_PROVIDER=auto
ZAI_MODEL=glm-4
ZAI_API_URL=https://api.z.ai/v1/chat/completions
ZAI_TIMEOUT_MS=12000

# OpenRouter (Fallback LLM Provider)
OPENROUTER_API_KEY=
OPENROUTER_TIMEOUT_MS=12000

# Apify
APIFY_API_TOKEN=
APIFY_ACTOR_ODDS_API=
APIFY_ACTOR_SOFASCORE=
APIFY_ACTOR_PREDICTIONS=
APIFY_ACTOR_FLASHSCORE=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Feature Flags
ENABLE_LIVE_ODDS=true
ENABLE_ARBITRAGE_DETECTION=true
ENABLE_AI_INSIGHTS=false
EOF

    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo -e "${YELLOW}  Created .env file - please update with your API keys${NC}"
    fi

    echo -e "${GREEN}  Environment files created${NC}"
    echo ""
}

# Install dependencies
install_deps() {
    echo -e "${BLUE}Installing dependencies...${NC}"

    if [ -d "backend" ]; then
        echo "  Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi

    if [ -d "frontend" ]; then
        echo "  Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi

    echo -e "${GREEN}  Dependencies installed${NC}"
    echo ""
}

# Start services
start_services() {
    echo -e "${BLUE}Starting services...${NC}"

    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "  Starting Docker services..."
        cd docker
        docker-compose up -d postgres redis
        cd ..
        echo -e "${GREEN}  PostgreSQL and Redis started${NC}"
    else
        echo -e "${YELLOW}  Docker not available - please start PostgreSQL and Redis manually${NC}"
    fi

    echo ""
}

# Print summary
print_summary() {
    echo "========================================"
    echo -e "${GREEN}  Setup Complete!${NC}"
    echo "========================================"
    echo ""
    echo "To start development:"
    echo ""
    echo "  1. Start the database (if not already running):"
    echo "     cd docker && docker-compose up -d"
    echo ""
    echo "  2. Start the backend:"
    echo "     cd backend && npm run dev"
    echo ""
    echo "  3. Start the frontend:"
    echo "     cd frontend && npm run dev"
    echo ""
    echo "Access the application:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:4000"
    echo "  - API Documentation: http://localhost:4000/api/docs"
    echo ""
    echo "Important:"
    echo "  - Update .env with your API keys"
    echo "  - Run database migrations: cd backend && npm run db:migrate"
    echo ""
    echo "========================================"
}

# Main execution
main() {
    check_requirements
    create_structure
    init_backend
    init_frontend
    create_docker
    create_env
    install_deps
    start_services
    print_summary
}

# Run main function
main "$@"
