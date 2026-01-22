# Testing Patterns

**Analysis Date:** 2024-01-22

## Test Framework

**Backend (Sports_Ai/backend):**
- **Runner**: Jest ^29.0.0
- **Config**: Custom configuration (no jest.config.ts found, uses defaults)
- **Scripts**:
  - `npm test` - Run all tests
  - `npm run test:watch` - Watch mode
  - `npm run test:coverage` - Coverage reports

- **Assertion Library**: Built-in Jest matchers
- **Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage
```

**Frontend (Sports_Ai/frontend/ui & Sports_Ai/frontend):**
- **Framework**: React component testing (no specific test runner detected)
- **Testing Library**: Not detected in package.json
- **Config**: No test configuration found

**Python (main project):**
- **Runner**: pytest ^8.0.0 (in requirements.txt)
- **Config**: No pytest.config.py found, uses defaults
- **Scripts**: Not defined in package.json (manual pytest command)
- **Assertion Library**: pytest built-in assertions

## Test File Organization

**Location:**
- Backend: Co-located with source files (`src/**/*.test.ts`)
- Frontend: No test files detected
- Python: Co-located (`test_security.py`)

**Naming:**
- TypeScript: `[name].test.ts` pattern
- Python: `test_[name].py` pattern

**Structure:**
```
Sports_Ai/backend/src/
├── service/
├── controller/
└── No test files detected in project (node_modules excluded)

Sports_Ai/frontend/
├── src/
└── No test files detected

test_security.py  # Python security validation
```

## Test Structure

**Backend Pattern (Detected from code analysis):**
```typescript
// Not found in project - typical Jest pattern:
describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should return environment status', () => {
    const result = service.getEnvStatus();
    expect(result).toBeDefined();
  });
});
```

**Python Pattern:**
```python
# From test_security.py
import asyncio
import sys
from security import (
    ALLOWED_COMMANDS,
    validate_command,
    is_safe_path,
)

def test_validate_command():
    assert validate_command('npm test') == True
    assert validate_command('rm -rf /') == False
```

## Mocking

**Backend:**
- **Framework**: Jest built-in mocking
- **Patterns**:
```typescript
// Not found in project - typical pattern:
jest.mock('../users/users.service');
const mockUsersService = UsersService as jest.MockedClass<typeof UsersService>;
```

**What to Mock:**
- External APIs (Prisma, external services)
- Database operations
- File system operations

**What NOT to Mock:**
- Pure utility functions
- Type definitions
- Simple data transformations

## Fixtures and Factories

**Test Data:**
```typescript
// Not found in project - typical pattern:
const mockUser = {
  id: 1,
  email: 'test@example.com',
  subscriptionTier: 'free',
};

const mockEnvironmentConfig = {
  nodeEnv: 'test',
  keys: {
    API_SPORTS_KEY: { set: false, placeholder: true },
  },
};
```

**Location:**
- Backend: No fixtures directory detected
- Python: Test data defined in test files

## Coverage

**Requirements:**
- Backend: Jest coverage available (`npm run test:coverage`)
- Frontend: No coverage configuration found
- Python: pytest coverage available (pytest-cov not in requirements)

**View Coverage:**
```bash
# Backend
npm run test:coverage

# Python
pytest --cov=. --cov-report=html
```

## Test Types

**Unit Tests:**
- Backend: Service and unit testing with Jest
- Python: Function validation tests (security.py)

**Integration Tests:**
- Backend: Not detected in current setup
- Python: No integration tests found

**E2E Tests:**
- Not detected in any component

## Common Patterns

**Async Testing (TypeScript):**
```typescript
// Not found in project - typical pattern:
it('should handle async operations', async () => {
  await expect(service.getUsers()).resolves.toEqual(mockUsers);
});
```

**Error Testing (TypeScript):**
```typescript
// Not found in project - typical pattern:
it('should throw error when user not found', () => {
  expect(() => service.getUser(999)).toThrow(NotFoundException);
});
```

**Testing Security (Python):**
```python
# From test_security.py
def test_validate_command():
    # Test allowed commands
    assert validate_command('npm test') == True

    # Test blocked commands
    assert validate_command('rm -rf /') == False
    assert validate_command('curl') == False
```

## Testing Gaps

**Missing Test Areas:**
1. **Backend Services**: No unit tests found in Sports_Ai/backend/src
2. **Frontend Components**: No React component tests found
3. **API Integration**: No integration tests for API endpoints
4. **Database Integration**: No Prisma integration tests
5. **Authentication/Authorization**: No security tests beyond security.py

**Current Coverage:**
- Python: Basic security validation tests only
- TypeScript: No tests detected in project
- React: No tests detected

---

*Testing analysis: 2024-01-22*