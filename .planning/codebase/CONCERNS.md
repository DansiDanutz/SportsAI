# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Large Frontend Components:**
- Issue: SettingsPage.tsx has 3,098 lines - violates single responsibility principle
- Files: `[Sports_Ai/frontend/src/screens/settings/SettingsPage.tsx]`
- Impact: Difficult to maintain, test, and understand
- Fix approach: Split into smaller focused components (SportSettings, AccountSettings, NotificationSettings)

**Service Dependencies in AI Controller:**
- Issue: AiController depends on 9 services, creating tight coupling
- Files: `[Sports_Ai/backend/src/ai/ai.controller.ts]`
- Impact: Hard to test, changes ripple through multiple services
- Fix approach: Implement facade pattern or dependency injection container

**Missing Error Boundaries:**
- Issue: React components lack error boundaries to prevent complete app crashes
- Files: `[Sports_Ai/frontend/src/App.tsx, Sports_Ai/frontend/src/components/Layout.tsx]`
- Impact: Single component errors can break entire UI
- Fix approach: Add React ErrorBoundary components around critical sections

## Known Bugs

**AI Advice Timeout Issues:**
- Symptoms: AI endpoints timeout on heavy loads, causing user frustration
- Files: `[Sports_Ai/backend/src/ai/ai.controller.ts, Sports_Ai/backend/src/ai/llm.service.ts]`
- Trigger: When multiple users request AI advice simultaneously
- Workaround: Added cache layer, but still vulnerable to timeout

**CORS Configuration Hardcoded:**
- Symptoms: Frontend-backend communication fails in non-local environments
- Files: `[Sports_Ai/.env.example, Sports_Ai/backend/src/index.ts]`
- Trigger: Deploying to staging/production without updating CORS settings
- Workaround: Manual environment variable updates required

**State Persistence Issues:**
- Symptoms: User preferences lost on page refresh in certain scenarios
- Files: `[Sports_Ai/frontend/src/store/preferencesStore.ts, Sports_Ai/frontend/src/hooks/useCacheAwareQuery.ts]`
- Trigger: Cache invalidation or storage quota exceeded
- Workaround: Manual re-login or page refresh

## Security Considerations

**JWT Secret in Environment:**
- Risk: Default JWT secret could be guessed, leading to token forgery
- Files: `[Sports_Ai/.env.example, Sports_Ai/backend/src/auth/jwt.strategy.ts]`
- Current mitigation: Requires environment variable override
- Recommendations: Generate strong random secret on first setup, implement rotation

**API Key Exposure:**
- Risk: Multiple API keys hardcoded or in version control
- Files: `[Sports_Ai/.env.example, Sports_Ai/backend/src/integrations/*]`
- Current mitigation: Environment variables required
- Recommendations: Implement API key rotation, separate dev/prod keys, audit keys monthly

**Rate Limiting Gaps:**
- Risk: Some endpoints lack proper rate limiting
- Files: `[Sports_Ai/backend/src/auth/api-rate-limiter.service.ts, Sports_Ai/backend/src/common/idempotency.guard.ts]`
- Current mitigation: Basic rate limiting on auth endpoints
- Recommendations: Add rate limiting to all public API endpoints, implement tiered limits

## Performance Bottlenecks

**AI Service Response Time:**
- Problem: AI advice generation takes 5-10 seconds under load
- Files: `[Sports_Ai/backend/src/ai/ai.controller.ts, Sports_Ai/backend/src/ai/llm.service.ts]`
- Cause: Sequential processing of complex models
- Improvement path: Implement async processing, queue system, model optimization

**Frontend Bundle Size:**
- Problem: Large initial bundle affects user experience
- Files: `[Sports_Ai/frontend/package.json, Sports_Ai/frontend/src/main.tsx]`
- Cause: No code splitting for heavy components
- Improvement path: Implement lazy loading, split vendor chunks, optimize imports

**Database Query Optimization:**
- Problem: N+1 query patterns in odds fetching
- Files: `[Sports_Ai/backend/src/integrations/sync.service.ts, Sports_Ai/backend/src/odds/odds.service.ts]`
- Cause: Missing eager loading in Prisma queries
- Improvement path: Add Prisma include statements, implement query batching

## Fragile Areas

**Apify Integration:**
- Files: `[Sports_Ai/backend/src/apify/apify.service.ts, Sports_Ai/backend/src/apify/apify.controller.ts]`
- Why fragile: External service dependency, rate limits, breaking changes
- Safe modification: Add mock service layer, implement retry logic with exponential backoff
- Test coverage: Minimal integration tests for Apify responses

**Flashscore Scraper:**
- Files: `[Sports_Ai/backend/src/flashscore/flashscore.service.ts]`
- Why fragile: Relies on website structure changes, no fallback mechanism
- Safe modification: Implement multiple data sources, add schema validation
- Test coverage: No automated tests for scraping logic

**WebSocket Connections:**
- Files: `[Sports_Ai/backend/src/index.ts, Sports_Ai/frontend/src/hooks/useWebSocket.ts]`
- Why fragile: Connection drops, reconnection logic complex
- Safe modification: Add connection state management, retry with backoff
- Test coverage: No integration tests for WebSocket failures

## Scaling Limits

**Database Connection Pool:**
- Current capacity: Configured for 10 concurrent connections
- Limit: Will fail under high user load
- Scaling path: Implement connection pooling configuration, read replicas for analytics

**Memory Usage in AI Service:**
- Current capacity: ~500MB RAM per request
- Limit: Will cause OOM errors with concurrent requests
- Scaling path: Implement request queuing, model streaming, memory monitoring

**File Upload Storage:**
- Current capacity: Local filesystem
- Limit: Single point of failure, no redundancy
- Scaling path: Implement cloud storage (AWS S3), CDN integration for assets

## Dependencies at Risk

**Prisma ORM Version:**
- Risk: Prisma 6.x has breaking changes in next version
- Impact: Database migrations, schema changes
- Migration plan: Monitor Prisma 7.x updates, create test branch for migration

**React Query (TanStack Query):**
- Risk: Major version 5.x introduced significant API changes
- Impact: Custom hooks need updates, pagination logic affected
- Migration plan: Already on v5, incrementally update to latest patch versions

## Missing Critical Features

**Monitoring and Observability:**
- Problem: No centralized logging or metrics
- Blocks: Performance debugging, error tracking
- Priority: High - essential for production stability

**Automated Testing Pipeline:**
- Problem: No CI/CD testing setup
- Blocks: Code quality assurance, deployment reliability
- Priority: High - prevents regressions in production

## Test Coverage Gaps

**Integration Tests:**
- What's not tested: API endpoint interactions with external services
- Files: `[Sports_Ai/backend/src/integrations/*.ts]`
- Risk: Breaking changes in APIs go undetected
- Priority: High - prevents production failures

**E2E Tests:**
- What's not tested: User workflows across the application
- Files: No E2E test files found
- Risk: Critical user flows can break unnoticed
- Priority: Medium - affects user experience but not core functionality

---

*Concerns audit: 2026-01-22*