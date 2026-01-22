# Coding Conventions

**Analysis Date:** 2024-01-22

## Languages

**Primary:**
- TypeScript/JavaScript - Frontend: Sports_Ai/frontend/ui (React 18), Sports_Ai/frontend (React 18)
- Python - Core system: main project directory (FastAPI, Claude Agent SDK)

**Secondary:**
- TypeScript - Backend: Sports_Ai/backend/src (NestJS)

## Naming Patterns

**Files:**
- Backend: kebab-case for files (e.g., `admin.service.ts`, `ai.controller.ts`)
- Frontend: PascalCase for components, camelCase for utilities (e.g., `Badge.tsx`, `useCacheAwareQuery.ts`)
- Python: snake_case for files and modules (e.g., `registry.py`, `security.py`)
- Test files: `[name].test.ts` for TypeScript, `test_[name].py` for Python

**Functions/Methods:**
- Backend: camelCase (e.g., `getEnvStatus()`, `listUsers()`)
- Frontend: camelCase for hooks and utilities, PascalCase for components (e.g., `useCacheAwareQuery`, `Badge`)
- Python: snake_case (e.g., `create_project()`, `get_next_feature()`)

**Variables:**
- Backend: camelCase (e.g., `adviceCache`, `jwtAuthGuard`)
- Frontend: camelCase (e.g., `variant`, `animated`, `glow`)
- Python: snake_case (e.g., `project_dir`, `user_registry`)
- Constants: UPPER_SNAKE_CASE for Python, UPPER_CAMEL_CASE for TypeScript constants

**Classes/Interfaces:**
- PascalCase for all languages (e.g., `AdminService`, `AiController`, `BadgeProps`)

## Code Style

**Formatting:**
- **Backend (Sports_Ai/backend)**: Prettier + ESLint with TypeScript parser
  - **Indentation**: Tabs (configured in tsconfig)
  - **Line length**: 80-100 characters
  - **Quotes**: Double quotes
  - **Semicolons**: Not required but present in some files

- **Frontend (Sports_Ai/frontend/ui & Sports_Ai/frontend)**: ESLint with React, TypeScript, and React Hooks
  - **Indentation**: Not specified in config, typically 2 spaces
  - **Line length**: 80-100 characters
  - **Quotes**: Double quotes
  - **Semicolons**: Not required by default

- **Python**: Ruff for formatting
  - **Indentation**: 4 spaces (PEP 8)
  - **Line length**: 88 characters
  - **Quotes**: Double quotes
  - **Trailing commas**: Yes in multi-line constructs

**Linting:**
- **Backend**: ESLint with @typescript-eslint/recommended
  - Disabled rules: no-unused-vars, no-explicit-any (selectively disabled)
  - Parser: @typescript-eslint/parser

- **Frontend**: ESLint with React, TypeScript, and React Hooks
  - Disabled rules: no-unused-vars, no-explicit-any (selectively disabled)
  - React rules: react/react-in-jsx-scope disabled (React 17+), prop-types disabled

- **Python**: Ruff for linting, MyPy for type checking
  - pytest included in requirements

## Import Organization

**TypeScript Backend:**
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
```
- Grouped: Built-in → External → Local/Relative
- Consistent relative paths with `@/` alias for src

**TypeScript Frontend:**
```typescript
import { ReactNode } from 'react';
import { clsx } from 'clsx';
```
- Same structure as backend
- Path alias `@/` for src directory

**Python:**
```python
from security import (
    ALLOWED_COMMANDS,
    validate_command,
    is_safe_path,
)
import asyncio
import sys
```
- Standard library first, then third-party, then local
- Explicit relative imports with `from .module import`

## Error Handling

**Backend (NestJS):**
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

export class AdminService {
  async listUsers() {
    try {
      const users = await this.prisma.user.findMany({...});
    } catch (error) {
      throw new NotFoundException('Users not found');
    }
  }
}
```
- Uses NestJS exceptions (NotFoundException, BadRequestException)
- Try-catch blocks for database operations

**Frontend:**
```typescript
export function Badge({ children, variant = 'default', ...props }: BadgeProps) {
  return (
    <span className={clsx('...', variantStyles[variant], ...)}>
      {children}
    </span>
  );
}
```
- PropTypes or TypeScript interfaces for type safety
- Graceful fallbacks for props

**Python:**
```python
def validate_command(command: str) -> bool:
    if not command.strip():
        return False
    return command.strip() in ALLOWED_COMMANDS
```
- Simple boolean returns for validation
- Error handling at boundary layers

## Comments

**TypeScript:**
- JSDoc for classes and complex functions
- Inline comments for complex business logic
- No TODO comments found in analyzed code

**Python:**
- Docstrings for functions and classes
- Type hints preferred over comments for type information
- Comments explain security decisions in security.py

## Function Design

**Size:**
- Backend: 20-50 lines per method
- Frontend: 10-30 lines per component/function
- Python: 15-40 lines per function

**Parameters:**
- Max 3-4 parameters for complex functions
- Use destructuring for object parameters (React props)
- Optional parameters at the end

**Return Values:**
- Backend: Consistent return types (e.g., always objects for API responses)
- Frontend: JSX for components, values for utilities
- Python: Explicit return types with typing

## Module Design

**Exports:**
- TypeScript: Named exports default
- Python: Public functions at module level, private with underscore

**Barrel Files:**
- Backend: `index.ts` files in each directory for reexports
- Frontend: `index.ts` files in components and screens directories
- No Python barrel files detected

---

*Convention analysis: 2024-01-22*