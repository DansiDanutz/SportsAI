# Contributing to SportsAI

Thank you for your interest in contributing to SportsAI! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- npm or yarn
- Git
- Docker & Docker Compose (for local development with databases)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/DansiDanutz/SportsAI.git
   cd SportsAI
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env

   # Frontend (if applicable)
   cp frontend/.env.example frontend/.env
   ```

4. **Run database migrations**
   ```bash
   cd backend && npx prisma migrate dev
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run start:dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/sharp-money-alerts`)
- `fix/` - Bug fixes (e.g., `fix/login-auth-error`)
- `refactor/` - Code refactoring (e.g., `refactor/api-response-format`)
- `docs/` - Documentation updates (e.g., `docs/api-endpoints`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Build process or auxiliary tool changes

**Examples:**
```
feat(arbitrage): add steam move detection for sharp money alerts
fix(auth): resolve token refresh race condition
docs(api): update endpoint documentation for v2 routes
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting locally
4. Push your branch and create a Pull Request
5. Fill out the PR template
6. Request review from maintainers

### Code Review Checklist

Before submitting a PR, ensure:

- [ ] Code follows the project's style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript types are correct (`npm run typecheck`)
- [ ] Documentation is updated if needed
- [ ] No sensitive data (API keys, credentials) is committed

## Project Structure

```
Sports_Ai/
├── backend/                # NestJS backend API
│   ├── src/
│   │   ├── ai/            # AI services (OpenRouter, Daily Tips, Sharp Money)
│   │   ├── arbitrage/     # Arbitrage detection engine
│   │   ├── auth/          # Authentication (JWT, OAuth)
│   │   ├── credits/       # Credit management
│   │   ├── events/        # Event management
│   │   ├── odds/          # Odds ingestion & normalization
│   │   ├── prisma/        # Database service
│   │   ├── setup/         # AI configuration setup
│   │   └── users/         # User management
│   ├── prisma/            # Prisma schema & migrations
│   └── test/              # E2E tests
│
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── screens/       # Page components
│   │   ├── services/      # API client
│   │   ├── store/         # Zustand state management
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
│
├── .github/               # GitHub Actions workflows
└── docs/                  # Additional documentation
```

## Coding Standards

### TypeScript

- Use strict mode (`"strict": true`)
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown

### React

- Use functional components with hooks
- Use TanStack Query for server state
- Use Zustand for client state
- Follow component composition patterns

### NestJS

- Use dependency injection
- Create services for business logic
- Use DTOs with class-validator for validation
- Handle errors with exception filters

### Styling

- Use Tailwind CSS for styling
- Follow mobile-first responsive design
- Use CSS variables for theming

## Testing

### Backend Tests
```bash
cd backend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test        # Unit tests
npm run test:cov    # Coverage report
```

## API Guidelines

### Response Format

All API responses follow this structure:

```typescript
// Success
{
  "data": { ... },
  "meta": { ... }  // Optional pagination, etc.
}

// Error
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Authentication

- All protected routes require Bearer token in Authorization header
- Use `@UseGuards(JwtAuthGuard)` decorator for protected endpoints
- Access user via `@Request() req` → `req.user.id`

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user input
- Sanitize data before database operations
- Follow OWASP guidelines

## Questions?

If you have questions, please:
1. Check existing issues and documentation
2. Open a new issue with the `question` label
3. Reach out to maintainers

Thank you for contributing!
