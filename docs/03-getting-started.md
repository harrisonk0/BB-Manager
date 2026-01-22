# 3. Getting Started

This guide walks you through setting up BB Manager locally with Supabase for authentication and data storage.

### Prerequisites

- **Node.js and npm**: Install from [nodejs.org](https://nodejs.org/) to manage dependencies and run the dev server.
- **Supabase account**: Create a project at [supabase.com](https://supabase.com/). Historical migrations are available in `.planning/archive/migrations/` for reference.
- A modern web browser (e.g., Chrome, Firefox, Edge).

---

### Step 1: Get the Code

Clone the repository or download the source as a ZIP and extract it.

---

### Step 2: Supabase Project Setup

1. **Create a Supabase project**
   - In the Supabase dashboard, create a new project with a strong database password.
   - The database schema should be configured using MCP Supabase tools. See `.planning/archive/migrations/README.md` for historical migration context.
   - Security note: the database uses RLS policies with GRANTs for access control. See [`docs/09-database-and-migrations.md`](./09-database-and-migrations.md).

2. **Obtain API keys**
   - In your project settings, copy the **Project URL** and **anon public key**.

3. **Create `.env` file**
   - In the repository root, create a `.env` file with:
     ```
     VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
     VITE_SUPABASE_ANON_KEY="<public-anon-key>"
     ```
   - These values are consumed by `services/supabaseClient.ts` at runtime.
   > TODO: Ensure `.env` is ignored by git and consider checking in `.env.example`.

4. **Seed roles (optional but recommended)**
   - Insert at least one admin row into `user_roles` that matches a Supabase Auth user ID and email so the first login has permissions.

---

### Step 3: Run the Application Locally

BB Manager uses **Vite** for local development.

1. **Install dependencies**
   - In the project root, run `npm install` (or `pnpm install`/`yarn install`).

2. **Start the dev server**
   - Run `npm run dev` and open the printed URL (typically `http://localhost:3000`).

**Accessing the App**

Sign up or sign in through Supabase Auth. Ensure the authenticated user has a corresponding entry in `user_roles` (`admin`, `captain`, or `officer`) so the UI can load section data.
