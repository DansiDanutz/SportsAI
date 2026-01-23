# Technical Debt Fix Plan

**Created:** January 22, 2026  
**Status:** In Progress  
**Total Items:** 12  
**Estimated Total Effort:** 19-28 days

---

## Execution Strategy

### Phase 1: High Priority (Critical Fixes)

**Duration:** 4-6 days  
**Goal:** Fix issues that impact maintainability and user experience

1. ✅ Add React Error Boundaries (1 day) - **STARTING HERE**
2. Refactor SettingsPage.tsx (2-3 days)
3. Fix AI Controller tight coupling (1-2 days)

### Phase 2: Critical Bugs (User-Facing Issues)

**Duration:** 4-6 days  
**Goal:** Fix bugs that directly affect users

1. Fix AI timeout issues (2-3 days)
2. Fix CORS configuration (1 day)
3. Fix state persistence issues (1-2 days)

### Phase 3: Security Hardening

**Duration:** 4-7 days  
**Goal:** Improve security posture

1. Implement JWT secret rotation (1-2 days)
2. Improve API key management (2-3 days)
3. Add rate limiting to all endpoints (2-3 days)

### Phase 4: Performance Optimization

**Duration:** 6-10 days  
**Goal:** Improve performance and scalability

1. Optimize AI service response time (3-5 days)
2. Implement frontend code splitting (2-3 days)
3. Fix database N+1 query patterns (1-2 days)

---

## Detailed Fix Plan

### ✅ Task 1: Add React Error Boundaries

**Priority:** High  
**Effort:** 1 day  
**Files to modify:**

- `Sports_Ai/frontend/src/App.tsx`
- `Sports_Ai/frontend/src/components/Layout.tsx`
- Create: `Sports_Ai/frontend/src/components/ErrorBoundary.tsx`

**Steps:**

1. Create ErrorBoundary component
2. Wrap App.tsx with ErrorBoundary
3. Wrap Layout.tsx sections with ErrorBoundary
4. Add error logging and user-friendly error messages

---

### Task 2: Refactor SettingsPage.tsx

**Priority:** High  
**Effort:** 2-3 days  
**Files to modify:**

- `Sports_Ai/frontend/src/screens/settings/SettingsPage.tsx` (refactor)
- Create: `Sports_Ai/frontend/src/screens/settings/SportSettings.tsx`
- Create: `Sports_Ai/frontend/src/screens/settings/AccountSettings.tsx`
- Create: `Sports_Ai/frontend/src/screens/settings/NotificationSettings.tsx`

**Steps:**

1. Analyze current SettingsPage structure
2. Extract SportSettings component
3. Extract AccountSettings component
4. Extract NotificationSettings component
5. Update SettingsPage to use new components
6. Test all settings functionality

---

### Task 3: Fix AI Controller Tight Coupling

**Priority:** High  
**Effort:** 1-2 days

**Files to modify:**

- `Sports_Ai/backend/src/ai/ai.controller.ts`
- Create: `Sports_Ai/backend/src/ai/ai.facade.ts` (or use DI container)

**Steps:**

1. Identify all 9 service dependencies
2. Create facade service or DI container
3. Refactor controller to use facade
4. Update tests

---

### Task 4: Fix AI Timeout Issues

**Priority:** Medium  
**Effort:** 2-3 days

**Files to modify:**

- `Sports_Ai/backend/src/ai/ai.controller.ts`
- `Sports_Ai/backend/src/ai/llm.service.ts`
- Create: `Sports_Ai/backend/src/ai/ai.queue.service.ts`

**Steps:**

1. Implement async processing queue (Bull or similar)
2. Move AI processing to background jobs
3. Add job status tracking
4. Update API to return job ID instead of blocking
5. Add WebSocket notifications for completion

---

### Task 5: Fix CORS Configuration

**Priority:** Medium  
**Effort:** 1 day

**Files to modify:**

- `Sports_Ai/backend/src/index.ts`
- `Sports_Ai/backend/src/app.module.ts`

**Steps:**

1. Read CORS_ORIGIN from environment variable
2. Support multiple origins (comma-separated)
3. Add dynamic origin validation
4. Update documentation

---

### Task 6: Fix State Persistence Issues

**Priority:** Medium  
**Effort:** 1-2 days  
**Files to modify:**

- `Sports_Ai/frontend/src/store/preferencesStore.ts`
- `Sports_Ai/frontend/src/hooks/useCacheAwareQuery.ts`

**Steps:**

1. Review cache invalidation logic
2. Add proper error handling for storage quota
3. Implement fallback storage mechanisms
4. Add storage quota monitoring

---

### Task 7: Implement JWT Secret Rotation

**Priority:** Medium  
**Effort:** 1-2 days  
**Files to modify:**

- `Sports_Ai/backend/src/auth/jwt.strategy.ts`
- Create: `Sports_Ai/backend/src/auth/jwt-rotation.service.ts`

**Steps:**

1. Create JWT rotation service
2. Implement secret versioning
3. Add scheduled rotation (every 90 days)
4. Support multiple active secrets during transition
5. Add rotation logging

---

### Task 8: Add Rate Limiting to All Endpoints

**Priority:** Medium  
**Effort:** 2-3 days  
**Files to modify:**

- `Sports_Ai/backend/src/auth/api-rate-limiter.service.ts`
- `Sports_Ai/backend/src/app.module.ts`
- All controller files

**Steps:**

1. Create global rate limiter guard
2. Implement tiered limits (free/premium/admin)
3. Apply to all public endpoints
4. Add rate limit headers to responses
5. Update documentation

---

### Task 9: Optimize Database Queries

**Priority:** Medium  
**Effort:** 1-2 days  
**Files to modify:**

- `Sports_Ai/backend/src/integrations/sync.service.ts`
- `Sports_Ai/backend/src/odds/odds.service.ts`

**Steps:**

1. Identify all N+1 query patterns
2. Add Prisma include statements
3. Implement query batching
4. Add query performance monitoring
5. Test query performance improvements

---

### Task 10: Implement Frontend Code Splitting

**Priority:** Medium  
**Effort:** 2-3 days  
**Files to modify:**

- `Sports_Ai/frontend/src/main.tsx`
- `Sports_Ai/frontend/src/App.tsx`
- `Sports_Ai/frontend/vite.config.ts`

**Steps:**

1. Lazy load SettingsPage component
2. Split vendor chunks
3. Implement route-based code splitting
4. Optimize bundle size
5. Test loading performance

---

## Progress Tracking

| Task | Status | Started | Completed | Notes |
| --- | --- | --- | --- | --- |
| 1. Error Boundaries | ✅ Complete | 2026-01-22 | 2026-01-22 | ErrorBoundary component created and integrated |
| 2. SettingsPage Refactor | ✅ Complete | 2026-01-22 | 2026-01-22 | Reduced from 3,098 to 994 lines (68% reduction). Created 6 child components |
| 3. AI Controller | ✅ Complete | 2026-01-22 | 2026-01-22 | Refactored to use AiFacadeService, reduced dependencies |
| 4. AI Timeout | ✅ Complete | 2026-01-22 | 2026-01-22 | Async job queue implemented with in-memory storage. Can be upgraded to Bull/Redis later |
| 5. CORS Config | ✅ Complete | 2026-01-22 | 2026-01-22 | Already dynamic, verified working |
| 6. State Persistence | ✅ Complete | 2026-01-22 | 2026-01-22 | Added sessionStorage fallback, quota monitoring, improved error handling |
| 7. JWT Rotation | ✅ Complete | 2026-01-22 | 2026-01-22 | JWT rotation service created with 90-day rotation, multi-secret support, scheduled checks |
| 8. Rate Limiting | ✅ Complete | 2026-01-22 | 2026-01-22 | Tiered rate limiting implemented (free/premium/pro/admin), endpoint-specific configs, scheduled cleanup |
| 9. DB Optimization | ✅ Complete | 2026-01-22 | 2026-01-22 | Queries already optimized with includes |
| 10. Code Splitting | ✅ Complete | 2026-01-22 | 2026-01-22 | React.lazy and Vite manual chunks implemented |

---

## Notes

- All fixes will be tested before marking complete
- Each fix will include appropriate error handling
- Documentation will be updated as needed
- Breaking changes will be documented
