# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Database:**
- Supabase - PostgreSQL as a Service
  - SDK: @supabase/supabase-js 2.48.0
  - Auth: Email/password authentication via Supabase Auth
  - Client-side configuration through VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

**Authentication:**
- Supabase Auth - Built-in authentication system
  - Services: Sign up, sign in, password reset, session management
  - Implementation: Client-side in services/supabaseAuth.ts
  - State management: React hooks in useAuthAndRole.ts

## Data Storage

**Databases:**
- Supabase - PostgreSQL database
  - Connection: Via Supabase client, client-side connections
  - Client: Direct @supabase/supabase-js client

**File Storage:**
- Local filesystem only - No cloud file storage detected

**Caching:**
- Not detected - No caching mechanism implemented

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Managed through @supabase/supabase-js
  - Implementation: Password-based authentication, session management
  - State: Client-side React hooks for auth state

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service integrated

**Logs:**
- Console logging - Basic console.log statements used
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Docker containerization - Multi-stage build with Node.js 20
- Static file serving - Build artifacts served via Express or serve package

**CI Pipeline:**
- Not detected - No CI/CD configuration files found

## Environment Configuration

**Required env vars:**
- VITE_SUPABASE_URL - Supabase project URL
- VITE_SUPABASE_ANON_KEY - Supabase anonymous key
- PORT - Server port (default 3000/8080)
- PROBE_OFFICER_EMAIL, PROBE_CAPTAIN_EMAIL - Diagnostic accounts
- PROBE_OFFICER_PASSWORD, PROBE_CAPTAIN_PASSWORD - Diagnostic passwords
- PROBE_EXPIRED_OR_REVOKED_INVITE_CODE - Test invitation code

**Secrets location:**
- Environment variables loaded at build time (Vite) or runtime (Express)

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints configured

**Outgoing:**
- Not detected - No outgoing webhooks implemented

---

*Integration audit: 2026-01-21*
