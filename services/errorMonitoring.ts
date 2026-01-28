interface ErrorReport {
  operation: string;
  error: string;
  user?: string;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * Reports an error to ntfy.sh for monitoring
 * @param operation - Name of the operation that failed (e.g., 'auth_signin')
 * @param error - The error that occurred
 * @param user - Optional user email for context
 * @param context - Optional additional context about the error
 */
export async function reportError(
  operation: string,
  error: Error,
  user?: string,
  context?: Record<string, any>
): Promise<void> {
  const report: ErrorReport = {
    operation,
    error: error.message,
    user,
    timestamp: new Date().toISOString(),
    context
  };

  try {
    await fetch('https://ntfy.sh/bb-manager-ops', {
      method: 'POST',
      headers: {
        'Title': `BB-Manager Error: ${operation}`,
        'Content-Type': 'application/json',
        'Priority': '3'  // High priority
      },
      body: JSON.stringify(report)
    });
  } catch (reportingError) {
    // Don't let error reporting break the app - silently fail
  }
}
