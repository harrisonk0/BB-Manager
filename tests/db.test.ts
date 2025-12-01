import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBoy, syncPendingWrites } from '@/services/db';
import { supabase } from '@/src/integrations/supabase/client';
import * as offlineDb from '@/services/offlineDb';
import * as cryptoService from '@/services/crypto';

// Mocks
vi.mock('@/src/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      select: vi.fn(),
      rpc: vi.fn(),
    })),
  },
}));

vi.mock('@/services/offlineDb', () => ({
  openDB: vi.fn(),
  saveBoyToDB: vi.fn(),
  addPendingWrite: vi.fn(),
  getPendingWrites: vi.fn(),
  clearPendingWrites: vi.fn(),
  deleteBoyFromDB: vi.fn(),
  getTableName: vi.fn(),
  addToDLQ: vi.fn(), // Mock DLQ
}));

vi.mock('@/services/crypto', () => ({
  encryptData: vi.fn(),
  decryptData: vi.fn(),
}));

describe('services/db.ts', () => {
  const mockKey = {} as CryptoKey;
  const mockBoy = { name: 'Test Boy', squad: 1, year: 8, marks: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default online status
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true, writable: true });
    
    // Default auth user
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    
    // Default crypto mocks
    (cryptoService.encryptData as any).mockResolvedValue({ ciphertext: new ArrayBuffer(0), iv: new ArrayBuffer(0) });
    (cryptoService.decryptData as any).mockResolvedValue({ ...mockBoy, id: 'decrypted-id' });
  });

  describe('createBoy', () => {
    it('should generate UUID client-side and use it for Supabase insert when online', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: insertMock,
      });

      const result = await createBoy(mockBoy as any, 'company', mockKey);

      expect(result.id).toBeDefined();
      expect(result.id).not.toContain('offline_'); // Should be a real UUID
      
      // Verify Supabase insert called
      expect(insertMock).toHaveBeenCalled();
      
      // Verify local save called with same ID
      expect(offlineDb.saveBoyToDB).toHaveBeenCalledWith(result.id, expect.anything(), 'company');
    });

    it('should queue write when offline', async () => {
      Object.defineProperty(window.navigator, 'onLine', { value: false });

      const result = await createBoy(mockBoy as any, 'company', mockKey);

      expect(result.id).toBeDefined();

      // Verify pending write added
      expect(offlineDb.addPendingWrite).toHaveBeenCalledWith(expect.objectContaining({
        type: 'CREATE_BOY',
        section: 'company'
      }));
      
      // Verify local save
      expect(offlineDb.saveBoyToDB).toHaveBeenCalledWith(result.id, expect.anything(), 'company');
    });
  });

  describe('syncPendingWrites', () => {
    it('should move failed writes to DLQ and continue', async () => {
      const pendingWrites = [
        { id: 1, type: 'CREATE_BOY', payload: {}, section: 'company' }, // Will fail fatal
        { id: 2, type: 'CREATE_BOY', payload: {}, section: 'company' }  // Will succeed
      ];
      (offlineDb.getPendingWrites as any).mockResolvedValue(pendingWrites);

      // Mock Supabase to fail first (fatal), succeed second
      const insertMock = vi.fn()
        .mockResolvedValueOnce({ error: { message: 'Fatal Error', code: '500' } }) 
        .mockResolvedValueOnce({ error: null }); // Success

      (supabase.from as any).mockReturnValue({
        insert: insertMock,
        select: vi.fn().mockReturnValue({ single: vi.fn() })
      });

      const result = await syncPendingWrites(mockKey);

      expect(result).toBe(true); // Queue cleared
      expect(offlineDb.addToDLQ).toHaveBeenCalledWith(pendingWrites[0], 'Fatal Error');
      expect(insertMock).toHaveBeenCalledTimes(2);
    });

    it('should abort sync on network error', async () => {
      const pendingWrites = [
        { id: 1, type: 'CREATE_BOY', payload: {}, section: 'company' }
      ];
      (offlineDb.getPendingWrites as any).mockResolvedValue(pendingWrites);

      // Mock Supabase to throw Network Error
      const insertMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      (supabase.from as any).mockReturnValue({
        insert: insertMock,
      });

      const result = await syncPendingWrites(mockKey);

      expect(result).toBe(false); // Aborted
      expect(offlineDb.clearPendingWrites).not.toHaveBeenCalled();
    });
  });
});