// Test setup file for Vitest
// Global mocks and test utilities go here

import { vi } from 'vitest';
import { createMockSupabaseClient } from './helpers/supabaseMock';

// Mock Supabase client for service-layer tests
const mockSupabase = createMockSupabaseClient();

vi.mock('@/services/supabaseClient', () => ({
  supabase: mockSupabase,
}));

export { mockSupabase };
