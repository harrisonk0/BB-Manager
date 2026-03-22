import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => {
  const readSingle = vi.fn();
  const readEq = vi.fn(() => ({ single: readSingle }));
  const readSelect = vi.fn(() => ({ eq: readEq }));

  const writeSingle = vi.fn();
  const writeSelect = vi.fn(() => ({ single: writeSingle }));
  const writeEq = vi.fn(() => ({ select: writeSelect }));
  const update = vi.fn(() => ({ eq: writeEq }));

  const from = vi.fn(() => ({ select: readSelect, update }));

  return { from, readSelect, readEq, readSingle, update, writeEq, writeSelect, writeSingle };
});

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

import { getSettings, saveSettings } from './settings';

describe('settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the default meeting day when the settings row is missing', async () => {
    supabaseMock.readSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    await expect(getSettings('company')).resolves.toEqual({ meetingDay: 5 });
    expect(supabaseMock.from).toHaveBeenCalledWith('settings');
  });

  it('returns the stored meeting day when the row exists', async () => {
    supabaseMock.readSingle.mockResolvedValueOnce({
      data: { meeting_day: 2 },
      error: null,
    });

    await expect(getSettings('junior')).resolves.toEqual({ meetingDay: 2 });
  });

  it('updates the seeded settings row for admins and captains', async () => {
    supabaseMock.writeSingle.mockResolvedValueOnce({
      data: { section: 'company', meeting_day: 4 },
      error: null,
    });

    await expect(saveSettings('company', { meetingDay: 4 }, 'captain')).resolves.toBeUndefined();
    expect(supabaseMock.update).toHaveBeenCalledWith({
      meeting_day: 4,
      updated_at: expect.any(String),
    });
    expect(supabaseMock.writeEq).toHaveBeenCalledWith('section', 'company');
  });

  it('rejects save attempts from non-admin roles before writing', async () => {
    await expect(saveSettings('company', { meetingDay: 4 }, 'officer')).rejects.toThrow(/permission denied/i);
    expect(supabaseMock.update).not.toHaveBeenCalled();
  });

  it('surfaces a missing seeded row as an error', async () => {
    supabaseMock.writeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    await expect(saveSettings('junior', { meetingDay: 2 }, 'admin')).rejects.toMatchObject({
      code: 'PGRST116',
    });
  });
});
