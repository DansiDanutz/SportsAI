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

**SportsAI Platform (v5.0.0 - 428/429 features passing):**
- User authentication (JWT, 2FA, OAuth)
- Real-time odds comparison across 10+ sportsbooks
- Arbitrage opportunity detection with alerts
- AI-driven betting predictions
- Multi-sport coverage (NFL, NBA, MLB, Soccer, etc.)
- Mobile-responsive PWA with pull-to-refresh
- Admin dashboard with RBAC
- PostgreSQL + Redis caching
- Rate limiting and security hardening

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

**Milestone v5.1 - Production Deployment:**
- [x] Frontend deployed to Vercel (https://sports-ai-one.vercel.app)
- [x] Backend deployed to Render (https://sportsapiai.onrender.com)
- [ ] Verify CORS configuration between deployments
- [ ] Health check verification
- [ ] End-to-end smoke tests
- [ ] Production monitoring setup

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
- 428 of 429 features passing (99.8%)
- Zero TypeScript compilation errors
- Zero console errors during runtime
- Production-grade security implemented
- Build verification passed (frontend + backend)

**Missing Feature:**
- Vercel deployment (0/1) - Final step to 100%

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

**Tech Debt:**
- SettingsPage.tsx has 3,098 lines (needs splitting)
- AI Controller depends on 9 services (tight coupling)
- Missing error boundaries in React

**Known Bugs:**
- AI advice timeout issues under heavy load
- CORS configuration hardcoded for local
- State persistence issues in some scenarios

**Security:**
- JWT secret needs rotation
- API key exposure risks (needs environment variables)
- Rate limiting gaps on some endpoints

**Performance:**
- AI service takes 5-10 seconds under load
- Frontend bundle size large (no code splitting)
- N+1 query patterns in odds fetching

## Constraints

- **Tech Stack**: SportsAI uses NestJS/React stack — maintain consistency for any changes
- **Deployment**: Vercel for frontend + Render/Vercel for backend — existing configuration
- **APIs**: Apify for sportsbook odds — rate limits apply
- **Database**: PostgreSQL 16 required — Prisma 6.19.1 ORM
- **Python**: 3.11+ required for autonomous system
- **Node.js**: 20.0.0+ required for SportsAI

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two-agent pattern (initializer + coding) | Separates project setup from feature implementation | ✓ Good - Proven effective for SportsAI |
| SQLite for features, PostgreSQL for app data | Lightweight for agent state, robust for user data | ✓ Good - Right tool for each job |
| MCP servers for agent communication | Standard protocol, extensible | ✓ Good - Works with Claude Agent SDK |
| Backend on Render (existing) | Already deployed at sportsapiai.onrender.com | ✓ Good - Verified deployment |
| Frontend on Vercel (existing) | Already deployed at sports-ai-one.vercel.app | ✓ Good - Verified deployment |
| PWA over native mobile | Single codebase, mobile-good-enough | ✓ Good - Reduces maintenance |
| Mock Stripe for payments | Avoids PCI compliance complexity | ⚠️ Revisit - Production needs real payments |
| Inverse probability for AI predictions | Fast, no external API costs | — Pending - May need enhancement |

---

*Last updated: 2026-01-22 after codebase mapping and audit (v5.0.0)*
