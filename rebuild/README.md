# BB-Manager Rebuild Documentation

This directory contains comprehensive documentation for rebuilding the BB-Manager application from scratch as a greenfield, self-hosted project. These documents describe WHAT to build and WHY, enabling an independent rebuild.

## Quick Start

**⭐ Start with:** [RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md) - Research summary with recommended tech stack and implementation strategy

**Recommended Stack:** Next.js + PostgreSQL + Better Auth + Docker + Caddy

## Core Documentation

| Document | Description |
|----------|-------------|
| **[PRD.md](./PRD.md)** | Product Requirements Document - user needs, features, and compliance requirements |
| **[technical-spec.md](./technical-spec.md)** | Technical Specification - architecture, tech stack, and key decisions |
| **[database-schema.md](./database-schema.md)** | Database Schema - reference schema from previous implementation |
| **[DATABASE-REDESIGN.md](./DATABASE-REDESIGN.md)** | ⭐ **Database improvements** - recommended changes for greenfield rebuild |

## Research & Alternatives (2026-01-22)

| Document | Description |
|----------|-------------|
| **[RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md)** | ⭐ **Start here** - Research summary with recommendations for self-hosted rebuild |
| **[research/001-framework-alternatives.md](./research/001-framework-alternatives.md)** | Framework analysis (recommendation: Next.js for API routes security) |
| **[research/002-backend-architecture.md](./research/002-backend-architecture.md)** | Self-hosted PostgreSQL analysis (recommendation: PostgreSQL + Drizzle) |
| **[research/003-deployment-strategies.md](./research/003-deployment-strategies.md)** | Docker, Caddy, monitoring for self-hosted deployments |
| **[research/004-authentication-patterns.md](./research/004-authentication-patterns.md)** | Self-hosted auth patterns (Better Auth, argon2, RLS) |

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
- **Architecture**: Backend-light React SPA with direct PostgreSQL access (via Drizzle ORM)
- **Security**: Row-Level Security (RLS) policies enforce role-based access at database level
- **Deployment**: Self-hosted using Docker Compose + Caddy
- **Hosting**: Runs on VPS or Raspberry Pi (UK hosting for GDPR data sovereignty)

## Greenfield Rebuild

This documentation is for a **complete rebuild from scratch** with no code migration from the previous implementation. The rebuild will use:

- **Next.js (App Router)** for the framework (API routes provide security boundary)
- **PostgreSQL** for the database (self-hosted, UK GDPR compliant)
- **Better Auth** for authentication (self-hosted, excellent Next.js integration)
- **Drizzle ORM** for type-safe database access
- **Docker + Caddy** for deployment (zero-config HTTPS, simple setup)

**Timeline:** 6-8 weeks for complete self-hosted implementation

**Why Next.js?**
- **API routes protect database** - No direct DB exposure to client
- **Single codebase** - Frontend and backend in one place
- **Better Auth support** - Excellent Next.js integration
- **Simpler deployment** - One container vs React + separate backend

See [RESEARCH-SYNTHESIS.md](./RESEARCH-SYNTHESIS.md) for complete analysis, decision matrix, and implementation strategy.
