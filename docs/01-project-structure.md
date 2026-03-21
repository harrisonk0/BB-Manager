# 1. Project Structure

BB Manager is organised as a Vite SPA with Supabase-facing services and a small documentation set.

```text
/
├── .github/workflows/   # CI and operational workflows
├── components/          # React UI and page components
├── docs/                # Active docs and runbooks
├── hooks/               # Custom React hooks
├── services/            # Supabase client, auth, data, settings
├── tests/               # Manual E2E runbooks
├── AGENTS.md            # Contributor and agent guide
├── ARCHITECTURE.md      # Canonical system overview
├── App.tsx              # App shell and view orchestration
├── index.css            # Global styles
├── index.html           # HTML shell
├── index.tsx            # React entrypoint
├── package.json         # Scripts and dependencies
├── tsconfig.json        # TypeScript config
├── vercel.json          # SPA rewrites for Vercel
└── vite.config.ts       # Vite config
```

## Key Directories

- `components/`: page-level UI and reusable presentation components
- `hooks/`: auth, section management, data loading, unsaved-change protection, toasts
- `services/`: Supabase integration and domain operations
- `tests/`: markdown E2E runbooks
- `docs/`: active docs and runbooks

## Key Root Files

- `AGENTS.md`: operating rules and repo-specific guidance
- `ARCHITECTURE.md`: current runtime, schema, and deployment model
- `App.tsx`: root app coordinator
- `package.json`: scripts such as `dev`, `build`, `preview`, `typecheck`, and tests
- `vercel.json`: rewrite-to-root config for SPA routing on Vercel
