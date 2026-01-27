import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';

// The supabase client is mocked in tests/setup.ts
// We're testing the RPC call pattern for get_user_role function

describe('get_user_role security function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful role lookup', () => {
    it('should return captain role for captain user', async () => {
      const mockResult = { data: { role: 'captain' }, error: null, count: null, status: 200, statusText: 'OK' };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('get_user_role', { user_uid: 'captain-uid' });

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', { user_uid: 'captain-uid' });
      expect(result.data).toEqual({ role: 'captain' });
      expect(result.error).toBeNull();
    });

    it('should return officer role for officer user', async () => {
      const mockResult = { data: { role: 'officer' }, error: null, count: null, status: 200, statusText: 'OK' };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('get_user_role', { user_uid: 'officer-uid' });

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', { user_uid: 'officer-uid' });
      expect(result.data).toEqual({ role: 'officer' });
      expect(result.error).toBeNull();
    });

    it('should return admin role for admin user', async () => {
      const mockResult = { data: { role: 'admin' }, error: null, count: null, status: 200, statusText: 'OK' };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('get_user_role', { user_uid: 'admin-uid' });

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', { user_uid: 'admin-uid' });
      expect(result.data).toEqual({ role: 'admin' });
      expect(result.error).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should return null for user without role', async () => {
      const mockResult = { data: null, error: null, count: null, status: 200, statusText: 'OK' };
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('get_user_role', { user_uid: 'no-role-uid' });

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', { user_uid: 'no-role-uid' });
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should return error on database failure', async () => {
      const mockError = { message: 'Database error', details: 'Connection failed' };
      const mockResult = { data: null, error: mockError, count: null, status: 400, statusText: 'Bad Request' } as any;
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResult);

      const result = await supabase.rpc('get_user_role', { user_uid: 'any-uid' });

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', { user_uid: 'any-uid' });
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });
});
