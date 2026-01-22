# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Multi-service architecture with autonomous coding agent, sports AI backend, and React UI

**Key Characteristics:**
- Two autonomous coding systems operating in parallel
- Event-driven architecture with WebSocket real-time updates
- Microservices with clear separation of concerns
- MCP servers for inter-agent communication
- Security-first approach with layered defenses

## Layers

### 1. Presentation Layer (ui/)
**React UI with neobrutalism design**
- Purpose: User interface for managing coding projects and sports AI
- Location: `ui/`
- Contains: React components, TypeScript types, hooks
- Depends on: REST API and WebSocket server
- Used by: End users through web browser

**Key Components:**
- `App.tsx` - Main application container with state management
- `KanbanBoard.tsx` - Feature management interface
- `AgentControl.tsx` - Agent session controls
- `AssistantPanel.tsx` - AI assistant integration

### 2. API Gateway Layer (server/)
**FastAPI backend with WebSocket support**
- Purpose: REST API and WebSocket for UI communication
- Location: `server/`
- Contains: FastAPI routers, schemas, services
- Depends on: Database layer, process management
- Used by: React UI, external clients

**Key Components:**
- `main.py` - FastAPI application entry point
- `routers/` - API endpoint definitions
- `services/` - Business logic layer
- `websocket.py` - Real-time communication handler

### 3. Autonomous Coding Core
**Two-agent pattern with prompt-driven development**

#### Initializer Agent
- Purpose: Creates project structure and initial features from spec
- Location: `start.py`, `autonomous_agent_demo.py`
- Contains: Project creation logic, prompt scaffolding
- Depends on: Feature MCP server, CLI tools
- Used by: Users for project initialization

#### Coding Agent
- Purpose: Implements features incrementally across sessions
- Location: `agent.py`, `client.py`
- Contains: Agent session logic, security hooks
- Depends on: Feature MCP, Playwright MCP, CLI
- Used by: Coding tasks and feature implementation

### 4. MCP Service Layer
**Model Context Protocol servers for agent communication**

#### Feature MCP Server (mcp_server/feature_mcp.py)
- Purpose: Feature and test case management
- Location: `mcp_server/feature_mcp.py`
- Contains: Feature CRUD operations, progress tracking
- Depends on: SQLite database, SQLAlchemy ORM
- Used by: Both agents for feature management

**Tools:**
- `feature_get_stats` - Progress statistics
- `feature_get_next` - Next feature to implement
- `feature_mark_passing` - Mark feature complete
- `feature_skip` - Move feature to end of queue

#### Playwright MCP Server
- Purpose: Browser automation for testing
- Location: External MCP server
- Contains: Web interaction tools
- Depends on: Playwright library
- Used by: Coding agent for regression testing

### 5. Database Layer
**SQLite for state management**
- Purpose: Persistent storage for features and projects
- Location: `features.db` in project directories
- Contains: Feature records, progress tracking
- Depends on: SQLAlchemy ORM
- Used by: Feature MCP server, progress tracking

### 6. Sports AI Backend (Sports_Ai/)
**NestJS microservice for sports betting intelligence**
- Purpose: Sports data processing and AI predictions
- Location: `Sports_Ai/backend/`
- Contains: NestJS modules, services, controllers
- Depends on: External APIs, databases
- Used by: Sports AI applications

**Modules:**
- AI services (`ai/`) - Predictions and tips
- Arbitrage (`arbitrage/`) - Betting opportunity detection
- Events (`events/`) - Sports data management
- Integrations (`integrations/`) - External API connectors
- User management (`users/`) - Authentication and profiles

## Data Flow

### Project Creation Flow
1. User selects "Create new project" in CLI menu
2. Project directory created with scaffolded prompts
3. User chooses spec creation method (Claude interactive or manual)
4. Features generated from spec and stored in SQLite
5. Initializer agent creates project structure

### Feature Implementation Flow
1. Coding agent requests next feature via MCP
2. Agent implements feature with prompt guidance
3. Automated tests run via Playwright MCP
4. Feature marked passing on test completion
5. Progress updated via WebSocket to UI

### Real-time Updates Flow
1. Agent writes progress to database
2. Feature MCP server detects changes
3. WebSocket broadcast via server
4. UI updates React state via TanStack Query
5. Visual feedback in kanban board

## Key Abstractions

### Feature Management
- **Purpose:** Test-driven development with feature tracking
- **Examples:** `mcp_server/feature_mcp.py`, `api/database.py`
- **Pattern:** CRUD operations with priority-based queue

### Agent Communication
- **Purpose:** Secure communication between agents and tools
- **Examples:** `client.py`, security hooks
- **Pattern:** MCP protocol with validation

### Project Registry
- **Purpose:** Cross-platform project path management
- **Examples:** `registry.py`, SQLite registry database
- **Pattern:** Name-to-path mapping with POSIX paths

## Entry Points

### CLI Entry Point (start.py)
- **Location:** `start.py`
- **Triggers:** User selection from menu
- **Responsibilities:** Project creation/selection, agent execution
- **Mode:** Interactive CLI interface

### Agent Entry Point (autonomous_agent_demo.py)
- **Location:** `autonomous_agent_demo.py`
- **Triggers:** CLI execution with project path
- **Responsibilities:** Agent session initialization
- **Mode:** Batch processing with auto-continue

### UI Server Entry Point (server/main.py)
- **Location:** `server/main.py`
- **Triggers:** Server start via uvicorn
- **Responsibilities:** REST API, WebSocket, static file serving
- **Mode:** Production web server

### Sports AI Entry Point (Sports_Ai/backend/src/main.ts)
- **Location:** `Sports_Ai/backend/src/main.ts`
- **Triggers:** Service start
- **Responsibilities:** Sports data processing
- **Mode:** Microservice API

## Error Handling

**Strategy:** Layered defense with graceful degradation

**Patterns:**
- Security hooks validate bash commands before execution
- WebSocket disconnections handled with auto-reconnect
- Database migrations handle schema changes
- CLI authentication errors provide helpful guidance
- Playwright failures fall back to screenshots

## Cross-Cutting Concerns

**Logging:** File-based logging with agent session capture
**Validation:** Pydantic models for input validation
**Authentication:** JWT-based with device sessions
**Rate Limiting:** Throttling at API and bash levels
**Security:** Multi-layered with sandboxing and allowlists

---

*Architecture analysis: 2026-01-22*
