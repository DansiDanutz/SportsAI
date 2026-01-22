# Docker Desktop Z.AI Configuration

## ✅ Z.AI API Key Added to Docker Configuration

The Z.AI API key has been successfully added to the Docker Desktop configuration.

## Configuration Details

### API Key

```bash
ZAI_API_KEY=***REMOVED***
```

### Where It's Configured

1. **docker-compose.yml** - Backend service environment variables
2. **init.sh** - .env.example template (includes Z.AI key)
3. **Dockerfile** - Backend container configuration

## Files Updated

### 1. `Sports_Ai/docker/docker-compose.yml`

- Added backend service with Z.AI API key
- Configured all environment variables including Z.AI settings
- Set up health checks and dependencies

### 2. `Sports_Ai/docker/Dockerfile`

- Created Dockerfile for backend service
- Includes Prisma client generation
- Production-ready configuration

### 3. `Sports_Ai/init.sh`

- Updated .env.example template to include Z.AI configuration
- Added all Z.AI environment variables with default values

### 4. `Sports_Ai/docker/README.md`

- Complete Docker setup guide
- Instructions for using Z.AI in Docker

## Quick Start with Docker

### Step 1: Navigate to Docker Directory

```bash
cd Sports_Ai/docker
```

### Step 2: Start Services

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# Or start only databases
docker-compose up -d postgres redis
```

### Step 3: Verify Z.AI is Working

```bash
# Check backend logs
docker-compose logs -f backend

# You should see:
# [LlmService] Using Z.AI as LLM provider (auto-detected)
```

## Environment Variables in Docker

The backend service in docker-compose.yml includes:

```yaml
environment:
  # Z.AI Configuration (Primary LLM Provider)
  ZAI_API_KEY: ${ZAI_API_KEY:-***REMOVED***}
  LLM_PROVIDER: ${LLM_PROVIDER:-auto}
  ZAI_MODEL: ${ZAI_MODEL:-glm-4}
  ZAI_API_URL: ${ZAI_API_URL:-https://api.z.ai/v1/chat/completions}
  ZAI_TIMEOUT_MS: ${ZAI_TIMEOUT_MS:-12000}
```

## Override Z.AI Settings

### Option 1: Create .env File

Create `Sports_Ai/docker/.env` file:

```bash
ZAI_API_KEY=***REMOVED***
LLM_PROVIDER=zai
ZAI_MODEL=glm-4
```

### Option 2: Set Environment Variables

```bash
export ZAI_API_KEY=***REMOVED***
docker-compose up -d
```

### Option 3: Direct in docker-compose.yml

The key is already set as a default value in docker-compose.yml, so it will work immediately.

## Verification

After starting the backend service:

1. **Check Logs:**

   ```bash
   docker-compose logs backend | grep LlmService
   ```

2. **Test API:**

   ```bash
   curl http://localhost:4000/health
   ```

3. **Check Admin Panel:**
   Visit `http://localhost:4000/admin/env-status` to see Z.AI_API_KEY status

## Troubleshooting

### Z.AI Not Detected

1. **Check Environment Variables:**

   ```bash
   docker-compose exec backend env | grep ZAI
   ```

2. **Restart Backend:**

   ```bash
   docker-compose restart backend
   ```

3. **View Logs:**

   ```bash
   docker-compose logs backend
   ```

### Port Conflicts

If port 4000 is in use:

```yaml
# In docker-compose.yml, change:
ports:
  - "4001:4000"  # Use port 4001 instead
```

## Next Steps

1. **Start Docker Services:**

   ```bash
   cd Sports_Ai/docker
   docker-compose up -d
   ```

2. **Run Migrations:**

   ```bash
   docker-compose exec backend npm run db:migrate
   ```

3. **Access Backend:**

   - API: <http://localhost:4000>
   - Health: <http://localhost:4000/health>
   - Docs: <http://localhost:4000/api/docs>

## Additional Resources

- **Docker Setup Guide:** `Sports_Ai/docker/README.md`
- **Z.AI Integration:** `ZAI_INTEGRATION_SUMMARY.md`
- **Environment Variables:** `ZAI_ENV_SETUP.md`
