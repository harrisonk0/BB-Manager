# PocketBase Implementation Guide

**Date:** 2026-01-22
**Purpose:** Complete guide to rebuilding BB-Manager with PocketBase

---

## What is PocketBase?

PocketBase is an open-source, self-hosted Backend as a Service (BaaS) that provides:

- ✅ **Authentication** - Email/password, OAuth, email verification, password reset (built-in)
- ✅ **Database** - Embedded SQLite (no separate database server)
- ✅ **CRUD API** - Auto-generated REST API from your schema
- ✅ **Admin UI** - Built-in admin interface (no custom frontend needed initially)
- ✅ **Real-time** - Subscriptions for live updates (optional)
- ✅ **Single Binary** - One Go executable, no dependencies

**Website:** https://pocketbase.io/docs

---

## Why PocketBase for BB-Manager?

### Simplicity

| Task | Next.js Stack | PocketBase |
|------|--------------|------------|
| Auth implementation | 2-3 weeks | ✅ Built-in |
| Admin UI | 2-3 weeks | ✅ Built-in |
| Database setup | 1 week | ✅ Built-in (SQLite) |
| CRUD API | 2 weeks | ✅ Auto-generated |
| Deployment | Complex (Docker + Caddy) | Simple (one binary) |
| **Total** | **6-8 weeks** | **2-3 weeks** |

### Features Perfect for BB-Manager

1. **Built-in Auth** - Email/password, role-based access via API rules
2. **Admin UI** - Can use immediately for mark entry
3. **Auto-generated API** - No backend code to write
4. **SQLite** - Simple backup (copy file), no DBA needed
5. **Single Binary** - Easy deployment to VPS or Raspberry Pi
6. **UK GDPR Compliant** - Self-hosted, data stays in UK

---

## Quick Start (5 Minutes)

### 1. Download PocketBase

```bash
# For Linux VPS (x86_64)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.5/pocketbase_0.23.5_linux_amd64.zip
unzip pocketbase_0.23.5_linux_amd64.zip
cd pocketbase

# For Raspberry Pi (ARM64)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.5/pocketbase_0.23.5_linux_arm64.zip
unzip pocketbase_0.23.5_linux_arm64.zip
cd pocketbase

# Start PocketBase
./pocketbase serve
```

**That's it!** Admin UI available at: http://localhost:8090/_/

### 2. Initial Setup

1. Open http://localhost:8090/_/
2. Create admin account (email + password)
3. You're in the admin UI!

---

## PocketBase Schema for BB-Manager

PocketBase uses a JSON schema file to define collections (tables). Create `pb_schema.json`:

```json
{
  "collections": [
    {
      "name": "boys",
      "type": "base",
      "schema": [
        {
          "name": "name",
          "type": "text",
          "required": true,
          "options": {
            "min": 1,
            "max": 100
          }
        },
        {
          "name": "squad",
          "type": "number",
          "required": true,
          "options": {
            "min": 1,
            "max": 4
          }
        },
        {
          "name": "year",
          "type": "text",
          "required": true
        },
        {
          "name": "section",
          "type": "select",
          "required": true,
          "options": {
            "values": ["company", "junior"]
          }
        },
        {
          "name": "is_squad_leader",
          "type": "bool",
          "required": false
        }
      ],
      "indexes": [
        "create index idx_boys_section on boys (section)",
        "create index idx_boys_section_squad on boys (section, squad)"
      ],
      "apiRule": "@request.auth.id != '' && @request.data.section = @request.auth.role.section"
    },
    {
      "name": "marks",
      "type": "base",
      "schema": [
        {
          "name": "boy_id",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "boys",
            "cascadeDelete": true
          }
        },
        {
          "name": "date",
          "type": "date",
          "required": true
        },
        {
          "name": "score",
          "type": "number",
          "required": false
        },
        {
          "name": "uniform_score",
          "type": "number",
          "required": false
        },
        {
          "name": "behaviour_score",
          "type": "number",
          "required": false
        },
        {
          "name": "is_absent",
          "type": "bool",
          "required": false
        },
        {
          "name": "section",
          "type": "select",
          "required": true,
          "options": {
            "values": ["company", "junior"]
          }
        }
      ],
      "indexes": [
        "create index idx_marks_boy_date on marks (boy_id, date desc)",
        "create index idx_marks_section_date on marks (section, date desc)"
      ],
      "apiRule": "@request.auth.id != '' && @request.data.section = @request.auth.role.section"
    },
    {
      "name": "users",
      "type": "auth",  // Special auth collection
      "schema": [
        {
          "name": "role",
          "type": "select",
          "required": true,
          "options": {
            "values": ["admin", "captain", "officer"]
          }
        },
        {
          "name": "name",
          "type": "text",
          "required": true
        }
      ]
    },
    {
      "name": "settings",
      "type": "base",
      "schema": [
        {
          "name": "section",
          "type": "select",
          "required": true,
          "options": {
            "values": ["company", "junior"]
          }
        },
        {
          "name": "meeting_day",
          "type": "number",
          "required": true,
          "options": {
            "min": 0,
            "max": 6
          }
        }
      ],
      "apiRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'captain')"
    },
    {
      "name": "audit_logs",
      "type": "base",
      "schema": [
        {
          "name": "user_id",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "users"
          }
        },
        {
          "name": "action",
          "type": "select",
          "required": true,
          "options": {
            "values": ["CREATE_BOY", "UPDATE_BOY", "DELETE_BOY", "CREATE_MARK", "UPDATE_SETTINGS"]
          }
        },
        {
          "name": "description",
          "type": "text",
          "required": true
        },
        {
          "name": "section",
          "type": "select",
          "required": true,
          "options": {
            "values": ["company", "junior", "global"]
          }
        }
      ],
      "indexes": [
        "create index idx_audit_logs_section_timestamp on audit_logs (section, timestamp desc)"
      ],
      "apiRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'captain')"
    }
  ]
}
```

---

## Setup PocketBase with Schema

### Option 1: Use Admin UI (Simplest)

1. Go to http://localhost:8090/_/
2. Click "New Collection"
3. Create collections: `boys`, `marks`, `settings`, `audit_logs`
4. For `users`, enable "Auth" in collection settings
5. Add `role` field to `users` collection

### Option 2: Import Schema (Automated)

```bash
# After starting PocketBase, import the schema
./pocketbase migrate pb_schema.json
```

---

## Authentication with PocketBase

PocketBase has built-in auth. No Better Auth needed!

### Create User

```javascript
// Using PocketBase JS SDK
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Sign up new user (with role)
await pb.collection('users').create({
  email: 'captain@example.com',
  password: 'secure_password_123',
  passwordConfirm: 'secure_password_123',
  role: 'captain',
  name: 'John Smith'
});
```

### Login

```javascript
// Login
const authData = await pb.collection('users').authWithPassword(
  'captain@example.com',
  'secure_password_123'
);

// PocketBase automatically stores auth token
// Check if logged in
pb.authStore.isValid; // true
```

### Get Current User

```javascript
// Get current user
const user = pb.authStore.model;
console.log(user.role); // "captain"
```

### Role-Based Access in Frontend

```javascript
// Check user role
function canAccessAuditLogs() {
  const user = pb.authStore.model;
  return user && (user.role === 'captain' || user.role === 'admin');
}
```

---

## API Rules (Authorization)

PocketBase API rules provide database-level authorization (like RLS).

### Example API Rules

**`boys` collection:**
```
// Only authenticated users can access
@request.auth.id != ""

// Only users with matching section
@request.data.section = @request.auth.role.section

// Captains and admins can delete
@request.auth.role = "admin" || @request.auth.role = "captain"
```

**`audit_logs` collection:**
```
// Only captains and admins can read
@request.auth.role = "admin" || @request.auth.role = "captain"

// Only admins can delete
@request.auth.role = "admin"
```

### Setting API Rules

In PocketBase Admin UI:
1. Go to collection
2. Click "API rules"
3. Add rules for each operation (create, view, update, delete)

---

## Using the Auto-Generated API

PocketBase auto-generates REST API from your schema. No backend code needed!

### Examples

```javascript
const pb = new PocketBase('http://127.0.0.1:8090');

// Get all boys for "company" section
const boys = await pb.collection('boys').getList(1, 50, {
  filter: 'section = "company"'
});

// Create a boy
const boy = await pb.collection('boys').create({
  name: 'John Smith',
  squad: 2,
  year: '9',
  section: 'company',
  is_squad_leader: false
});

// Update a boy
await pb.collection('boys').update(boy.id, {
  name: 'John Smith Jr.'
});

// Add a mark
await pb.collection('marks').create({
  boy_id: boy.id,
  date: '2025-01-22',
  score: 8,
  section: 'company'
});

// Get marks for a boy
const marks = await pb.collection('marks').getList(1, 50, {
  filter: `boy_id = "${boy.id}"`,
  sort: '-date'
});
```

---

## Frontend Options

### Option 1: PocketBase Admin UI (Zero Code)

**For initial deployment, just use the PocketBase Admin UI!**

It already provides:
- ✅ List/add/edit/delete records
- ✅ Search and filter
- ✅ Role-based access
- ✅ Mobile-friendly
- ✅ Works offline

**Timeline:** Deploy in days, not weeks.

### Option 2: Simple HTML + Vanilla JS

```html
<!DOCTYPE html>
<html>
<head>
  <title>BB-Manager Marks Entry</title>
</head>
<body>
  <form id="markForm">
    <select id="boySelect"></select>
    <input type="date" id="markDate">
    <input type="number" id="score" min="0" max="10">
    <button type="submit">Save</button>
  </form>

  <script type="module">
    import PocketBase from 'https://esm.sh/pocketbase';

    const pb = new PocketBase('http://localhost:8090');

    // Load boys
    const boys = await pb.collection('boys').getList(1, 100, {
      filter: 'section = "company"'
    });

    const select = document.getElementById('boySelect');
    boys.items.forEach(boy => {
      const option = document.createElement('option');
      option.value = boy.id;
      option.text = boy.name;
      select.appendChild(option);
    });

    // Save mark
    document.getElementById('markForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await pb.collection('marks').create({
        boy_id: select.value,
        date: document.getElementById('markDate').value,
        score: parseFloat(document.getElementById('score').value),
        section: 'company'
      });
      alert('Mark saved!');
    });
  </script>
</body>
</html>
```

### Option 3: SvelteKit (Recommended Framework)

If you want a custom frontend, SvelteKit is perfect with PocketBase:

```bash
npm create svelte@latest bb-manager
cd bb-manager
npm install
```

**Why Svelte?**
- Lightweight (smaller bundle than React)
- Simple syntax
- Great PocketBase SDK
- Compiles to vanilla JS (fast)

---

## Deployment

### Development

```bash
./pocketbase serve
# Runs on http://localhost:8090
```

### Production (VPS)

```bash
# Upload pocketbase binary to VPS
scp pocketbase user@your-vps:/var/www/bb-manager/

# SSH into VPS
ssh user@your-vps

# Start PocketBase
cd /var/www/bb-manager
./pocketbase serve
```

### Production (Systemd Service)

Create `/etc/systemd/system/pocketbase.service`:

```ini
[Unit]
Description=PocketBase Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bb-manager
ExecStart=/var/www/bb-manager/pocketbase serve --http=0.0.0.0:8090
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
sudo systemctl status pocketbase
```

### Reverse Proxy (Optional)

If you want HTTPS, use Caddy in front:

**Caddyfile:**

```
bb-manager.example.com {
    reverse_proxy localhost:8090
}
```

PocketBase runs on port 8090, Caddy handles HTTPS on port 443.

### Raspberry Pi Deployment

Same as VPS! Just download the ARM64 binary:

```bash
wget https://github.com/pocketbase/pocketbase/releases/download/v0.23.5/pocketbase_0.23.5_linux_arm64.zip
unzip pocketbase_0.23.5_linux_arm64.zip
./pocketbase serve
```

**Performance:** SQLite on Pi 4 (4GB RAM) easily handles hundreds of concurrent users.

---

## Backups

### SQLite Backup

PocketBase stores data in `pb_data/data.db`. Just copy the file!

```bash
# Stop PocketBase
./pocketbase stop

# Backup
cp pb_data/data.db backups/bb-manager-$(date +%Y%m%d).db

# Restart
./pocketbase serve
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/bb-manager"
DATA_DIR="/var/www/bb-manager/pb_data"

# Stop PocketBase
systemctl stop pocketbase

# Create backup
cp $DATA_DIR/data.db "$BACKUP_DIR/bb-manager-$(date +%Y%m%d-%H%M%S).db"

# Keep only last 30 days
find $BACKUP_DIR -name "bb-manager-*.db" -mtime +30 -delete

# Start PocketBase
systemctl start pocketbase
```

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /var/www/bb-manager/backup.sh
```

---

## Migration from Previous Schema

If you have existing PostgreSQL data:

```bash
# 1. Export from PostgreSQL
pg_dump bb-manager > backup.sql

# 2. Convert to SQLite (requires manual work or tool)
# Use pg_dump or write migration script

# 3. Import into PocketBase
# PocketBase will use the imported SQLite database
```

**Recommendation:** Start fresh. Migrate only active data if needed.

---

## Security Checklist

### Authentication

- [x] Email/password authentication (built-in)
- [ ] Enable email verification (PocketBase settings)
- [ ] Configure password reset (PocketBase settings)
- [ ] Set strong password policy (frontend validation)

### Authorization

- [ ] API rules for each collection
- [ ] Role-based access (admin, captain, officer)
- [ ] Section-based data separation

### HTTPS

- [ ] Use reverse proxy (Caddy) with Let's Encrypt
- [ ] Force HTTPS in production

### GDPR Compliance

- [ ] Data stored in UK (self-hosted)
- [ ] Automated backups
- [ ] Audit logging enabled
- [ ] Right to deletion (user can delete account)
- [ ] Right to export (user can export their data)

---

## Monitoring

### Logs

```bash
./pocketbase serve
# Logs output to stdout
```

### Health Check

```bash
# Check if PocketBase is running
curl http://localhost:8090/api/health
# Returns: {"health":"ok"}
```

---

## Development Workflow

### 1. Setup (Day 1)

```bash
# Download and start PocketBase
./pocketbase serve

# Create admin account
# Open http://localhost:8090/_/

# Define collections in Admin UI
# - boys
# - marks
# - users (auth enabled)
# - settings
# - audit_logs
```

### 2. Data Model (Day 1-2)

```bash
# Create test users
# Define API rules
# Test auth flow
```

### 3. Frontend (Day 3-7)

```bash
# Option A: Use Admin UI initially (deploy in days)
# Option B: Build simple HTML/JS form
# Option C: Build SvelteKit app
```

### 4. Testing (Day 8-10)

```bash
# Test auth flows
# Test CRUD operations
# Test API rules
# Test on mobile devices
```

### 5. Deployment (Day 11-14)

```bash
# Deploy to VPS or Raspberry Pi
# Configure HTTPS (Caddy)
# Set up backups
# Monitor for issues
```

**Total:** 2 weeks (conservative estimate)

---

## PocketBase Resources

- **Official Docs:** https://pocketbase.io/docs/
- **JavaScript SDK:** https://github.com/pocketbase/js-sdk
- **Examples:** https://github.com/pocketbase/pocketbase/tree/main/examples
- **Community:** https://github.com/pocketbase/pocketbase/discussions

---

## Common Issues

### Port Already in Use

```bash
# Use different port
./pocketbase serve --http=0.0.0.0:8091
```

### Database Locked

```bash
# Stop PocketBase first
./pocketbase stop

# Then start again
./pocketbase serve
```

### Can't Access Admin UI

```bash
# Check firewall
sudo ufw allow 8090

# Check if running
ps aux | grep pocketbase
```

---

## Comparison with Next.js Stack

| Feature | PocketBase | Next.js Stack |
|---------|-----------|--------------|
| **Auth** | Built-in | Implement Better Auth (2-3 weeks) |
| **Admin UI** | Built-in | Build custom (2-3 weeks) |
| **Database** | SQLite (embedded) | PostgreSQL (manage server) |
| **API** | Auto-generated | Write API routes (2 weeks) |
| **Deployment** | One binary | Docker + Caddy + Postgres |
| **Timeline** | 2-3 weeks | 6-8 weeks |
| **Complexity** | LOW-MED | HIGH |

---

## Final Recommendation

**Start with PocketBase Admin UI.**

If the Admin UI meets your needs (it probably will), you're done in days, not weeks.

If you need a custom UI, build a simple HTML/JS frontend or use SvelteKit.

**Don't use Next.js unless PocketBase can't meet your requirements.**
