# BB-Manager Technical Specification

## Overview

BB-Manager is a **backend-light** React + TypeScript single-page application that communicates directly with Supabase for authentication and data persistence. There is no custom application server for business logic; the only server code is for serving static assets with SPA fallback routing.

The application prioritizes simplicity and minimal infrastructure over sophisticated patterns. Data flows predictably from UI to hooks to services to Supabase.

**For canonical architecture documentation**, see [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## ⚠️ Research Findings (2026-01-22)

**IMPORTANT:** Comprehensive research was conducted to evaluate alternative frameworks, backend architectures, deployment strategies, and authentication patterns for the rebuild.

**Project Context:**
- **Greenfield rebuild** - No source code carried over from v1
- **Full self-hosting required** - Must run on local infrastructure (VPS/Raspberry Pi)

**Key Recommendation:** For a greenfield, self-hosted rebuild, use **Next.js + PostgreSQL + Better Auth** with Docker + Caddy deployment.

### Research Summary

| Area | Finding | Recommendation |
|------|---------|----------------|
| **Framework** | Next.js API routes provide security boundary; Better Auth first-class support | ✅ Next.js (App Router) |
| **Backend** | Self-hosted PostgreSQL provides data sovereignty for UK GDPR | ✅ PostgreSQL + Drizzle ORM |
| **Deployment** | Docker + Caddy provides zero-config HTTPS, simple deployment | ✅ Docker + Caddy (primary) |
| **Auth** | Lucia deprecated (Mar 2025); Better Auth has excellent Next.js integration | ✅ Better Auth + argon2id |

### Why Next.js?

- **API routes provide security boundary** - Database never exposed to client
- **Single codebase** - Frontend and backend in one repository
- **Better Auth integration** - Excellent Next.js support (primary use case)
- **Simpler deployment** - One container vs React + separate backend
- **Self-hosting is mature** - Docker Compose well-documented
- **App Router is modern** - Server components reduce client JS

### Why Self-Hosted PostgreSQL?

- **Data sovereignty:** Full control over data location (UK hosting for GDPR)
- **Mature & stable:** Battle-tested, excellent documentation
- **Runs anywhere:** VPS, Raspberry Pi, ARM64, x86_64
- **Free & open-source:** No licensing costs, no vendor lock-in
- **Drizzle ORM:** Type-safe, lightweight, performant

### Why Better Auth?

- **Lucia deprecated** (March 2025) - "Lucia, in the current state, is not working"
- **Better Auth** - Framework-agnostic replacement, absorbed Auth.js
- **Excellent Next.js support** - Middleware, server actions, App Router integration
- **Type-safe:** Excellent TypeScript integration
- **Feature complete:** Password reset, email verification, 2FA, OAuth
- **Self-hosted:** Full control over user data

### Deployment Strategy

**Primary: Docker + Caddy**
- Zero-config automatic HTTPS (Let's Encrypt)
- Hardware agnostic (VPS, Raspberry Pi, ARM64, x86_64)
- Simple deployment (single `docker-compose up` command)
- Health checks and auto-restart

**Hardware Options:**
- **VPS:** 1-2GB RAM, 1 CPU core, 20GB storage (£5-10/mo)
- **Raspberry Pi:** 4GB RAM minimum (8GB recommended)

### Full Research Documentation

See [RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md) for complete analysis with sources, decision matrices, and implementation strategy (6-8 week timeline, security checklist, open questions).

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15+ | React framework with App Router |
| TypeScript | 5.8.2 | Type safety and developer experience |
| Tailwind CSS | 3.4.4 | Utility-first styling |
| PostCSS | 8.4.38 | CSS processing |
| Autoprefixer | 10.4.19 | CSS vendor prefixing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16+ | Data persistence with RLS |
| Drizzle ORM | Latest | Type-safe database client |
| Better Auth | Latest | Authentication (argon2id) |
| Next.js API Routes | - | Backend API endpoints |
| Caddy | Latest | Reverse proxy with automatic HTTPS |

### Development

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.0.17 | Test runner |
| Docker Compose | Latest | Container orchestration |
| GitHub Actions | Latest | CI/CD deployment |

### Deployment

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | Latest | Containerization |
| Caddy | Latest | Reverse proxy + HTTPS |
| kartoza/pg-backup | Latest | Automated PostgreSQL backups |
| Uptime Kuma | Latest (optional) | Self-hosted monitoring |

## Architecture

### High-Level Pattern

```
Browser (untrusted)
    |
    v
Next.js App Router
    |
    +-- Server Components (secure, no DB exposure)
    +-- API Routes (security boundary)
    |       |
    |       v
    |   PostgreSQL (via Drizzle ORM) with RLS
    |       |
    |       v
    |   Better Auth (authentication)
    |
    v
Client Components (React)
```

**Deployment: Docker Compose**
```
Caddy (reverse proxy, HTTPS)
    |
    +-- Next.js App (API routes + frontend)
    +-- PostgreSQL (database)
```

**Key Principles:**

1. **API routes provide security boundary** - Database never exposed to client
2. **Server components for data** - Fetch data server-side, reduce client JS
3. **App Router organization** - File-based routing with layouts
4. **Section partitioning** - Data queries always scoped by section
5. **Database enforces security** - RLS policies provide defense-in-depth
6. **Self-hosted** - Full control over data and infrastructure

### Component Structure (App Router)

```
app/
    |
    +-- layout.tsx (root layout with Header)
    +-- page.tsx (redirect to home or login)
    +-- (auth)/
    |   +-- login/page.tsx
    |   +-- signup/page.tsx
    +-- (app)/
    |   +-- layout.tsx (authenticated layout)
    |   +-- page.tsx (home/member roster)
    |   +-- weekly-marks/page.tsx
    |   +-- boy/[id]/page.tsx (individual history)
    |   +-- dashboard/page.tsx
    |   +-- audit-log/page.tsx
    |   +-- settings/page.tsx
    |   +-- admin/page.tsx
    |   +-- account/page.tsx
    |   +-- help/page.tsx
    +-- api/
        +-- auth/[...nextauth]/route.ts (Better Auth)
        +-- boys/route.ts
        +-- boys/[id]/route.ts
        +-- marks/route.ts
        +-- audit-logs/route.ts
        +-- settings/route.ts
components/
    |
    +-- ui/
        +-- BoyForm.tsx (member edit)
        +-- Modal.tsx (dialogs)
        +-- Icons.tsx (SVG icons)
        +-- DatePicker.tsx (date input)
        +-- Toast.tsx (notifications)
        +-- SkeletonLoaders.tsx (placeholders)
        +-- BarChart.tsx (visualizations)
lib/
    |
    +-- db.ts (Drizzle client)
    +-- auth.ts (Better Auth config)
    +-- utils.ts (helper functions)
```

### Data Access Layer

```
lib/db.ts (Drizzle ORM client)
    |
    +-- schema/ (Drizzle schema definitions)
    +-- queries/
        +-- boys.ts (boy queries)
        +-- marks.ts (mark queries)
        +-- audit-logs.ts (audit trail)
        +-- settings.ts (section settings)
```

**Responsibilities:**

- `lib/db.ts`: Drizzle ORM client initialization
- `lib/auth.ts`: Better Auth configuration
- `lib/queries/boys.ts`: Boy data operations
- `lib/queries/marks.ts`: Mark data operations
- `lib/queries/audit-logs.ts`: Audit trail operations
- `lib/queries/settings.ts`: Settings operations

### Client Components (where needed)

```
components/
    |
    +-- client/
        +-- SectionProvider.tsx (section context)
        +-- ToastProvider.tsx (notification context)
        +-- UnsavedChangesGuard.tsx (navigation protection)
```

**Responsibilities:**

- `SectionProvider`: Manages active section state (localStorage + context)
- `ToastProvider`: Manages toast notification queue
- `UnsavedChangesGuard`: Blocks navigation when form changes pending

## Data Flow Patterns

### Auth Flow

```
1. Middleware checks auth status on protected routes
2. If not authenticated, redirect to /login
3. If authenticated, Better Auth session provides user ID
4. Server components fetch user role from user_roles table
5. Client components can access auth via Better Auth hooks
```

### Data Loading Flow

```
1. User selects section (stored in localStorage)
2. Server component fetches boys and settings via API routes
3. Data passed to client components via props
4. Client components can trigger mutations via API routes
5. Server actions or revalidation update data after mutations
```

### Write Flow (Member Create)

```
1. User fills BoyForm and submits
2. Form calls POST /api/boys (server action or fetch)
3. API route validates data (mark ranges, etc.)
4. API route calls Drizzle insert() to database
5. API route creates audit log entry
6. Response returns updated data
7. Toast notification shown
8. Page revalidates data (router.refresh() or revalidatePath())
```

## State Management

### State "Sources of Truth"

| State | Source | Scope |
|-------|--------|-------|
| Domain data | PostgreSQL | Authoritative |
| Auth session | Better Auth | HTTP-only cookies |
| Active section | `localStorage['activeSection']` | Browser persistence |
| Working data | React state (client components) | In-memory |

### Server Components First

The app uses Next.js App Router with server components as default:

1. **Server Components**: Fetch data server-side, no client JS
2. **Client Components**: Only for interactivity (forms, modals, etc.)
3. **API Routes**: Security boundary between client and database
4. **Server Actions**: Type-safe mutations (optional alternative to API routes)

**Benefits**:
- Reduced client JavaScript
- Database never exposed to client
- Simpler security model
- Better performance

## Key Architectural Decisions

### 1. API Routes as Security Boundary

**Decision**: All database access goes through API routes; no direct DB access from client.

**Rationale**:
- Database never exposed to browser
- Single place for validation and authorization
- Server-side business logic
- Better security model for self-hosting

**Trade-offs**:
- More code than direct DB access
- Slightly more latency (server hop)
- Need to implement API endpoints

### 2. Server Components by Default

**Decision**: Use Next.js server components unless client interactivity needed.

**Rationale**:
- Reduced client JavaScript
- Faster page loads
- Data fetching server-side (more secure)
- Better SEO (if needed in future)

**Trade-offs**:
- Need to mark interactive components with 'use client'
- Can't use hooks in server components

### 3. Section-Based Partitioning

**Decision**: Data queries always include `section` dimension.

**Rationale**:
- Boys' Brigade organizes by sections
- Different mark rules per section
- Clean data separation

**Trade-offs**:
- Can't easily view cross-section data
- Duplicate settings storage
- Queries always filtered

### 5. Embedded Marks Array

**Decision**: Marks stored as JSON array on each boy record.

**Rationale**:
- Simple reads (one query per section)
- No joins needed
- Easy to understand

**Trade-offs**:
- Write amplification (rewrite entire array)
- Row size growth with history
- Harder to query marks across boys

### 6. Audit Log Snapshot Reverts

**Decision**: Reverts use stored prior-state snapshots, not event replay.

**Rationale**:
- Simpler implementation
- No event sourcing complexity
- Works with embedded marks

**Trade-offs**:
- Larger storage footprint
- Can't replay from beginning
- More complex to store for large changes

## Security Model

### Authentication

- **Provider**: Supabase Auth
- **Method**: Email/password
- **Session**: Managed by Supabase client
- **Reset**: Email-based password reset

### Authorization

**Application Roles** (stored in `user_roles` table):

| Role | Can Read | Can Write | Special |
|------|----------|-----------|---------|
| officer | boys, settings | boys, marks | - |
| captain | officer + audit_logs | officer + settings | Manage officers, create officer invites |
| admin | all | all | Revert actions, manage captain/officer |

**Enforcement**:

1. **Client-side**: Role checks in UI/Services (UX only)
2. **Server-side**: RLS policies on all tables (real security)
3. **Critical**: Never trust client checks; database enforces

### Security Functions

Database functions (SECURITY DEFINER, hardened search_path):

- `get_user_role()`: Returns role for current user
- `can_access_section(section)`: Checks section access
- `can_access_audit_logs()`: Checks Captain+ status

These functions mitigate CVE-2018-1058 by setting explicit `search_path`.

### Secrets Management

**Client-side** (embedded in bundle):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY**: Public anon key

**Never in client code**:
- Service role key
- Database passwords
- Private API keys

## Build and Deployment

### Build Configuration

```javascript
// vite.config.ts
{
  build: { outDir: 'dist' },
  server: {
    port: 3000,
    host: '0.0.0.0',
    historyApiFallback: true
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  }
}
```

### Environment Variables

Required for build/dev:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional:

```bash
PORT=3000  # For Express server
```

### Build Commands

```bash
npm install         # Install dependencies
npm run dev         # Start Next.js dev server (localhost:3000)
npm run build       # Build for production
npm run start       # Start production server
```

### Deployment Options

1. **Docker Compose** (Recommended)
   - Single container with Next.js + PostgreSQL
   - Caddy reverse proxy for HTTPS
   - See deployment research for docker-compose.yml example

2. **Standalone Build**
   - Next.js standalone output for smaller Docker image
   - Configure in next.config.js: `output: 'standalone'`

## Performance Considerations

### Optimizations for Next.js

1. **Server Components**: Reduce client JavaScript by default
2. **API Route caching**: Cache GET requests where appropriate
3. **RLS policy optimization**: `(SELECT auth.uid())` subquery pattern
4. **Compound indexes**: On frequently queried columns
5. **useMemo**: For dashboard computations (client components)
6. **Parallel queries**: Loading data server-side concurrently

### Known Limitations

1. **Fetch-all rosters**: Loads all members for section into memory
2. **Inline marks**: Write amplification with mark history
3. **Unpaginated audit logs**: Loads entire log history
4. **Client-side dashboard**: Computation grows with roster size

### Scaling Strategy

If needed, consider:

1. Normalize marks into separate table
2. Add pagination for audit logs
3. Implement server-side aggregation
4. Add virtual scrolling for large rosters

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

**Key flags**:

- `strict`: All strict type checking enabled
- `noFallthroughCasesInSwitch`: Catches missing discriminated union cases
- `noUncheckedIndexedAccess`: Prevents undefined access on arrays/objects

## Testing

### Test Framework

- **Vitest**: 4.0.17
- **Environment**: Node (via happy-dom for React components)
- **Config**: Extended from vite.config.ts

### Current Coverage

- Security functions: Unit tests with mocked Supabase
- Database operations: Tests pending (Phase 3)

### Test Pattern

```typescript
// TDD-style test example
describe('get_user_role', () => {
  it('returns role for authenticated user', async () => {
    const mock = vi.mocked(supabase.rpc)
    mock.mockResolvedValue({ data: { role: 'captain' }, error: null })
    const result = await get_user_role(supabase)
    expect(result).toEqual({ role: 'captain' })
  })
})
```

## Error Handling

### Strategy

1. **Fail fast**: Throw on missing env vars
2. **Show UI errors**: Toast notifications for user-visible failures
3. **Log errors**: Console for development (production: consider logging service)
4. **Graceful degradation**: Show dataError state but don't crash

### Error Sources

- **Auth**: Expired sessions, invalid credentials
- **Network**: Supabase outage, timeout
- **Permissions**: RLS denial, missing role
- **Validation**: Bad data format, range violations

## Accessibility

### Current Support

1. **Semantic HTML**: Proper heading hierarchy
2. **ARIA labels**: On form inputs and buttons
3. **Keyboard navigation**: Full keyboard support
4. **Focus management**: Modal focus trapping
5. **Error messages**: Screen reader friendly

### Known Gaps

- Screen reader testing not performed
- High contrast mode not validated
- Touch target sizes not verified

## Internationalization

**Status**: Not supported (English only)

**Future consideration**:

- All user-facing strings are in components
- Would need i18n library integration
- Date/time formatting considerations

## Monitoring and Observability

**Current**: No production monitoring

**Recommended additions**:

1. **Error tracking**: Sentry or similar
2. **Analytics**: Usage metrics (respecting privacy)
3. **Performance**: Web Vitals tracking
4. **Uptime**: External monitoring for Supabase/ hosting

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Canonical system model
- [PRD.md](./PRD.md) - Product requirements
- [database-schema.md](./database-schema.md) - Data model
- [setup-guide.md](./setup-guide.md) - Build instructions
