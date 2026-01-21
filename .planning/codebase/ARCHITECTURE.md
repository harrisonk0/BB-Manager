# Architecture

**Analysis Date:** 2024-01-21

## Pattern Overview

**Overall:** Client-side React application with service layer architecture

**Key Characteristics:**
- Single-page application (SPA) using React with TypeScript
- Service layer pattern for data operations and API calls
- Custom hooks for state management and cross-cutting concerns
- Component-based UI architecture with clear separation of concerns
- Supabase as backend for data storage and authentication

## Layers

**Presentation Layer:**
- Purpose: React components for UI rendering
- Location: `components/`
- Contains: Page components, reusable UI components, loaders
- Depends on: Custom hooks, types, services
- Used by: React rendering engine via `App.tsx`

**Custom Hooks Layer:**
- Purpose: Business logic, state management, and cross-cutting concerns
- Location: `hooks/`
- Contains: `useAuthAndRole`, `useAppData`, `useSectionManagement`, `useUnsavedChangesProtection`, `useToastNotifications`
- Depends on: Services, types
- Used by: Presentation layer components and App component

**Service Layer:**
- Purpose: Data operations, API calls, and business logic encapsulation
- Location: `services/`
- Contains: `db.ts` (database operations), `settings.ts` (settings management), `supabaseClient.ts`, `supabaseAuth.ts`
- Depends on: Supabase client, types
- Used by: Custom hooks

**Data Layer:**
- Purpose: Database connection and schema definition
- Location: `supabase/`
- Contains: Database migrations, Supabase configuration
- Used by: Service layer

## Data Flow

**Data Loading Flow:**

1. User authentication via `useAuthAndRole` hook
2. Section selection via `useSectionManagement` hook
3. `useAppData` hook triggers data loading:
   - `fetchBoys()` from services/db.ts
   - `getSettings()` from services/settings.ts
4. Data flows back through hooks to components

**State Management:**
- React local state for UI components
- Custom hooks for shared state and business logic
- No global state management library
- Props drilling used for data passing

**Update Flow:**
1. Component calls function from custom hook
2. Hook calls service layer function
3. Service layer makes Supabase API call
4. Service layer updates local state
5. React re-renders affected components

## Key Abstractions

**Boy:**
- Purpose: Represents a member of the Boys' Brigade
- Examples: `types.ts` (Boy interface)
- Pattern: Domain object with embedded marks array

**Section:**
- Purpose: Represents organizational units (Company or Junior)
- Examples: `types.ts` (Section type), used throughout components
- Pattern: Enumeration with business logic differences

**View:**
- Purpose: Manages application navigation and routing
- Examples: `types.ts` (View, Page types), App.tsx
- Pattern: State machine for page navigation

**AuditLog:**
- Purpose: Tracks all changes for auditability
- Examples: `types.ts` (AuditLog interface)
- Pattern: Event sourcing pattern for data changes

## Entry Points

**index.tsx:**
- Location: `/Users/harrisonk/dev/BB-Manager/index.tsx`
- Triggers: Application startup
- Responsibilities: React DOM mounting, StrictMode wrapper

**App.tsx:**
- Location: `/Users/harrisonk/dev/BB-Manager/App.tsx`
- Triggers: Application initialization
- Responsibilities: Root component, state management, routing, layout

**server.js:**
- Location: `/Users/harrisonk/dev/BB-Manager/server.js`
- Triggers: Production server start
- Responsibilities: Static file serving, fallback routing

## Error Handling

**Strategy:** Component-based error handling with user feedback

**Patterns:**
- Loading states during async operations
- Toast notifications for user feedback
- Error boundaries for component crashes
- Graceful degradation for missing data
- Section-specific error handling in hooks

## Cross-Cutting Concerns

**Logging:** Console.error for developer debugging, user-facing messages via toasts

**Validation:** Business logic validation in services (e.g., mark validation, section-specific rules)

**Authentication:** Handled by `useAuthAndRole` hook with Supabase integration

**Unsaved Changes:** Dedicated `useUnsavedChangesProtection` hook for navigation protection

---

*Architecture analysis: 2024-01-21*