import { describe, expect, it } from 'vitest';

import { describeError } from './observability';

describe('describeError', () => {
  it('prefers a supabase-style message and details', () => {
    expect(
      describeError(
        { message: 'new row violates row-level security policy', details: 'Failing row contains ...' },
        'Failed.',
      ),
    ).toBe('new row violates row-level security policy — Failing row contains ...');
  });

  it('returns the fallback when no message is present', () => {
    expect(describeError(null, 'Failed to save marks. Please try again.')).toBe(
      'Failed to save marks. Please try again.',
    );
  });
});
