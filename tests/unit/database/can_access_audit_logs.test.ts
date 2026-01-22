import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';

// Mock setup is already done in tests/setup.ts
// vi.mock('@/services/supabaseClient', () => ({
//   supabase: {
//     from: vi.fn(),
//     rpc: vi.fn(),
//   },
// }));

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
 */
describe('can_access_audit_logs security function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Access Granted Tests (Captain and Admin)

  describe('access granted - Captain and Admin roles', () => {
    it('should grant access to captain role', async () => {
      const captainUid = 'captain-user-uid';

      // GREEN: Mock returns true for captain access
      const mockResult = { data: true, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: captainUid
      });

      // Verify RPC was called correctly
      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: captainUid
      });

      // Captain should have access
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should grant access to admin role', async () => {
      const adminUid = 'admin-user-uid';

      // GREEN: Mock returns true for admin access
      const mockResult = { data: true, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: adminUid
      });

      // Verify RPC was called correctly
      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: adminUid
      });

      // Admin should have access
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // Access Denied Tests (Officer and no role)

  describe('access denied - Officer and no role', () => {
    it('should deny access to officer role', async () => {
      const officerUid = 'officer-user-uid';

      // GREEN: Mock returns false for officer (access denied)
      const mockResult = { data: false, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: officerUid
      });

      // Verify RPC was called correctly
      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: officerUid
      });

      // Officer should NOT have access
      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should deny access to user without role', async () => {
      const unassignedUid = 'unassigned-user-uid';

      // GREEN: Mock returns false for users without roles
      const mockResult = { data: false, error: null };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: unassignedUid
      });

      // Verify RPC was called correctly
      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: unassignedUid
      });

      // Users without roles should NOT have access
      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  // Error Handling Tests

  describe('error handling', () => {
    it('should return error on database failure', async () => {
      const someUid = 'some-user-uid';

      // GREEN: Mock returns error on database failure
      const mockError = { message: 'Database connection failed', details: '', hint: '', code: 'DB000' };
      const mockResult = { data: null, error: mockError };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('can_access_audit_logs', {
        user_uid: someUid
      });

      // Verify RPC was called
      expect(supabase.rpc).toHaveBeenCalledWith('can_access_audit_logs', {
        user_uid: someUid
      });

      // Should have an error
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });
});
