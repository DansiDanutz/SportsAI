# Technology Stack

**Analysis Date:** 2024-01-22

## Languages

**Primary:**
- TypeScript 5.0.0 - Main backend language with NestJS framework
- JavaScript - Frontend (React 18.2.0) and some utility scripts
- Python 3.11 - Core autonomous agent system with Claude Agent SDK

**Secondary:**
- SQL - Database queries with Prisma ORM
- JSON - Configuration and API communication
- Dockerfile - Container configuration

## Runtime

**Environment:**
- Node.js 20.0.0+ - Runtime for backend and frontend
- Python 3.11 - Runtime for autonomous agent system
- Docker - Containerization for services

**Package Managers:**
- npm 8.0+ - Backend and frontend dependency management
- pip - Python package management
- poetry - Python dependency management (optional)

## Frameworks

**Backend:**
- NestJS 10.0.0 - Full-Node.js framework with TypeScript
- Fastify - HTTP server with Express-like API
- Prisma 6.19.1 - Database ORM and migration tool
- TypeORM 0.14.0 - Additional ORM capabilities

**Frontend:**
- React 18.2.0 - UI library with hooks
- Vite 4.4.0 - Build tool and development server
- Tailwind CSS 3.3.0 - Utility-first CSS framework
- Radix UI - Unstyled, accessible component primitives
- TanStack Query 5.0.0 - Server state management

**Testing:**
- Jest 29.0.0 - Backend testing framework
- Vitest 1.6.1 - Frontend testing framework
- Playwright 1.57.0 - E2E testing and web scraping
- Mypy 1.13.0 - Python static type checking
- Ruff 0.8.0 - Python linter and formatter

**Build/Dev:**
- SWC 1.15.8 - TypeScript compiler for fast builds
- ESLint 8.0.0 - Code linting for TypeScript
- TypeScript 5.0.0 - Type checking and compilation

## Key Dependencies

**Critical:**
- @nestjs/common 10.0.0 - Core NestJS framework
- @prisma/client 6.19.1 - Database access layer
- reflect-metadata 0.2.2 - TypeScript decorators support
- rxjs 7.8.0 - Reactive programming
- uuid 13.0.0 - UUID generation
- axios 1.6.0 - HTTP client for API calls

**Infrastructure:**
- ioredis 5.3.0 - Redis client for caching
- kafkajs 2.2.0 - Kafka client for event streaming
- bcryptjs 2.4.3 - Password hashing
- otplib 13.0.2 - Two-factor authentication
- zod 3.22.0 - Schema validation

**AI/LLM Integration:**
- Z.AI - Primary LLM provider (glm-4 model)
- OpenRouter - Fallback LLM provider
- Custom Claude Agent SDK - Autonomous coding

## Configuration

**Environment:**
- .env files for local development
- Environment variables for production configuration
- dotenv 17.2.3 for environment variable loading

**Build:**
- tsconfig.json - TypeScript configuration
- package.json scripts for build and development
- Docker files for containerization

## Platform Requirements

**Development:**
- Node.js 20.0.0+
- Python 3.11+
- Docker (optional for local services)
- PostgreSQL 16+
- Redis 7+
- Playwright for browser automation

**Production:**
- Render or Vercel for deployment
- PostgreSQL database
- Redis for caching
- Kafka (optional for event streaming)
- Docker containerization

---

*Stack analysis: 2024-01-22*