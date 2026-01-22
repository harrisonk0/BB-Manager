# Rebuild Research Synthesis

**Date:** 2026-01-22
**Status:** Research Complete, Recommendations Ready

## Executive Summary

Four research areas were investigated to improve the BB-Manager rebuild:
1. Framework alternatives (React vs Next.js)
2. Backend architecture (Supabase vs self-hosted)
3. Deployment strategies (VPS/Raspberry Pi)
4. Authentication patterns (self-hosted auth)

**Key Finding:** The current tech stack (React + Vite + Supabase) is **optimal for v1** and should be retained. Proposed changes introduce complexity, security risk, and development effort with minimal benefit.

---

## Recommendations Summary

| Area | Recommendation | Confidence | Rationale |
|------|---------------|------------|-----------|
| **Framework** | ✅ Keep React + Vite | HIGH | Next.js designed for SEO/SSR (not needed); migration cost 2-6 weeks |
| **Backend** | ✅ Keep Supabase | MEDIUM | Self-hosting requires 4-8 weeks auth implementation + security complexity |
| **Deployment** | ⚠️ Add Docker option | MEDIUM | Keep current Vercel, add optional self-hosted Docker setup for v1.1 |
| **Auth** | ✅ Keep Supabase Auth | HIGH | Lucia deprecated (Mar 2025); Better Auth unproven; RLS provides defense-in-depth |

---

## Detailed Findings

### 1. Framework: Stay with React + Vite ✅

**Recommendation:** Do NOT switch to Next.js

**Why:**
- **BB-Manager is an auth-gated CRUD app** - No SEO needs, no public pages, no content marketing
- **Next.js adds complexity** - Requires Node.js server, more RAM, SSR caching, App Router learning curve
- **Migration cost:** 2-6 weeks with zero functional benefit
- **Current stack is modern** - React 19.2.0 + Vite 6.2.0 is cutting-edge
- **Self-hosting constraint** - React SPA = static files; Next.js = server process

**Next.js is optimal for:**
- E-commerce sites (SEO, social sharing)
- Marketing pages (SSR for SEO, dynamic OG images)
- Content-heavy sites (blogging, documentation)

**BB-Manager has none of these requirements.**

**Verdict:** Stay with React + Vite. Current architecture is appropriate.

> **Research:** [001-framework-alternatives.md](./research/001-framework-alternatives.md)

---

### 2. Backend: Stay with Supabase for v1 ✅

**Recommendation:** Keep Supabase, defer self-hosting decision until after v1

**Why Supabase for v1:**
- **Security:** Row-Level Security (RLS) provides database-level enforcement
- **Auth:** Complete authentication system (no implementation needed)
- **Features:** Realtime, storage, edge functions available when needed
- **Speed:** 4-6 weeks to launch vs 8-14 weeks for self-hosted
- **Reliability:** Managed backups, high availability, security patches

**Self-hosting tradeoffs:**
- **Auth complexity:** Must implement auth from scratch (Lucia deprecated, Better Auth unproven)
- **Security burden:** Application-level checks only; one bug = data leak
- **Operations burden:** Database backups, security patches, monitoring, SSL certificates
- **Raspberry Pi issues:** ARM64 compatibility uncertain, requires 8GB RAM recommended
- **Cost savings minimal:** Supabase Free Tier → Pro Plan (£25/mo) vs development time

**UK GDPR Note:** Hosting location (UK vs EU) doesn't automatically ensure compliance. The Children's Code requirements (data minimization, parental consent, access controls, audit logging) apply regardless of hosting.

**Verdict:** Use Supabase for v1. Re-evaluate self-hosting after v1 based on actual hosting costs, privacy requirements, and team capacity.

> **Research:** [002-backend-architecture.md](./research/002-backend-architecture.md)

---

### 3. Deployment: Add Docker Option for v1.1 ⚠️

**Current:** Vercel (works perfectly)

**Proposed Addition:** Optional self-hosted Docker setup for organizations requiring on-premise deployment

**Recommended Stack:**
- **Caddy** - Zero-config automatic HTTPS (better than Nginx + certbot)
- **Docker Compose** - Complete orchestration with health checks
- **kartoza/pg-backup** - Automated PostgreSQL backups with cron scheduling
- **GitHub Actions SSH** - Simple CI/CD deployment pipeline
- **Uptime Kuma** - Self-hosted monitoring (optional)

**Hardware Requirements:**
- **VPS:** 1-2GB RAM, 1 CPU core, 20GB storage (£5-10/mo)
- **Raspberry Pi:** 4GB RAM minimum (8GB recommended), swap space required

**Deployment Scenarios:**
| Scenario | Stack | When to Use |
|----------|-------|-------------|
| **Default** | Vercel + Supabase | Most users, fastest setup |
| **Self-hosted** | Docker + Caddy + Supabase | Data sovereignty requirements |
| **Full self-hosted** | Docker + Caddy + Postgres + Better Auth | On-premise, air-gapped networks |

**Verdict:** Keep Vercel as default, provide Docker Compose setup as optional alternative for v1.1.

> **Research:** [003-deployment-strategies.md](./research/003-deployment-strategies.md)

---

### 4. Authentication: Keep Supabase Auth ✅

**Critical Finding:** Lucia Auth was **deprecated March 2025** (library author announcement: "Lucia, in the current state, is not working").

**Recommended Replacement (if self-hosting):**
- **Better Auth** - Framework-agnostic, absorbed Auth.js (NextAuth v5) to prevent deprecation
- **argon2id** - OWASP/NIST recommended password hashing
- **HTTP-only cookies** - XSS protection prioritized over CSRF (mitigated via SameSite)
- **Session-based auth** - Preferred over JWT for web apps (provides revocation)
- **PostgreSQL RLS** - Database-level authorization (defense-in-depth)

**Supabase Auth advantages:**
- **Battle-tested** - Thousands of production deployments
- **RLS integration** - Policies enforced at database level
- **Feature complete** - Password reset, email verification, OAuth, MFA
- **Zero maintenance** - Security patches, uptime, DDoS protection managed

**Self-hosted auth risks:**
- **Security bugs** - Any missed authorization check = data leak
- **Development time** - 4-6 weeks minimum
- **Ongoing maintenance** - Security updates, vulnerability monitoring
- **Email delivery** - Must integrate SMTP provider (Postfix, Mailgun, SendGrid)

**Verdict:** Use Supabase Auth for v1. Only consider Better Auth migration if full self-hosting is required.

> **Research:** [004-authentication-patterns.md](./research/004-authentication-patterns.md)

---

## Decision Matrix

### Keep Current Stack (Recommended)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Time to Launch | ⭐⭐⭐⭐⭐ | 4-6 weeks (focus on features) |
| Security | ⭐⭐⭐⭐⭐ | RLS + managed security patches |
| Development Cost | ⭐⭐⭐⭐⭐ | Low (auth, DB, hosting handled) |
| Maintenance | ⭐⭐⭐⭐⭐ | Managed backups, updates, monitoring |
| GDPR Compliance | ⭐⭐⭐⭐ | Same effort regardless of hosting |
| Data Sovereignty | ⭐⭐⭐ | EU hosting available, not UK |
| Monthly Cost | ⭐⭐⭐ | Free tier → £25/mo (Pro) |

### Full Self-Host (Not Recommended for v1)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Time to Launch | ⭐ | 8-14 weeks (auth implementation) |
| Security | ⭐⭐ | App-level checks only, higher risk |
| Development Cost | ⭐ | High (auth, backups, monitoring) |
| Maintenance | ⭐⭐ | Manual backups, patches, monitoring |
| GDPR Compliance | ⭐⭐⭐⭐ | Same effort regardless of hosting |
| Data Sovereignty | ⭐⭐⭐⭐⭐ | Full control, UK hosting possible |
| Monthly Cost | ⭐⭐⭐⭐ | VPS cost only (£5-10/mo) |

---

## Implementation Strategy

### Phase 1: v1 Rebuild (Current Stack)

**Goal:** Rebuild BB-Manager with current architecture, focus on code quality and features

**Tech Stack:**
- React 19 + Vite 6 + TypeScript
- Supabase (Postgres + Auth + RLS)
- React Router v7
- Vercel deployment

**Timeline:** 4-6 weeks

**Deliverables:**
- Clean, tested, documented codebase
- Complete feature parity with current version
- Comprehensive rebuild documentation

### Phase 1.1: Docker Option (Add-on)

**Goal:** Provide self-hosted deployment option for organizations requiring on-premise

**Tech Stack:**
- Docker Compose + Caddy
- Supabase (still cloud-hosted)
- GitHub Actions deployment
- Optional monitoring

**Timeline:** 1-2 weeks

**Deliverables:**
- `docker-compose.yml` with health checks
- Caddyfile with automatic HTTPS
- Deployment runbook
- Backup/restore procedures

### Phase 2: Full Self-Host (Future, If Needed)

**Goal:** Complete self-hosted stack for air-gapped or strict data sovereignty requirements

**Tech Stack:**
- Docker Compose + Caddy
- PostgreSQL + Better Auth
- Application-level authorization
- Self-hosted monitoring

**Timeline:** 6-8 weeks (start from v1.1)

**Deliverables:**
- Migration scripts from Supabase
- Complete auth implementation
- Security audit
- Operations runbook

**Gate Criteria:**
- Clear requirement for air-gapped deployment
- Monthly hosting costs justify development effort
- Team capacity for ongoing maintenance

---

## Open Questions

1. **UK GDPR Data Residency** - Does Supabase EU hosting vs self-hosted UK hosting materially impact compliance? **Recommendation:** Consult legal counsel; hosting location is one factor among many.

2. **Raspberry Pi Feasibility** - Can full stack run reliably on Raspberry Pi 4/5? **Recommendation:** Prototype on target hardware before committing to self-hosted route.

3. **Better Auth Viability** - Is Better Auth production-ready for the long term? **Recommendation:** Monitor project status quarterly; stable for now but newer ecosystem.

---

## Conclusion

**The current tech stack is optimal for BB-Manager v1.**

Proposed changes (Next.js, self-hosted auth, full self-hosting) introduce complexity, security risk, and development effort with minimal benefit for the current use case.

**Recommended Path:**
1. ✅ **v1:** Rebuild with React + Vite + Supabase (4-6 weeks)
2. ⚠️ **v1.1:** Add Docker deployment option (1-2 weeks)
3. ❓ **v2:** Evaluate full self-hosting based on actual requirements

**Key Principle:** Start simple, add complexity only when clear requirement emerges.

---

## Research Files

- [001-framework-alternatives.md](./research/001-framework-alternatives.md) - React vs Next.js analysis
- [002-backend-architecture.md](./research/002-backend-architecture.md) - Supabase vs self-hosted Postgres
- [003-deployment-strategies.md](./research/003-deployment-strategies.md) - Docker, Caddy, monitoring
- [004-authentication-patterns.md](./research/004-authentication-patterns.md) - Better Auth, argon2, RLS

**Total Research:** 113KB of documentation covering framework selection, backend architecture, deployment strategies, and authentication patterns.
