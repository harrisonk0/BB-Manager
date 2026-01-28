# Phase 3: Code Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up codebase by removing debug logging, dead code, and vulnerabilities while establishing test coverage for core services (db.ts and settings.ts).

**Architecture:** Two-wave execution: (1) Parallel test writing for db.ts and settings.ts to establish baseline, (2) Parallel code cleanup (console removal, LineChart deletion, npm audit fix). Uses Supabase mock helper for chainable query builders.

**Tech Stack:** Vitest 4.0.17, TypeScript 5.8.2, @supabase/supabase-js v2.48.0, vi.mocked() for mocking

---

## Task 1: Create Supabase Mock Helper

**Files:**
- Create: `tests/helpers/supabaseMock.ts`
- Modify: `tests/setup.ts`

### Step 1: Create mock helper file

Create `tests/helpers/supabaseMock.ts` with chainable query builder:

```typescript
import { vi } from 'vitest';

type SupabaseResponse<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
  status: number;
  statusText: string;
};

const createMockQueryBuilder = () => {
  const mockChain = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    neq: vi.fn(() => mockChain),
    gt: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lt: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    like: vi.fn(() => mockChain),
    ilike: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    is: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    range: vi.fn(() => mockChain),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    or: vi.fn(() => mockChain),
    not: vi.fn(() => mockChain),
    match: vi.fn(() => mockChain),
    returns: vi.fn(() => mockChain),
  };
  return mockChain;
};

export const createMockSupabaseClient = () => ({
  from: vi.fn(() => createMockQueryBuilder()),
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    })),
  },
});

export const mockSuccessfulQuery = <T,>(
  queryBuilder: any,
  responseData: T,
  returnType: 'single' | 'maybeSingle' | 'data' = 'single'
) => {
  const response: SupabaseResponse<T> = {
    data: responseData,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };

  if (returnType === 'single') {
    queryBuilder.single.mockResolvedValueOnce(response);
  } else if (returnType === 'maybeSingle') {
    queryBuilder.maybeSingle.mockResolvedValueOnce(response);
  } else {
    // For data returns, mock the last method called
    queryBuilder.select.mockResolvedValueOnce(response);
  }
};

export const mockFailedQuery = (
  queryBuilder: any,
  errorMessage: string,
  errorCode?: string,
  returnType: 'single' | 'maybeSingle' = 'single'
) => {
  const response = {
    data: null,
    error: { message: errorMessage, code: errorCode },
    count: null,
    status: 400,
    statusText: 'Bad Request',
  };

  if (returnType === 'single') {
    queryBuilder.single.mockResolvedValueOnce(response);
  } else if (returnType === 'maybeSingle') {
    queryBuilder.maybeSingle.mockResolvedValueOnce(response);
  } else {
    queryBuilder.select.mockResolvedValueOnce(response);
  }
};
```

### Step 2: Update test setup

Modify `tests/setup.ts` to use the enhanced mock:

```typescript
// Test setup file for Vitest
// Global mocks and test utilities go here

import { vi } from 'vitest';
import { createMockSupabaseClient } from './helpers/supabaseMock';

// Mock Supabase client for service-layer tests
const mockSupabase = createMockSupabaseClient();

vi.mock('@/services/supabaseClient', () => ({
  supabase: mockSupabase,
}));

export { mockSupabase };
```

### Step 3: Create test helper directory

```bash
mkdir -p tests/helpers
touch tests/helpers/.gitkeep
```

### Step 4: Verify setup compiles

```bash
npx tsc --noEmit
```

Expected: 0 errors

### Step 5: Commit

```bash
git add tests/helpers/supabaseMock.ts tests/setup.ts tests/helpers/.gitkeep
git commit -m "feat(testing): add chainable Supabase mock helper

- Create reusable mock factory for chained queries
- Support select, insert, update, delete, eq, single, etc.
- Add helpers for success/failure query mocking
- Update test setup to use enhanced mock

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Write Tests for db.ts CRUD Operations

**Files:**
- Create: `tests/unit/services/db-crud.test.ts`
- Reference: `services/db.ts:70-250` (CRUD functions)

### Step 1: Create test file structure

Create `tests/unit/services/db-crud.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import { createBoy, updateBoy, deleteBoyById, fetchBoys, fetchBoyById } from '@/services/db';
import { mockSuccessfulQuery, mockFailedQuery } from '../../helpers/supabaseMock';
import type { Boy } from '@/types';

describe('db.ts CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBoy', () => {
    it('should create a boy successfully', async () => {
      const mockBoy = { id: 1, name: 'John Doe', squad: 'A', year: 2025, marks: {}, isSquadLeader: false, section: 'company' };

      const queryBuilder = vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: mockBoy,
              error: null,
              status: 200,
              statusText: 'OK'
            })
          })
        })
      } as any);

      const result = await createBoy({ name: 'John Doe', squad: 'A', year: 2025, marks: {}, isSquadLeader: false }, 'company');

      expect(result).toEqual(mockBoy);
    });

    it('should throw error when user not authenticated', async () => {
      // Mock auth check to return null user
      await expect(
        createBoy({ name: 'John', squad: 'A', year: 2025, marks: {}, isSquadLeader: false }, 'company')
      ).rejects.toThrow('User not authenticated');
    });

    it('should validate marks before creation', async () => {
      // Invalid marks should trigger validation error
      await expect(
        createBoy({ name: 'John', squad: 'A', year: 2025, marks: { week1: 50 }, isSquadLeader: false }, 'company')
      ).rejects.toThrow();
    });
  });

  describe('updateBoy', () => {
    it('should update a boy successfully', async () => {
      const mockBoy = { id: 1, name: 'Jane Doe', squad: 'B', year: 2025, marks: {}, isSquadLeader: false, section: 'company' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: mockBoy,
                error: null,
                status: 200,
                statusText: 'OK'
              })
            })
          })
        })
      } as any);

      const result = await updateBoy(1, { name: 'Jane Doe' }, 'company');

      expect(result).toEqual(mockBoy);
    });

    it('should throw error for section mismatch', async () => {
      // Attempting to update boy in different section
      await expect(
        updateBoy(1, { name: 'Jane' }, 'junior')
      ).rejects.toThrow('Section mismatch');
    });
  });

  describe('deleteBoyById', () => {
    it('should delete a boy successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
            status: 204,
            statusText: 'No Content'
          })
        })
      } as any);

      await deleteBoyById(1);

      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('boys');
    });

    it('should throw error for unauthorized deletion', async () => {
      // Mock permission denied error
      await expect(deleteBoyById(999)).rejects.toThrow();
    });
  });

  describe('fetchBoys', () => {
    it('should fetch all boys for a section', async () => {
      const mockBoys = [
        { id: 1, name: 'John', section: 'company' },
        { id: 2, name: 'Jane', section: 'company' }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: mockBoys,
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await fetchBoys('company');

      expect(result).toEqual(mockBoys);
    });

    it('should return empty array when no boys found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await fetchBoys('company');

      expect(result).toEqual([]);
    });
  });

  describe('fetchBoyById', () => {
    it('should fetch a specific boy', async () => {
      const mockBoy = { id: 1, name: 'John Doe', section: 'company' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: mockBoy,
              error: null,
              status: 200,
              statusText: 'OK'
            })
          })
        })
      } as any);

      const result = await fetchBoyById(1);

      expect(result).toEqual(mockBoy);
    });

    it('should return null for non-existent boy', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
              status: 404,
              statusText: 'Not Found'
            })
          })
        })
      } as any);

      const result = await fetchBoyById(999);

      expect(result).toBeNull();
    });
  });
});
```

### Step 2: Run tests to verify they fail (implementation doesn't exist yet)

```bash
npm run test tests/unit/services/db-crud.test.ts
```

Expected: Some tests fail, some pass depending on existing implementation

### Step 3: Review actual db.ts implementation to adjust tests

Check if functions exist and match expected signatures:
```bash
grep -A 20 "export const createBoy" services/db.ts
grep -A 20 "export const updateBoy" services/db.ts
grep -A 20 "export const deleteBoyById" services/db.ts
grep -A 20 "export const fetchBoys" services/db.ts
grep -A 20 "export const fetchBoyById" services/db.ts
```

### Step 4: Adjust test expectations based on actual implementation

Update test file to match actual function signatures, error handling, and behavior.

### Step 5: Run tests again

```bash
npm run test tests/unit/services/db-crud.test.ts
```

Expected: Tests pass or have clear failures indicating needed implementation fixes

### Step 6: Commit

```bash
git add tests/unit/services/db-crud.test.ts
git commit -m "test(db): add CRUD operations tests

- Test createBoy with auth and validation
- Test updateBoy with section checking
- Test deleteBoyById with authorization
- Test fetchBoys and fetchBoyById
- Use Supabase mock helper for chainable queries

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Write Tests for db.ts Validation and Role Management

**Files:**
- Create: `tests/unit/services/db-validation.test.ts`
- Reference: `services/db.ts:250-400` (validation and role functions)

### Step 1: Create validation tests file

Create `tests/unit/services/db-validation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import {
  validateBoyMarks,
  updateUserRole,
  deleteUserRole
} from '@/services/db';

describe('db.ts Validation and Role Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateBoyMarks', () => {
    it('should accept valid marks within range', () => {
      const boy = {
        id: 1,
        name: 'John',
        marks: { week1: 15, week2: 20, week3: 25 },
        section: 'company'
      };

      expect(() => validateBoyMarks(boy, 'company')).not.toThrow();
    });

    it('should reject marks above maximum (30 for Company)', () => {
      const boy = {
        id: 1,
        name: 'John',
        marks: { week1: 35 }, // Above 30
        section: 'company'
      };

      expect(() => validateBoyMarks(boy, 'company')).toThrow();
    });

    it('should reject negative marks', () => {
      const boy = {
        id: 1,
        name: 'John',
        marks: { week1: -5 },
        section: 'company'
      };

      expect(() => validateBoyMarks(boy, 'company')).toThrow();
    });

    it('should reject marks for non-existent weeks', () => {
      const boy = {
        id: 1,
        name: 'John',
        marks: { week999: 10 },
        section: 'company'
      };

      expect(() => validateBoyMarks(boy, 'company')).toThrow();
    });
  });

  describe('updateUserRole', () => {
    it('should allow admin to promote to captain', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
            status: 204,
            statusText: 'No Content'
          })
        })
      } as any);

      await expect(
        updateUserRole('user-123', 'captain', 'admin')
      ).resolves.not.toThrow();
    });

    it('should prevent admin from demoting themselves', async () => {
      // Mock getCurrentUser to return admin user
      await expect(
        updateUserRole('current-admin-id', 'officer', 'admin')
      ).rejects.toThrow('Admins cannot demote themselves');
    });

    it('should prevent admin from demoting other admins', async () => {
      await expect(
        updateUserRole('other-admin-id', 'officer', 'admin')
      ).rejects.toThrow('Admins cannot demote other Admins');
    });

    it('should allow captain to change officer role', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
            status: 204,
            statusText: 'No Content'
          })
        })
      } as any);

      await expect(
        updateUserRole('officer-123', 'officer', 'captain')
      ).resolves.not.toThrow();
    });

    it('should prevent captain from changing admin role', async () => {
      await expect(
        updateUserRole('admin-123', 'officer', 'captain')
      ).rejects.toThrow("Captains cannot change an Admin's role");
    });
  });

  describe('deleteUserRole', () => {
    it('should allow admin to delete role', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
            status: 204,
            statusText: 'No Content'
          })
        })
      } as any);

      await expect(deleteUserRole('user-123', 'admin')).resolves.not.toThrow();
    });

    it('should prevent captain from deleting roles', async () => {
      await expect(
        deleteUserRole('user-123', 'captain')
      ).rejects.toThrow('Only Admins can delete user roles');
    });

    it('should prevent admin from deleting own role', async () => {
      await expect(
        deleteUserRole('current-admin-id', 'admin')
      ).rejects.toThrow('Admins cannot delete their own user role');
    });
  });
});
```

### Step 2: Run validation tests

```bash
npm run test tests/unit/services/db-validation.test.ts
```

### Step 3: Adjust tests to match actual implementation

Check actual validation logic:
```bash
grep -A 30 "validateBoyMarks" services/db.ts
grep -A 30 "updateUserRole" services/db.ts
grep -A 30 "deleteUserRole" services/db.ts
```

Update tests based on actual function signatures and error messages.

### Step 4: Run tests again

```bash
npm run test tests/unit/services/db-validation.test.ts
```

### Step 5: Commit

```bash
git add tests/unit/services/db-validation.test.ts
git commit -m "test(db): add validation and role management tests

- Test mark validation (range, negative, invalid weeks)
- Test updateUserRole permissions (admin, captain)
- Test deleteUserRole permissions
- Cover self-demotion and admin protection rules

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Write Tests for Weekly Marks Operations

**Files:**
- Create: `tests/unit/services/db-weekly-marks.test.ts`
- Reference: `services/db.ts:400-550` (weekly marks functions)

### Step 1: Check for weekly marks functions

First, identify what weekly marks functions exist:

```bash
grep -n "export.*Marks" services/db.ts
grep -n "weekly" services/db.ts -i
```

### Step 2: Create weekly marks tests file

Create `tests/unit/services/db-weekly-marks.test.ts` based on actual functions found:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import { saveWeeklyMarks, fetchWeeklyMarksHistory } from '@/services/db';

describe('db.ts Weekly Marks Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveWeeklyMarks', () => {
    it('should save weekly marks successfully', async () => {
      const marksData = {
        boyId: 1,
        week: '2025-01-27',
        marks: { week1: 15, week2: 20 }
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: 1, ...marksData },
              error: null,
              status: 201,
              statusText: 'Created'
            })
          })
        })
      } as any);

      const result = await saveWeeklyMarks([marksData], 'company');

      expect(result).toBeDefined();
    });

    it('should handle partial save errors gracefully', async () => {
      const marksData = [
        { boyId: 1, week: '2025-01-27', marks: { week1: 15 } },
        { boyId: 2, week: '2025-01-27', marks: { week1: 20 } }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Batch insert failed' },
              status: 400,
              statusText: 'Bad Request'
            })
          })
        })
      } as any);

      await expect(saveWeeklyMarks(marksData, 'company')).rejects.toThrow();
    });

    it('should validate mark scores before saving', async () => {
      const invalidMarks = {
        boyId: 1,
        week: '2025-01-27',
        marks: { week1: 50 } // Above 30
      };

      await expect(
        saveWeeklyMarks([invalidMarks], 'company')
      ).rejects.toThrow();
    });
  });

  describe('fetchWeeklyMarksHistory', () => {
    it('should retrieve marks history for a section', async () => {
      const mockHistory = [
        { boyId: 1, week: '2025-01-20', marks: { week1: 15 } },
        { boyId: 1, week: '2025-01-27', marks: { week1: 20 } }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: mockHistory,
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await fetchWeeklyMarksHistory('company', '2025-01-01', '2025-01-31');

      expect(result).toEqual(mockHistory);
    });

    it('should return empty array for no history', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await fetchWeeklyMarksHistory('company', '2025-01-01', '2025-01-31');

      expect(result).toEqual([]);
    });

    it('should enforce section isolation', async () => {
      // Should only return marks for requested section
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { boyId: 1, week: '2025-01-27', marks: { week1: 15 }, section: 'company' }
            ],
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await fetchWeeklyMarksHistory('company', '2025-01-01', '2025-01-31');

      expect(result.every(item => item.section === 'company')).toBe(true);
    });
  });

  describe('weekly marks validation', () => {
    it('should validate date ranges', async () => {
      // Invalid date range (end before start)
      await expect(
        fetchWeeklyMarksHistory('company', '2025-01-31', '2025-01-01')
      ).rejects.toThrow();
    });

    it('should validate mark limits per section', async () => {
      const invalidMarks = {
        boyId: 1,
        week: '2025-01-27',
        marks: { week1: 35 } // Above Company Section limit of 30
      };

      await expect(
        saveWeeklyMarks([invalidMarks], 'company')
      ).rejects.toThrow('Mark exceeds maximum');
    });
  });
});
```

### Step 3: Run weekly marks tests

```bash
npm run test tests/unit/services/db-weekly-marks.test.ts
```

### Step 4: Adjust to actual implementation

Check actual function signatures and behavior:
```bash
grep -A 40 "saveWeeklyMarks\|fetchWeeklyMarksHistory" services/db.ts
```

Update tests to match actual implementation.

### Step 5: Run tests again

```bash
npm run test tests/unit/services/db-weekly-marks.test.ts
```

### Step 6: Commit

```bash
git add tests/unit/services/db-weekly-marks.test.ts
git commit -m "test(db): add weekly marks operations tests

- Test saveWeeklyMarks with batch operations
- Test fetchWeeklyMarksHistory with date ranges
- Test section isolation in marks queries
- Validate mark scores and date ranges

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Write Tests for settings.ts

**Files:**
- Create: `tests/unit/services/settings.test.ts`
- Reference: `services/settings.ts`

### Step 1: Check settings.ts structure

```bash
head -100 services/settings.ts
grep -n "export" services/settings.ts
```

### Step 2: Create settings tests file

Create `tests/unit/services/settings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import { getSettings, saveSettings, updateSetting, resetToDefaults } from '@/services/settings';

describe('settings.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should retrieve settings successfully', async () => {
      const mockSettings = {
        id: 1,
        companySectionMaxMarks: 30,
        juniorSectionMaxMarks: 20,
        academicYear: '2024-2025'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: mockSettings,
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await getSettings();

      expect(result).toEqual(mockSettings);
    });

    it('should return default settings when none exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
            status: 404,
            statusText: 'Not Found'
          })
        })
      } as any);

      const result = await getSettings();

      expect(result).toBeDefined();
      expect(result.companySectionMaxMarks).toBeDefined();
    });
  });

  describe('saveSettings', () => {
    it('should save settings successfully', async () => {
      const settings = {
        companySectionMaxMarks: 30,
        juniorSectionMaxMarks: 20,
        academicYear: '2024-2025'
      };

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValueOnce({
          data: { id: 1, ...settings },
          error: null,
          status: 200,
          statusText: 'OK'
        })
      } as any);

      await expect(saveSettings(settings)).resolves.not.toThrow();
    });

    it('should validate settings before saving', async () => {
      const invalidSettings = {
        companySectionMaxMarks: -1, // Invalid negative value
        juniorSectionMaxMarks: 20,
        academicYear: '2024-2025'
      };

      await expect(saveSettings(invalidSettings)).rejects.toThrow();
    });
  });

  describe('updateSetting', () => {
    it('should update single setting field', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: { companySectionMaxMarks: 35 },
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      await expect(
        updateSetting('companySectionMaxMarks', 35)
      ).resolves.not.toThrow();
    });
  });

  describe('resetToDefaults', () => {
    it('should restore default settings', async () => {
      const defaultSettings = {
        companySectionMaxMarks: 30,
        juniorSectionMaxMarks: 20,
        academicYear: '2024-2025'
      };

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValueOnce({
          data: { id: 1, ...defaultSettings },
          error: null,
          status: 200,
          statusText: 'OK'
        })
      } as any);

      const result = await resetToDefaults();

      expect(result.companySectionMaxMarks).toBe(30);
    });
  });

  describe('settings merge behavior', () => {
    it('should merge partial settings with existing', async () => {
      const partialSettings = {
        companySectionMaxMarks: 35
      };

      const existingSettings = {
        companySectionMaxMarks: 30,
        juniorSectionMaxMarks: 20,
        academicYear: '2024-2025'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: existingSettings,
            error: null,
            status: 200,
            statusText: 'OK'
          })
        })
      } as any);

      const result = await saveSettings(partialSettings);

      expect(result.juniorSectionMaxMarks).toBe(20); // Preserved
      expect(result.companySectionMaxMarks).toBe(35); // Updated
    });
  });
});
```

### Step 3: Run settings tests

```bash
npm run test tests/unit/services/settings.test.ts
```

### Step 4: Adjust to actual implementation

Update tests based on actual settings.ts functions and behavior.

### Step 5: Run tests again

```bash
npm run test tests/unit/services/settings.test.ts
```

### Step 6: Commit

```bash
git add tests/unit/services/settings.test.ts
git commit -m "test(settings): add settings service tests

- Test getSettings with default fallback
- Test saveSettings with validation
- Test updateSetting for single fields
- Test resetToDefaults
- Test settings merge behavior

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Remove All Console Statements

**Files:**
- Modify: All `.ts` and `.tsx` files in `src/`, `components/`, `services/`, `hooks/`

### Step 1: Find all console statements

```bash
grep -r "console\." --include="*.ts" --include="*.tsx" --exclude-dir=tests --exclude-dir=node_modules src/ components/ services/ hooks/ > /tmp/console_statements.txt
cat /tmp/console_statements.txt
```

### Step 2: Remove console statements in services/db.ts

```bash
# Count occurrences
grep -n "console\." services/db.ts

# For each console statement, remove the line:
# - If alongside reportError(), remove console only
# - If standalone debug log, remove entire line
```

Example removal:
```typescript
// Before:
console.error("Failed to save marks", error);
await reportError('marks_save', error as Error, userEmail, context);

// After:
await reportError('marks_save', error as Error, userEmail, context);
```

### Step 3: Remove console statements in components

Repeat for each component:
```bash
# Check WeeklyMarksPage.tsx
grep -n "console\." components/WeeklyMarksPage.tsx

# Remove console.error calls alongside ntfy reporting
```

### Step 4: Verify no console statements remain

```bash
grep -r "console\." --include="*.ts" --include="*.tsx" --exclude-dir=tests src/ components/ services/ hooks/
```

Expected: 0 results (or only results in test files)

### Step 5: Type-check to ensure nothing broke

```bash
npx tsc --noEmit
```

Expected: 0 errors

### Step 6: Commit

```bash
git add -A
git commit -m "refactor(code): remove all console statements

- Remove console.log, console.error, console.warn
- Keep ntfy.sh error reporting intact
- Clean up debug logging from services and components

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Delete LineChart.tsx Component

**Files:**
- Delete: `components/LineChart.tsx`

### Step 1: Verify component is unused

```bash
grep -r "LineChart" --include="*.ts" --include="*.tsx" src/ components/
```

Expected: No imports or references (only the file itself)

### Step 2: Delete the file

```bash
rm components/LineChart.tsx
```

### Step 3: Verify deletion

```bash
ls components/LineChart.tsx
```

Expected: "No such file or directory"

### Step 4: Type-check

```bash
npx tsc --noEmit
```

Expected: 0 errors (no broken references)

### Step 5: Commit

```bash
git add components/LineChart.tsx
git commit -m "refactor(components): delete unused LineChart component

- Remove empty LineChart.tsx component
- Component was attempted feature that didn't work out
- No references exist in codebase

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Fix npm Vulnerabilities

**Files:**
- Modify: `package-lock.json`

### Step 1: Run npm audit to see vulnerabilities

```bash
npm audit
```

Expected: Shows 4 high-severity vulnerabilities in body-parser, express, glob, qs

### Step 2: Run automatic fix

```bash
npm audit fix
```

Expected: Updates transitive dependencies to fix vulnerabilities

### Step 3: Verify vulnerabilities are fixed

```bash
npm audit
```

Expected: "found 0 vulnerabilities" or only moderate/low severity

### Step 4: Run tests to ensure nothing broke

```bash
npm run test
```

Expected: All tests pass

### Step 5: Type-check

```bash
npx tsc --noEmit
```

Expected: 0 errors

### Step 6: Commit

```bash
git add package-lock.json
git commit -m "fix(deps): fix high-severity npm vulnerabilities

- Run npm audit fix
- Update body-parser, express, glob, qs
- Fix 4 high-severity vulnerabilities

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Final Verification

### Step 1: Verify all console statements removed

```bash
grep -r "console\." --include="*.ts" --include="*.tsx" --exclude-dir=tests src/ components/ services/ hooks/
```

Expected: 0 results

### Step 2: Verify LineChart deleted

```bash
ls components/LineChart.tsx 2>&1
```

Expected: "No such file or directory"

### Step 3: Verify no npm vulnerabilities

```bash
npm audit
```

Expected: 0 high-severity vulnerabilities

### Step 4: Run all tests

```bash
npm run test
```

Expected: ~28 tests pass (3 from Phase 2 security + ~25 from Phase 3)

### Step 5: Type-check

```bash
npx tsc --noEmit
```

Expected: 0 errors

### Step 6: Smoke test the application

```bash
npm run dev
```

Manual verification:
- [ ] Login works
- [ ] Create/edit/delete boy record works
- [ ] Enter weekly marks works
- [ ] No console errors in browser DevTools

### Step 7: Final commit (if any adjustments needed)

```bash
git add -A
git commit -m "chore(phase-3): complete Phase 3 code quality

- All console statements removed
- LineChart component deleted
- npm vulnerabilities fixed
- ~28 unit tests added for services
- All tests passing
- Type-check clean

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 8: Update project documentation

Update `.planning/ROADMAP.md` Phase 3 status to complete:

```bash
sed -i '' 's/3. Code Quality | 0\/5 | Not started/3. Code Quality | 5\/5 | Complete ✓ | 2026-01-28/' .planning/ROADMAP.md
```

Commit documentation update:
```bash
git add .planning/ROADMAP.md
git commit -m "docs(phase): mark Phase 3 complete

- Code quality improvements done
- Test coverage established
- Ready for Phase 4: Configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total tasks:** 9
**Estimated time:** 3-4 hours
**Dependencies:** Vitest configured (Phase 1), Supabase client (existing)

**Execution order:**
1. Task 1: Create mock helper (prerequisite for all tests)
2. Tasks 2-5: Write tests (can run in parallel after Task 1)
3. Tasks 6-8: Code cleanup (can run in parallel after tests pass)
4. Task 9: Final verification

**Success criteria:**
- ✅ 0 console statements in production code
- ✅ LineChart.tsx deleted
- ✅ 0 high-severity npm vulnerabilities
- ✅ ~28 unit tests passing
- ✅ Type-check clean
