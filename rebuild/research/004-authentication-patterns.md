# Authentication Patterns for Self-Hosted BB-Manager

**Researched:** 2026-01-22
**Domain:** Self-hosted authentication and authorization
**Confidence:** MEDIUM

## Executive Summary

This research examines authentication implementation patterns for transitioning BB-Manager from Supabase Auth to a self-hosted solution. The application requires role-based access control (Captain, Admin, Officer, Member, Guest), Row-Level Security equivalent, session management, secure password storage, and email workflows for password reset and verification.

**Critical Finding:** **Lucia Auth is deprecated as of March 2025**. The library author announced deprecation due to architectural issues. The recommended replacement is **Better Auth**, a modern TypeScript authentication framework that has absorbed Auth.js (NextAuth v5) to prevent its own deprecation.

**Primary Recommendation:** Use **Better Auth** with PostgreSQL as the authentication backend. Better Auth provides a framework-agnostic, type-safe authentication system that supports email/password credentials, session management with HTTP-only cookies, and integrates well with PostgreSQL for user data and roles.

## Standard Stack

The established libraries/tools for self-hosted authentication in 2025:

### Core Authentication

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Better Auth** | Latest (2025) | Primary auth framework | Modern TypeScript replacement for deprecated Lucia/Auth.js; framework-agnostic; excellent DX; self-hosting support added in 2025 |
| **PostgreSQL** | 15+ | User/session storage | Already in use (via Supabase transition); RLS support; proven reliability |
| **argon2** | via libsodium | Password hashing | OWASP/NIST recommended winner of 2015 Password Hashing Competition; GPU/ASIC resistant |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Nodemailer** | Latest | SMTP email delivery | Password reset, email verification flows |
| **Zod** | Latest | Input validation | Type-safe validation for auth inputs (email, password) |
| **Jose** | Latest | JWT creation/validation | If using JWT tokens for API authentication |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js v5 (NextAuth) | More mature but tightly coupled to Next.js; Better Auth is framework-agnostic |
| Better Auth | Clerk | Commercial solution; expensive; not truly self-hosted |
| Better Auth | Custom implementation | Maximum control but high security risk; authentication is notoriously difficult to implement correctly |
| argon2 | bcrypt | bcrypt is still viable (battle-tested since 1999) but argon2 has better hardware attack resistance |

### Installation

```bash
npm install better-auth @better-auth/core
npm install better-auth/react  # React hooks integration
npm install argon2             # Password hashing
npm install nodemailer         # Email delivery
npm install zod                # Validation
npm install jose               # JWT (if needed)
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── config.ts           # Better Auth configuration
│   ├── server.ts           # Auth server instance
│   ├── password.ts         # Password hashing utilities
│   ├── email.ts            # Email service (Nodemailer)
│   └── middleware.ts       # Auth middleware for API routes
├── db/
│   ├── schema/             # Database schema
│   │   ├── users.ts        # Users table
│   │   ├── sessions.ts     # Sessions table
│   │   ├── roles.ts        # User roles table
│   │   └── tokens.ts       # Reset/verification tokens
│   └── migrations/         # SQL migrations
└── types/
    └── auth.ts             # Auth-related TypeScript types
```

### Pattern 1: Better Auth Credentials Provider

**What:** Framework-agnostic authentication using email/password credentials with PostgreSQL backend

**When to use:** Self-hosted applications requiring full control over user data and authentication flow

**Example:**

```typescript
// src/auth/config.ts
import { betterAuth } from "better-auth"
import { postgresAdapter } from "better-auth/adapters/postgres"
import { argon2 } from "argon2"

export const auth = betterAuth({
  database: postgresAdapter({
    url: process.env.DATABASE_URL!,
    // Uses pg or Drizzle ORM under the hood
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Send password reset email via Nodemailer
      await sendPasswordResetEmail(user.email, url)
    },
    sendVerificationEmail: async ({ user, url }) => {
      // Send verification email via Nodemailer
      await sendVerificationEmail(user.email, url)
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  // Rate limiting
  rateLimit: {
    window: 10, // seconds
    max: 5,     // requests
  },
})

// src/auth/password.ts
import argon2 from "argon2"

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,        // iterations
    parallelism: 4,
  })
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}
```

### Pattern 2: Database Schema with Roles

**What:** PostgreSQL tables for users, sessions, and role-based access control

**When to use:** Any application requiring user authentication and authorization

**Example:**

```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'captain', 'admin', 'officer', 'member', 'guest'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);
```

### Pattern 3: Row-Level Security for Authorization

**What:** PostgreSQL RLS policies to enforce role-based data access at database level

**When to use:** Critical security requirement - database must enforce authorization, not just application layer

**Example:**

```sql
-- Enable RLS on boys table
ALTER TABLE boys ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read boys data
CREATE POLICY boys_read_authenticated ON boys
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only officers and above can insert/update boys
CREATE POLICY boys_write_officers ON boys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('officer', 'captain', 'admin')
    )
  );

-- Policy: Only captains and admins can delete boys
CREATE POLICY boys_delete_captains ON boys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('captain', 'admin')
    )
  );

-- Similar policies for settings, audit_logs, etc.
-- Audit logs restricted to captain/admin only
CREATE POLICY audit_logs_read_captains ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('captain', 'admin')
    )
  );
```

### Pattern 4: Session Management with HTTP-Only Cookies

**What:** Secure session storage using HTTP-only, Secure, SameSite cookies

**When to use:** Web applications - provides XSS protection; CSRF mitigated via SameSite

**Example:**

```typescript
// src/auth/config.ts (continued)
export const auth = betterAuth({
  // ... previous config
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    // Better Auth automatically sets HTTP-only, Secure, SameSite cookies
  },
})

// Usage in API routes
import { auth } from "./auth/config"
import { headers } from "next/headers" // or equivalent for your framework

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Check user role
  const userRole = await getUserRole(session.user.id)
  if (!hasRequiredRole(userRole, 'captain')) {
    return new Response("Forbidden", { status: 403 })
  }

  // Process request...
}
```

### Anti-Patterns to Avoid

- **Storing JWTs in localStorage:** Highly vulnerable to XSS attacks. Use HTTP-only cookies instead.
- **Client-side role checks only:** Never trust client checks. Always enforce in database via RLS.
- **Rolling your own crypto:** Never implement password hashing or JWT creation manually. Use established libraries.
- **Using MD5 or SHA-1 for passwords:** These are fast hashing algorithms designed for checksums, not passwords. Use argon2 or bcrypt.
- **Storing passwords in plain text:** Obvious but critical. Always hash with salt.
- **Session IDs in URLs:** Exposes session to URL logging and shoulder surfing.
- **Missing rate limiting:** Allows brute force and credential stuffing attacks.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt/argon2 implementation | `argon2` library | Side-channel attacks, memory hardness parameters, constant-time comparisons are easy to get wrong |
| Session management | Custom session tokens and storage | Better Auth sessions | Session fixation, hijacking, expiration, rotation, concurrent sessions |
| CSRF protection | Custom CSRF tokens | Better Auth built-in CSRF | Token generation, validation, double-submit cookie pattern |
| Email validation | Regex or manual validation | Zod schemas with `z.string().email()` | RFC compliance, internationalized domains, edge cases |
| Rate limiting | Custom in-memory counters | Better Auth built-in rate limiting | Distributed systems, race conditions, cleanup, per-IP vs per-user |
| JWT creation/validation | Manual JWT implementation | `jose` library | Signature verification, key rotation, claims validation, timing attacks |
| Password reset flows | Custom token generation and validation | Better Auth password reset | Token entropy, expiration, replay attacks, one-time use, secure transport |

**Key insight:** Authentication and session management are notoriously difficult to implement securely. Edge cases around concurrency, timing attacks, race conditions, and cryptographic primitives make custom implementations dangerous. Better Auth handles these complexities while providing a type-safe, developer-friendly API.

## Common Pitfalls

### Pitfall 1: Stored XSS via User Input

**What goes wrong:** Malicious users inject JavaScript into name/email fields that executes when admins view user lists

**Why it happens:** Default React escaping isn't enough if using `dangerouslySetInnerHTML` or improperly sanitized user data

**How to avoid:**
- Never use `dangerouslySetInnerHTML` with user input
- Validate and sanitize all input on write (Zod schemas)
- Escape all output (React does this by default)
- Implement Content Security Policy headers

**Warning signs:** User-controlled data rendered without validation, HTML anywhere in user input flow

### Pitfall 2: Session Fixation Attacks

**What goes wrong:** Attacker sets user's session ID before login, then hijacks authenticated session

**Why it happens:** Session ID not regenerated after authentication

**How to avoid:**
- Better Auth handles this automatically
- Regenerate session ID on login and privilege escalation
- Bind session to IP/user agent (optional, breaks legitimate roaming)
- Set expiration times appropriately

**Warning signs:** Session IDs not changing after login, long-lived sessions without refresh

### Pitfall 3: Missing CSRF Protection

**What goes wrong:** Attacker tricks authenticated user into performing unwanted actions via malicious form/link

**Why it happens:** HTTP-only cookies prevent XSS but don't prevent CSRF

**How to avoid:**
- Better Auth includes CSRF protection
- Set `SameSite=Strict` or `SameSite=Lax` on cookies
- Use CSRF tokens for state-changing operations
- Validate `Origin`/`Referer` headers

**Warning signs:** POST requests from external domains succeed, no SameSite attribute

### Pitfall 4: Weak Password Requirements

**What goes wrong:** Users choose weak passwords vulnerable to brute force or dictionary attacks

**Why it happens:** No password policy enforcement or weak hashing

**How to avoid:**
- Enforce minimum 8 characters (preferably 12+)
- Require character variety (uppercase, lowercase, numbers, symbols)
- Check against common password dictionaries
- Use strong argon2 parameters (memory cost >= 64MB)
- Implement rate limiting on login attempts

**Warning signs:** Passwords stored with fast hashing, no minimum length, no rate limiting

### Pitfall 5: Information Leakage in Error Messages

**What goes wrong:** Login errors reveal whether email exists, enabling user enumeration

**Why it happens:** Descriptive error messages ("Email not found" vs "Wrong password")

**How to avoid:**
- Use generic error messages: "Invalid email or password"
- Log specific errors server-side for debugging
- Rate limit login attempts equally regardless of validity

**Warning signs:** Different error messages for missing vs incorrect credentials

### Pitfall 6: Password Reset Token Replay

**What goes wrong:** Attacker uses old/expired reset token to gain access

**Why it happens:** Tokens not marked as used after password change

**How to avoid:**
- Mark tokens as used after successful reset
- Implement one-time use tokens
- Set short expiration (15-60 minutes)
- Expire tokens immediately after password change

**Warning signs:** Same token works multiple times, tokens not tracked after use

## Code Examples

Verified patterns from official sources:

### Email Validation with Zod

```typescript
import { z } from "zod"

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number")
    .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
  inviteCode: z.string().min(6, "Invalid invite code"),
})

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Invalid token"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number")
    .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
})
```

### Password Reset Flow

```typescript
// src/auth/password-reset.ts
import { auth } from "./config"
import { randomBytes } from "crypto"
import { sendEmail } from "./email"

export async function requestPasswordReset(email: string) {
  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  // Always return success to prevent email enumeration
  if (!user) {
    return { success: true }
  }

  // Generate secure token
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Store token
  await db.insert(verificationTokens).values({
    userId: user.id,
    token,
    type: "password_reset",
    expiresAt,
  })

  // Send reset email
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: "Reset your BB-Manager password",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 15 minutes.</p>`,
  })

  return { success: true }
}

export async function resetPassword(token: string, newPassword: string) {
  // Find valid token
  const tokenRecord = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.token, token),
      eq(verificationTokens.type, "password_reset"),
      gt(verificationTokens.expiresAt, new Date())
    ),
  })

  if (!tokenRecord) {
    throw new Error("Invalid or expired token")
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword)

  // Update user password
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, tokenRecord.userId))

  // Delete all user's sessions (force re-login)
  await db.delete(sessions)
    .where(eq(sessions.userId, tokenRecord.userId))

  // Delete used token
  await db.delete(verificationTokens)
    .where(eq(verificationTokens.id, tokenRecord.id))

  return { success: true }
}
```

### Role-Based Authorization Middleware

```typescript
// src/auth/middleware.ts
import { auth } from "./config"
import type { UserRole } from "@/types/auth"

const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  member: 1,
  officer: 2,
  captain: 3,
  admin: 4,
}

export async function requireAuth(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    throw new Error("Unauthorized")
  }

  return session
}

export async function requireRole(
  req: Request,
  minRole: UserRole
) {
  const session = await requireAuth(req)

  const userRole = await getUserRole(session.user.id)

  if (!userRole || ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
    throw new Error("Forbidden")
  }

  return session
}

// Usage in API route
export async function POST(req: Request) {
  const session = await requireRole(req, "captain")

  // User is authenticated and has captain role or higher
  // Process request...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bcrypt password hashing | argon2id (2015 PHC winner) | 2015 (OWASP rec) | More resistant to GPU/ASIC attacks, configurable memory hardness |
| localStorage tokens | HTTP-only cookies | ~2020 | XSS protection prioritized over CSRF; CSRF mitigated via SameSite |
| JWT for sessions | Session-based auth (server) | 2023-2024 | Sessions provide revocation, simpler security model |
| Lucia Auth (v3) | Better Auth | March 2025 | Lucia deprecated; Better Auth absorbs Auth.js and Lucia concepts |
| Client-side role checks | Database-level RLS | 2020s | Security enforced at trust boundary (database), not untrusted client |

**Deprecated/outdated:**
- **Lucia Auth v3:** Deprecated March 2025; author announced "Lucia, in the current state, is not working"
- **MD5/SHA-1 for passwords:** Fast algorithms designed for checksums, not password hashing
- **JWT for sessions:** Still viable for API tokens, but session-based auth provides better security for web apps
- **Client-side only auth checks:** Never secure; database must enforce authorization

## Open Questions

1. **Better Auth maturity and long-term support**
   - What we know: Better Auth is the recommended replacement for deprecated Lucia/Auth.js; has active development in 2025
   - What's unclear: Long-term maintenance commitment, corporate backing vs community project
   - Recommendation: Evaluate Better Auth's maintenance history and contributor activity before committing

2. **PostgreSQL connection pooling for auth queries**
   - What we know: Auth queries happen on every request; need efficient database access
   - What's unclear: Whether Better Auth handles connection pooling automatically or requires configuration
   - Recommendation: Plan for PgBouncer or similar for production deployments

3. **Email delivery reliability**
   - What we know: Password reset and email verification require SMTP; Nodemailer is standard
   - What's unclear: Best practices for self-hosted SMTP (Postfix?) vs using transactional email service (SendGrid, Mailgun)
   - Recommendation: For truly self-hosted, use Postfix or configure with external SMTP (Gmail, SendGrid)

4. **Migration strategy from Supabase Auth**
   - What we know: Need to migrate users, sessions, and role data
   - What's unclear: Password hash compatibility (Supabase uses bcrypt), session token migration
   - Recommendation: Plan for password reset-required migration; verify bcrypt hash compatibility with Better Auth

5. **Rate limiting implementation**
   - What we know: Better Auth includes rate limiting; need in-memory or Redis-based counter
   - What's unclear: Distributed deployment considerations (multiple app servers)
   - Recommendation: Start with in-memory; migrate to Redis if using multiple app servers

## Sources

### Primary (HIGH confidence)

- **Better Auth Official Documentation** - https://www.better-auth.com/
  - Verified current as of 2025
  - Framework-agnostic TypeScript auth library
  - Self-hosting support added in 2025

- **OWASP Password Storage Cheat Sheet** - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  - Argon2id recommendation
  - Password hashing best practices

### Secondary (MEDIUM confidence)

- **[Lucia Auth Deprecation Discussion](https://www.reddit.com/r/webdev/comments/1pzwct1/what_are_the_most_effective_ways_to_handle_user/)**
  - Lucia Auth deprecated March 2025
  - Better Auth recommended as replacement

- **[Better Auth Self-Hosting Announcement](https://better-auth-studio.vercel.app/changelog)**
  - Beta release with self-hosting support (2025)
  - Studio can be embedded in applications

- **[JWT Security Best Practices](https://phasetwo.io/articles/jwts/jwt-security-best-practices/)**
  - Token lifecycle security
  - Complete security strategies

- **[Session vs Token Authentication](https://www.authgear.com/post/session-vs-token-authentication)**
  - HTTP-only cookies vs localStorage
  - CSRF and XSS mitigation strategies

### Tertiary (LOW confidence)

- **[Best Authentication Libraries for Next.js in 2025](https://dev.to/joodi/best-authentication-libraries-for-nextjs-in-2025-5eca)**
  - Comparison of NextAuth, Lucia, Better Auth
  - Community sentiment and usage patterns

- **[Auth.js (NextAuth v5) Credentials Guide](https://medium.com/@vetriselvan_11/auth-js-nextauth-v5-credentials-authentication-in-next-js-app-router-complete-guide-ef77aaae7cdf)**
  - Complete implementation guide
  - Credentials provider setup

## Metadata

**Confidence breakdown:**
- Standard stack: **MEDIUM** - Better Auth verified as current (2025) replacement for deprecated Lucia; bcrypt vs argon2 well-established; email tooling (Nodemailer) standard
- Architecture: **MEDIUM** - Better Auth patterns verified via official docs; RLS patterns based on PostgreSQL best practices; specific implementation details may vary
- Pitfalls: **HIGH** - XSS, CSRF, session fixation well-documented security issues; mitigation strategies standard practice
- Migration strategy: **LOW** - Specific Supabase Auth to Better Auth migration not documented; requires validation

**Research date:** 2026-01-22
**Valid until:** 2025-03-15 (rapidly evolving auth landscape; Lucia deprecation March 2025)

## Security Checklist

Use this checklist when implementing self-hosted authentication:

### Password Security
- [ ] Passwords hashed with argon2id (memory cost >= 64MB, time cost >= 3)
- [ ] Minimum password length 12 characters
- [ ] Password complexity requirements (uppercase, lowercase, number, symbol)
- [ ] Passwords never logged or exposed in errors
- [ ] Rate limiting on login attempts (5 requests per 10 seconds)

### Session Security
- [ ] Session IDs stored in HTTP-only, Secure, SameSite cookies
- [ ] Sessions regenerated after login and privilege escalation
- [ ] Session expiration after 7 days of inactivity
- [ ] All sessions invalidated after password change
- [ ] Concurrent session limit enforced

### Token Security
- [ ] Password reset tokens use cryptographically secure random values
- [ ] Reset tokens expire after 15 minutes
- [ ] Reset tokens marked as used after password change
- [ ] Tokens transmitted only over HTTPS
- [ ] Tokens stored hashed in database (or encrypted)

### CSRF Protection
- [ ] Cookies set with SameSite=Strict or SameSite=Lax
- [ ] CSRF tokens used for state-changing operations
- [ ] Origin/Referer headers validated for API requests
- [ ] Sensitive operations require re-authentication

### XSS Prevention
- [ ] All user input validated on write (Zod schemas)
- [ ] User data escaped on output (React default)
- [ ] Content Security Policy headers set
- [ ] No use of dangerouslySetInnerHTML with user input
- [ ] HTTP-only cookies prevent token access via XSS

### Authorization
- [ ] Role checks performed on server-side for every operation
- [ ] Database-level RLS policies enforce data access
- [ ] Client-side role checks for UX only (not security)
- [ ] Privilege escalation requires re-authentication
- [ ] Audit log of sensitive operations

### Email Security
- [ ] Password reset links valid for single use only
- [ ] Reset links expire after 15 minutes
- [ ] Generic error messages prevent email enumeration
- [ ] Email verification required before account activation
- [ ] SMTP connection uses TLS

### Data Protection (UK GDPR)
- [ ] Right to deletion implemented (DELETE /api/users/:id)
- [ ] Data export functionality (GDPR data portability)
- [ ] Access logging for all authenticated operations
- [ ] Consent tracking for data processing
- [ ] Data minimization (only collect necessary fields)

### Infrastructure
- [ ] Environment variables never exposed to client (no VITE_* secrets)
- [ ] Database connection uses SSL
- [ ] Secrets rotated regularly (JWT signing keys, API keys)
- [ ] Backups encrypted and access-controlled
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

### Testing
- [ ] Authentication flow tested (signup, login, logout)
- [ ] Password reset flow tested end-to-end
- [ ] Role-based access control tested for each role
- [ ] RLS policies tested with different user roles
- [ ] Security testing for XSS, CSRF, session hijacking

---

**Next Steps:**

1. **Evaluate Better Auth** - Review source code, contributor activity, and issue tracker
2. **Prototype auth flow** - Implement minimal auth with Better Auth + PostgreSQL
3. **Plan migration** - Document Supabase Auth to Better Auth migration strategy
4. **Security audit** - Third-party review of auth implementation before production
5. **Testing suite** - Comprehensive test coverage for auth security-critical paths
