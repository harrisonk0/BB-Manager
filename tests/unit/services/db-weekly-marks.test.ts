import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import * as supabaseAuth from '@/services/supabaseAuth';
import { createBoy, updateBoy, fetchBoys } from '@/services/db';
import type { Boy, Mark, Section } from '@/types';
import { createMockSupabaseClient, mockSuccessfulQuery, mockFailedQuery } from '@/tests/helpers/supabaseMock';
import * as errorMonitoring from '@/services/errorMonitoring';

describe('db.ts Weekly Marks Operations', () => {
  const mockAuthUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabaseAuth, 'getCurrentUser').mockResolvedValue(mockAuthUser as any);
    // Mock reportError to avoid actual network calls
    vi.spyOn(errorMonitoring, 'reportError').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Company Section Weekly Marks', () => {
    const section: Section = 'company';

    describe('createBoy with weekly marks', () => {
      it('should create a boy with initial weekly marks', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: 8.5 },
            { date: '2025-01-22', score: 9.0 }
          ] as Mark[],
          isSquadLeader: false
        };

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: mockBoyData.marks,
          is_squad_leader: false,
          section: 'company'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await createBoy(mockBoyData, section);

        expect(result.marks).toHaveLength(2);
        expect(result.marks[0].score).toBe(8.5);
        expect(result.marks[1].score).toBe(9.0);
      });

      it('should create a boy with absence mark (score = -1)', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: -1 }
          ] as Mark[],
          isSquadLeader: false
        };

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: mockBoyData.marks,
          is_squad_leader: false,
          section: 'company'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await createBoy(mockBoyData, section);

        expect(result.marks).toHaveLength(1);
        expect(result.marks[0].score).toBe(-1);
      });

      it('should reject marks with score > 10 for company section', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: 11 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Company section score for John Doe on 2025-01-15 is out of range (0-10).');
      });

      it('should reject marks with negative score other than -1', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: -2 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Company section score for John Doe on 2025-01-15 is out of range (0-10).');
      });

      it('should reject marks with more than 2 decimal places', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: 8.555 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Total score for John Doe on 2025-01-15 has more than 2 decimal places.');
      });

      it('should reject marks with uniformScore or behaviourScore for company section', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: 8, uniformScore: 5, behaviourScore: 3 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Company section boy John Doe on 2025-01-15 has junior-specific scores.');
      });
    });

    describe('updateBoy with weekly marks', () => {
      it('should add new weekly mark to existing boy', async () => {
        const existingBoy: Boy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: 8.5 }
          ] as Mark[],
          isSquadLeader: false
        };

        const updatedMarks = [
          { date: '2025-01-15', score: 8.5 },
          { date: '2025-01-22', score: 9.0 }
        ] as Mark[];

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: updatedMarks,
          is_squad_leader: false,
          section: 'company'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await updateBoy({ ...existingBoy, marks: updatedMarks }, section);

        expect(result.marks).toHaveLength(2);
        expect(result.marks[1].score).toBe(9.0);
      });

      it('should update existing weekly mark for a date', async () => {
        const existingBoy: Boy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [
            { date: '2025-01-15', score: 8.5 }
          ] as Mark[],
          isSquadLeader: false
        };

        const updatedMarks = [
          { date: '2025-01-15', score: 9.0 }
        ] as Mark[];

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: updatedMarks,
          is_squad_leader: false,
          section: 'company'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await updateBoy({ ...existingBoy, marks: updatedMarks }, section);

        expect(result.marks).toHaveLength(1);
        expect(result.marks[0].score).toBe(9.0);
      });

      it('should update multiple boys marks in batch', async () => {
        const boy1: Boy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [{ date: '2025-01-15', score: 8.5 }] as Mark[],
          isSquadLeader: false
        };

        const boy2: Boy = {
          id: 'boy-456',
          name: 'Jane Smith',
          squad: 2,
          year: 9,
          marks: [{ date: '2025-01-15', score: 7.5 }] as Mark[],
          isSquadLeader: false
        };

        const updatedMarks1 = [{ date: '2025-01-15', score: 9.0 }, { date: '2025-01-22', score: 8.0 }] as Mark[];
        const updatedMarks2 = [{ date: '2025-01-15', score: 8.0 }, { date: '2025-01-22', score: 9.5 }] as Mark[];

        const mockDbBoy1 = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: updatedMarks1,
          is_squad_leader: false,
          section: 'company'
        };

        const mockDbBoy2 = {
          id: 'boy-456',
          name: 'Jane Smith',
          squad: 2,
          year: 9,
          marks: updatedMarks2,
          is_squad_leader: false,
          section: 'company'
        };

        // Mock first update
        let queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy1, 'single');

        // Mock second update
        let queryBuilder2 = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder2, mockDbBoy2, 'single');

        vi.mocked(supabase.from)
          .mockReturnValueOnce(queryBuilder)
          .mockReturnValueOnce(queryBuilder2);

        const [result1, result2] = await Promise.all([
          updateBoy({ ...boy1, marks: updatedMarks1 }, section),
          updateBoy({ ...boy2, marks: updatedMarks2 }, section)
        ]);

        expect(result1.marks).toHaveLength(2);
        expect(result2.marks).toHaveLength(2);
      });

      it('should report error when update fails', async () => {
        const existingBoy: Boy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 9,
          marks: [{ date: '2025-01-15', score: 8.5 }] as Mark[],
          isSquadLeader: false
        };

        const updatedMarks = [
          { date: '2025-01-15', score: 9.0 }
        ] as Mark[];

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockFailedQuery(queryBuilder, 'Database error');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        await expect(
          updateBoy({ ...existingBoy, marks: updatedMarks }, section)
        ).rejects.toThrow('Database error');

        expect(errorMonitoring.reportError).toHaveBeenCalledWith(
          'db_updateBoy',
          expect.any(Error),
          undefined,
          { boyId: 'boy-123', section: 'company' }
        );
      });
    });

    describe('fetchBoys with weekly marks', () => {
      it('should fetch all boys with their weekly marks for a section', async () => {
        const mockDbBoys = [
          {
            id: 'boy-123',
            name: 'John Doe',
            squad: 1,
            year: 9,
            marks: [
              { date: '2025-01-15', score: 8.5 },
              { date: '2025-01-22', score: 9.0 }
            ],
            is_squad_leader: false,
            section: 'company'
          },
          {
            id: 'boy-456',
            name: 'Jane Smith',
            squad: 2,
            year: 9,
            marks: [
              { date: '2025-01-15', score: 7.5 },
              { date: '2025-01-22', score: 8.0 }
            ],
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

        const result = await fetchBoys(section);

        expect(result).toHaveLength(2);
        expect(result[0].marks).toHaveLength(2);
        expect(result[1].marks).toHaveLength(2);
      });

      it('should handle boys with no marks', async () => {
        const mockDbBoys = [
          {
            id: 'boy-123',
            name: 'John Doe',
            squad: 1,
            year: 9,
            marks: null,
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

        const result = await fetchBoys(section);

        expect(result).toHaveLength(1);
        expect(result[0].marks).toEqual([]);
      });
    });
  });

  describe('Junior Section Weekly Marks', () => {
    const section: Section = 'junior';

    describe('createBoy with weekly marks', () => {
      it('should create a boy with junior weekly marks (uniform + behaviour)', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 13, uniformScore: 8, behaviourScore: 5 }
          ] as Mark[],
          isSquadLeader: false
        };

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: mockBoyData.marks,
          is_squad_leader: false,
          section: 'junior'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await createBoy(mockBoyData, section);

        expect(result.marks).toHaveLength(1);
        expect(result.marks[0].score).toBe(13);
        expect(result.marks[0].uniformScore).toBe(8);
        expect(result.marks[0].behaviourScore).toBe(5);
      });

      it('should create a boy with absence mark (score = -1)', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: -1, uniformScore: -1, behaviourScore: -1 }
          ] as Mark[],
          isSquadLeader: false
        };

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: mockBoyData.marks,
          is_squad_leader: false,
          section: 'junior'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await createBoy(mockBoyData, section);

        expect(result.marks).toHaveLength(1);
        expect(result.marks[0].score).toBe(-1);
      });

      it('should reject marks with uniformScore > 10', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 15, uniformScore: 11, behaviourScore: 4 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Junior section uniform score for John Doe on 2025-01-15 is invalid or out of range (0-10).');
      });

      it('should reject marks with behaviourScore > 5', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 15, uniformScore: 10, behaviourScore: 6 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Junior section behaviour score for John Doe on 2025-01-15 is invalid or out of range (0-5).');
      });

      it('should reject marks where total does not match sum of uniform and behaviour', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 14, uniformScore: 8, behaviourScore: 5 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Junior section total score for John Doe on 2025-01-15 does not match sum of uniform and behaviour scores.');
      });

      it('should reject marks with uniformScore having more than 2 decimal places', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 13.5, uniformScore: 8.555, behaviourScore: 5 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Uniform score for John Doe on 2025-01-15 has more than 2 decimal places.');
      });

      it('should reject marks with behaviourScore having more than 2 decimal places', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 12.5, uniformScore: 8, behaviourScore: 4.555 }
          ] as Mark[],
          isSquadLeader: false
        };

        await expect(
          createBoy(mockBoyData, section)
        ).rejects.toThrow('Behaviour score for John Doe on 2025-01-15 has more than 2 decimal places.');
      });

      it('should accept valid junior marks with decimal places', async () => {
        const mockBoyData: Omit<Boy, 'id'> = {
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 13.55, uniformScore: 8.55, behaviourScore: 5 }
          ] as Mark[],
          isSquadLeader: false
        };

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: mockBoyData.marks,
          is_squad_leader: false,
          section: 'junior'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await createBoy(mockBoyData, section);

        expect(result.marks).toHaveLength(1);
        expect(result.marks[0].uniformScore).toBe(8.55);
      });
    });

    describe('updateBoy with weekly marks', () => {
      it('should update existing junior weekly mark', async () => {
        const existingBoy: Boy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 13, uniformScore: 8, behaviourScore: 5 }
          ] as Mark[],
          isSquadLeader: false
        };

        const updatedMarks = [
          { date: '2025-01-15', score: 14, uniformScore: 9, behaviourScore: 5 }
        ] as Mark[];

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: updatedMarks,
          is_squad_leader: false,
          section: 'junior'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await updateBoy({ ...existingBoy, marks: updatedMarks }, section);

        expect(result.marks).toHaveLength(1);
        expect(result.marks[0].uniformScore).toBe(9);
      });

      it('should add new weekly mark to junior boy', async () => {
        const existingBoy: Boy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: [
            { date: '2025-01-15', score: 13, uniformScore: 8, behaviourScore: 5 }
          ] as Mark[],
          isSquadLeader: false
        };

        const updatedMarks = [
          { date: '2025-01-15', score: 13, uniformScore: 8, behaviourScore: 5 },
          { date: '2025-01-22', score: 12, uniformScore: 7, behaviourScore: 5 }
        ] as Mark[];

        const mockDbBoy = {
          id: 'boy-123',
          name: 'John Doe',
          squad: 1,
          year: 'P4',
          marks: updatedMarks,
          is_squad_leader: false,
          section: 'junior'
        };

        const queryBuilder = createMockSupabaseClient().from('boys') as any;
        mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await updateBoy({ ...existingBoy, marks: updatedMarks }, section);

        expect(result.marks).toHaveLength(2);
        expect(result.marks[1].uniformScore).toBe(7);
      });
    });
  });

  describe('Cross-Section Weekly Marks Operations', () => {
    it('should isolate company section marks from junior section marks', async () => {
      const companyBoy: Boy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [{ date: '2025-01-15', score: 8.5 }] as Mark[],
        isSquadLeader: false
      };

      const juniorBoy: Boy = {
        id: 'boy-456',
        name: 'Jane Smith',
        squad: 1,
        year: 'P4',
        marks: [{ date: '2025-01-15', score: 13, uniformScore: 8, behaviourScore: 5 }] as Mark[],
        isSquadLeader: false
      };

      const mockDbCompanyBoy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: companyBoy.marks,
        is_squad_leader: false,
        section: 'company'
      };

      const mockDbJuniorBoy = {
        id: 'boy-456',
        name: 'Jane Smith',
        squad: 1,
        year: 'P4',
        marks: juniorBoy.marks,
        is_squad_leader: false,
        section: 'junior'
      };

      // Mock company boy fetch
      let queryBuilder1 = createMockSupabaseClient().from('boys') as any;
      queryBuilder1.select.mockReturnValue(queryBuilder1);
      queryBuilder1.eq.mockReturnValue(queryBuilder1);
      queryBuilder1.order.mockResolvedValueOnce({
        data: [mockDbCompanyBoy],
        error: null,
        status: 200,
        statusText: 'OK'
      });

      // Mock junior boy fetch
      let queryBuilder2 = createMockSupabaseClient().from('boys') as any;
      queryBuilder2.select.mockReturnValue(queryBuilder2);
      queryBuilder2.eq.mockReturnValue(queryBuilder2);
      queryBuilder2.order.mockResolvedValueOnce({
        data: [mockDbJuniorBoy],
        error: null,
        status: 200,
        statusText: 'OK'
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(queryBuilder1)
        .mockReturnValueOnce(queryBuilder2);

      const [companyBoys, juniorBoys] = await Promise.all([
        fetchBoys('company'),
        fetchBoys('junior')
      ]);

      expect(companyBoys).toHaveLength(1);
      expect(juniorBoys).toHaveLength(1);
      expect(companyBoys[0].marks[0].score).toBe(8.5);
      expect(juniorBoys[0].marks[0].score).toBe(13);
    });
  });

  describe('Weekly Marks Validation Edge Cases', () => {
    it('should reject marks with non-numeric score', async () => {
      const mockBoyData: Omit<Boy, 'id'> = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [
          { date: '2025-01-15', score: 'invalid' as any }
        ] as Mark[],
        isSquadLeader: false
      };

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('Invalid score type for mark on 2025-01-15. Score must be a number.');
    });

    it('should reject non-array marks', async () => {
      const mockBoyData = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: 'not-an-array' as any,
        isSquadLeader: false
      } as Omit<Boy, 'id'>;

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('Marks must be an array.');
    });

    it('should accept zero scores', async () => {
      const mockBoyData: Omit<Boy, 'id'> = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [
          { date: '2025-01-15', score: 0 }
        ] as Mark[],
        isSquadLeader: false
      };

      const mockDbBoy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: mockBoyData.marks,
        is_squad_leader: false,
        section: 'company'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;
      mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await createBoy(mockBoyData, 'company');

      expect(result.marks[0].score).toBe(0);
    });

    it('should accept maximum boundary scores', async () => {
      const mockBoyData: Omit<Boy, 'id'> = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [
          { date: '2025-01-15', score: 10 }
        ] as Mark[],
        isSquadLeader: false
      };

      const mockDbBoy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: mockBoyData.marks,
        is_squad_leader: false,
        section: 'company'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;
      mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await createBoy(mockBoyData, 'company');

      expect(result.marks[0].score).toBe(10);
    });

    it('should handle multiple marks with different dates', async () => {
      const mockBoyData: Omit<Boy, 'id'> = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [
          { date: '2025-01-08', score: 7.5 },
          { date: '2025-01-15', score: 8.0 },
          { date: '2025-01-22', score: 9.0 },
          { date: '2025-01-29', score: 8.5 }
        ] as Mark[],
        isSquadLeader: false
      };

      const mockDbBoy = {
        id: 'boy-123',
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: mockBoyData.marks,
        is_squad_leader: false,
        section: 'company'
      };

      const queryBuilder = createMockSupabaseClient().from('boys') as any;
      mockSuccessfulQuery(queryBuilder, mockDbBoy, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await createBoy(mockBoyData, 'company');

      expect(result.marks).toHaveLength(4);
      expect(result.marks.map(m => m.date)).toEqual([
        '2025-01-08',
        '2025-01-15',
        '2025-01-22',
        '2025-01-29'
      ]);
    });

    it('should validate date format strictly', async () => {
      const mockBoyData: Omit<Boy, 'id'> = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [
          { date: '2025/01/15', score: 8 }
        ] as Mark[],
        isSquadLeader: false
      };

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('Invalid date format for mark: 2025/01/15');
    });

    it('should reject invalid date formats', async () => {
      const mockBoyData: Omit<Boy, 'id'> = {
        name: 'John Doe',
        squad: 1,
        year: 9,
        marks: [
          { date: '15-01-2025', score: 8 }
        ] as Mark[],
        isSquadLeader: false
      };

      await expect(
        createBoy(mockBoyData, 'company')
      ).rejects.toThrow('Invalid date format for mark: 15-01-2025');
    });
  });
});
