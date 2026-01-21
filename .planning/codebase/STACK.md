# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- TypeScript 5.8.2 - Frontend development
- JavaScript - Frontend and server-side (Express)

**Secondary:**
- HTML - Frontend markup
- CSS - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js 20 (Node:20 in Docker)

**Package Manager:**
- npm 8+ (Version not explicitly pinned, lockfile present)
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- React 19.2.0 - UI library with functional components and hooks
- React DOM 19.2.0 - DOM rendering
- Express 4.18.2 - Production server

**Testing:**
- Not detected - No test framework configuration found

**Build/Dev:**
- Vite 6.2.0 - Build tool and dev server
- TypeScript compiler - Type checking and compilation
- PostCSS 8.4.38 - CSS processing
- Autoprefixer 10.4.19 - CSS vendor prefixing

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.48.0 - Database client and authentication
- react-vite-component-tagger 0.8.0 - Component tagging for debugging
- @types/node 22.14.0 - Node.js type definitions

**Infrastructure:**
- Tailwind CSS 3.4.4 - Utility-first CSS framework

## Configuration

**Environment:**
- Vite environment variables (VITE_ prefixed) embedded at build time
- Express server port (PORT variable, default 3000/8080)

**Build:**
- TypeScript: ES2022 target, ESNext modules, experimental decorators
- Vite: OutDir: 'dist', port: 3000 (dev), host: '0.0.0.0'
- Path aliases: '@/*' resolves to project root

## Platform Requirements

**Development:**
- Node.js 20+
- npm for package management

**Production:**
- Node.js 20-slim (via Docker)
- HTTP server (Express or serve npm package)
- Port 8080 (container) or 3000 (Express)

---

*Stack analysis: 2026-01-21*
