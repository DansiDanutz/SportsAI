# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
Sports/
├── .autocoder/                   # Project registry database
├── .claude/                      # Claude Code configuration
│   ├── agents/                   # Agent definitions
│   ├── commands/                 # Slash commands
│   ├── skills/                   # Claude Code skills
│   └── templates/               # Prompt templates
├── .planning/                   # Planning and analysis documents
│   └── codebase/                # This analysis
├── .auto-claude/                 # Auto-claude IDEation data
├── api/                         # Feature database API
│   ├── database.py              # SQLAlchemy models
│   ├── migration.py            # JSON to SQLite migration
│   └── __init__.py
├── mcp_server/                  # MCP servers
│   ├── feature_mcp.py          # Feature management server
│   └── __init__.py
├── scripts/                     # Utility scripts
├── server/                      # FastAPI web server
│   ├── main.py                 # Server entry point
│   ├── routers/                # API endpoints
│   ├── services/               # Business logic
│   ├── schemas.py             # Pydantic models
│   └── websocket.py           # Real-time handlers
├── Sports_Ai/                   # Sports AI system
│   ├── backend/                # NestJS backend
│   │   ├── src/                # Backend source code
│   │   │   ├── ai/             # AI services
│   │   │   ├── arbitrage/     # Betting arbitrage
│   │   │   ├── auth/           # Authentication
│   │   │   ├── events/         # Sports events
│   │   │   ├── integrations/   # External APIs
│   │   │   ├── users/          # User management
│   │   │   └── app.module.ts  # NestJS module
│   │   └── docker/            # Docker configuration
│   └── docker/                 # Docker compose
├── ui/                          # React web UI
│   ├── src/                    # UI source code
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and types
│   │   └── styles/             # CSS and themes
│   └── package.json           # Frontend dependencies
├── start.py                     # CLI launcher entry point
├── autonomous_agent_demo.py     # Agent harness
├── agent.py                    # Agent session logic
├── client.py                   # Claude SDK client
├── prompts.py                  # Prompt management
├── progress.py                 # Progress tracking
├── registry.py                 # Project registry
├── security.py                 # Security validation
└── get_default_model.py        # Model selection
```

## Directory Purposes

### Core Autonomous Coding System
**Root directory:**
- **Purpose:** Main autonomous coding agent system
- **Contains:** Python backends, UI server, agents
- **Key files:** `start.py`, `agent.py`, `client.py`

**server/ directory:**
- Purpose: FastAPI web server for UI API
- Contains: REST endpoints, WebSocket handlers
- Key files: `main.py`, `routers/projects.py`, `routers/features.py`

**ui/ directory:**
- Purpose: React web interface
- Contains: UI components, hooks, types
- Key files: `src/App.tsx`, `src/components/KanbanBoard.tsx`

**mcp_server/ directory:**
- Purpose: MCP servers for agent communication
- Contains: Feature management server
- Key files: `feature_mcp.py`

### Sports AI System (Sports_Ai/)
**Sports_Ai/backend/ directory:**
- Purpose: NestJS microservice for sports betting
- Contains: Sports data processing, AI predictions
- Key files: `src/app.module.ts`, `src/ai/`, `src/arbitrage/`

**Sports_Ai/docker/ directory:**
- Purpose: Docker configuration for sports AI
- Contains: Docker files and compose
- Key files: `Dockerfile`, `docker-compose.yml`

### Configuration and Tools
**.claude/ directory:**
- Purpose: Claude Code configuration
- Contains: Templates, skills, commands
- Key files: `templates/initializer_prompt.md`

**.autocoder/ directory:**
- Purpose: Project registry database
- Contains: SQLite database for project paths
- Key files: `registry.db` (SQLite)

## Key File Locations

### Entry Points
- **CLI:** `start.py` - Interactive menu for project management
- **Agent:** `autonomous_agent_demo.py` - Agent execution harness
- **UI Server:** `server/main.py` - FastAPI server
- **Sports AI:** `Sports_Ai/backend/src/main.ts` - NestJS application

### Configuration
- **Registry:** `registry.py` - Project path management
- **Prompts:** `prompts.py` - Prompt template loading
- **Security:** `security.py` - Bash command validation
- **Client:** `client.py` - Claude SDK configuration

### Core Logic
- **Agent:** `agent.py` - Session management and tool handling
- **Progress:** `progress.py` - Feature progress tracking
- **Database:** `api/database.py` - Feature storage models

### UI Components
- **Main App:** `ui/src/App.tsx` - Root React component
- **Kanban Board:** `ui/src/components/KanbanBoard.tsx` - Feature management
- **Agent Control:** `ui/src/components/AgentControl.tsx` - Agent controls

### Sports AI Services
- **AI Module:** `Sports_Ai/backend/src/ai/ai.module.ts` - AI services
- **Arbitrage:** `Sports_Ai/backend/src/arbitrage/` - Betting opportunities
- **Integrations:** `Sports_Ai/backend/src/integrations/` - External APIs

## Naming Conventions

### Files
- **Python:** `snake_case` (e.g., `start.py`, `agent_session.py`)
- **TypeScript:** `camelCase` (e.g., `app.tsx`, `useProjects.ts`)
- **Modules:** `kebab-case` for directories (e.g., `feature-mcp`)

### Functions
- **Python:** `snake_case` (e.g., `run_agent_session`)
- **TypeScript:** `camelCase` (e.g., `useWebSocket`)

### Classes/Models
- **Python:** `PascalCase` (e.g., `Feature`, `Project`)
- **TypeScript:** `PascalCase` (e.g., `FeatureCard`, `AgentControl`)

### Variables
- **Python:** `snake_case` (e.g., `project_dir`, `agent_session`)
- **TypeScript:** `camelCase` (e.g., `selectedProject`, `featuresList`)

## Where to Add New Code

### New Autonomous Coding Feature
- **Implementation:** `agent.py` - Core logic
- **API:** `server/routers/features.py` - REST endpoints
- **UI:** `ui/src/components/` - React components
- **Storage:** `api/database.py` - Database models

### New Sports AI Module
- **Service:** `Sports_Ai/backend/src/[module]/[module].service.ts`
- **Controller:** `Sports_Ai/backend/src/[module]/[module].controller.ts`
- **Module:** `Sports_Ai/backend/src/[module]/[module].module.ts`
- **Database:** Update Prisma schema and run migration

### New UI Component
- **Component:** `ui/src/components/[ComponentName].tsx`
- **Hook:** `ui/src/hooks/use[HookName].ts` (if needed)
- **Type:** `ui/src/lib/types.ts` (if new types needed)
- **Style:** `ui/src/styles/globals.css` (if custom styles)

### New Prompt Template
- **Location:** `.claude/templates/[name].template.md`
- **Usage:** Referenced in `prompts.py` fallback chain
- **Purpose:** Agent behavior customization

## Special Directories

### .autocoder/
- Purpose: Project registry database storage
- Generated: Yes (SQLite database created automatically)
- Committed: No (stored in user home directory)

### mcp_server/
- Purpose: MCP servers for agent communication
- Generated: No (source code only)
- Committed: Yes (part of version control)

### ui/dist/
- Purpose: Build output for React UI
- Generated: Yes (created by `npm run build`)
- Committed: No (added to .gitignore)

### Sports_Ai/backend/dist/
- Purpose: Build output for NestJS backend
- Generated: Yes (created by build process)
- Committed: No (added to .gitignore)

---

*Structure analysis: 2026-01-22*
