# BB-Manager Technical Specification (PocketBase)

**Date:** 2026-01-22 (Updated from Next.js to PocketBase)
**Status:** Ready for implementation

## Overview

BB-Manager is built with **PocketBase**, a self-hosted Backend as a Service (BaaS). PocketBase provides authentication, database, auto-generated CRUD API, and admin UI in a single Go binary.

This approach dramatically simplifies the architecture and reduces development time from 6-8 weeks (Next.js stack) to 2-3 weeks.

**For implementation guide**, see [POCKETBASE-GUIDE.md](./POCKETBASE-GUIDE.md).

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| PocketBase | 0.23.5+ | Self-hosted BaaS (auth, DB, API, admin UI) |
| SQLite | Embedded | Database (no separate server) |

### Frontend (Optional)

| Technology | Purpose |
|------------|---------|
| PocketBase Admin UI | Built-in admin interface |
| Vanilla JS / HTML | Simple custom forms (if needed) |
| SvelteKit | Lightweight framework (if custom UI needed) |

### Development

| Technology | Purpose |
|------------|---------|
| PocketBase JS SDK | Client library |
| TypeScript | Type safety (optional) |

### Deployment

| Technology | Purpose |
|------------|---------|
| PocketBase Binary | Single executable, no dependencies |
| Systemd | Service management (Linux) |
| Caddy (optional) | HTTPS reverse proxy |

## Architecture

### High-Level Pattern

```
Browser (untrusted)
    |
    v
Frontend (Admin UI or Custom)
    |
    v
PocketBase (port 8090)
    |
    +-- Authentication (built-in)
    +-- SQLite Database (embedded)
    +-- CRUD API (auto-generated)
    +-- Admin UI (built-in)
    +-- API Rules (authorization)
```

**Deployment:**
```
VPS or Raspberry Pi
    |
    +-- pocketbase (single binary)
    +-- pb_data/ (SQLite database + uploads)
    |
    +-- Optional: Caddy (HTTPS)
```

**Key Principles:**

1. **BaaS simplicity** - PocketBase handles auth, DB, API
2. **Admin UI first** - Use built-in admin UI initially
3. **Auto-generated API** - No backend code to write
4. **API rules** - Authorization at database level
5. **Single binary** - No Docker, no complexity
6. **Self-hosted** - Full control, UK GDPR compliant

## Data Model

### PocketBase Collections

```
users (auth collection)
    |
    +-- id (UUID)
    +-- email
    +-- role (admin, captain, officer)
    +-- name

boys
    |
    +-- id (UUID)
    +-- name
    +-- squad (1-4)
    +-- year
    +-- section (company, junior)
    +-- is_squad_leader
    +-- created
    +-- updated

marks
    |
    +-- id (UUID)
    +-- boy_id (relation to boys)
    +-- date
    +-- score
    +-- uniform_score
    +-- behaviour_score
    +-- is_absent
    +-- section
    +-- created
    +-- updated

settings
    |
    +-- id (UUID)
    +-- section (company, junior)
    +-- meeting_day (0-6)
    +-- created
    +-- updated

audit_logs
    |
    +-- id (UUID)
    +-- user_id (relation to users)
    +-- action (CREATE_BOY, UPDATE_BOY, etc.)
    +-- description
    +-- section
    +-- created
```

## Authentication

### Built-in Auth

PocketBase provides complete authentication system:

```javascript
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

// Sign up
await pb.collection('users').create({
  email: 'user@example.com',
  password: 'password123',
  passwordConfirm: 'password123',
  role: 'officer',
  name: 'John Doe'
});

// Log in
await pb.collection('users').authWithPassword(
  'user@example.com',
  'password123'
);

// Check auth
pb.authStore.isValid; // true

// Get current user
const user = pb.authStore.model;
console.log(user.role); // "officer"
```

### Role-Based Access

Roles stored in `users` collection:

| Role | Permissions |
|------|-------------|
| **admin** | Full access, manage users, audit logs |
| **captain** | Manage officers, view audit logs, all data access |
| **officer** | View/edit boys and marks, assigned section only |

## API Rules (Authorization)

PocketBase API rules provide database-level authorization (similar to RLS).

### Example Rules

**`boys` collection:**
```
View: @request.auth.id != "" && @request.data.section = @request.auth.role.section
Create: @request.auth.id != "" && @request.auth.role IN ("admin", "captain", "officer")
Update: @request.auth.id != "" && @request.auth.role IN ("admin", "captain", "officer")
Delete: @request.auth.role IN ("admin", "captain")
```

**`marks` collection:**
```
View: @request.auth.id != "" && @request.data.section = @request.auth.role.section
Create: @request.auth.id != "" && @request.auth.role IN ("admin", "captain", "officer")
Update: @request.auth.id != "" && @request.auth.role IN ("admin", "captain", "officer")
Delete: @request.auth.role IN ("admin", "captain")
```

**`audit_logs` collection:**
```
View: @request.auth.role IN ("admin", "captain")
Create: @request.auth.id != "" && @request.auth.role IN ("admin", "captain", "officer")
Delete: @request.auth.role = "admin"
```

## Using the API

PocketBase auto-generates REST API from schema.

### JavaScript SDK Examples

```javascript
const pb = new PocketBase('http://127.0.0.1:8090');

// List boys (with filter)
const boys = await pb.collection('boys').getList(1, 50, {
  filter: 'section = "company"',
  sort: 'name'
});

// Create boy
const boy = await pb.collection('boys').create({
  name: 'John Smith',
  squad: 2,
  year: '9',
  section: 'company'
});

// Update boy
await pb.collection('boys').update(boy.id, {
  name: 'John Smith Jr.'
});

// Delete boy
await pb.collection('boys').delete(boy.id);

// Add mark
await pb.collection('marks').create({
  boy_id: boy.id,
  date: '2025-01-22',
  score: 8,
  section: 'company'
});

// Get marks for boy
const marks = await pb.collection('marks').getList(1, 50, {
  filter: `boy_id = "${boy.id}"`,
  sort: '-date'
});

// Real-time subscription (optional)
await pb.collection('boys').subscribe('*', (e) => {
  console.log('Boys collection changed:', e);
});
```

## Frontend Options

### Option 1: PocketBase Admin UI (Recommended for v1)

**Use the built-in admin UI!**

Features:
- List/add/edit/delete records
- Search and filter
- Role-based access
- Mobile-friendly
- Zero development time

**Timeline:** Deploy in days

### Option 2: Simple HTML/JS

For custom forms, vanilla JS is sufficient:

```html
<script type="module">
  import PocketBase from 'https://esm.sh/pocketbase';
  const pb = new PocketBase('http://localhost:8090');
  // ... form handling
</script>
```

### Option 3: SvelteKit (If Custom UI Needed)

If you want a custom frontend, SvelteKit is recommended:

```bash
npm create svelte@latest bb-manager
```

**Why Svelte?**
- Lightweight (smaller bundle than React)
- Simple syntax
- Great PocketBase SDK
- Compiles to vanilla JS

## Deployment

### Development

```bash
./pocketbase serve
# Admin UI: http://localhost:8090/_/
# API: http://localhost:8090/api/
```

### Production (Systemd Service)

Create `/etc/systemd/system/pocketbase.service`:

```ini
[Unit]
Description=PocketBase Server for BB-Manager
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bb-manager
ExecStart=/var/www/bb-manager/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
sudo systemctl status pocketbase
```

### HTTPS (Caddy)

Optional Caddy reverse proxy:

**Caddyfile:**

```
bb-manager.example.com {
    reverse_proxy localhost:8090
}
```

Caddy handles HTTPS automatically with Let's Encrypt.

### Raspberry Pi

Same deployment as VPS! Just use ARM64 binary:

```bash
wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.5/pocketbase_0.23.5_linux_arm64.zip
unzip pocketbase_0.23.5_linux_arm64.zip
./pocketbase serve
```

## Backup Strategy

### SQLite Backup

PocketBase stores data in `pb_data/data.db`.

```bash
# Stop service
systemctl stop pocketbase

# Backup
cp pb_data/data.db backups/bb-manager-$(date +%Y%m%d).db

# Start service
systemctl start pocketbase
```

### Automated Backup Script

```bash
#!/bin/bash
# /var/www/bb-manager/backup.sh

BACKUP_DIR="/var/backups/bb-manager"
DATA_DIR="/var/www/bb-manager/pb_data"

systemctl stop pocketbase
cp $DATA_DIR/data.db "$BACKUP_DIR/bb-manager-$(date +%Y%m%d-%H%M%S).db"
find $BACKUP_DIR -name "bb-manager-*.db" -mtime +30 -delete
systemctl start pocketbase
```

Add to crontab:

```bash
0 2 * * * /var/www/bb-manager/backup.sh
```

## Security

### Authentication

- Email/password authentication (built-in)
- Password hashing (handled by PocketBase)
- Session management (handled by PocketBase)
- Email verification (configure in PocketBase settings)
- Password reset (configure in PocketBase settings)

### Authorization

- API rules for each collection
- Role-based access control
- Section-based data separation

### HTTPS

- Use Caddy for automatic HTTPS (recommended)
- Or configure manually with certbot

### GDPR Compliance

- Self-hosted in UK (data sovereignty)
- Automated backups
- Audit logging
- User data export and deletion

## Performance

### SQLite Performance

SQLite on Raspberry Pi 4 (4GB RAM):
- Handles hundreds of concurrent users
- Sub-millisecond queries
- Suitable for BB-Manager scale

### Optimization Tips

1. **Use indexes** on frequently queried fields
2. **Batch operations** when possible
3. **Use pagination** (getList) for large datasets
4. **Enable query cache** in PocketBase settings

## Monitoring

### Logs

```bash
journalctl -u pocketbase -f
```

### Health Check

```bash
curl http://localhost:8090/api/health
# Returns: {"health":"ok"}
```

### Metrics

PocketBase provides basic metrics in Admin UI:
- Active connections
- Request count
- Response times

## Development Timeline

### Week 1: PocketBase Setup

- Download and install PocketBase
- Create admin account
- Define collections (schema)
- Configure API rules
- Test authentication

### Week 2: Data Entry

- Use Admin UI for data entry
- Test all CRUD operations
- Validate API rules
- Load test data

### Week 3: Polish & Deploy

- Custom forms (if needed)
- Deploy to VPS/Raspberry Pi
- Configure HTTPS (Caddy)
- Set up backups
- User testing

**Total: 2-3 weeks** (vs 6-8 weeks with Next.js)

## Advantages over Next.js Stack

| Feature | PocketBase | Next.js Stack |
|---------|-----------|--------------|
| Auth Implementation | ✅ Built-in (0 weeks) | ❌ Better Auth (2-3 weeks) |
| Admin UI | ✅ Built-in (0 weeks) | ❌ Custom UI (2-3 weeks) |
| Database Management | ✅ SQLite embedded | ❌ PostgreSQL server |
| API Development | ✅ Auto-generated | ❌ Write API routes (2 weeks) |
| Deployment | ✅ One binary | ❌ Docker + Caddy + Postgres |
| Development Time | ✅ 2-3 weeks | ❌ 6-8 weeks |
| Complexity | ✅ LOW-MED | ❌ HIGH |
| Learning Curve | ✅ Simple | ❌ Steep |

## Build Commands

### PocketBase

```bash
# Development
./pocketbase serve

# Production (systemd)
sudo systemctl start pocketbase
sudo systemctl stop pocketbase
sudo systemctl restart pocketbase
sudo systemctl status pocketbase
```

### Frontend (If Using SvelteKit)

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Key Decisions

### 1. PocketBase over Custom Backend

**Decision:** Use PocketBase BaaS instead of Next.js + Better Auth + PostgreSQL.

**Rationale:**
- Auth built-in (saves 2-3 weeks)
- Admin UI built-in (saves 2-3 weeks)
- Auto-generated API (saves 2 weeks)
- Simpler deployment
- Lower risk

### 2. SQLite over PostgreSQL

**Decision:** Use embedded SQLite instead of separate PostgreSQL server.

**Rationale:**
- Simpler deployment (no DB server)
- Easier backups (copy file)
- Sufficient performance for BB-Manager
- Raspberry Pi friendly

### 3. Admin UI First

**Decision:** Use PocketBase Admin UI initially, add custom frontend later if needed.

**Rationale:**
- Deploy in days, not weeks
- Validate requirements
- Avoid over-engineering
- Can always add custom UI later

## Migration from Previous Implementation

If migrating from PostgreSQL version:

1. Export data from PostgreSQL
2. Transform to PocketBase schema
3. Import via PocketBase API
4. Validate data integrity

**Recommendation:** Start fresh for greenfield rebuild. Migrate only active data if needed.

## Environment Variables

```bash
# PocketBase (optional, mostly uses defaults)
PB_ENCRYPTION_KEY=your-encryption-key

# Frontend (if using SvelteKit)
VITE_POCKETBASE_URL=http://localhost:8090
```

## Testing

### Manual Testing

1. Test authentication flows
2. Test CRUD operations via Admin UI
3. Test API rules (try unauthorized access)
4. Test on mobile devices
5. Test backup/restore

### Automated Testing (Optional)

PocketBase doesn't include testing framework. Use Playwright or similar for E2E tests.

## Documentation

See [POCKETBASE-GUIDE.md](./POCKETBASE-GUIDE.md) for complete implementation guide.

## Summary

PocketBase provides the simplest path to a self-hosted BB-Manager:

- ✅ 2-3 weeks vs 6-8 weeks
- ✅ Auth built-in
- ✅ Admin UI built-in
- ✅ Auto-generated API
- ✅ Single binary deployment
- ✅ SQLite embedded
- ✅ Self-hosted (UK GDPR compliant)

**Start with PocketBase Admin UI. Add custom frontend only if needed.**
