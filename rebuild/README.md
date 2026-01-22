# BB-Manager Rebuild Documentation

This directory contains comprehensive documentation for rebuilding the BB-Manager application from scratch as a greenfield, self-hosted project. These documents describe WHAT to build and WHY, enabling an independent rebuild.

## ⚠️ Important: Read This First

**⭐⭐ START HERE:** [SIMPLICITY-ANALYSIS.md](./SIMPLICITY-ANALYSIS.md) - Is this over-engineered? Why PocketBase is recommended over Next.js.

## Quick Start

**⭐ Read:** [SIMPLICITY-ANALYSIS.md](./SIMPLICITY-ANALYSIS.md) - Analysis of simplicity vs complexity

**Recommended Stack:** PocketBase + Simple Frontend (vanilla JS or lightweight framework)

**Why PocketBase?**
- Self-hosted (single Go binary)
- Auth built-in (saves 2-3 weeks)
- Admin UI built-in (saves 2-3 weeks)
- Auto-generated CRUD API
- SQLite embedded (no database management)
- **Timeline: 2-3 weeks vs 6-8 weeks with Next.js**

## Core Documentation

| Document | Description |
|----------|-------------|
| **[SIMPLICITY-ANALYSIS.md](./SIMPLICITY-ANALYSIS.md)** | ⭐⭐ **START HERE** - Why PocketBase instead of Next.js |
| **[PRD.md](./PRD.md)** | Product Requirements Document - user needs, features, and compliance requirements |
| **[technical-spec.md](./technical-spec.md)** | Technical Specification - PocketBase architecture and setup |
| **[POCKETBASE-GUIDE.md](./POCKETBASE-GUIDE.md)** | ⭐ PocketBase setup guide and implementation |
| **[database-schema.md](./database-schema.md)** | Reference schema (for understanding, PocketBase uses different structure) |

## Research & Alternatives (2026-01-22)

**Note:** Research below was conducted before choosing PocketBase. Kept for reference.

| Document | Description |
|----------|-------------|
| **[RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md)** | Original research (Next.js stack) - superseded by SIMPLICITY-ANALYSIS.md |
| **[research/001-framework-alternatives.md](./research/001-framework-alternatives.md)** | Framework comparison (Next.js vs React) |
| **[research/002-backend-architecture.md](./research/002-backend-architecture.md)** | Backend comparison (Supabase vs self-hosted) |
| **[research/003-deployment-strategies.md](./research/003-deployment-strategies.md)** | Deployment research (Docker, Caddy) |
| **[research/004-authentication-patterns.md](./research/004-authentication-patterns.md)** | Auth research (Better Auth, argon2) |

## Purpose

The BB-Manager application is a Boys' Brigade member management system for tracking member attendance, marks, and information. This rebuild documentation provides a complete specification for building a self-hosted application from scratch:

- The product vision and user requirements
- The technical architecture and implementation choices
- The database structure and security model
- Research into alternative approaches

## Key Context

- **Organization**: Boys' Brigade (UK youth organization)
- **Users**: Officers, Captains, and Admins managing member data
- **Data Sensitivity**: Stores personal information about minors (UK GDPR compliance required)
- **Architecture**: PocketBase (self-hosted BaaS) + Simple frontend
- **Security**: PocketBase built-in auth + API rules for authorization
- **Deployment**: Single Go binary (no Docker required)
- **Hosting**: Runs on VPS or Raspberry Pi (UK hosting for GDPR data sovereignty)

## Greenfield Rebuild with PocketBase

This is a **complete rebuild from scratch** with no code migration from the previous implementation.

**Tech Stack:**
- **PocketBase** - Self-hosted backend (auth, database, API, admin UI)
- **SQLite** - Embedded database (no separate database server)
- **Simple Frontend** - Vanilla JS or lightweight framework (Svelte, Alpine.js)
- **Optional:** Custom frontend built later if needed

**Timeline:** 2-3 weeks for complete implementation

**Why PocketBase?**
- **Auth built-in** - No Better Auth implementation needed (saves 2-3 weeks)
- **Admin UI built-in** - Use PocketBase Admin UI initially (saves 2-3 weeks)
- **Auto-generated API** - CRUD API created automatically from schema
- **Single binary** - No Docker, no PostgreSQL, no Caddy complexity
- **Self-contained** - Runs on Raspberry Pi or VPS
- **Proven** - Battle-tested, growing community

**Development Approach:**
1. **Week 1:** Set up PocketBase, define schema, configure auth
2. **Week 2:** Build simple mark entry UI (can use PocketBase admin UI initially)
3. **Week 3:** Polish UI, add reports, testing

See [POCKETBASE-GUIDE.md](./POCKETBASE-GUIDE.md) for implementation guide.
