import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';
import { getSettings, saveSettings } from '@/services/settings';
import type { Section, SectionSettings, UserRole } from '@/types';
import { createMockSupabaseClient, mockSuccessfulQuery, mockFailedQuery } from '@/tests/helpers/supabaseMock';
import * as errorMonitoring from '@/services/errorMonitoring';

describe('settings.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock reportError to avoid actual network calls
    vi.spyOn(errorMonitoring, 'reportError').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch settings successfully for company section', async () => {
      const mockSettings = { meeting_day: 3 };
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      mockSuccessfulQuery(queryBuilder, mockSettings, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await getSettings('company');

      expect(result).toEqual({ meetingDay: 3 });
      expect(supabase.from).toHaveBeenCalledWith('settings');
    });

    it('should fetch settings successfully for junior section', async () => {
      const mockSettings = { meeting_day: 5 };
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      mockSuccessfulQuery(queryBuilder, mockSettings, 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await getSettings('junior');

      expect(result).toEqual({ meetingDay: 5 });
    });

    it('should return default settings when no settings exist (PGRST116 error)', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      mockFailedQuery(queryBuilder, 'No rows found', 'PGRST116', 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await getSettings('company');

      expect(result).toEqual({ meetingDay: 5 }); // DEFAULT_MEETING_DAY
    });

    it('should return default settings when query returns null data', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      const response = {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      queryBuilder.single.mockResolvedValueOnce(response);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await getSettings('junior');

      expect(result).toEqual({ meetingDay: 5 }); // DEFAULT_MEETING_DAY
    });

    it('should return default settings on database error (non-PGRST116)', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      mockFailedQuery(queryBuilder, 'Database connection failed', 'DB_ERROR', 'single');

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const result = await getSettings('company');

      expect(result).toEqual({ meetingDay: 5 }); // DEFAULT_MEETING_DAY
    });

    it('should return default settings on exception', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await getSettings('junior');

      expect(result).toEqual({ meetingDay: 5 }); // DEFAULT_MEETING_DAY
    });

    it('should handle different meeting_day values correctly', async () => {
      const testCases = [
        { day: 1, expected: 1 },
        { day: 7, expected: 7 },
        { day: 5, expected: 5 },
      ];

      for (const testCase of testCases) {
        const mockSettings = { meeting_day: testCase.day };
        const queryBuilder = createMockSupabaseClient().from('settings') as any;
        mockSuccessfulQuery(queryBuilder, mockSettings, 'single');

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const result = await getSettings('company');

        expect(result).toEqual({ meetingDay: testCase.expected });
      }
    });
  });

  describe('saveSettings', () => {
    it('should save settings successfully for admin user', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      const response = {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      queryBuilder.upsert.mockResolvedValueOnce(response);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const settings: SectionSettings = { meetingDay: 3 };
      const userRole: UserRole = 'admin';

      await expect(saveSettings('company', settings, userRole)).resolves.not.toThrow();

      expect(supabase.from).toHaveBeenCalledWith('settings');
      expect(queryBuilder.upsert).toHaveBeenCalledWith({
        section: 'company',
        meeting_day: 3,
        updated_at: expect.any(String),
      });
    });

    it('should save settings successfully for captain user', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      const response = {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      queryBuilder.upsert.mockResolvedValueOnce(response);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const settings: SectionSettings = { meetingDay: 5 };
      const userRole: UserRole = 'captain';

      await expect(saveSettings('junior', settings, userRole)).resolves.not.toThrow();

      expect(queryBuilder.upsert).toHaveBeenCalledWith({
        section: 'junior',
        meeting_day: 5,
        updated_at: expect.any(String),
      });
    });

    it('should reject save when user role is null', async () => {
      const settings: SectionSettings = { meetingDay: 3 };
      const userRole = null;

      await expect(saveSettings('company', settings, userRole)).rejects.toThrow(
        'Permission denied: Only Admins and Captains can save settings.'
      );
    });

    it('should reject save when user role is member', async () => {
      const settings: SectionSettings = { meetingDay: 3 };
      const userRole: UserRole = 'member';

      await expect(saveSettings('junior', settings, userRole)).rejects.toThrow(
        'Permission denied: Only Admins and Captains can save settings.'
      );
    });

    it('should throw error when upsert fails', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      const error = { message: 'Constraint violation', code: '23505' };
      const response = {
        data: null,
        error,
        count: null,
        status: 400,
        statusText: 'Bad Request',
      };
      queryBuilder.upsert.mockResolvedValueOnce(response);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const settings: SectionSettings = { meetingDay: 3 };
      const userRole: UserRole = 'admin';

      await expect(saveSettings('company', settings, userRole)).rejects.toEqual(error);
    });

    it('should include updated_at timestamp when saving', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      const response = {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      queryBuilder.upsert.mockResolvedValueOnce(response);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const settings: SectionSettings = { meetingDay: 3 };
      const userRole: UserRole = 'captain';

      await saveSettings('company', settings, userRole);

      const upsertCall = queryBuilder.upsert.mock.calls[0][0];
      expect(upsertCall).toHaveProperty('updated_at');
      expect(new Date(upsertCall.updated_at)).toBeInstanceOf(Date);
    });

    it('should convert meetingDay to meeting_day for database', async () => {
      const queryBuilder = createMockSupabaseClient().from('settings') as any;
      const response = {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      queryBuilder.upsert.mockResolvedValueOnce(response);

      vi.mocked(supabase.from).mockReturnValue(queryBuilder);

      const settings: SectionSettings = { meetingDay: 2 };
      const userRole: UserRole = 'admin';

      await saveSettings('junior', settings, userRole);

      expect(queryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting_day: 2,
        })
      );
    });

    it('should handle both section types correctly', async () => {
      const sections: Section[] = ['company', 'junior'];

      for (const section of sections) {
        const queryBuilder = createMockSupabaseClient().from('settings') as any;
        const response = {
          data: null,
          error: null,
          count: null,
          status: 200,
          statusText: 'OK',
        };
        queryBuilder.upsert.mockResolvedValueOnce(response);

        vi.mocked(supabase.from).mockReturnValue(queryBuilder);

        const settings: SectionSettings = { meetingDay: 4 };
        const userRole: UserRole = 'admin';

        await saveSettings(section, settings, userRole);

        expect(queryBuilder.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            section: section,
          })
        );
      }
    });
  });
});
