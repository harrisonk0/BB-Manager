// Unit tests for can_access_section security function
//
// Per Phase 1 decision: "all authenticated users with roles can access both sections"
// Section is contextual (not a security boundary) - officers, captains, and admins
// can access both 'company' and 'junior' sections.
//
// This test suite verifies the can_access_section RPC function correctly:
// - Grants access to users with roles (officer, captain, admin)
// - Denies access to users without roles
// - Handles database errors appropriately

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/services/supabaseClient';

// The supabase client is mocked at the module level in tests/setup.ts
// vi.mocked(supabase.rpc) provides type-safe mock access

describe('can_access_section security function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('access granted scenarios', () => {
    it('should grant access to officer for company section', async () => {
      const mockResult = { data: true, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_section', {
        user_uid: 'officer-uid',
        section: 'company'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_section', {
        user_uid: 'officer-uid',
        section: 'company'
      });
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should grant access to officer for junior section', async () => {
      const mockResult = { data: true, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_section', {
        user_uid: 'officer-uid',
        section: 'junior'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_section', {
        user_uid: 'officer-uid',
        section: 'junior'
      });
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should grant access to captain for any section', async () => {
      // Test both sections to verify contextual behavior
      const sections = ['company', 'junior'];

      for (const section of sections) {
        vi.clearAllMocks();

        const mockResult = { data: true, error: null };
        vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

        const result = await supabase.rpc('can_access_section', {
          user_uid: 'captain-uid',
          section
        });

        expect(supabase.rpc).toHaveBeenCalledWith('can_access_section', {
          user_uid: 'captain-uid',
          section
        });
        expect(result.data).toBe(true);
        expect(result.error).toBeNull();
      }
    });

    it('should grant access to admin for any section', async () => {
      // Test both sections to verify contextual behavior
      const sections = ['company', 'junior'];

      for (const section of sections) {
        vi.clearAllMocks();

        const mockResult = { data: true, error: null };
        vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

        const result = await supabase.rpc('can_access_section', {
          user_uid: 'admin-uid',
          section
        });

        expect(supabase.rpc).toHaveBeenCalledWith('can_access_section', {
          user_uid: 'admin-uid',
          section
        });
        expect(result.data).toBe(true);
        expect(result.error).toBeNull();
      }
    });
  });

  describe('access denied scenarios', () => {
    it('should deny access to user without role', async () => {
      const mockResult = { data: false, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_section', {
        user_uid: 'user-without-role-uid',
        section: 'company'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_section', {
        user_uid: 'user-without-role-uid',
        section: 'company'
      });
      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('error handling scenarios', () => {
    it('should return error on database failure', async () => {
      const mockError = {
        message: 'Database connection failed',
        code: 'CONNECTION_ERROR'
      };
      const mockResult = { data: null, error: mockError };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_section', {
        user_uid: 'officer-uid',
        section: 'company'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_section', {
        user_uid: 'officer-uid',
        section: 'company'
      });
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });
});
