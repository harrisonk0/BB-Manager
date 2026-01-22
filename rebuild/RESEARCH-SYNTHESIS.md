# Rebuild Research Synthesis

**Date:** 2026-01-22 (Updated 2026-01-22 for greenfield self-hosted rebuild)
**Status:** Research Complete, Recommendations Updated

## Executive Summary

Four research areas were investigated to improve the BB-Manager rebuild:
1. Framework alternatives (React vs Next.js)
2. Backend architecture (Supabase vs self-hosted)
3. Deployment strategies (VPS/Raspberry Pi)
4. Authentication patterns (self-hosted auth)

**Project Context:**
- **Greenfield rebuild** - No source code carried over from v1
- **Full self-hosting required** - Must run on local infrastructure (VPS/Raspberry Pi)
- **UK GDPR compliance** - Data sovereignty and children's data protection

**Key Finding:** For a **greenfield, self-hosted** rebuild, the recommended stack is **Next.js + PostgreSQL + Better Auth** with Docker + Caddy deployment.

---

## Recommendations Summary

| Area | Recommendation | Confidence | Rationale |
|------|---------------|------------|-----------|
| **Framework** | ✅ Next.js (App Router) | HIGH | API routes provide security boundary; Better Auth first-class support; simpler for self-hosting |
| **Backend** | ✅ Self-hosted PostgreSQL | HIGH | Full data sovereignty; runs on Raspberry Pi/VPS; Drizzle ORM for type safety |
| **Deployment** | ✅ Docker + Caddy | HIGH | Zero-config HTTPS; simple deployment; hardware-agnostic |
| **Auth** | ✅ Better Auth + PostgreSQL | HIGH | Excellent Next.js integration; replaces deprecated Lucia; RLS for defense-in-depth |

---

## Detailed Findings

### 1. Framework: Next.js (App Router) ✅

**Recommendation:** Use Next.js with App Router

**Why Next.js is Simpler for Self-Hosting:**

**Security Architecture:**
- **API routes provide security boundary** - Database never exposed to client
- React + Vite requires direct DB access from browser (less secure)
- Server-side auth with Better Auth is more robust

**Single Codebase:**
- Frontend and API routes in one repository
- No need to deploy separate backend service
- Simpler Docker setup (one container vs two)

**Better Auth Integration:**
- **Excellent Next.js support** (primary use case for Better Auth)
- Middleware for route protection
- Server actions for type-safe mutations
- Well-documented patterns

**Self-Hosting is Mature:**
- Next.js standalone mode produces optimized builds
- Docker Compose setups well-documented
- Resource usage is reasonable for simple apps
- Caddy reverse proxy handles HTTPS seamlessly

**Why NOT React + Vite:**
- Direct database access from browser is less secure
- Need separate backend service for security
- Better Auth React integration is less mature
- More complex deployment (two services)

**App Router Benefits:**
- Modern, React-based architecture
- Server components reduce client JavaScript
- Built-in data fetching
- Simpler than old Pages router

**Verdict:** Next.js with App Router provides simpler, more secure architecture for self-hosted rebuild. API routes eliminate need to expose database directly to client.

> **Research:** [001-framework-alternatives.md](./research/001-framework-alternatives.md)

---

### 2. Backend: Self-Hosted PostgreSQL ✅

**Recommendation:** Use self-hosted PostgreSQL with Drizzle ORM

**Why PostgreSQL:**
- **Data sovereignty:** Full control over data location (UK hosting for GDPR)
- **Mature & stable:** Battle-tested, excellent documentation
- **Runs anywhere:** VPS, Raspberry Pi, ARM64, x86_64
- **Feature-rich:** JSON support, full-text search, excellent constraints
- **Free & open-source:** No licensing costs, no vendor lock-in

**ORM Choice: Drizzle**
- **Type-safe:** Excellent TypeScript integration
- **Lightweight:** Minimal runtime overhead (unlike Prisma)
- **SQL-like:** You write real SQL, not a custom query language
- **Performant:** No query engine overhead, direct PostgreSQL queries
- **Self-hosted friendly:** No separate schema engine needed

**Self-Hosting Considerations:**
- **RLS required:** Must implement Row-Level Security policies for defense-in-depth
- **Backup strategy:** Automated backups with `kartoza/pg-backup` or pg_dump cron
- **Monitoring:** Basic health checks (connection pooling, query performance)
- **Hardware:** PostgreSQL runs well on Raspberry Pi 4 (4GB+ RAM recommended)

**UK GDPR Advantage:**
- Full data sovereignty - data never leaves your infrastructure
- UK hosting ensures compliance with data residency requirements
- Complete control over data retention and deletion

**Verdict:** Self-hosted PostgreSQL with Drizzle ORM provides optimal balance of control, performance, and compliance for self-hosted deployment.

> **Research:** [002-backend-architecture.md](./research/002-backend-architecture.md)

---

### 3. Deployment: Docker + Caddy ✅

**Recommendation:** Docker Compose + Caddy for all deployments

**Why Docker + Caddy:**
- **Hardware agnostic:** Works identically on VPS, Raspberry Pi, ARM64, x86_64
- **Zero-config HTTPS:** Caddy automatically obtains and renews Let's Encrypt certificates
- **Simple deployment:** Single `docker-compose up` command
- **Health checks:** Built-in container health monitoring and auto-restart
- **Backup automation:** `kartoza/pg-backup` handles scheduled PostgreSQL backups

**Deployment Stack:**
- **Caddy** - Reverse proxy with automatic HTTPS (better than Nginx + certbot)
- **Docker Compose** - Complete orchestration with health checks
- **kartoza/pg-backup** - Automated PostgreSQL backups with retention policies
- **GitHub Actions SSH** - CI/CD pipeline for deployments
- **Uptime Kuma** - Self-hosted monitoring (optional)

**Hardware Requirements:**
- **VPS:** 1-2GB RAM, 1 CPU core, 20GB storage (£5-10/mo)
- **Raspberry Pi:** 4GB RAM minimum (8GB recommended), swap space required

**Deployment Scenarios:**
| Scenario | Stack | When to Use |
|----------|-------|-------------|
| **Self-hosted VPS** | Docker + Caddy + Postgres + Better Auth | Most deployments, UK hosting |
| **Raspberry Pi** | Docker + Caddy + Postgres + Better Auth | On-premise, low power |
| **Air-gapped** | Docker + Caddy + Postgres + Better Auth | Offline networks |

**Verdict:** Docker + Caddy is the recommended deployment strategy for all scenarios. Simple, secure, and hardware-agnostic.

> **Research:** [003-deployment-strategies.md](./research/003-deployment-strategies.md)

---

### 4. Authentication: Better Auth ✅

**Critical Finding:** Lucia Auth was **deprecated March 2025** (library author announcement: "Lucia, in the current state, is not working").

**Recommended Solution:**
- **Better Auth** - Framework-agnostic, absorbed Auth.js (NextAuth v5) to prevent deprecation
- **argon2id** - OWASP/NIST recommended password hashing
- **HTTP-only cookies** - XSS protection prioritized over CSRF (mitigated via SameSite)
- **Session-based auth** - Preferred over JWT for web apps (provides revocation)
- **PostgreSQL RLS** - Database-level authorization (defense-in-depth)

**Better Auth advantages:**
- **Framework-agnostic:** Works with React, Next.js, vanilla JS
- **Type-safe:** Excellent TypeScript integration
- **Feature complete:** Password reset, email verification, 2FA, OAuth
- **Self-hosted:** Full control over user data
- **Active development:** Replacing Auth.js/NextAuth and Lucia

**Self-Hosting Considerations:**
- **Development time:** 2-3 weeks for full implementation
- **Email delivery:** Must integrate SMTP provider (Postfix, Mailgun, SendGrid, or local)
- **RLS policies:** Must implement PostgreSQL Row-Level Security for defense-in-depth
- **Security:** Application-level checks + database-level policies (defense-in-depth)

**Security Checklist:**
- [ ] argon2id password hashing (minimum 19 MB memory cost)
- [ ] HTTP-only, Secure, SameSite cookies
- [ ] CSRF protection (SameSite cookie attribute)
- [ ] Rate limiting on login endpoints
- [ ] Password requirements (min 8 chars, complexity)
- [ ] Session management (revocation, expiration)
- [ ] PostgreSQL RLS policies on all tables
- [ ] Audit logging for sensitive operations

**Verdict:** Better Auth provides modern, secure, self-hosted authentication with excellent TypeScript support. Requires 2-3 weeks implementation but provides full data sovereignty.

> **Research:** [004-authentication-patterns.md](./research/004-authentication-patterns.md)

---

## Decision Matrix

### Self-Hosted Stack (Recommended)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Time to Launch | ⭐⭐⭐⭐ | 6-8 weeks (auth + deployment setup) |
| Security | ⭐⭐⭐⭐⭐ | RLS + argon2id + defense-in-depth |
| Development Cost | ⭐⭐⭐ | Medium (auth implementation required) |
| Maintenance | ⭐⭐⭐⭐ | Docker + automated backups |
| GDPR Compliance | ⭐⭐⭐⭐⭐ | Full data sovereignty, UK hosting |
| Data Sovereignty | ⭐⭐⭐⭐⭐ | Complete control, UK hosting possible |
| Monthly Cost | ⭐⭐⭐⭐⭐ | VPS cost only (£5-10/mo) or free on own hardware |

### Supabase Stack (Not Self-Hosted)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Time to Launch | ⭐⭐⭐⭐⭐ | 4-6 weeks (auth handled) |
| Security | ⭐⭐⭐⭐⭐ | RLS + managed security patches |
| Development Cost | ⭐⭐⭐⭐⭐ | Low (auth, DB, hosting handled) |
| Maintenance | ⭐⭐⭐⭐⭐ | Managed backups, updates, monitoring |
| GDPR Compliance | ⭐⭐⭐⭐ | Same effort regardless of hosting |
| Data Sovereignty | ⭐⭐ | EU hosting available, not UK |
| Monthly Cost | ⭐⭐⭐ | Free tier → £25/mo (Pro) |

---

## Implementation Strategy

### Phase 1: v1 Greenfield Rebuild (Self-Hosted)

**Goal:** Build BB-Manager from scratch with self-hosted architecture

**Tech Stack:**
- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Drizzle ORM
- Better Auth (authentication)
- Docker Compose + Caddy (deployment)

**Timeline:** 6-8 weeks

**Deliverables:**
- Complete Better Auth implementation with argon2id
- PostgreSQL schema with RLS policies
- API routes for all data operations
- Docker Compose configuration
- Caddy reverse proxy with automatic HTTPS
- Automated backup strategy
- Clean, tested, documented codebase

**Week Breakdown:**
- Week 1-2: Better Auth + PostgreSQL schema + RLS policies
- Week 3-4: API routes + core data models (users, boys, marks, attendance)
- Week 5-6: UI components and business logic (App Router)
- Week 7: Docker + Caddy deployment setup
- Week 8: Testing, documentation, backup verification

### Phase 1.1: Production Hardening (Optional)

**Goal:** Add monitoring, observability, and operational readiness

**Additions:**
- Uptime Kuma monitoring
- Log aggregation (Loki or similar)
- Backup verification tests
- Security audit
- Performance optimization

**Timeline:** 1-2 weeks

### Phase 2: Advanced Features (Future)

**Goal:** Add features that were out of scope for v1

**Potential Features:**
- Analytics and reporting dashboards
- Advanced admin features
- Data export functionality
- API for external integrations
- Realtime updates (WebSocket)

**Timeline:** TBD based on requirements

---

## Open Questions

1. **Raspberry Pi Feasibility** - Can PostgreSQL + app run reliably on Raspberry Pi 4? **Recommendation:** Prototype on target hardware (4GB+ RAM) before production deployment.

2. **Better Auth Long-term Viability** - Is Better Auth production-ready for the long term? **Recommendation:** Monitor project status quarterly; currently stable but newer ecosystem (2025).

3. **SMTP for Email** - Use transactional email service (Mailgun, SendGrid) or self-host Postfix? **Recommendation:** Start with transactional service for reliability, evaluate self-hosted Postfix later.

4. **Connection Pooling** - Does Better Auth handle PostgreSQL connection pooling automatically? **Recommendation:** Verify during implementation; add PgBouncer if needed.

---

## Conclusion

**For a greenfield, self-hosted rebuild, the recommended stack is Next.js + PostgreSQL + Better Auth with Docker + Caddy deployment.**

This approach provides:
- ✅ Full data sovereignty (UK hosting for GDPR)
- ✅ No vendor lock-in (all open-source)
- ✅ Low monthly costs (VPS or free on own hardware)
- ✅ Modern, secure authentication (Better Auth + argon2id)
- ✅ API routes provide security boundary (no direct DB exposure)
- ✅ Simple deployment (Docker Compose with one container)
- ✅ Automatic HTTPS (Caddy)
- ✅ Better Auth has excellent Next.js integration

**Tradeoffs:**
- ⚠️ Longer initial development (6-8 weeks vs 4-6 weeks with Supabase)
- ⚠️ Must implement auth from scratch (Better Auth)
- ⚠️ Responsible for backups, security updates, monitoring

**Why Next.js is Simpler:**
- **Single codebase** - Frontend and API routes together
- **Security boundary** - API routes protect database from direct client access
- **Better Auth support** - Excellent Next.js integration (primary use case)
- **One container** - Simpler Docker deployment than React + separate backend

**Recommended Path:**
1. ✅ **v1:** Greenfield rebuild with Next.js + self-hosted stack (6-8 weeks)
2. ⚠️ **v1.1:** Production hardening with monitoring (1-2 weeks)
3. ❓ **v2:** Advanced features based on user feedback

**Key Principle:** Start simple, add complexity only when clear requirement emerges.

---

## Research Files

- [001-framework-alternatives.md](./research/001-framework-alternatives.md) - React vs Next.js analysis
- [002-backend-architecture.md](./research/002-backend-architecture.md) - Supabase vs self-hosted Postgres
- [003-deployment-strategies.md](./research/003-deployment-strategies.md) - Docker, Caddy, monitoring
- [004-authentication-patterns.md](./research/004-authentication-patterns.md) - Better Auth, argon2, RLS

**Total Research:** 113KB of documentation covering framework selection, backend architecture, deployment strategies, and authentication patterns.
