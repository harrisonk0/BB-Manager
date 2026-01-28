import { vi } from 'vitest';
import type { Mock } from 'vitest';

type SupabaseResponse<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
  status: number;
  statusText: string;
};

const createMockQueryBuilder = () => {
  const mockChain = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    neq: vi.fn(() => mockChain),
    gt: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lt: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    like: vi.fn(() => mockChain),
    ilike: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    is: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    range: vi.fn(() => mockChain),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    or: vi.fn(() => mockChain),
    not: vi.fn(() => mockChain),
    match: vi.fn(() => mockChain),
    returns: vi.fn(() => mockChain),
  };
  return mockChain;
};

type MockQueryBuilder = ReturnType<typeof createMockQueryBuilder> & {
  single: Mock<() => Promise<any>>;
  maybeSingle: Mock<() => Promise<any>>;
  select: Mock<() => Promise<any>>;
};

export const createMockSupabaseClient = () => ({
  from: vi.fn(() => createMockQueryBuilder()),
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    })),
  },
});

export const mockSuccessfulQuery = <T,>(
  queryBuilder: MockQueryBuilder,
  responseData: T,
  returnType: 'single' | 'maybeSingle' | 'data' = 'single'
) => {
  const response: SupabaseResponse<T> = {
    data: responseData,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };

  if (returnType === 'single') {
    queryBuilder.single.mockResolvedValueOnce(response);
  } else if (returnType === 'maybeSingle') {
    queryBuilder.maybeSingle.mockResolvedValueOnce(response);
  } else {
    // For data returns, mock the last method called
    queryBuilder.select.mockResolvedValueOnce(response);
  }
};

export const mockFailedQuery = (
  queryBuilder: MockQueryBuilder,
  errorMessage: string,
  errorCode?: string,
  returnType: 'single' | 'maybeSingle' = 'single'
) => {
  const response: SupabaseResponse<null> = {
    data: null,
    error: { message: errorMessage, code: errorCode },
    count: null,
    status: 400,
    statusText: 'Bad Request',
  };

  if (returnType === 'single') {
    queryBuilder.single.mockResolvedValueOnce(response);
  } else if (returnType === 'maybeSingle') {
    queryBuilder.maybeSingle.mockResolvedValueOnce(response);
  } else {
    queryBuilder.select.mockResolvedValueOnce(response);
  }
};
