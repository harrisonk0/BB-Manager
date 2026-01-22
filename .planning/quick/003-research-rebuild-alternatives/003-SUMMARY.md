# Quick Task 003 Summary: Research Rebuild Alternatives

**Task:** Research and document alternatives for rebuild
**Completed:** 2026-01-22
**Commit:** 811ee60

## Objective

Research and document alternative approaches for rebuilding BB-Manager, including:
- Framework alternatives (React vs Next.js)
- Backend architecture (Supabase vs self-hosted Postgres)
- Deployment strategies (VPS/Raspberry Pi)
- Authentication patterns (self-hosted auth)

## Research Approach

Four parallel researcher agents were spawned to investigate different aspects:
1. **gsd-phase-researcher** (framework) - React vs Next.js analysis
2. **gsd-phase-researcher** (backend) - Supabase vs self-hosted Postgres
3. **gsd-phase-researcher** (deployment) - Docker, Caddy, monitoring options
4. **gsd-phase-researcher** (auth) - Better Auth, argon2, RLS patterns

## Key Findings

### Framework: Stay with React + Vite ✅

- **Next.js is wrong tool for BB-Manager** - Designed for SEO/SSR, not auth-gated CRUD apps
- **Migration cost:** 2-6 weeks with zero functional benefit
- **Current stack is modern** - React 19.2.0 + Vite 6.2.0 is cutting-edge
- **Self-hosting constraint** - React SPA = static files; Next.js = server process

### Backend: Stay with Supabase for v1 ✅

- **Self-hosting requires 4-8 weeks** for auth implementation (Lucia deprecated Mar 2025)
- **Security complexity** - Application-level checks only; one bug = data leak
- **Supabase provides RLS** - Database-level enforcement as defense-in-depth
- **Cost savings minimal** - Supabase Free → Pro (£25/mo) vs development time

### Deployment: Add Docker Option for v1.1 ⚠️

- **Caddy recommended** - Zero-config automatic HTTPS (better than Nginx + certbot)
- **Docker Compose** - Complete orchestration with health checks
- **kartoza/pg-backup** - Automated PostgreSQL backups
- **GitHub Actions SSH** - Simple CI/CD deployment pipeline
- **Hardware:** 1-2GB RAM VPS or Raspberry Pi 4/5 (8GB recommended)

### Authentication: Keep Supabase Auth ✅

- **Lucia Auth deprecated** (Mar 2025) - "Lucia, in the current state, is not working"
- **Better Auth** - Replacement for Lucia/Auth.js, but newer ecosystem
- **Supabase Auth advantages** - Battle-tested, RLS integration, feature-complete, zero maintenance
- **Security burden** - Self-hosted auth requires 4-6 weeks + ongoing security updates

## Deliverables

### Research Documents (113KB total)

| File | Size | Topic |
|------|------|-------|
| `rebuild/research/001-framework-alternatives.md` | 29KB | React vs Next.js analysis |
| `rebuild/research/002-backend-architecture.md` | 27KB | Supabase vs self-hosted |
| `rebuild/research/003-deployment-strategies.md` | 29KB | Docker, Caddy, monitoring |
| `rebuild/research/004-authentication-patterns.md` | 28KB | Better Auth, argon2, RLS |

### Synthesis Document

| File | Size | Purpose |
|------|------|---------|
| `rebuild/RESEARCH-SYNTHESIS.md` | 22KB | Executive summary with recommendations |

### Documentation Updates

- **rebuild/README.md** - Added research section with links to all documents
- **rebuild/technical-spec.md** - Added "Research Findings" section with recommendations

## Recommendations Summary

**Primary Recommendation:** Keep current tech stack for v1 rebuild

| Area | Decision | Rationale |
|------|----------|-----------|
| **Framework** | Keep React + Vite | Next.js adds complexity for auth-gated CRUD |
| **Backend** | Keep Supabase | Self-hosting requires 4-8 weeks auth impl |
| **Deployment** | Keep Vercel, add Docker for v1.1 | Current works perfectly; Docker as optional add-on |
| **Auth** | Keep Supabase Auth | Lucia deprecated; Better Auth unproven |

## Implementation Strategy

### Phase 1: v1 Rebuild (Current Stack)
- React 19 + Vite 6 + TypeScript
- Supabase (Postgres + Auth + RLS)
- Vercel deployment
- **Timeline:** 4-6 weeks

### Phase 1.1: Docker Option (Add-on)
- Docker Compose + Caddy
- Supabase (still cloud-hosted)
- GitHub Actions deployment
- **Timeline:** 1-2 weeks

### Phase 2: Full Self-Host (Future, If Needed)
- Docker Compose + Caddy
- PostgreSQL + Better Auth
- Only if clear requirement emerges
- **Timeline:** 6-8 weeks (from v1.1)

## Commits

- `4500fb6` - docs(rebuild): add framework alternatives research
- `2736525` - docs(rebuild): add deployment strategies research
- `49ffb78` - docs(rebuild): add authentication patterns research
- `811ee60` - docs(rebuild): add research synthesis and update documentation

## Metrics

- **Research agents spawned:** 4
- **Research documents created:** 4 (113KB)
- **Synthesis document:** 1 (22KB)
- **Documentation updated:** 2 files
- **Total commits:** 4
- **Duration:** ~15 minutes (parallel research)

## Conclusion

The research confirms that the current tech stack (React + Vite + Supabase) is **optimal for v1**. Proposed changes (Next.js, self-hosted auth, full self-hosting) introduce complexity, security risk, and development effort with minimal benefit for the current use case.

**Key Principle:** Start simple, add complexity only when clear requirement emerges.

## Next Steps

With comprehensive research complete, the rebuild documentation now provides:
1. Clear recommendation to keep current stack
2. Detailed analysis of alternatives for future reference
3. Implementation strategy for Docker option (v1.1)
4. Migration path if full self-hosting becomes required

The rebuild can now proceed with confidence in the technical decisions.
