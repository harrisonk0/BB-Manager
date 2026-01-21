# Coding Conventions

**Analysis Date:** 2024-01-21

## Naming Patterns

**Files:**
- PascalCase for components: `HomePage.tsx`, `Header.tsx`
- kebabCase for pages: `weekly-marks-page.tsx` (if used)
- camelCase for hooks: `useToastNotifications.ts`, `useAppData.ts`
- camelCase for services: `supabaseClient.ts`, `settings.ts`
- snake_case for configuration: `tailwind.config.js`, `postcss.config.js`

**Functions:**
- camelCase for utility functions: `showToast()`, `removeToast()`, `fetchBoys()`
- PascalCase for React components: `const App: React.FC = () => {}`
- PascalCase for type interfaces: `interface Boy {}`, `interface ToastMessage {}`

**Variables:**
- camelCase for local variables: `const [boys, setBoys] = useState<Boy[]>([])`
- camelCase for props: `boys={boys} setView={navigateWithProtection}`
- UPPER_CASE for constants and env variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Types:**
- PascalCase for types and interfaces: `type Section = 'company' | 'junior'`
- PascalCase for enums: `export type Page = 'home' | 'weeklyMarks' | 'dashboard' | 'auditLog' | 'settings' | 'globalSettings' | 'accountSettings' | 'signup';`
- camelCase for union members: `'company' | 'junior'`

## Code Style

**Formatting:**
- Uses standard TypeScript with React
- No dedicated linting or formatting configuration detected
- Consistent 2-space indentation
- Semicolons used consistently

**Import Organization:**
1. React imports first: `import React, { useState, useEffect } from 'react';`
2. External libraries next: `import { createClient } from '@supabase/supabase-js';`
3. Relative imports last: `import { ToastMessage, ToastType } from '../types';`
4. Alias imports from `@`: `import { useToastNotifications } from '@/hooks/useToastNotifications';`

## Error Handling

**Patterns:**
- Using try/catch blocks in data fetching functions
- Error state in React components: `const [dataError, setDataError] = useState<string | null>(null);`
- Error boundaries not detected
- Toast notifications for user-facing errors
- Console.error for development debugging

**Example:**
```typescript
try {
  await refreshData();
} catch (err: any) {
  console.error("Failed to fetch data:", err);
  setDataError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
}
```

## Logging

**Framework:** console.log and console.error

**Patterns:**
- Error logging with console.error in catch blocks
- No structured logging framework detected
- Development-only logging, no production logging configuration

## Comments

**When to Comment:**
- JSDoc comments for interfaces and complex types: `/** @type {import('tailwindcss').Config} */`
- JSDoc-style comments at top of files: `/** * @file index.tsx * @description This is the main entry point for the React application... */`
- Inline comments for complex logic

**JSDoc/TSDoc:**
- Partial usage - some functions/types have documentation, others don't
- Not consistently applied across all public APIs

## Function Design

**Size:** Functions vary from simple hooks (lines) to complex App component (232 lines)
- Prefer focused, single-purpose functions
- Component decomposition encouraged with custom hooks

**Parameters:**
- PropTypes or TypeScript interfaces for complex props
- Optional parameters marked with `?`
- Destructuring used for object props

**Return Values:**
- Consistent return types with TypeScript
- Union types for multiple return values

## Module Design

**Exports:**
- Default exports for React components
- Named exports for utility functions and types
- No module bundler configuration detected beyond Vite

**Barrel Files:**
- No index.ts barrel files detected
- Direct imports from specific files

---

*Convention analysis: 2024-01-21*
```