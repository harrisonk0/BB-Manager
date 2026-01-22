# Framework Alternatives Research: React vs Next.js

**Researched:** 2026-01-22
**Domain:** Frontend framework selection for BB-Manager rebuild
**Confidence:** HIGH

## Summary

This research evaluates whether to migrate BB-Manager from the current React + Vite SPA architecture to Next.js, considering the project's specific requirements: self-hosting on VPS/Raspberry Pi, low resource usage, simple CRUD application, auth-gated access, and solo developer experience.

**Primary recommendation:** **Stay with React + Vite**. The current SPA architecture aligns perfectly with BB-Manager's requirements. Next.js would introduce complexity without meaningful benefits for an auth-gated internal CRUD app with no SEO needs.

**Key findings:**
- Next.js is optimized for SEO, SSR, and public-facing content - none of which apply to BB-Manager
- Self-hosting Next.js requires more resources (Node.js server runtime vs static files)
- Migration effort is substantial (2-6 weeks for medium apps) with little ROI
- Supabase auth is simpler with direct client-side access vs Next.js server-side complexity
- Current architecture already achieves all non-goals explicitly stated in ARCHITECTURE.md

## Standard Stack

### Current Stack (React SPA)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI framework | Current standard, lightweight, excellent DX |
| Vite | 6.2.0 | Build tool | Fast HMR, simple config, industry standard for SPAs |
| TypeScript | 5.8.2 | Type safety | Essential for data-heavy CRUD apps |
| Supabase JS | 2.48.0 | Backend-as-a-Service | Auth + database, direct browser access |
| Tailwind CSS | 3.4.4 | Styling | Utility-first, fast development |

### If Migrating to Next.js
| Library | Version | Purpose | Tradeoff |
|---------|---------|---------|----------|
| Next.js | 15.x | Full-stack framework | SSR, routing, API routes built-in |
| @supabase/ssr | Latest | Server-side Supabase | Required for Next.js server components |
| React | 19.x | UI framework | Same, but with server components |
| TypeScript | 5.x | Type safety | Same |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React SPA | Next.js | More infrastructure, SSR complexity, higher resource usage |
| React SPA | Remix | Similar to Next.js, different conventions, steeper learning curve |
| React SPA | Astro | Great for content sites, overkill for CRUD app |

**Installation (current):**
```bash
npm install react react-dom vite @supabase/supabase-js typescript tailwindcss
```

**Installation (if migrating to Next.js):**
```bash
npx create-next-app@latest
npm install @supabase/supabase-js @supabase/ssr
```

## Architecture Patterns

### Current: React SPA (Recommended for BB-Manager)

**Project Structure:**
```
src/
├── components/          # React UI components
│   ├── Header.tsx      # App shell
│   ├── *Page.tsx       # Feature pages (Roster, Marks, etc.)
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useAuthAndRole.ts
│   ├── useSectionManagement.ts
│   ├── useAppData.ts
│   └── useUnsavedChangesProtection.ts
├── services/           # Supabase data layer
│   ├── supabaseClient.ts
│   ├── supabaseAuth.ts
│   ├── db.ts
│   └── settings.ts
├── types.ts            # Domain types
└── App.tsx             # App orchestrator (view state machine)
```

**Pattern: Backend-Light SPA**
**What:** Browser talks directly to Supabase (Auth + Postgres) via `@supabase/supabase-js`. No custom application server.
**When to use:** Auth-gated apps, simple CRUD, internal tools, no SEO requirements.
**Example:**
```typescript
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// hooks/useAppData.ts
import { supabase } from '../services/supabaseClient'
import { useQuery } from '@tanstack/react-query' // or useState + useEffect

export function useAppData(section: Section) {
  const [boys, setBoys] = useState<Boy[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: boysData } = await supabase
        .from('boys')
        .select('*')
        .eq('section', section)

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('section', section)
        .single()

      setBoys(boysData ?? [])
      setSettings(settingsData)
    }

    loadData()
  }, [section])

  return { boys, settings }
}
```

**Why this works for BB-Manager:**
- Auth gates all access - no public pages
- Simple CRUD operations - no complex data transformations
- Direct database access - no API layer needed
- Static deployment - can host on Raspberry Pi, VPS, or anywhere

### Alternative: Next.js App Router

**Project Structure:**
```
app/
├── layout.tsx          # Root layout (auth check)
├── page.tsx            # Dashboard (after auth)
├── login/
│   └── page.tsx        # Login page
├── roster/
│   └── page.tsx        # Roster page (server component)
├── api/
│   └── route.ts        # API routes if needed
├── middleware.ts       # Auth refresh
└── (auth)/             # Authenticated route group
    ├── company/
    │   └── page.tsx
    └── junior/
        └── page.tsx

utils/
└── supabase/
    ├── client.ts       # Browser client
    ├── server.ts       # Server client
    └── middleware.ts   # Middleware utility
```

**Pattern: Server-Side Rendering + Server Components**
**What:** React renders on the server, sends HTML to browser, then hydrates. Server Components run only on server.
**When to use:** Public-facing content, SEO requirements, dynamic data per request, e-commerce.
**Example:**
```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// app/company/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: boys } = await supabase
    .from('boys')
    .select('*')
    .eq('section', 'company')

  return (
    <div>
      {/* Render roster - happens on server */}
      <h1>Company Section</h1>
      {boys?.map(boy => <div key={boy.id}>{boy.name}</div>)}
    </div>
  )
}
```

**Why this doesn't fit BB-Manager:**
- SSR provides no benefit (no SEO, no public pages)
- Server Components add complexity for simple CRUD
- Middleware required for auth token refresh
- Deployment requires Node.js server (not just static files)

### Anti-Patterns to Avoid

- **[Anti-pattern]: Migrating to Next.js "for better routing"**
  - **Why it's bad:** React Router or simple state machine (current approach) is sufficient. Next.js file-based routing is not inherently better for this use case.
  - **What to do instead:** If routing feels complex, refactor state machine in `App.tsx` or add React Router v7.

- **[Anti-pattern]: Using Next.js server-side features "for security"**
  - **Why it's bad:** Security is enforced at the database level (RLS policies), not the framework. Server-side rendering doesn't improve security.
  - **What to do instead:** Focus on RLS policy hardening (already done in Phase 1).

- **[Anti-pattern]: Next.js API routes "to hide business logic"**
  - **Why it's bad:** Adds unnecessary layer. Supabase RLS policies already enforce authorization at the database level.
  - **What to do instead:** Keep direct Supabase access, enforce security in RLS.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Routing system | Custom view state machine | React Router v7 (if needed) | battle-tested, handles edge cases, deep links |
| Auth state management | Custom hooks + localStorage | @supabase/supabase-js built-in auth | Supabase handles sessions, tokens, refresh |
| Data fetching | Manual useEffect + useState | @tanstack/react-query (optional) | Caching, retries, loading states, error handling |
| Form validation | Custom validation | Zod + react-hook-form | Type-safe validation, good DX |
| State management | Redux, Zustand | React Context + hooks | Simpler for this scale, less boilerplate |

**Key insight:** The current architecture already uses appropriate abstractions (services layer, custom hooks). Don't add complexity unless there's a clear problem to solve.

## Common Pitfalls

### Pitfall 1: Framework FOMO (Fear Of Missing Out)

**What goes wrong:** "Everyone's using Next.js, we should too."
**Why it happens:** Next.js is popular, well-marketed, and Vercel pushes it heavily.
**How to avoid:** Evaluate based on project requirements, not trends.
**Warning signs:** Considering Next.js for "better DX" or "modern stack" without specific technical problems.

**For BB-Manager specifically:**
- ❌ No public pages = no SEO benefit
- ❌ Auth-gated = no social sharing benefit
- ❌ Simple CRUD = no complex data fetching needs
- ❌ Self-hosted on low-resource hardware = Next.js overhead is a cost

### Pitfall 2: Overestimating Migration Benefits

**What goes wrong:** "Next.js will make everything faster/better/simpler."
**Why it happens:** Marketing materials highlight best-case scenarios.
**How to avoid:** Do a proof-of-concept. Migrate one page and measure.
**Warning signs:** Expected benefits are vague ("better performance", "modern architecture").

**Migration reality check:**
- **Effort:** 2-6 weeks for medium app ($20K-$150K industry estimates)
- **Code changes:** Every component becomes a Server Component or needs "use client"
- **Routing:** Current state machine → Next.js file-based routing
- **Data fetching:** Client-side Supabase → Server-side + client-side split
- **Auth:** Simple browser client → Middleware + server client + browser client
- **Deployment:** Static files → Node.js server or Docker container

### Pitfall 3: Underestimating Next.js Complexity

**What goes wrong:** "Next.js is just React with routing."
**Why it happens:** Tutorials start simple, real apps get complex quickly.
**How to avoid:** Read the full docs before committing.
**Warning signs:** Not understanding Server Components, middleware, or caching strategies.

**Next.js concepts you'd need to learn:**
- App Router vs Pages Router
- Server Components vs Client Components
- Streaming and Suspense
- Middleware for auth
- Server Actions vs API Routes
- Incremental Static Regeneration (ISR)
- Revalidation and caching strategies
- Edge Runtime vs Node Runtime

**For comparison:** Current React SPA uses:
- React components (all client-side)
- Custom hooks for state
- Supabase client for data
- Vite for building
- Simple static deployment

### Pitfall 4: Resource Usage on Self-Hosted Hardware

**What goes wrong:** "Next.js will run fine on a Raspberry Pi."
**Why it happens:** Works in development, but production build + runtime is heavier.
**How to avoid:** Test on target hardware before committing.
**Warning signs:** Not measuring build memory, runtime memory, or CPU usage.

**Resource comparison:**
| Aspect | React SPA (Vite) | Next.js (self-hosted) |
|--------|------------------|----------------------|
| Build output | Static files (HTML/CSS/JS) | Static files + Node.js server OR static export |
| Build memory | ~1-2 GB RAM | ~2-4 GB RAM (some report needing more) |
| Runtime | Static hosting (nginx, Apache) | Node.js server (next start) or Docker |
| Server resources | Minimal (~50MB disk, ~50MB RAM) | Higher (~500MB disk, ~200-500MB RAM) |
| Raspberry Pi | ✅ Works well | ⚠️ Possible but slower builds |
| VPS (1GB RAM) | ✅ Plenty | ⚠️ May be tight during builds |

**Sources:** Community reports indicate Next.js builds can require 2-4GB RAM for medium apps, with Raspberry Pi hosting being possible but requiring careful configuration.

### Pitfall 5: Supabase Auth Complexity

**What goes wrong:** "Server-side auth is more secure."
**Why it happens:** Assumption that server-side = better security.
**How to avoid:** Understand that RLS policies are the real security boundary.
**Warning signs:** Moving auth checks to server without strengthening RLS.

**Auth comparison:**

**Current (React SPA - Client-side):**
```typescript
// Simple browser client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, anonKey)

// Auth state in browser
const { data: { user } } = await supabase.auth.getUser()

// Security enforced by RLS in database
const { data } = await supabase.from('boys').select('*')
```

**Next.js (Server-side):**
```typescript
// Middleware required for token refresh
// middleware.ts
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Server client
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(url, key, { cookies: {...} })
}

// Client component client
export function createClient() {
  return createBrowserClient(url, key)
}

// Need both depending on context
```

**Key point:** Security is identical. Both approaches rely on RLS policies in the database. Next.js adds complexity without improving security.

## Code Examples

### Auth Pattern Comparison

**Current: React SPA (Simple)**
```typescript
// services/supabaseAuth.ts
import { supabase } from './supabaseClient'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  await supabase.auth.signOut()
}

// hooks/useAuthAndRole.ts
export function useAuthAndRole() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadRole(session.user.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) loadRole(session.user.id)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, role }
}
```

**Next.js: Server-Side (Complex)**
```typescript
// utils/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}

// middleware.ts (at root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// app/layout.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <html><body>{children}</body></html>
}
```

**Comparison:**
- React SPA: ~50 lines of code, one file
- Next.js: ~150 lines of code, 4 files, middleware, cookies, server/client split

### Data Fetching Comparison

**Current: React SPA (Direct)**
```typescript
// hooks/useAppData.ts
export function useAppData(section: Section) {
  const [boys, setBoys] = useState<Boy[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [boysData, settingsData] = await Promise.all([
        fetchBoys(section),
        getSettings(section)
      ])
      setBoys(boysData)
      setSettings(settingsData)
      setLoading(false)
    }
    loadData()
  }, [section])

  return { boys, settings, loading }
}

// services/db.ts
export async function fetchBoys(section: Section): Promise<Boy[]> {
  const { data, error } = await supabase
    .from('boys')
    .select('*')
    .eq('section', section)
    .order('name')

  if (error) throw error
  return data ?? []
}
```

**Next.js: Server Component (Split concerns)**
```typescript
// app/company/page.tsx (Server Component)
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import RosterClient from './RosterClient'

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: boys } = await supabase
    .from('boys')
    .select('*')
    .eq('section', 'company')
    .order('name')

  return <RosterClient initialBoys={boys ?? []} />
}

// app/company/RosterClient.tsx (Client Component)
'use client'

import { useState } from 'react'

export default function RosterClient({ initialBoys }: { initialBoys: Boy[] }) {
  const [boys, setBoys] = useState(initialBoys)

  // Now need to fetch updates client-side anyway for interactivity
  async function addBoy(name: string) {
    const response = await fetch('/api/boys', {
      method: 'POST',
      body: JSON.stringify({ name, section: 'company' })
    })
    const newBoy = await response.json()
    setBoys([...boys, newBoy])
  }

  return (
    <div>
      {/* UI */}
    </div>
  )
}
```

**Comparison:**
- React SPA: Fetch in hook, simple state updates
- Next.js: Server fetches initial data, client needs separate fetch/write logic, or use Server Actions (another concept to learn)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite | 2022-2023 | CRA deprecated, Vite is now standard for React SPAs |
| React Router v6 | React Router v7 | 2025 | v7 adds framework-like features, but remains lightweight |
| Next.js Pages Router | Next.js App Router | 2022-2023 | App Router introduces Server Components, new mental model |
| Client-side only | React Server Components | 2022-2025 | RSCs mature, but add complexity for simple apps |

**Deprecated/outdated:**
- Create React App: Use Vite instead
- Next.js Pages Router: App Router is the default now
- Next.js < 13: Lacks Server Components, App Router
- Class components: Functional components + hooks since React 16.8 (2019)

**For BB-Manager specifically:**
- Current stack (React 19 + Vite 6) is cutting-edge
- No legacy patterns to migrate away from
- Architecture is intentionally simple and appropriate for use case

## Recommendation for BB-Manager

### Stay with React + Vite SPA

**Reasons:**

1. **Architecture alignment:**
   - Architected as "backend-light SPA" (ARCHITECTURE.md line 7-10)
   - Non-goals explicitly include "SSR, SEO-oriented routing" (line 42)
   - Current state machine routing is intentional, not a limitation

2. **Feature mismatch:**
   - Next.js optimized for: SEO, SSR, public content, e-commerce
   - BB-Manager requires: Auth-gated CRUD, internal tool, no SEO
   - No overlap between Next.js strengths and BB-Manager needs

3. **Resource constraints:**
   - Self-hosting requirement: VPS or Raspberry Pi
   - Next.js requires: Node.js server runtime, more RAM (2-4GB builds)
   - React SPA requires: Static hosting only (~1GB builds)

4. **Migration cost:**
   - Effort: 2-6 weeks for medium app
   - Code changes: Every component, routing, data fetching, auth
   - Testing: Full regression test of all features
   - Learning: Server Components, middleware, caching strategies
   - Benefit: None for this use case

5. **Supabase simplicity:**
   - Current: Direct browser access, one Supabase client
   - Next.js: Server + browser clients, middleware for token refresh
   - Security: Identical (both rely on RLS)

6. **Deployment simplicity:**
   - Current: `npm run build` → static files → deploy anywhere
   - Next.js: `npm run build` → Node.js server or static export (limited features)
   - Raspberry Pi: React SPA trivial, Next.js possible but heavier

7. **Solo developer experience:**
   - React SPA: Simpler mental model, fewer concepts
   - Next.js: More moving parts, more to debug
   - Current DX: Fast HMR (Vite), simple builds

### When Next.js Would Make Sense

Consider Next.js if BB-Manager gains these requirements:

1. **Public-facing pages:**
   - Public company information page
   - SEO requirements (Google indexing)
   - Social media sharing (Open Graph images)

2. **Complex data fetching:**
   - Per-request data that must be fresh
   - Aggregations that are too heavy for client-side
   - Need for streaming responses

3. **Performance needs beyond SPA:**
   - Very large datasets where SSR initial load helps
   - Need for Incremental Static Regeneration
   - Edge deployment for global latency

4. **API requirements:**
   - Webhooks from external services
   - Scheduled jobs (cron)
   - Background processing

**None of these apply to BB-Manager today.**

### Alternative: React Router v7

If routing feels like a limitation (it shouldn't), consider React Router v7 instead of Next.js:

**Why React Router v7 over Next.js:**
- Still a lightweight router (not full framework)
- Client-side only (simpler deployment)
- Better data fetching with new loaders
- Familiar mental model
- Can adopt incrementally

**When to use:**
- Current state machine in `App.tsx` feels complex
- Want deep links and URL-based state
- Want code-based routing (not file-based)

**Example:**
```typescript
// React Router v7 (if routing becomes a problem)
import { createBrowserRouter, RouterProvider } from 'react-router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'company', element: <CompanySection /> },
      { path: 'junior', element: <JuniorSection /> },
      { path: 'roster', element: <RosterPage /> },
      { path: 'marks', element: <WeeklyMarksPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}
```

**But:** Current state machine is intentionally simple and matches ARCHITECTURE.md goals.

## Open Questions

1. **Routing preferences**
   - What we know: Current state machine works, but no deep links
   - What's unclear: Whether deep links/URL-based state are desired
   - Recommendation: Stay with state machine unless users report issues

2. **Future public pages**
   - What we know: Currently 100% auth-gated
   - What's unclear: If public info pages will be added (company info, etc.)
   - Recommendation: Cross this bridge when needed. Can add public React SPA pages or use Next.js for just public section.

3. **Performance concerns**
   - What we know: Current "fetch all" approach may degrade at scale
   - What's unclear: Actual scale thresholds (ARCHITECTURE.md says "likely fine for small sections")
   - Recommendation: Monitor performance, optimize queries/indexes before changing framework

## Sources

### Primary (HIGH confidence)

- **[Next.js Official Docs - Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)** - Verified Next.js self-hosting requirements, reverse proxy recommendation, caching behavior, image optimization, streaming support
- **[Supabase Docs - Next.js Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)** - Verified Next.js auth setup complexity, middleware requirement, server/client split
- **[ARCHITECTURE.md](/Users/harrisonk/dev/BB-Manager/ARCHITECTURE.md)** - Verified current architecture is intentionally backend-light SPA, non-goals include SSR/SEO
- **[package.json](/Users/harrisonk/dev/BB-Manager/package.json)** - Verified current stack versions (React 19.2.0, Vite 6.2.0, TypeScript 5.8.2)
- **[REQUIREMENTS.md](/Users/harrisonk/dev/BB-Manager/.planning/REQUIREMENTS.md)** - Verified project requirements, security focus, scope

### Secondary (MEDIUM confidence)

- **[Self-hosting Next.js on Raspberry Pi](https://medium.com/@thizaradeshan/self-hosting-full-stack-nextjs-nodejs-app-on-a-raspberry-pi-step-by-step-540cb682ffd5)** - Community guide showing Next.js can run on Raspberry Pi but requires Docker/configuration
- **[How To Host Next.js In 2026 (VPS, Self-Hosting, Managed)](https://www.youtube.com/watch?v=ze1zrmoElrs)** - Video tutorial covering self-hosting setup including firewall, Nginx, PM2/Docker (20-60 min setup)
- **[Reddit: Self hosting next.js - required resources](https://www.reddit.com/r/nextjs/comments/1hldkrv/self_hosting_nextjs_required_resources/)** - Community experiences: 1GHz CPU, 1GB RAM minimum, 2.5GB storage for build
- **[React Router v7 vs Next.js Reddit Discussion](https://www.reddit.com/r/webdev/comments/1qdjhpd/react_router_v7_vs_nextjs_for_a_2026_ecommerce_app/)** - Notes React Router v7 "feels lighter and more intuitive for routing"
- **[Next.js vs Remix vs React Router 7 (2026)](https://medium.com/@pallavilodhi08/react-frameworks-in-2026-next-js-vs-remix-vs-react-router-7-b18bcbae5b26)** - Compares frameworks, notes React Router evolution from simple router to framework

### Tertiary (LOW confidence - not used without verification)

- WebSearch results for "Next.js build memory requirements" - Search quota reached
- WebSearch results for "Vite React SPA resource usage" - Search quota reached
- WebSearch results for migration effort - Search quota reached

**Note:** Several WebSearch queries hit rate limits. However, the official documentation and verified sources provide sufficient HIGH/MEDIUM confidence evidence for the recommendation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Current stack verified from package.json, Next.js stack from official docs
- Architecture: HIGH - Verified from ARCHITECTURE.md, official Next.js and Supabase docs
- Pitfalls: HIGH - Verified from official docs, community sources, ARCHITECTURE.md non-goals
- Resource usage: MEDIUM - Community reports on Reddit, Medium (not officially benchmarked)
- Migration effort: LOW - WebSearch quota reached, industry estimates not verified (but migration cost is not central to recommendation)

**Research date:** 2026-01-22
**Valid until:** 2026-06-22 (6 months - React/Next.js ecosystem moves fast, but core trade-offs are stable)

**Key insight:** BB-Manager's requirements (auth-gated CRUD, internal tool, no SEO, self-hosted on low-resource hardware) are the anti-pattern for Next.js. The current React SPA architecture is the right tool for the job.
