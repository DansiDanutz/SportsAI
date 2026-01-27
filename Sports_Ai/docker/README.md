# Docker Setup for SportsAI

This directory contains Docker configuration for running SportsAI locally with Docker Desktop.

## Quick Start

### 1. Create Environment File

Copy the example environment file:

```bash
cd Sports_Ai/docker
cp .env.example .env
```

The `.env` file already includes the Z.AI API key. Update other API keys as needed.

### 2. Start Services

Start all services (PostgreSQL, Redis, and Backend):

```bash
docker-compose up -d
```

Or start only database services:

```bash
docker-compose up -d postgres redis
```

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### 4. Stop Services

```bash
docker-compose down
```

## Services

### PostgreSQL

- **Port:** 5432
- **Database:** sportsai
- **User:** sportsai
- **Password:** sportsai_dev

### Redis

- **Port:** 6379

### Backend API

- **Port:** 4000
- **Health Check:** <http://localhost:4000/health>
- **API Docs:** <http://localhost:4000/api/docs>

## Environment Variables

The backend service uses environment variables from:

1. `.env` file in the `docker/` directory (for docker-compose)
2. Environment variables set in docker-compose.yml
3. Default values in docker-compose.yml

### Z.AI Configuration

The Z.AI API key is already configured:

- **API Key:** `your-zai-api-key-here`
- **Provider:** Auto (uses Z.AI if configured, falls back to OpenRouter)
- **Model:** glm-4
- **API URL:** <https://api.z.ai/v1/chat/completions>

To change the Z.AI configuration, edit the `.env` file or update environment variables in docker-compose.yml.

## Development Mode

For development with hot-reload, you can mount the source code:

```bash
# The docker-compose.yml already includes volume mounts for development
docker-compose up -d backend
```

The backend will watch for file changes and automatically restart.

## Troubleshooting

### Backend won't start

1. Check logs: `docker-compose logs backend`
2. Verify database is healthy: `docker-compose ps`
3. Check environment variables: `docker-compose config`

### Database connection errors

1. Ensure PostgreSQL is running: `docker-compose ps postgres`
2. Check database URL in `.env` file
3. Verify network connectivity: `docker-compose exec backend ping postgres`

### Port conflicts

If ports 4000, 5432, or 6379 are already in use:

1. Stop conflicting services
2. Or change ports in docker-compose.yml

## Production

For production deployment, use the Dockerfile to build an optimized image:

```bash
docker build -f docker/Dockerfile -t sportsai-backend:latest .
```

Then run with production environment variables.
