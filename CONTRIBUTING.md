# Contributing to SportsAI

Thank you for your interest in contributing to SportsAI! This document provides guidelines and information for contributors.

## 📋 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## 🚀 Getting Started

### Development Setup

1. **Fork the repository**
   ```bash
   git fork https://github.com/Sports-AI/SportsAI.git
   cd SportsAI/Sports_Ai
   ```

2. **Install dependencies**
   ```bash
   ./init.sh  # Automated setup
   # OR manual setup:
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend  
   cd frontend && npm run dev
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠️ Development Guidelines

### Code Standards

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is enforced
- **Testing**: Write tests for new features (90%+ coverage required)

### Architecture Principles

- **Backend**: NestJS with clean architecture
- **Frontend**: React with hooks and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **API**: RESTful with OpenAPI documentation

### Naming Conventions

```typescript
// Files: kebab-case
arbitrage-detection.service.ts
user-profile.component.tsx

// Classes: PascalCase  
class ArbitrageDetectionService {}

// Functions/Variables: camelCase
const calculateArbitragePercentage = () => {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_ARBITRAGE_OPPORTUNITIES = 100;

// Database: snake_case
user_id, created_at, subscription_tier
```

## 📝 Pull Request Process

### Before Submitting

1. **Code Quality Checks**
   ```bash
   # Backend
   cd backend
   npm run lint          # Fix linting issues
   npm run typecheck     # Verify TypeScript
   npm run test          # Run all tests
   
   # Frontend
   cd frontend
   npm run lint          # Fix linting issues  
   npm run typecheck     # Verify TypeScript
   npm run test          # Run all tests
   npm run build         # Ensure it builds
   ```

2. **Database Changes**
   ```bash
   # If you modified the Prisma schema
   cd backend
   npm run db:migrate    # Create migration
   npm run db:generate   # Update client
   ```

### PR Requirements

- [ ] **Tests**: All new code has corresponding tests
- [ ] **Documentation**: Update relevant docs (API, README, etc.)
- [ ] **Type Safety**: No TypeScript errors
- [ ] **Linting**: Passes ESLint checks
- [ ] **Performance**: No significant performance regressions
- [ ] **Security**: No hardcoded secrets or security vulnerabilities

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if UI changes)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🧪 Testing Guidelines

### Backend Testing

```bash
cd backend

# Unit tests
npm test -- auth.service.spec.ts

# Integration tests
npm test -- app.e2e-spec.ts

# Test coverage
npm run test:coverage
```

### Frontend Testing

```bash
cd frontend

# Component tests
npm test -- src/components/

# Hook tests  
npm test -- src/hooks/

# E2E tests
npm run test:e2e
```

### Test Organization

```
backend/src/
├── module/
│   ├── module.service.ts
│   ├── module.service.spec.ts     # Unit tests
│   ├── module.controller.ts
│   └── module.controller.spec.ts  # Controller tests

test/
├── app.e2e-spec.ts               # E2E tests
└── fixtures/                     # Test data
```

## 📊 Performance Guidelines

### API Performance

- **Response Time**: <300ms (cached), <800ms (uncached)
- **Database Queries**: Use proper indexes, avoid N+1 queries
- **Caching**: Implement Redis caching for frequent queries
- **Pagination**: Always paginate large datasets

### Frontend Performance

- **Bundle Size**: Keep chunks under 1MB
- **Code Splitting**: Split by routes and heavy components  
- **Images**: Optimize and use WebP format
- **Caching**: Implement proper caching strategies

## 🔐 Security Guidelines

### Authentication & Authorization

- Always validate user permissions
- Use JWT tokens with proper expiration
- Implement rate limiting for sensitive endpoints
- Sanitize all user inputs

### Data Protection

- Never log sensitive information (passwords, tokens)
- Use environment variables for all secrets
- Implement proper CORS policies
- Validate all API inputs with Zod/class-validator

## 📖 API Guidelines

### RESTful Design

```typescript
// Good
GET    /api/v1/arbitrage/opportunities
POST   /api/v1/arbitrage/opportunities
GET    /api/v1/arbitrage/opportunities/:id
PATCH  /api/v1/arbitrage/opportunities/:id

// Bad
GET    /api/getArbitrageOpportunities
POST   /api/createArbitrageOpportunity
```

### Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}

// Error Response  
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

### OpenAPI Documentation

- Document all endpoints with OpenAPI decorators
- Include request/response examples
- Specify validation rules and error codes
- Keep documentation up to date

## 🚢 Deployment Guidelines

### Environment Setup

```bash
# Development
NODE_ENV=development

# Staging
NODE_ENV=staging

# Production  
NODE_ENV=production
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name descriptive_name

# Deploy to production
npx prisma migrate deploy
```

### Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Update CHANGELOG.md
3. **Testing**: Run full test suite
4. **Documentation**: Update API docs
5. **Deploy**: Use CI/CD pipeline

## 📚 Resources

### Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)  
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools

- **Backend IDE**: VS Code with NestJS extensions
- **Frontend IDE**: VS Code with React/TypeScript extensions  
- **Database**: pgAdmin, Prisma Studio
- **API Testing**: Postman, Thunder Client
- **Performance**: Chrome DevTools, Lighthouse

### Learning Resources

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Database Design](https://www.postgresql.org/docs/current/ddl.html)

## 🤝 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Request Reviews**: Code-specific discussions

### Code Review Process

1. **Automated Checks**: CI/CD pipeline validates your code
2. **Peer Review**: At least one team member reviews
3. **Manual Testing**: QA team tests new features
4. **Approval**: Maintainer approves and merges

## 📄 License

By contributing to SportsAI, you agree that your contributions will be licensed under the same terms as the project.

---

**Thank you for contributing to SportsAI!** 🏆

For questions, please open an issue or reach out to the maintainers.