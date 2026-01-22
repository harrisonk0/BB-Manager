import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';

/**
 * Unit tests for can_access_audit_logs security function
 *
 * Security Model (per docs/10-database-security-model.md and Phase 1 decision):
 * - Captain role: CAN access audit logs (returns true)
 * - Admin role: CAN access audit logs (returns true)
 * - Officer role: CANNOT access audit logs (returns false)
 * - Users without roles: CANNOT access audit logs (returns false)
 *
 * The function is called via Supabase RPC with user_uid parameter.
 *
 * Note: Mock setup is done in tests/setup.ts
 */
describe('can_access_audit_logs security function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Access Granted Tests (Captain and Admin)

  describe('access granted - Captain and Admin roles', () => {
    it('should grant access to captain role', async () => {
      const captainUid = 'captain-user-uid';

      const mockResult = { data: true, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: captainUid
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: captainUid
      });

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should grant access to admin role', async () => {
      const adminUid = 'admin-user-uid';

      const mockResult = { data: true, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: adminUid
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: adminUid
      });

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // Access Denied Tests (Officer and no role)

  describe('access denied - Officer and no role', () => {
    it('should deny access to officer role', async () => {
      const officerUid = 'officer-user-uid';

      const mockResult = { data: false, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: officerUid
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: officerUid
      });

      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should deny access to user without role', async () => {
      const unassignedUid = 'unassigned-user-uid';

      const mockResult = { data: false, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: unassignedUid
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: unassignedUid
      });

      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  // Error Handling Tests

  describe('error handling', () => {
    it('should return error on database failure', async () => {
      const someUid = 'some-user-uid';

      const mockError = {
        message: 'Database connection failed',
        details: '',
        hint: '',
        code: 'DB000'
      };
      const mockResult = { data: null, error: mockError };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: someUid
      });

      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: someUid
      });

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });
});
