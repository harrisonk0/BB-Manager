# BB-Manager Setup and Rebuild Guide

This guide provides step-by-step instructions for setting up and running the BB-Manager application from scratch.

## Prerequisites

Before you begin, ensure you have the following:

### Required

- **Node.js**: Version 18 or higher (download from [nodejs.org](https://nodejs.org/))
- **npm**: Comes with Node.js (verify with `npm --version`)
- **Supabase account**: Create a free account at [supabase.com](https://supabase.com/)
- **Git**: For cloning the repository (optional if downloading source)

### Recommended

- **VS Code** or similar code editor
- **Modern web browser** (Chrome, Firefox, Edge, Safari)

## Step 1: Create Supabase Project

1. **Sign in to Supabase**
   - Go to [supabase.com](https://supabase.com/)
   - Sign in with your preferred method (GitHub, email, etc.)

2. **Create a new project**
   - Click "New Project"
   - Choose an organization (or create one)
   - Project name: `bb-manager` (or your preferred name)
   - Database password: Generate a strong password and save it securely
   - Region: Choose closest to your users
   - Click "Create new project"
   - Wait for project provisioning (2-3 minutes)

3. **Get API credentials**
   - In your project dashboard, go to Settings -> API
   - Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy the **anon public** key
   - Keep these safe; you'll need them for environment variables

## Step 2: Get the Source Code

### Option A: Clone Repository (if you have access)

```bash
git clone https://github.com/your-org/bb-manager.git
cd bb-manager
```

### Option B: Download Source

1. Download the source code as a ZIP file
2. Extract to your preferred location
3. Navigate to the extracted directory in your terminal

## Step 3: Install Dependencies

From the project root directory, run:

```bash
npm install
```

This installs all required packages defined in `package.json`:
- React 19.2.0
- TypeScript 5.8.2
- Vite 6.2.0
- Supabase SDK 2.48.0
- And all other dependencies

## Step 4: Configure Environment Variables

1. **Create `.env` file**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```

2. **Edit `.env` file**
   - Open `.env` in your text editor
   - Fill in your Supabase credentials:
     ```bash
     VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
     VITE_SUPABASE_ANON_KEY="your-anon-key-here"
     ```

3. **Save the file**

   **Important**: Never commit `.env` to version control. It is already in `.gitignore`.

## Step 5: Set Up Database Schema

The database schema must be created in Supabase. There are two approaches:

### Option A: Manual Schema Creation (for understanding)

If you want to understand the schema structure, you can manually create tables using the SQL Editor in Supabase:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query and execute the schema DDL

**Reference**: See [database-schema.md](./database-schema.md) for the complete schema definition.

**Key tables to create**:
- `boys`
- `settings`
- `user_roles`
- `invite_codes`
- `audit_logs`

### Option B: MCP Supabase Tools (production method)

In the actual project, schema changes are made via MCP Supabase tools:

```bash
# List existing tables
mcp__supabase__listTables

# Execute SQL directly
mcp__supabase__executeSQL "CREATE TABLE ..."

# Describe a table
mcp__supabase__describeTable "boys"
```

### Required Security Functions

After creating tables, create the security functions:

```sql
-- Get current user's application role
CREATE FUNCTION public.get_user_role()
RETURNS TABLE (role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.uid = auth.uid()::text
  LIMIT 1;
$$;

-- Check if user can access audit logs
CREATE FUNCTION public.can_access_audit_logs()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = auth.uid()::text
    AND role IN ('captain', 'admin')
  );
$$;
```

### Enable RLS

Enable Row Level Security on all tables:

```sql
ALTER TABLE public.boys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

**Reference**: See [database-schema.md](./database-schema.md) for complete RLS policies.

## Step 6: Create Initial Admin User

You need at least one admin user to access the application:

1. **Create Supabase Auth user**
   - Go to Authentication -> Users in Supabase dashboard
   - Click "Add user" -> "Create new user"
   - Enter email and password
   - Click "Create user"

2. **Get user ID**
   - Click on the newly created user
   - Copy the UID (UUID format)

3. **Create user_roles entry**
   - Go to SQL Editor
   - Execute:
     ```sql
     INSERT INTO public.user_roles (uid, email, role)
     VALUES ('your-user-uid-here', 'your-email@example.com', 'admin');
     ```

## Step 7: Run Development Server

Start the Vite development server:

```bash
npm run dev
```

The server will start at:
- Local: `http://localhost:3000`
- Network: `http://192.168.x.x:3000` (your local IP)

Open the URL in your browser.

## Step 8: Test the Application

1. **Sign in**
   - Enter your admin email and password
   - Click "Sign In"

2. **Select section**
   - Choose "Company" or "Junior"
   - This selection persists in localStorage

3. **Verify access**
   - You should see the home page with member roster
   - Navigation should work between pages

4. **Test member creation**
   - Click "Add Member"
   - Fill in the form
   - Save and verify the member appears

## Step 9: Create Invite Codes (Optional)

To allow other users to sign up:

1. Go to **Global Settings** (Captain+ only)
2. Scroll to **Invite Codes** section
3. Click **Generate Invite Code**
4. Choose role and section
5. Share the code with the new user

## Build for Production

When ready to deploy:

```bash
npm run build
```

This creates a `dist/` directory with:
- Optimized and minified JavaScript
- Hashed filenames for caching
- `index.html` as entry point

### Verify Build

Test the production build locally:

```bash
npm run preview
```

Or serve with Express:

```bash
npm run build
npm run start
# Server runs at http://localhost:3000
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set environment variables**
   - In Vercel dashboard, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Option 2: Netlify

1. **Connect repository** to Netlify
2. **Build command**: `npm run build`
3. **Publish directory**: `dist`
4. **Add environment variables** in site settings

### Option 3: Docker

1. **Build image**
   ```bash
   docker build -t bb-manager .
   ```

2. **Run container**
   ```bash
   docker run -p 3000:80 bb-manager
   ```

### Option 4: Static hosting

Upload the `dist/` directory to any static hosting service:
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Traditional web host

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Express server port | `3000` |

## Common Issues and Solutions

### Issue: "Supabase environment variables are missing"

**Solution**: Ensure `.env` file exists and contains both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Restart the dev server after creating `.env`.

### Issue: "Permission denied" errors

**Solution**: Verify RLS policies are created and your user has an entry in `user_roles` table. Check that the `uid` in `user_roles` matches your Supabase Auth user ID.

### Issue: "No role" error after sign in

**Solution**: The authenticated user must have a corresponding row in `user_roles`. Create one manually in the SQL Editor if needed.

### Issue: Cannot see audit logs

**Solution**: Only Captain+ roles can view audit logs. Verify your role in `user_roles`. If you're an Officer, you won't have access.

### Issue: Marks validation errors

**Solution**: Ensure:
- Company section: scores 0-10
- Junior section: uniform 0-10, behaviour 0-5
- Maximum 2 decimal places
- Date format: YYYY-MM-DD

### Issue: Cannot revert audit log action

**Solution**: Only Admins can revert actions. Ensure your role is `admin` in the `user_roles` table.

## Development Workflow

### Type Checking

Run TypeScript compiler to check for type errors:

```bash
npx tsc -p tsconfig.json --noEmit
```

### Testing

Run the test suite:

```bash
npm run test       # Watch mode
npm run test:run   # Single run
```

### Linting (if configured)

```bash
npm run lint
```

## Production Considerations

### Security Checklist

- [ ] RLS enabled on all tables
- [ ] Security functions created with hardened search_path
- [ ] No service role key in client code
- [ ] Audit log retention scheduled (14 days)
- [ ] HTTPS enforced in production
- [ ] Environment variables properly secured

### Monitoring Considerations

- Set up error tracking (e.g., Sentry)
- Monitor Supabase quota and performance
- Track user authentication events
- Monitor database query performance

### Backup Strategy

- Supabase provides automated backups
- Consider periodic exports of critical data
- Document disaster recovery procedure

## Next Steps

After setup:

1. **Read the documentation**
   - [PRD.md](./PRD.md) - Product requirements
   - [technical-spec.md](./technical-spec.md) - Technical details
   - [database-schema.md](./database-schema.md) - Data model

2. **Customize for your needs**
   - Adjust squads and school years
   - Modify mark validation rules
   - Add custom fields to member records

3. **Train users**
   - Share the built-in Help documentation
   - Create user guides specific to your company
   - Document your workflows

## Support

For issues or questions:

1. Check the built-in Help page in the application
2. Review the documentation in the `docs/` directory
3. Check Supabase dashboard for database issues
4. Review browser console for client-side errors

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [CLAUDE.md](../CLAUDE.md) - Development guidelines
- [README.md](../README.md) - Project overview
