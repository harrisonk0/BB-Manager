import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import * as supabaseAuth from '@/services/supabaseAuth';
import { createBoy, updateBoy, deleteBoyById, fetchBoys, fetchBoyById } from '@/services/db';
import type { Boy, Mark, Section } from '@/types';
import { createMockSupabaseClient, mockSuccessfulQuery, mockFailedQuery } from '@/tests/helpers/supabaseMock';

describe('db.ts CRUD Operations', () => {
  const mockAuthUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabaseAuth, 'getCurrentUser').mockResolvedValue(mockAuthUser as any);
    // Mock reportError to avoid actual network calls
    vi.doMock('@/services/errorMonitoring', () => ({
      reportError: vi.fn().mockResolvedValue(undefined)
    }));
  });

  describe('createBoy', () => {
    it('should create a boy successfully', async () => {
      const mockBoyData = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [],
        isSquadLeader: false
      };

      const mockDbBoy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [],
        is_squad_leader: false,
        section: 'company'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;
      mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await createBoy(mockBoyData, 'company');

      expect(result).toEqual({
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [],
        isSquadLeader: false
      });
      expect(supabase.from).toHaveBeenCalledWith('boys');
    });

    it('should throw error when user not authenticated', async () => {
      vi.spyOn(supabaseAuth, 'getCurrentUser').mockResolvedValue(null);

      const mockBoyData = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [],
        isSquadLeader: false
      };

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('User not authenticated');
    });

    it('should validate marks before creation', async () => {
      const mockBoyData = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [{ date: '2025-01-15', score: 50 }] as Mark[],
        isSquadLeader: false
      };

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('Company section score for John Doe on 2025-01-15 is out of range (0-10).');
    });

    it('should reject marks with invalid date format', async () => {
      const mockBoyData = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [{ date: '01/15/2025', score: 8 }] as Mark[],
        isSquadLeader: false
      };

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('Invalid date format for mark: 01/15/2025');
    });
  });

  describe('updateBoy', () => {
    it('should update a boy successfully', async () => {
      const mockBoy: Boy = {
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 2,
        year: 10,
        marks: [],
        isSquadLeader: false
      };

      const mockDbBoy = {
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 2,
        year: 10,
        marks: [],
        is_squad_leader: false,
        section: 'company'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;
      mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await updateBoy(mockBoy, 'company');

      expect(result).toEqual({
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 2,
        year: 10,
        marks: [],
        isSquadLeader: false
      });
      expect(supabase.from).toHaveBeenCalledWith('boys');
    });

    it('should validate marks on update', async () => {
      const mockBoy: Boy = {
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 2,
        year: 10,
        marks: [{ date: '2025-01-15', score: 50 }] as Mark[],
        isSquadLeader: false
      };

      await expect(
        updateBoy(mockBoy, 'company')
      ).rejects.toThrow('Company section score for Jane Doe on 2025-01-15 is out of range (0-10).');
    });

    it('should handle junior section validation', async () => {
      const mockBoy: Boy = {
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 1,
        year: 'P5',
        marks: [{ date: '2025-01-15', score: 7, uniformScore: 5, behaviourScore: 2 }] as Mark[],
        isSquadLeader: false
      };

      const mockDbBoy = {
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 1,
        year: 'P5',
        marks: [{ date: '2025-01-15', score: 7, uniformScore: 5, behaviourScore: 2 }],
        is_squad_leader: false,
        section: 'junior'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;
      mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await updateBoy(mockBoy, 'junior');

      expect(result).toBeDefined();
      expect(result.name).toBe('Jane Doe');
    });

    it('should reject junior marks with incorrect total score', async () => {
      const mockBoy: Boy = {
        id: 'boy-123',
        name: 'Jane Doe',
        squad: 1,
        year: 'P5',
        marks: [{ date: '2025-01-15', score: 10, uniformScore: 5, behaviourScore: 2 }] as Mark[],
        isSquadLeader: false
      };

      await expect(
        updateBoy(mockBoy, 'junior')
      ).rejects.toThrow('Junior section total score for Jane Doe on 2025-01-15 does not match sum of uniform and behaviour scores.');
    });
  });

  describe('deleteBoyById', () => {
    it('should delete a boy successfully', async () => {
      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      // Mock the chain: delete().eq().eq()
      const deleteChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
            status: 204,
            statusText: 'No Content'
          })
        })
      };

      queryBuilder.delete.mockReturnValue(deleteChain);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      await expect(deleteBoyById('boy-123', 'company')).resolves.not.toThrow();

      expect(supabase.from).toHaveBeenCalledWith('boys');
      expect(queryBuilder.delete).toHaveBeenCalled();
    });

    it('should throw error for unauthorized deletion', async () => {
      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      const deleteChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'Permission denied', code: '42501' },
            status: 403,
            statusText: 'Forbidden'
          })
        })
      };

      queryBuilder.delete.mockReturnValue(deleteChain);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      await expect(deleteBoyById('boy-999', 'company')).rejects.toThrow('Permission denied');
    });
  });

  describe('fetchBoys', () => {
    it('should fetch all boys for a section', async () => {
      const mockDbBoys = [
        {
          id: 'boy-1',
          name: 'John',
          squad: 1,
          year: 9,
          marks: [],
          is_squad_leader: false,
          section: 'company'
        },
        {
          id: 'boy-2',
          name: 'Jane',
          squad: 2,
          year: 10,
          marks: [],
          is_squad_leader: false,
          section: 'company'
        }
      ];

      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      // Mock the chain: select().eq().order()
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockResolvedValueOnce({
        data: mockDbBoys,
        error: null,
        status: 200,
        statusText: 'OK'
      });

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await fetchBoys('company');

      expect(result).toEqual([
        { id: 'boy-1', name: 'John', squad: 1, year: 9, marks: [], isSquadLeader: false },
        { id: 'boy-2', name: 'Jane', squad: 2, year: 10, marks: [], isSquadLeader: false }
      ]);
      expect(supabase.from).toHaveBeenCalledWith('boys');
    });

    it('should return empty array when no boys found', async () => {
      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockResolvedValueOnce({
        data: [],
        error: null,
        status: 200,
        statusText: 'OK'
      });

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await fetchBoys('company');

      expect(result).toEqual([]);
    });

    it('should return empty array when user not authenticated', async () => {
      vi.spyOn(supabaseAuth, 'getCurrentUser').mockResolvedValue(null);

      const result = await fetchBoys('company');

      expect(result).toEqual([]);
    });

    it('should throw error on fetch failure', async () => {
      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
        status: 500,
        statusText: 'Internal Server Error'
      });

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      await expect(fetchBoys('company')).rejects.toThrow('Database connection failed');
    });
  });

  describe('fetchBoyById', () => {
    it('should fetch a specific boy', async () => {
      const mockDbBoy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [],
        is_squad_leader: false,
        section: 'company'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      // Mock the chain: select().eq().eq().single()
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue({
        ...queryBuilder,
        single: vi.fn().mockResolvedValueOnce({
          data: mockDbBoy,
          error: null,
          status: 200,
          statusText: 'OK'
        })
      });

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await fetchBoyById('boy-123', 'company');

      expect(result).toEqual({
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [],
        isSquadLeader: false
      });
    });

    it('should return undefined for non-existent boy', async () => {
      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue({
        ...queryBuilder,
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
          status: 404,
          statusText: 'Not Found'
        })
      });

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await fetchBoyById('boy-999', 'company');

      expect(result).toBeUndefined();
    });

    it('should throw error when user not authenticated', async () => {
      vi.spyOn(supabaseAuth, 'getCurrentUser').mockResolvedValue(null);

      await expect(fetchBoyById('boy-123', 'company')).rejects.toThrow('User not authenticated');
    });

    it('should throw error on database error', async () => {
      const queryBuilder = createMockSupabaseClient().from('boys') as any;

      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue({
        ...queryBuilder,
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection failed' },
          status: 500,
          statusText: 'Internal Server Error'
        })
      });

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      await expect(fetchBoyById('boy-123', 'company')).rejects.toThrow('Connection failed');
    });
  });
});
