# Database Schema Redesign Recommendations

**Date:** 2026-01-22
**Purpose:** Improvements for greenfield rebuild with Next.js + Better Auth + Drizzle

## Overview

The existing schema works but has some design patterns that should be improved for a greenfield rebuild. This document recommends specific changes.

---

## 🔴 Critical Changes Required for Better Auth

### 1. Add Proper `users` Table

**Current:** `user_roles` table references `uid` (Supabase Auth user ID)

**Problem:** Better Auth requires its own `users` table.

**Recommended Schema:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- Better Auth user ID (UUID)
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Better Auth also creates sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Change Required:** Replace `user_roles.uid` with `user_roles.user_id` referencing `users.id`.

---

## 🟡 Strongly Recommended Improvements

### 2. Normalize `marks` from JSONB to Separate Table

**Current:** Marks stored as JSONB array in `boys.marks`

**Problems:**
- Can't easily query "all marks for date range" or "attendance trends"
- No database-level validation (score ranges, etc.)
- JSONB manipulation is complex
- Can't add foreign keys to marks
- Hard to do aggregations (average scores, attendance rates)

**Recommended Schema:**
```sql
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boy_id UUID NOT NULL REFERENCES boys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score NUMERIC,  -- Overall score (Company) or calculated (Junior)
  uniform_score NUMERIC,  -- Junior only
  behaviour_score NUMERIC,  -- Junior only
  is_absent BOOLEAN DEFAULT FALSE,
  section TEXT NOT NULL CHECK (section IN ('company', 'junior')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One mark per boy per date
  UNIQUE(boy_id, date)
);

-- Indexes for common queries
CREATE INDEX idx_marks_boy_date ON marks(boy_id, date DESC);
CREATE INDEX idx_marks_section_date ON marks(section, date DESC);
CREATE INDEX idx_marks_date ON marks(date DESC);

-- Check constraints for validation
ALTER TABLE marks ADD CONSTRAINT marks_company_score_check
  CHECK (section = 'company' OR (score IS NULL OR score BETWEEN -1 AND 10));

ALTER TABLE marks ADD CONSTRAINT marks_junior_scores_check
  CHECK (section = 'junior' OR (
    (uniform_score IS NULL OR uniform_score BETWEEN 0 AND 10) AND
    (behaviour_score IS NULL OR behaviour_score BETWEEN 0 AND 5)
  ));
```

**Benefits:**
- Easy to query: `SELECT * FROM marks WHERE date >= '2025-01-01'`
- Database-level validation (no app bugs can invalidate data)
- Can add audit logs per mark (not just per boy update)
- Better performance for aggregations
- Can add comments/notes on individual marks later

**Trade-off:** Slightly more complex queries (JOIN instead of accessing array)

---

### 3. Add Foreign Key Constraints

**Current:** No FKs (likely due to Supabase RLS complexity)

**Recommended:** Add proper foreign keys for data integrity:

```sql
-- user_roles references users
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- marks references boys
ALTER TABLE marks
  ADD CONSTRAINT marks_boy_id_fkey
  FOREIGN KEY (boy_id) REFERENCES boys(id) ON DELETE CASCADE;

-- audit_logs could reference user who performed action
ALTER TABLE audit_logs
  ADD COLUMN user_id TEXT REFERENCES users(id);
```

**Benefits:**
- Can't orphan data (delete cascades work properly)
- Drizzle ORM can use FKs for better type inference
- Data integrity enforced at database level

---

### 4. Use UUID Primary Keys Consistently

**Current:**
- `invite_codes.id` is TEXT (the code itself)
- `user_roles.uid` is TEXT

**Recommended:**
```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,  -- The 6-character code
  generated_by TEXT NOT NULL,
  default_user_role TEXT NOT NULL,
  -- ... rest of columns
);
```

**Benefits:**
- Consistent with other tables
- Can expose ID in URLs without revealing the code
- Can change code format without breaking FKs

---

## 🟢 Optional Improvements

### 5. Add `created_by` Tracking

**Current:** `boys` table doesn't track who created/modified records

**Recommended:**
```sql
ALTER TABLE boys
  ADD COLUMN created_by TEXT REFERENCES users(id),
  ADD COLUMN updated_by TEXT REFERENCES users(id);
```

**Benefits:**
- Better audit trail
- Can answer "who created this boy record?"
- Helps with debugging

**Trade-off:** Slightly more complex queries (need to JOIN to get creator name)

---

### 6. Consider Soft Deletes

**Current:** Deleting boys removes them permanently

**Recommended:**
```sql
ALTER TABLE boys
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by TEXT REFERENCES users(id);

-- Partial unique index excludes deleted boys
CREATE UNIQUE INDEX boys_name_section_unique
  ON boys(name, section)
  WHERE deleted_at IS NULL;
```

**Benefits:**
- Can recover accidentally deleted boys
- Can track deletion history
- Name reuse prevented

**Trade-off:** More complex queries (need `WHERE deleted_at IS NULL` everywhere)

---

### 7. Add `boy_attendance` Table (If Tracking Attendance Separately)

**Current:** Attendance implied by marks (score = -1)

**Recommended (if attendance tracking is important):**
```sql
CREATE TABLE boy_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boy_id UUID NOT NULL REFERENCES boys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  attended BOOLEAN DEFAULT FALSE,
  section TEXT NOT NULL,
  note TEXT,  -- Optional reason for absence
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(boy_id, date)
);
```

**Benefits:**
- Track attendance independently of marks
- Can record reasons for absence
- Can generate attendance reports

**Trade-off:** Additional complexity (only needed if attendance is first-class concern)

---

## 8. Improved Timestamp Handling

**Current:** Manual `updated_at` in application code

**Recommended:** Use Drizzle's timestamp auto-update or PostgreSQL triggers:

```sql
-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_boys_updated_at
  BEFORE UPDATE ON boys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Benefits:**
- Can't forget to update `updated_at`
- Consistent across all tables

---

## Email Setup: Gmail SMTP

**Question:** Could use Gmail SMTP credentials for easier life?

**Answer:** Yes! This is the **recommended approach**.

### Setup

```env
# Environment variables
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password-here  # Generate in Google Account settings
SMTP_FROM="BB-Manager <your-email@gmail.com>"
```

### Gmail App Password Setup

1. Go to Google Account → Security
2. Enable 2-Step Verification (required)
3. App passwords → Generate → Name it "BB-Manager"
4. Copy the 16-character password
5. Use in `SMTP_PASSWORD`

### Why Gmail SMTP?

**Pros:**
- ✅ Free (with Gmail account)
- ✅ Reliable (Google's infrastructure)
- ✅ Simple setup (no Postfix/SMTP server)
- ✅ TLS/SSL encrypted
- ✅ No rate limiting issues for small apps
- ✅ Works from anywhere (no IP reputation issues)

**Cons:**
- ⚠️ Daily sending limit (500/day for free accounts)
- ⚠️ Requires personal Gmail account
- ⚠️ Google can see sent emails (privacy concern)

**For BB-Manager:** Perfect fit. Low email volume (password resets, maybe notifications). 500/day is more than enough.

### Alternative: Transactional Email Service

If Gmail doesn't work:
- **Mailgun** (free tier: 1000/month)
- **SendGrid** (free tier: 100/day)
- **Resend** (free tier: 3000/month)

But Gmail SMTP is simplest to start.

---

## Migration Strategy

If rebuilding from scratch, implement these changes from day one. No migration needed.

If migrating existing data:
1. Create new schema with all improvements
2. Write migration script to:
   - Convert `boys.marks` JSONB to `marks` table
   - Create `users` table from existing auth data
   - Add FKs
3. Test thoroughly before cutover

---

## Summary

### Must Do (Better Auth):
- ✅ Add `users` table (Better Auth requirement)
- ✅ Add `sessions` table (Better Auth requirement)
- ✅ Update `user_roles` to reference `users.id`

### Should Do (Data Quality):
- ✅ Normalize `marks` to separate table
- ✅ Add foreign key constraints
- ✅ Use UUID primary keys consistently

### Nice to Have:
- Add `created_by` tracking
- Consider soft deletes
- Auto-update timestamps

### Email:
- ✅ Use Gmail SMTP (simplest, free, reliable)

**Recommendation:** Implement at least the "Must Do" and "Should Do" changes. The normalized `marks` table alone will make the app much more maintainable.
