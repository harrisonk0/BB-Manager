export const reportError = (error: unknown, context?: string) => {
  const prefix = context ? `[${context}]` : '[app]';
  if (error instanceof Error) {
    console.error(prefix, error.message, error);
    return;
  }
  console.error(prefix, error);
};
