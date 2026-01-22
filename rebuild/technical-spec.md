# BB-Manager Technical Specification

## Overview

BB-Manager is a **backend-light** React + TypeScript single-page application that communicates directly with Supabase for authentication and data persistence. There is no custom application server for business logic; the only server code is for serving static assets with SPA fallback routing.

The application prioritizes simplicity and minimal infrastructure over sophisticated patterns. Data flows predictably from UI to hooks to services to Supabase.

**For canonical architecture documentation**, see [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## ⚠️ Research Findings (2026-01-22)

**IMPORTANT:** Comprehensive research was conducted to evaluate alternative frameworks, backend architectures, deployment strategies, and authentication patterns for the rebuild.

**Key Recommendation:** The current tech stack (React + Vite + Supabase) is **optimal for v1** and should be retained.

### Research Summary

| Area | Finding | Recommendation |
|------|---------|----------------|
| **Framework** | Next.js adds complexity for auth-gated CRUD app; no SEO needs | ✅ Keep React + Vite |
| **Backend** | Self-hosting requires 4-8 weeks auth implementation + security complexity | ✅ Keep Supabase for v1 |
| **Deployment** | Docker + Caddy provides viable self-hosted option for v1.1 | ⚠️ Add as optional later |
| **Auth** | Lucia deprecated (Mar 2025); Better Auth unproven; RLS provides defense-in-depth | ✅ Keep Supabase Auth |

### Why Not Next.js?

- **BB-Manager is auth-gated** - No SEO needs, no public pages
- **Next.js designed for SSR** - Overkill for SPA CRUD app
- **Migration cost:** 2-6 weeks with zero functional benefit
- **Current stack is modern** - React 19.2.0 + Vite 6.2.0 is cutting-edge
- **Self-hosting constraint** - React SPA = static files; Next.js = server process

### Why Not Full Self-Hosting?

- **Auth complexity:** Must implement auth from scratch (Lucia deprecated, Better Auth unproven)
- **Security burden:** Application-level checks only; one bug = data leak
- **Operations burden:** Database backups, security patches, monitoring, SSL certificates
- **Raspberry Pi issues:** ARM64 compatibility uncertain, requires 8GB RAM recommended
- **Cost savings minimal:** Supabase Free Tier → Pro Plan (£25/mo) vs development time

### When to Consider Self-Hosting?

**v1.1 Docker Option** (1-2 weeks):
- Organizations requiring on-premise deployment
- Still use Supabase cloud (auth complexity avoided)
- Docker Compose + Caddy + GitHub Actions deployment
- See [research/003-deployment-strategies.md](./research/003-deployment-strategies.md)

**v2 Full Self-Host** (6-8 weeks, if needed):
- Air-gapped networks or strict data sovereignty requirements
- Self-hosted PostgreSQL + Better Auth
- Only if clear requirement emerges
- See [RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md) for decision framework

### Full Research Documentation

See [RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md) for complete analysis with sources, decision matrices, and implementation strategy.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.8.2 | Type safety and developer experience |
| Vite | 6.2.0 | Build tool and dev server |
| Tailwind CSS | 3.4.4 | Utility-first styling |
| PostCSS | 8.4.38 | CSS processing |
| Autoprefixer | 10.4.19 | CSS vendor prefixing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase SDK | 2.48.0 | Auth and Postgres client |
| Supabase Auth | - | Email/password authentication |
| Supabase Postgres | - | Data persistence with RLS |

### Development

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.0.17 | Test runner |
| @vitejs/plugin-react | 5.0.0 | React JSX support |
| Express | 4.18.2 | Optional static file serving |

## Architecture

### High-Level Pattern

```
Browser (untrusted)
    |
    v
React Components
    |
    v
Custom Hooks
    |
    v
Services Layer
    |
    v
Supabase (Auth + Postgres with RLS)
```

**Key Principles:**

1. **Backend-light**: No API server; browser talks directly to Supabase
2. **Services boundary**: Supabase query details isolated in `services/*`
3. **In-memory state**: No global state framework; React hooks manage state
4. **Section partitioning**: Data queries always scoped by section
5. **Database enforces security**: RLS policies are the real authority

### Component Structure

```
App.tsx (root orchestrator)
    |
    +-- Header.tsx (navigation bar)
    +-- Page Components
        +-- HomePage.tsx (member roster)
        +-- WeeklyMarksPage.tsx (marks entry)
        +-- BoyMarksPage.tsx (individual history)
        +-- DashboardPage.tsx (statistics)
        +-- AuditLogPage.tsx (audit trail)
        +-- SettingsPage.tsx (section config)
        +-- GlobalSettingsPage.tsx (admin)
        +-- AccountSettingsPage.tsx (password)
        +-- LoginPage.tsx (auth)
        +-- SignupPage.tsx (invite signup)
        +-- SectionSelectPage.tsx (section choice)
        +-- HelpPage.tsx (documentation)
    +-- UI Components
        +-- BoyForm.tsx (member edit)
        +-- Modal.tsx (dialogs)
        +-- Icons.tsx (SVG icons)
        +-- DatePicker.tsx (date input)
        +-- Toast.tsx (notifications)
        +-- SkeletonLoaders.tsx (placeholders)
        +-- BarChart.tsx (visualizations)
```

### Services Layer

```
services/
    |
    +-- supabaseClient.ts (Supabase client initialization)
    +-- supabaseAuth.ts (auth operations wrapper)
    +-- db.ts (CRUD for boys, audit_logs, invite_codes, user_roles)
    +-- settings.ts (per-section settings)
```

**Responsibilities:**

- `supabaseClient.ts`: Creates Supabase client from environment variables
- `supabaseAuth.ts`: Wraps auth operations (signIn, signUp, signOut, resetPassword)
- `db.ts`: All data operations with validation helpers
- `settings.ts`: Settings read/write operations

### Custom Hooks

```
hooks/
    |
    +-- useAuthAndRole.ts (auth + role loading)
    +-- useSectionManagement.ts (section persistence)
    +-- useAppData.ts (boys + settings loading)
    +-- useUnsavedChangesProtection.ts (dirty form guard)
    +-- useToastNotifications.ts (notification system)
```

**Responsibilities:**

- `useAuthAndRole`: Subscribes to auth changes; loads role from `user_roles`
- `useSectionManagement`: Manages `localStorage['activeSection']`
- `useAppData`: Fetches `boys` and `settings` for active section
- `useUnsavedChangesProtection`: Blocks navigation when changes pending
- `useToastNotifications`: Manages toast message queue

## Data Flow Patterns

### Auth Flow

```
1. App.tsx initializes useAuthAndRole
2. Hook calls supabase.auth.getUser()
3. If user exists, queries user_roles table for role
4. If no role, signs out and shows error
5. Hook subscribes to auth state changes
```

### Data Loading Flow

```
1. User selects section (stored in localStorage)
2. App.tsx calls useAppData
3. Hook fetches boys and settings in parallel
4. Data passed to page components via props
5. Pages use refreshData() after writes
```

### Write Flow (Member Create)

```
1. User fills BoyForm and submits
2. Page calls createBoy() from services/db.ts
3. Service validates data (mark ranges, etc.)
4. Service calls supabase.from('boys').insert()
5. Service calls createAuditLog()
6. Page calls refreshData()
7. Toast notification shown
```

## State Management

### State "Sources of Truth"

| State | Source | Scope |
|-------|--------|-------|
| Domain data | Supabase Postgres | Authoritative |
| Auth session | Supabase Auth | Client-side storage |
| Active section | `localStorage['activeSection']` | Browser persistence |
| Working data | React state (hooks/components) | In-memory |

### No Global State Framework

The app intentionally avoids Redux, Zustand, or similar. State is managed through:

1. **Component-level state**: `useState` for local UI state
2. **Custom hooks**: Cross-cutting concerns (auth, section, data)
3. **Prop drilling**: App.tsx passes data to pages
4. **localStorage**: Section selection persistence

**Trade-off**: More prop drilling vs. simpler mental model and less boilerplate.

## Key Architectural Decisions

### 1. Direct-to-Supabase Access

**Decision**: Browser talks directly to Supabase; no custom API server.

**Rationale**:
- Reduces infrastructure (no server to maintain)
- Lower latency (no intermediate hop)
- Supabase RLS provides security boundary
- Simpler deployment (static hosting)

**Trade-offs**:
- No server-side business logic encapsulation
- Business rules must be in client code or database
- Limited ability to do background processing

### 2. Services Layer as Boundary

**Decision**: All Supabase queries go through `services/*` functions.

**Rationale**:
- Single place for table/column knowledge
- Easier to change schema
- Centralized validation
- Testable business logic

**Trade-offs**:
- More indirection than direct queries
- Need to keep services in sync with schema

### 3. No React Router

**Decision**: View state managed in `App.tsx`; URL not source of truth.

**Rationale**:
- Simpler for single-page app
- No deep-linking requirements
- Easier state management
- Avoids routing complexity

**Trade-offs**:
- No shareable URLs for pages
- No browser history integration
- Can't refresh into specific views

### 4. Section-Based Partitioning

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
npm run dev         # Start Vite dev server (localhost:3000)
npm run build       # Build production bundle to dist/
npm run preview     # Preview production build
npm run start       # Serve with Express (requires build first)
```

### Deployment Options

1. **Static hosting** (Vercel, Netlify, etc.)
   - Deploy `dist/` directory
   - Configure SPA rewrites to index.html

2. **Express server** (`server.js`)
   - Serves static files
   - SPA fallback routing
   - Docker image available

3. **Docker**
   - Uses `serve` package for static files
   - Single container deployment

## Performance Considerations

### Current Optimizations

1. **RLS policy optimization**: `(SELECT auth.uid())` subquery pattern
2. **Compound indexes**: On frequently queried columns
3. **useMemo**: For dashboard computations
4. **Parallel queries**: Loading boys and settings simultaneously

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
