// Test setup file for Vitest
// Global mocks and test utilities go here

import { vi } from 'vitest';

// Mock Supabase client for service-layer tests
// This will be expanded when actual tests are written
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));
