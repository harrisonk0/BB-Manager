import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn();
  const from = vi.fn(() => ({ select, upsert }));

  return { from, select, eq, single, upsert };
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
    supabaseMock.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    await expect(getSettings('company')).resolves.toEqual({ meetingDay: 5 });
    expect(supabaseMock.from).toHaveBeenCalledWith('settings');
  });

  it('returns the stored meeting day when the row exists', async () => {
    supabaseMock.single.mockResolvedValueOnce({
      data: { meeting_day: 2 },
      error: null,
    });

    await expect(getSettings('junior')).resolves.toEqual({ meetingDay: 2 });
  });

  it('rejects save attempts from non-admin roles before writing', async () => {
    await expect(saveSettings('company', { meetingDay: 4 }, 'officer')).rejects.toThrow(/permission denied/i);
    expect(supabaseMock.upsert).not.toHaveBeenCalled();
  });
});
