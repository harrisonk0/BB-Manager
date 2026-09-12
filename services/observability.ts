type ErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
};

const readErrorPart = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const describeError = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (typeof error === 'object') {
    const candidate = error as ErrorLike;
    const parts = [candidate.message, candidate.details, candidate.hint]
      .map(readErrorPart)
      .filter((part): part is string => Boolean(part));

    if (parts.length > 0) {
      return [...new Set(parts)].join(' — ');
    }
  }

  return fallback;
};

export const reportError = (error: unknown, context?: string) => {
  const prefix = context ? `[${context}]` : '[app]';
  if (error instanceof Error) {
    console.error(prefix, error.message, error);
    return;
  }
  console.error(prefix, error);
};
