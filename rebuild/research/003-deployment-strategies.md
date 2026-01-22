# Phase: Deployment Strategies Research

**Researched:** 2026-01-22
**Domain:** Self-hosted deployment on resource-constrained hardware
**Confidence:** MEDIUM

## Summary

BB-Manager is a backend-light React SPA that currently uses Supabase cloud for both auth and database. The research focused on designing an optimal self-hosted deployment strategy for UK-based GDPR compliance on Raspberry Pi (4/5) or small VPS (1-2GB RAM) with low traffic (~10-50 users).

**Key findings:**
- **Caddy** is the optimal reverse proxy for resource-constrained environments due to automatic HTTPS, simple configuration, and low memory footprint
- **Docker Compose** provides the simplest deployment orchestration with built-in health checks and restart policies
- **PostgreSQL backups** should use the `kartoza/pg-backup` Docker image with automated cron jobs and retention policies
- **GitHub Actions SSH deployment** offers the simplest CI/CD approach for low-traffic applications
- **Uptime Kuma** is the recommended monitoring solution (self-hosted, lightweight, excellent UI)

**Primary recommendation:** Use Caddy + Docker Compose + PostgreSQL with automated backups, deployed via GitHub Actions SSH workflow.

## Standard Stack

The recommended stack for self-hosting BB-Manager:

### Core Infrastructure

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| **Caddy** | 2.x (latest) | Reverse proxy & automatic HTTPS | Zero-config TLS, simple Caddyfile, low memory usage, automatic certificate renewal |
| **Docker Compose** | 2.x+ | Container orchestration | Declarative config, health checks, restart policies, simple updates |
| **PostgreSQL** | 15/16 | Database (supabase/pg compat) | Direct replacement for Supabase Postgres, mature backup tools |
| **Docker** | 24.x+ | Container runtime | Industry standard, excellent ARM64 support |

### Supporting Services

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| **kartoza/pg-backup** | latest | Automated PostgreSQL backups | Cron-scheduled dumps with retention policies |
| **Uptime Kuma** | latest | Self-hosted monitoring | HTTP checks, status page, alerts (Discord/email) |
| **serve** (npm) | latest | Static file serving | Production React SPA serving |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Caddy** | **Nginx** | Nginx is more battle-tested but requires manual SSL cert setup (certbot) and more complex config. Caddy's automatic HTTPS is worth the minor performance tradeoff for low-traffic sites. |
| **Caddy** | **Traefik** | Traefik is designed for orchestration (Kubernetes/Docker Swarm). Overkill for single-app deployment. Steeper learning curve. |
| **Docker Compose** | **Systemd services** | Systemd is lighter but requires manual dependency management, no health checks, harder rollback. Compose wins on simplicity. |
| **GitHub Actions** | **Webhook CI/CD** | Simpler but less reliable. GitHub Actions provides better logging, secret management, and retry logic. |
| **kartoza/pg-backup** | **pg_dump cron** | Manual cron scripts work but lack built-in retention, off-site transfer, and failure handling. |
| **Uptime Kuma** | **External services** (UptimeRobot) | External services can't monitor internal Docker containers. Kuma provides end-to-end monitoring. |

### Installation

```bash
# On Raspberry Pi/Ubuntu VPS
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (comes with Docker above)
docker compose version

# Install Caddy (alternative: via Docker)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## Architecture Patterns

### Recommended Deployment Topology

```
Internet
    |
    v
[Caddy Reverse Proxy :443]
    |--> Automatic HTTPS (Let's Encrypt)
    |--> Static file caching
    |--> Security headers
    |
    +---> [BB-Manager Container :3000]  (React SPA via serve)
    |
    +---> [Uptime Kuma Container :3001] (optional, monitoring)
    |
    +---> [PostgreSQL Container :5432]
           |
           +---> [pg-backup Container] (cron scheduled backups)
```

### Production Project Structure

```
/opt/bb-manager/
├── docker-compose.yml          # Main orchestration
├── Caddyfile                   # Reverse proxy config
├── .env                        # Secrets (never commit)
├── backups/                    # PostgreSQL dumps (mounted volume)
├── postgres-data/              # Database volume (Docker managed)
└── bb-manager/                 # App clone (for git pull updates)
    └── dist/                   # Built React app
```

### Pattern 1: Docker Compose with Health Checks

**What:** Declarative container orchestration with built-in health monitoring and auto-restart.

**When to use:** All production deployments.

**Example docker-compose.yml:**

```yaml
# Source: Based on Docker Compose production best practices
# https://docs.docker.com/compose/how-tos/production/
services:
  # PostgreSQL database
  db:
    image: postgres:16-alpine
    container_name: bb-manager-db
    restart: always
    environment:
      POSTGRES_DB: bbmanager
      POSTGRES_USER: bbmanager
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # From .env file
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bbmanager -d bbmanager"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  # Automated backups
  db-backup:
    image: kartoza/pg-backup:latest
    container_name: bb-manager-backup
    restart: always
    environment:
      POSTGRES_HOST: db
      POSTGRES_DB: bbmanager
      POSTGRES_USER: bbmanager
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      # Schedule: Daily at 2 AM
      CRON_SCHEDULE: "0 2 * * *"
      # Keep last 7 days of backups
      BACKUP_RETENTION_DAYS: 7
      # Backup destination
      BACKUP_DIR: /backups
    volumes:
      - ./backups:/backups
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

  # BB-Manager app (static files)
  app:
    image: bb-manager:latest
    container_name: bb-manager-app
    build: .
    restart: always
    environment:
      # Supabase connection (keep using cloud for now)
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
      # Or self-hosted Postgres (future)
      # DATABASE_URL: postgresql://bbmanager:${DB_PASSWORD}@db:5432/bbmanager
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - internal

  # Uptime Kuma (optional monitoring)
  uptime:
    image: louislam/uptime-kuma:latest
    container_name: bb-manager-uptime
    restart: always
    volumes:
      - uptime-data:/app/data
    ports:
      - "3001:3001"  # Access via Caddy reverse proxy
    networks:
      - internal

volumes:
  postgres-data:
  uptime-data:

networks:
  internal:
    driver: bridge
```

**Key points:**
- `restart: always` ensures containers recover from crashes/reboots
- `healthcheck` provides dependency management via `depends_on: condition: service_healthy`
- Named volumes persist data across container recreations
- Environment variables injected from `.env` file (never committed)

### Pattern 2: Caddy Reverse Proxy Configuration

**What:** Automatic HTTPS with simple configuration file.

**When to use:** All production deployments (Raspberry Pi or VPS).

**Example Caddyfile:**

```caddyfile
# Source: Caddyserver documentation
# https://caddyserver.com/docs/caddyfile

bb-manager.yourdomain.co.uk {
    # Automatic HTTPS via Let's Encrypt
    encode gzip

    # BB-Manager app
    reverse_proxy app:8080 {
        # Health check the upstream
        health_uri /health
        health_interval 30s
        health_timeout 10s
    }

    # Security headers
    header {
        # Enable HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        # Prevent clickjacking
        X-Frame-Options "SAMEORIGIN"
        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"
        # XSS protection
        X-XSS-Protection "1; mode=block"
        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Static file caching for /assets (hashed filenames)
    @static {
        path /static/* /assets/*
    }
    header @static Cache-Control "public, immutable, max-age=31536000"
}

# Optional: Uptime Kuma monitoring
status.yourdomain.co.uk {
    reverse_proxy uptime:3001
}

# Optional: Internal monitoring endpoint (no auth)
internal.yourdomain.co.uk {
    respond /health "OK" 200
    respond /metrics "# Prometheus metrics here" 200
}
```

**Key advantages:**
- Zero-config SSL: Caddy automatically obtains and renews Let's Encrypt certificates
- HTTP/2 and HTTP/3 support by default
- Automatic HTTP → HTTPS redirects
- Simple syntax compared to Nginx

### Anti-Patterns to Avoid

- **Don't run PostgreSQL without volume mounts:** Data loss on container recreation
- **Don't skip health checks:** Dependency management breaks without them
- **Don't use `latest` tag in production:** Use versioned tags for reproducibility
- **Don't expose PostgreSQL directly to internet:** Always keep on internal network
- **Don't skip backups:** Automated backups are non-negotiable for production data
- **Don't hardcode secrets in compose file:** Always use `.env` file or Docker secrets

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **SSL certificate automation** | Manual certbot scripts with cron jobs | **Caddy automatic HTTPS** | Caddy handles renewal, OCSP stapling, and fallback. Cert management is error-prone. |
| **PostgreSQL backups** | Custom bash scripts with pg_dump | **kartoza/pg-backup Docker image** | Built-in cron, retention policies, compression, failure handling. Reinventing this is risky. |
| **Container health monitoring** | Custom scripts checking `docker ps` | **Docker healthcheck + restart policies** | Native Docker integration, automatic restart on failure, dependency management. |
| **CI/CD deployment** | Manual git pull + docker build | **GitHub Actions with SSH** | Better logging, secret management, parallel deployments, rollback capability. |
| **Log aggregation** | Custom grep scripts | **Docker logs + journalctl** | Native rotation, timestamps, structured logging. For advanced needs, add Loki. |
| **Static file serving** | Custom Express server | **serve npm package** | Single-purpose, optimized for static files, better caching headers. |

**Key insight:** Self-hosting on resource-constrained hardware benefits from battle-tested tools. Custom solutions introduce maintenance burden and failure modes that standard tools have already solved.

## Common Pitfalls

### Pitfall 1: Running Out of Memory on Raspberry Pi

**What goes wrong:** Docker containers get OOM-killed, database crashes, random failures.

**Why it happens:** Raspberry Pi 4 has 2-8GB RAM shared with GPU. Running PostgreSQL + app + reverse proxy + monitoring can exceed available memory, especially during backups or build processes.

**How to avoid:**
1. **Add swap space** (critical for 1-2GB RAM devices):
   ```bash
   # Create 2GB swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
2. **Limit container memory** in docker-compose:
   ```yaml
   services:
     db:
       deploy:
         resources:
           limits:
             memory: 512M
   ```
3. **Use Alpine-based images** (PostgreSQL Alpine, Node slim)
4. **Monitor memory usage:** `docker stats`

**Warning signs:** Containers restarting randomly, database connection errors, slow page loads.

### Pitfall 2: Backup Failures Going Unnoticed

**What goes wrong:** Backup cron job fails silently, no backups created, disaster strikes when data is needed.

**Why it happens:** `pg_dump` fails due to disk full, permissions, or database connectivity, but cron output isn't monitored.

**How to avoid:**
1. **Use kartoza/pg-backup with health checks:**
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "test -f /backups/latest_backup.sql"]
     interval: 1h
   ```
2. **Set up email notifications** for container failures:
   ```yaml
   labels:
     - "com.centurylinklabs.watchtower.enable=true"
   ```
3. **Test backup restores monthly:** Automated restore test to staging environment
4. **Monitor backup volume size:** Alert if disk usage > 80%

**Warning signs:** Backup file size not increasing, stale backup timestamps, backup volume filling up.

### Pitfall 3: Let's Encrypt Rate Limiting

**What goes wrong:** SSL certificate fails to renew, site shows security warnings.

**Why it happens:** Let's Encrypt has strict rate limits (5 failures per account per hour). Misconfigured Caddyfile or DNS issues trigger rapid retries.

**How to avoid:**
1. **Test Caddyfile locally first:** Use `caddy validate --adapter caddyfile --config Caddyfile`
2. **Use Let's Encrypt staging environment** during setup:
   ```caddyfile
   {
       acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
   }
   ```
3. **Ensure DNS A record points to correct IP** before starting Caddy
4. **Check Caddy logs** for ACME errors: `docker logs caddy`

**Warning signs:** Browser certificate warnings, Caddy logs showing "too many certificates" errors.

### Pitfall 4: Database Migration Failures

**What goes wrong:** Deploy new code but database schema not updated, app crashes, data corruption.

**Why it happens:** Manual schema changes via Supabase UI not tracked, migrations not run during deployment.

**How to avoid:**
1. **Version control all schema changes:** Never use Supabase UI in production
2. **Create migration files** in `migrations/` directory:
   ```sql
   -- migrations/001_add_boys_table.sql
   CREATE TABLE IF NOT EXISTS boys (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       -- ...
   );
   ```
3. **Run migrations during deployment:**
   ```yaml
   # In docker-compose.yml
   db-migrate:
     image: bb-manager:latest
     command: npm run migrate
     depends_on:
       db:
         condition: service_healthy
   ```
4. **Test migrations on staging first**

**Warning signs:** App errors after deployment, "column does not exist" database errors.

### Pitfall 5: CORS and Authentication Issues

**What goes wrong:** Browser blocks API requests, authentication fails, app unusable.

**Why it happens:** Supabase anon key restricted to wrong domain, reverse proxy not forwarding headers.

**How to avoid:**
1. **Update Supabase allowed domains** in dashboard:
   - Add both `https://bb-manager.yourdomain.co.uk` and `http://localhost:3000` (for dev)
2. **Configure Caddy to forward host header:**
   ```caddyfile
   reverse_proxy app:8080 {
       header_up Host {host}
   }
   ```
3. **Test authentication flow** after every deployment

**Warning signs:** Browser console shows CORS errors, 401 Unauthorized on all API requests.

## Code Examples

### Example 1: Complete docker-compose.yml for Production

```yaml
# File: /opt/bb-manager/docker-compose.yml
version: '3.8'

services:
  # PostgreSQL database (future self-hosted replacement for Supabase)
  db:
    image: postgres:16-alpine
    container_name: bb-manager-db
    restart: always
    environment:
      POSTGRES_DB: bbmanager
      POSTGRES_USER: bbmanager
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_GB.UTF-8"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      # Mount migration scripts
      - ./migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bbmanager -d bbmanager"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  # Automated backups with retention
  db-backup:
    image: kartoza/pg-backup:16-3.4
    container_name: bb-manager-backup
    restart: always
    environment:
      POSTGRES_HOST: db
      POSTGRES_DB: bbmanager
      POSTGRES_USER: bbmanager
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      # Daily backup at 2 AM
      CRON_SCHEDULE: "0 2 * * *"
      # Keep last 7 daily backups + 4 weekly backups
      BACKUP retention_keep_daily: 7
      BACKUP retention_keep_weekly: 4
      BACKUP_DIR: /backups
      # Enable compression
      COMPRESS_BACKUPS: "true"
    volumes:
      - ./backups:/backups
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

  # BB-Manager React SPA
  app:
    image: bb-manager:latest
    container_name: bb-manager-app
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      # Keep using Supabase for now
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
      # Future: Direct Postgres connection
      # DATABASE_URL: postgresql://bbmanager:${DB_PASSWORD}@db:5432/bbmanager
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

  # Uptime Kuma monitoring (optional)
  uptime:
    image: louislam/uptime-kuma:latest
    container_name: bb-manager-uptime
    restart: always
    volumes:
      - uptime-data:/app/data
    ports:
      - "127.0.0.1:3001:3001"  # Internal access only
    networks:
      - internal

volumes:
  postgres-data:
    driver: local
  uptime-data:
    driver: local

networks:
  internal:
    driver: bridge
```

### Example 2: GitHub Actions Deployment Workflow

```yaml
# File: .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t bb-manager:${{ github.sha }} .
          docker tag bb-manager:${{ github.sha }} bb-manager:latest

      - name: Save image to tar
        run: docker save bb-manager:latest | gzip > bb-manager.tar.gz

      - name: Copy to server via SSH
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "bb-manager.tar.gz"
          target: "/tmp/"

      - name: Deploy on server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/bb-manager

            # Load new Docker image
            docker load < /tmp/bb-manager.tar.gz

            # Restart app container with new image
            docker compose up -d app

            # Clean up old images
            docker image prune -f

            # Verify deployment
            docker compose ps
            docker logs bb-manager-app --tail 20

      - name: Notify on failure
        if: failure()
        run: echo "Deployment failed! Check server logs."
```

### Example 3: Backup Verification Script

```bash
#!/bin/bash
# File: /opt/bb-manager/scripts/verify-backup.sh
# Run weekly via cron to verify backup integrity

set -euo pipefail

BACKUP_DIR="/opt/bb-manager/backups"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [[ -z "$LATEST_BACKUP" ]]; then
    echo "ERROR: No backups found in $BACKUP_DIR"
    exit 1
fi

# Check backup age (should be < 48 hours)
BACKUP_AGE=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ))
MAX_AGE=$(( 48 * 3600 ))  # 48 hours in seconds

if [[ $BACKUP_AGE -gt $MAX_AGE ]]; then
    echo "ERROR: Latest backup is older than 48 hours"
    exit 1
fi

# Check backup file size (should be > 1MB)
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")
MIN_SIZE=$(( 1024 * 1024 ))  # 1MB

if [[ $BACKUP_SIZE -lt $MIN_SIZE ]]; then
    echo "ERROR: Latest backup is too small ($BACKUP_SIZE bytes)"
    exit 1
fi

# Test backup integrity by checking if it's valid gzip
if ! gzip -t "$LATEST_BACKUP"; then
    echo "ERROR: Latest backup is corrupted (invalid gzip)"
    exit 1
fi

echo "✓ Backup verification passed: $LATEST_BACKUP"
exit 0
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| **Manual SSL with certbot** | **Automatic HTTPS with Caddy** | ~2019 | Eliminates certificate management overhead, reduces misconfigurations |
| **Custom backup scripts** | **Dockerized backup solutions (kartoza/pg-backup)** | ~2021 | Built-in retention, compression, failure handling |
| **Webhook-based deployments** | **GitOps with GitHub Actions** | ~2022 | Better logging, rollback, secret management |
| **PM2 for process management** | **Docker Compose health checks** | ~2020 | Native orchestration, dependency management |
| **External monitoring only** | **Self-hosted Uptime Kuma** | ~2021 | Full-stack monitoring including internal services |

**Deprecated/outdated:**
- **Nginx + manual certbot:** Still works but unnecessary complexity. Caddy's automatic HTTPS is superior for low-traffic sites.
- **Supervisor/systemd for containers:** Use Docker's native restart policies instead.
- **Manual git pull on server:** GitHub Actions SSH workflow provides better audit trail.
- **Standalone PostgreSQL without Docker:** Harder to manage backups, upgrades, and migration.

## Deployment Scenarios

### Scenario 1: Raspberry Pi at School (On-Premise)

**Hardware:** Raspberry Pi 5 (8GB RAM) + 256GB SSD

**Pros:**
- Full data sovereignty (GDPR compliant)
- No monthly hosting costs
- Local network access (fast)
- Physical control of data

**Cons:**
- Requires physical maintenance
- Dependent on school internet reliability
- Backup responsibility falls on staff
- Hardware failure risk

**Setup:**
1. Flash Raspberry Pi OS Lite (64-bit)
2. Configure static IP on school network
3. Install Docker + Caddy (see Standard Stack)
4. Configure router port forwarding (80, 443)
5. Set up dynamic DNS (if no static IP)
6. Deploy with docker-compose
7. Configure off-site backup sync (rsync to home/cloud)

**Monitoring:**
- Uptime Kuma for internal health checks
- External monitoring (UptimeRobot) for public access
- Daily backup verification emails

**Cost:** ~£80 (Pi 5 + SSD + power supply) + £0/month

### Scenario 2: VPS Hosting (Hetzner/DigitalOcean)

**Hardware:** 1-2GB RAM VPS in UK datacenter

**Pros:**
- Professional redundancy (power, network)
- Automated backups available
- No physical maintenance
- Easy scaling
- UK data sovereignty

**Cons:**
- Monthly recurring cost (£5-10/month)
- Less physical control
- Dependency on provider

**Recommended VPS Providers (UK/GDPR):**

| Provider | Location | Price | Best For |
|----------|----------|-------|----------|
| **Hetzner** | Falkenstein (Germany), UK | ~£4-6/month | Best price/performance, EU GDPR compliant |
| **DigitalOcean** | London | ~£12/month | Ease of use, good documentation |
| **Linode** | London | ~£10/month | Good performance, UK datacenter |

**Setup:**
1. Create VPS (Ubuntu 22.04 LTS)
2. SSH into server
3. Install Docker + Caddy
4. Point domain A record to VPS IP
5. Deploy docker-compose stack
6. Configure automated backups (provider + pg-backup)

**Monitoring:**
- Uptime Kuma on same VPS
- Provider monitoring (network, disk)
- Email alerts on container failures

**Cost:** ~£5-12/month

### Scenario 3: Hybrid (DB On-Premise, App Hosted)

**Architecture:** PostgreSQL at school + React app on VPS

**Pros:**
- Data sovereignty (DB local)
- Better performance (VPS for app)
- Redundant app hosting

**Cons:**
- More complex setup
- Database connectivity over internet
- Requires VPN or SSH tunnel for DB security

**Setup:**
1. Run PostgreSQL on Raspberry Pi at school
2. Configure VPN (WireGuard) between Pi and VPS
3. Host React app on VPS
4. App connects to DB via VPN tunnel
5. Double backup (local + remote)

**When to use:** This is complex. Only choose if you need both app reliability and local data control.

## Open Questions

1. **Supabase Self-Hosting vs. Vanilla PostgreSQL**
   - **What we know:** Supabase provides Auth, Postgres, and real-time features. BB-Manager only uses Auth + Postgres.
   - **What's unclear:** Can we replace just the Postgres component while keeping Supabase Auth? Or do we need to self-host the entire Supabase stack (including GoTrue, PostgREST, Realtime)?
   - **Recommendation:** For simplicity, keep Supabase cloud for now. Evaluate full Supabase self-hosting if GDPR requirements mandate fully on-premise. Supabase self-hosting via Docker is possible but complex (7+ containers).

2. **ARM64 Compatibility for All Images**
   - **What we know:** Raspberry Pi uses ARM64 architecture. Most official Docker images support ARM64.
   - **What's unclear:** Do all dependencies in BB-Manager's Docker image support ARM64?
   - **Recommendation:** Test build on actual Raspberry Pi hardware before deploying to production. Most Node.js and PostgreSQL images are ARM64-compatible.

3. **Optimal Backup Strategy for Low-Traffic Site**
   - **What we know:** Automated daily backups with 7-day retention is standard. Off-site backup is critical for disaster recovery.
   - **What's unclear:** Should backups be synced to cloud storage (S3, Wasabi) or is local backup sufficient?
   - **Recommendation:** Start with local backups on separate disk. Add rclone sync to cloud storage if data becomes critical. For school data, local backup + weekly USB drive rotation may be sufficient.

4. **CI/CD Pipeline Complexity**
   - **What we know:** GitHub Actions with SSH deployment works well for simple apps.
   - **What's unclear:** Should we use self-hosted GitHub runner on the Pi/VPS, or SSH from GitHub Actions?
   - **Recommendation:** SSH from GitHub Actions is simpler. Self-hosted runners require maintenance and security hardening.

## Sources

### Primary (HIGH confidence)

- **kartoza/docker-pg-backup** - GitHub repository and example docker-compose.yml showing automated PostgreSQL backups with cron scheduling, retention policies, and health checks.
- **Docker Official Documentation** - "Use Compose in production" and "Start containers automatically" for restart policies and health check configuration.
- **Caddy Server Documentation** - Automatic HTTPS configuration, Caddyfile syntax, and reverse proxy setup.

### Secondary (MEDIUM confidence)

- **Automated PostgreSQL Backups in Docker** (serversinc.io, September 2025) - Verified patterns for pg_dump automation with cron and retention policies.
- **How to Automate Docker Volume Backups with Cron** (oneuptime.com, January 2026) - Rotation policies and remote storage solutions.
- **Poor man's CD with GitHub Actions and a VPS** (Medium, 2024-2025) - SSH-based deployment patterns.
- **Docker Compose Health Checks: An Easy-to-follow Guide** (Last9, March 2025) - Production health check implementation.
- **VPS RAM Requirements Guide** (SSD Nodes Blog) - Confirms 1GB RAM sufficient for small applications with swap.

### Tertiary (LOW confidence)

- **Self-hosted deployment small VPS** (various sources, 2024-2025) - General best practices for low-resource VPS deployment.
- **Hetzner VPS UK GDPR** (search rate-limited) - Unable to verify current Hetzner UK datacenter status. Recommendation based on general knowledge of Hetzner's EU operations.
- **Uptime Kuma vs. alternatives** (general knowledge) - Uptime Kuma is widely recommended but specific comparisons not verified.

## Metadata

**Confidence breakdown:**
- Standard stack: **MEDIUM** - Caddy, Docker Compose, and kartoza/pg-backup verified from official sources. Uptime Kuma recommendation based on general knowledge.
- Architecture: **MEDIUM** - Docker Compose patterns verified from official docs. Caddy configuration verified from official docs. Hybrid scenario not tested.
- Pitfalls: **HIGH** - Memory issues and backup failures well-documented. Let's Encrypt rate limits documented officially.
- Deployment scenarios: **MEDIUM** - VPS and Raspberry Pi setup based on standard practices. GDPR compliance requires legal verification.

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - Docker and Caddy release cycles are stable, but verify latest versions before deployment)

**Next steps:**
1. Test Docker Compose stack on Raspberry Pi 5 hardware
2. Verify Caddy obtains Let's Encrypt certificate successfully
3. Test backup and restore procedure end-to-end
4. Run load test with 50 concurrent users
5. Document disaster recovery procedure
