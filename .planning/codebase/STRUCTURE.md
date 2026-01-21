# Codebase Structure

**Analysis Date:** 2024-01-21

## Directory Layout

```
/Users/harrisonk/dev/BB-Manager/
├── components/          # React UI components and pages
├── hooks/              # Custom React hooks for state management
├── services/           # Service layer for data operations
├── src/                # Static assets (CSS only currently)
├── supabase/           # Database configuration and migrations
├── .planning/          # Planning documents
├── docs/               # Documentation
├── index.tsx           # Main React entry point
├── App.tsx             # Root React component
├── package.json        # Dependencies and scripts
├── types.ts            # TypeScript type definitions
├── vite.config.ts      # Vite build configuration
└── server.js           # Production server
```

## Directory Purposes

**components/:**
- Purpose: All React components including pages and reusable UI
- Contains: Page components, shared components, loaders, icons
- Key files:
  - `App.tsx` - Root component (not UI, but application logic)
  - `Header.tsx` - Main navigation header
  - `HomePage.tsx` - Home page with boy listing
  - `WeeklyMarksPage.tsx` - Weekly marks entry interface
  - `BoyMarksPage.tsx` - Individual boy's marks page
  - `LoginPage.tsx` - Authentication interface
  - `DashboardPage.tsx` - Analytics and overview

**hooks/:**
- Purpose: Custom React hooks for shared business logic
- Contains: 5 main hooks for different concerns
- Key files:
  - `useAuthAndRole.ts` - Authentication and role management
  - `useAppData.ts` - Data loading and state
  - `useSectionManagement.ts` - Section switching logic
  - `useUnsavedChangesProtection.ts` - Navigation protection
  - `useToastNotifications.ts` - Toast message management

**services/:**
- Purpose: Data operations and API calls
- Contains: Database operations, settings, authentication
- Key files:
  - `db.ts` - Main database operations (21KB)
  - `settings.ts` - Settings management
  - `supabaseClient.ts` - Supabase client setup
  - `supabaseAuth.ts` - Authentication helpers

**src/:**
- Purpose: Static assets and global styles
- Contains: CSS files and other assets
- Key files:
  - `index.css` - Global styles

**supabase/:**
- Purpose: Database configuration and migrations
- Contains: Database schema, migrations, config
- Key files:
  - `config.toml` - Supabase configuration
  - `migrations/` - Database migration scripts

## Key File Locations

**Entry Points:**
- `/Users/harrisonk/dev/BB-Manager/index.tsx`: React DOM mounting
- `/Users/harrisonk/dev/BB-Manager/App.tsx`: Application root
- `/Users/harrisonk/dev/BB-Manager/server.js`: Production server

**Configuration:**
- `/Users/harrisonk/dev/BB-Manager/package.json`: Dependencies and scripts
- `/Users/harrisonk/dev/BB-Manager/vite.config.ts`: Build configuration
- `/Users/harrisonk/dev/BB-Manager/types.ts`: TypeScript definitions

**Core Logic:**
- `/Users/harrisonk/dev/BB-Manager/App.tsx`: Application state and routing
- `/Users/harrisonk/dev/BB-Manager/services/db.ts`: Database operations
- `/Users/harrisonk/dev/BB-Manager/hooks/useAppData.ts`: Data management

**Testing:**
- No test files detected

## Naming Conventions

**Files:**
- PascalCase for components: `HomePage.tsx`, `DatePicker.tsx`
- camelCase for hooks: `useAuthAndRole.ts`
- camelCase for services: `db.ts`, `supabaseClient.ts`
- PascalCase for types: `types.ts`
- kebab-case for config: `vite.config.ts`

**Functions:**
- camelCase for export functions: `fetchBoys()`, `refreshData()`
- camelCase for hooks: `useAuthAndRole()`
- PascalCase for component functions: `HomePage()`

**Variables:**
- camelCase for local variables: `activeSection`, `currentUser`
- PascalCase for types: `Section`, `Boy`
- kebab-case for CSS classes: `bg-slate-200`

## Where to Add New Code

**New Feature Page:**
- Primary code: `components/[FeatureName]Page.tsx`
- Add to App.tsx import and routing
- Create corresponding type in types.ts if needed
- Add to useUnsavedChangesProtection if navigation protection needed

**New Component:**
- Implementation: `components/[ComponentName].tsx`
- Follow PascalCase naming
- Import styles from appropriate location

**New Hook:**
- Implementation: `hooks/use[FeatureName].ts`
- Follow camelCase naming with "use" prefix
- Export from index if shared

**New Service:**
- Implementation: `services/[serviceName].ts`
- camelCase naming
- Import from services/index if shared

## Special Directories

**.planning/codebase/:**
- Purpose: Architecture and planning documents
- Generated: Yes
- Committed: Yes

**supabase/migrations/:**
- Purpose: Database schema changes
- Generated: Yes
- Committed: Yes

**src/ (limited):**
- Purpose: Global styles and static assets
- Generated: No
- Committed: Yes

---

*Structure analysis: 2024-01-21*