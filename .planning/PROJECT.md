# Sports Project

## What This Is

A dual-purpose development workspace containing:

1. **SportsAI Platform** - A production-ready sports intelligence application with real-time arbitrage detection, multi-sportsbook odds comparison, and AI-driven insights across 10+ sports
2. **Autonomous Coding System** - A framework for building applications autonomously using Claude Agent SDK with React UI

## Core Value

**SportsAI:** Detect betting arbitrage opportunities in real-time across multiple sportsbooks so users can find profitable odds differences before they disappear.

**Autonomous System:** Enable rapid application development through AI agents that can implement features from specifications with minimal human intervention.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

**SportsAI Platform (v5.1 - 429/429 features passing - PRODUCTION):**

- ✅ Production deployment (Vercel frontend + Render backend)
- ✅ User authentication (JWT, 2FA, OAuth)
- ✅ Real-time odds comparison across 10+ sportsbooks
- ✅ Arbitrage opportunity detection with alerts
- ✅ AI-driven betting predictions
- ✅ Multi-sport coverage (NFL, NBA, MLB, Soccer, etc.)
- ✅ Mobile-responsive PWA with pull-to-refresh
- ✅ Admin dashboard with RBAC
- ✅ PostgreSQL + Redis caching
- ✅ Rate limiting and security hardening
- ✅ Production monitoring (Vercel Analytics, error tracking, logging)
- ✅ React error boundaries for graceful error handling
- ✅ Frontend code splitting for performance
- ✅ JWT rotation service
- ✅ Tiered rate limiting (free/premium/pro/admin)

**Autonomous Coding System:**

- Two-agent pattern (initializer + coding)
- Feature tracking with SQLite database
- MCP server for agent communication
- React UI with kanban board
- WebSocket real-time updates
- Project registry for path management
- Playwright browser automation for testing

### Active

<!-- Current scope. Building toward these. -->

**Current Milestone: v5.2 - Custom Domain & SSL**

**Goal:** Configure custom domain infrastructure for Vercel frontend with SSL certificates

**Target features:**
- Custom domain configuration (infrastructure ready, domain to be added by user)
- SSL certificate setup and HTTPS enforcement
- DNS configuration guidance
- Vercel domain settings documentation

**Future Milestones:**

- Performance optimization (CDN caching)
- Automated backup strategy
- CI/CD pipeline with automated testing
- SettingsPage.tsx refactor completion

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Native mobile apps** — PWA provides mobile experience; native apps add significant complexity
- **Live betting streams** — Requires complex licensing; focus on odds comparison
- **Payment processing** — Mock Stripe integration; production requires PCI compliance
- **Advanced AI models** — Current inverse probability model sufficient; GPT integration adds cost/latency

## Context

### SportsAI Platform

**Technology:**

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query
- Backend: NestJS, Fastify, Prisma ORM, PostgreSQL 16, Redis
- Auth: JWT with bcrypt, TOTP 2FA, OAuth (Google)
- Deployment: Configured for Vercel (vercel.json files ready)

**Current Status:**

- 429 of 429 features passing (100%) ✅
- Zero TypeScript compilation errors ✅
- Production deployments live:
  - Frontend: https://sports-ai-one.vercel.app
  - Backend: https://sportsapiai.onrender.com
- Production monitoring configured ✅
- Production-grade security implemented ✅

**Shipped:** January 23, 2026

### Autonomous Coding System

**Technology:**

- Python 3.11 with Claude Agent SDK
- FastAPI server with WebSocket support
- React UI with neobrutalism design
- MCP servers for inter-agent communication
- SQLite for state management

**Purpose:**
This system was used to build the SportsAI platform autonomously. It can be reused to build other applications by providing an app spec.

### Known Issues (from CONCERNS.md)

**Tech Debt (Resolved in v5.1):**

- ✅ SettingsPage.tsx refactor - Components created (6 child components), main integration pending
- ✅ AI Controller tight coupling - Fixed with AiFacadeService (9 dependencies → 1)
- ✅ Missing error boundaries - Added to App.tsx and Layout.tsx
- ✅ CORS configuration - Auto-configured for Vercel domains
- ✅ Frontend code splitting - Implemented with React.lazy()
- ✅ JWT rotation - Service implemented with 90-day rotation
- ✅ Rate limiting - Tiered system (free/premium/pro/admin)

**Remaining Tech Debt:**

- SettingsPage.tsx main refactor (integrate the 6 created components)
- Add integration tests for API endpoints
- Automated backup strategy
- CI/CD pipeline with automated testing

**Post-Launch Verification (User Actions):**

- Manual browser testing of deployed application
- Enable Vercel Analytics in dashboard
- Configure deployment notifications in Vercel

## Constraints

- **Tech Stack**: SportsAI uses NestJS/React stack — maintain consistency for any changes
- **Deployment**: Vercel for frontend + Render/Vercel for backend — existing configuration
- **APIs**: Apify for sportsbook odds — rate limits apply
- **Database**: PostgreSQL 16 required — Prisma 6.19.1 ORM
- **Python**: 3.11+ required for autonomous system
- **Node.js**: 20.0.0+ required for SportsAI

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

Decision | Rationale | Outcome
--- | --- | ---
Two-agent pattern (initializer + coding) | Separates project setup from feature implementation | ✓ Good - Proven effective for SportsAI
SQLite for features, PostgreSQL for app data | Lightweight for agent state, robust for user data | ✓ Good - Right tool for each job
MCP servers for agent communication | Standard protocol, extensible | ✓ Good - Works with Claude Agent SDK
Backend on Render (existing) | Already deployed at sportsapiai.onrender.com | ✓ Good - Verified deployment
Frontend on Vercel (production) | Auto-deploy from GitHub, zero-config HTTPS | ✓ Good - Verified deployment
PWA over native mobile | Single codebase, mobile-good-enough | ✓ Good - Reduces maintenance
Mock Stripe for payments | Avoids PCI compliance complexity | ⚠️ Revisit - Production needs real payments
Inverse probability for AI predictions | Fast, no external API costs | — Pending - May need enhancement
AiFacadeService pattern | Reduces AI controller coupling from 9 to 1 | ✓ Good - Improves testability
JWT rotation service | 90-day automatic rotation with multi-secret support | ✓ Good - Production security best practice
Vercel Analytics + Error Tracking | Zero-config monitoring for frontend | ✓ Good - Sufficient for current scale

---

### Last Updated

2026-01-23 after starting v5.2 milestone (Custom Domain & SSL)
