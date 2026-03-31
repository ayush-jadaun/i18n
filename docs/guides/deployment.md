# Deployment Guide — i18n-platform

This guide covers four deployment configurations: local development, Docker Compose for production, a hybrid Vercel + Docker setup, and a reference table of all environment variables.

---

## Table of Contents

1. [Docker Compose — Development](#1-docker-compose--development)
2. [Docker Compose — Production](#2-docker-compose--production)
3. [Vercel (Dashboard) + Docker (API)](#3-vercel-dashboard--docker-api)
4. [Environment Variables Reference](#4-environment-variables-reference)

---

## 1. Docker Compose — Development

The repository ships `docker-compose.yml` at the root. It starts the four infrastructure services the platform depends on. The API and dashboard run as Node.js processes on the host machine (hot-reload via `tsx watch`).

### Start infrastructure

```bash
docker compose up -d
```

Services started:

| Container | Image | Host Port | Purpose |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | Primary database |
| `redis` | `redis:7-alpine` | `6379` | Cache, rate-limit state |
| `minio` | `minio/minio:latest` | `9000` / `9001` | S3-compatible storage |
| `mailpit` | `axllent/mailpit:latest` | `8025` / `1025` | SMTP capture for dev email |

Data directories are mounted at `.docker-data/postgres`, `.docker-data/redis`, and `.docker-data/minio` — all gitignored.

### Health checks

```bash
docker compose ps           # all services should show "healthy"
docker compose logs -f api  # tail API logs
```

### Run database migrations

```bash
pnpm db:migrate
pnpm db:seed    # optional: load demo data
```

### Start API and dashboard

```bash
# Terminal 1
pnpm --filter @i18n-platform/api dev
# Fastify on http://localhost:3000

# Terminal 2
pnpm --filter @i18n-platform/dashboard dev
# Next.js on http://localhost:3001
```

### Tear down

```bash
docker compose down          # stop containers, keep volumes
docker compose down -v       # stop and delete volumes (wipes data)
```

---

## 2. Docker Compose — Production

For a self-hosted production deployment, build Docker images for the API and dashboard and add them to the Compose file alongside the infrastructure services.

### Build images

```bash
# Build all packages first
pnpm build

# Build API image
docker build -f packages/api/Dockerfile -t i18n-api:latest .

# Build Dashboard image
docker build -f packages/dashboard/Dockerfile -t i18n-dashboard:latest .
```

### Example production `docker-compose.prod.yml`

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  api:
    image: i18n-api:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_TOKEN_EXPIRY: 15m
      JWT_REFRESH_TOKEN_EXPIRY: 7d
      CORS_ORIGINS: https://your-dashboard-domain.com
      API_PORT: 3000
      LOG_LEVEL: info
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}
      S3_BUCKET: ${S3_BUCKET}
      S3_REGION: ${S3_REGION}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  dashboard:
    image: i18n-dashboard:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NEXT_PUBLIC_API_URL: https://api.your-domain.com
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Deploy

```bash
# Copy env vars
cp .env.example .env.production
# Fill in all values in .env.production

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec api node dist/migrate.js
```

### Recommended production additions

- **Reverse proxy**: Nginx or Traefik in front of API (port 3000) and dashboard (port 3001) for TLS termination.
- **Backups**: Use `pg_dump` on a cron schedule for PostgreSQL.
- **Logging**: Mount pino log output to a file and ship to Loki, Datadog, or CloudWatch.
- **Secrets**: Use Docker secrets or a secrets manager (Vault, AWS Secrets Manager) instead of plain env vars.

---

## 3. Vercel (Dashboard) + Docker (API)

This hybrid topology is well-suited for teams that want global edge performance for the dashboard while keeping the API and database in a single controlled region.

```
┌──────────────────────────────────────────────────────────┐
│ Vercel Edge Network                                      │
│   @i18n-platform/dashboard (Next.js, App Router, SSR)   │
│   NEXT_PUBLIC_API_URL → https://api.your-domain.com      │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────┐
│ Your VPS / Kubernetes cluster                            │
│   i18n-api container (port 3000)                         │
│   ├── PostgreSQL 16                                      │
│   ├── Redis 7                                            │
│   └── MinIO / AWS S3 (CDN bundles)                       │
└──────────────────────────────────────────────────────────┘
```

### Dashboard — Vercel

1. Import the repository into Vercel.
2. Set the root directory to `packages/dashboard` (or configure `turbo.json` output correctly).
3. Set environment variables in Vercel project settings:

```
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

4. Deploy. Vercel will run `next build` and host the output at your domain.

### API — Docker on VPS

On your server:

```bash
# Pull or build the API image
docker pull your-registry/i18n-api:latest

# Create environment file
cat > /etc/i18n-platform.env <<EOF
DATABASE_URL=postgresql://i18n:strongpassword@localhost:5432/i18n_prod
REDIS_URL=redis://:redispassword@localhost:6379
JWT_SECRET=your-64-char-random-secret
CORS_ORIGINS=https://your-dashboard.vercel.app
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=i18n-translations-prod
S3_REGION=us-east-1
EOF

# Run
docker run -d \
  --name i18n-api \
  --env-file /etc/i18n-platform.env \
  -p 3000:3000 \
  --restart unless-stopped \
  your-registry/i18n-api:latest
```

Configure Nginx as a reverse proxy with TLS:

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### CORS configuration

The API allows only the origins listed in `CORS_ORIGINS`. In the hybrid setup, set it to your Vercel dashboard domain:

```
CORS_ORIGINS=https://your-dashboard.vercel.app
```

For multiple origins, use a comma-separated list:

```
CORS_ORIGINS=https://dashboard.your-domain.com,https://your-dashboard.vercel.app
```

---

## 4. Environment Variables Reference

### API (`packages/api`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL (format: `postgresql://user:pass@host:port/db`) |
| `REDIS_URL` | Yes | — | Redis connection URL (format: `redis://:pass@host:port`) |
| `JWT_SECRET` | Yes | — | Secret used to sign JWTs — minimum 16 characters |
| `JWT_ACCESS_TOKEN_EXPIRY` | No | `15m` | Access token lifetime (e.g., `15m`, `1h`) |
| `JWT_REFRESH_TOKEN_EXPIRY` | No | `7d` | Refresh token lifetime (e.g., `7d`, `30d`) |
| `CORS_ORIGINS` | No | `http://localhost:3001` | Comma-separated allowed CORS origins |
| `API_PORT` | No | `3000` | TCP port the HTTP server binds to |
| `API_HOST` | No | `0.0.0.0` | Network interface to bind |
| `LOG_LEVEL` | No | `info` | Pino log level: `debug` / `info` / `warn` / `error` |

### CDN Publisher (`apps/cdn-publisher`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `S3_ENDPOINT` | Yes | — | S3 endpoint URL (e.g., `https://s3.amazonaws.com` or `http://localhost:9000` for MinIO) |
| `S3_ACCESS_KEY_ID` | Yes | — | AWS access key ID or MinIO root user |
| `S3_SECRET_ACCESS_KEY` | Yes | — | AWS secret key or MinIO root password |
| `S3_BUCKET` | Yes | — | Bucket name for translation bundles |
| `S3_REGION` | No | `us-east-1` | S3 region (set to `us-east-1` for MinIO) |
| `S3_FORCE_PATH_STYLE` | No | `false` | Set to `true` when using MinIO or other non-AWS providers |

### Dashboard (`packages/dashboard`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3000` | Base URL of the REST API (exposed to the browser) |

### CLI (`@i18n-platform/cli`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `I18N_API_KEY` | Yes (for most commands) | — | API key used to authenticate CLI requests |
| `I18N_API_URL` | No | From `i18n.config.ts` | Override API URL without editing config |

### Development overrides (`.env.local`)

Create `packages/api/.env.local` to override defaults without touching `.env`:

```dotenv
LOG_LEVEL=debug
JWT_ACCESS_TOKEN_EXPIRY=1h
```

---

## Security checklist for production

- [ ] `JWT_SECRET` is at least 32 random characters (use `openssl rand -hex 32`)
- [ ] PostgreSQL password is strong and not the Docker Compose default
- [ ] Redis is password-protected (`requirepass`)
- [ ] S3 bucket has a restrictive IAM policy (principle of least privilege)
- [ ] CORS origins are limited to your actual dashboard domain
- [ ] TLS is enabled on all public-facing endpoints
- [ ] Docker images run as non-root users
- [ ] `.env` files are excluded from version control (`.gitignore` entry)
- [ ] API key raw values are never logged (only the prefix is safe to log)
- [ ] `LOG_LEVEL` is set to `info` or `warn` in production (avoid `debug`)
