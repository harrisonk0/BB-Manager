/**
 * @file logger.ts
 * @description Centralized logging service.
 */

type LogLevel = 'info' | 'warn' | 'error';

class LoggerService {
  private log(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const payload = { timestamp, level, message, context };

    // Placeholder for Sentry/Datadog integration
    // if (window.Sentry) window.Sentry.captureMessage(message, { level, extra: context });

    switch (level) {
      case 'info':
        console.log(`[${level.toUpperCase()}] ${message}`, context || '');
        break;
      case 'warn':
        console.warn(`[${level.toUpperCase()}] ${message}`, context || '');
        break;
      case 'error':
        console.error(`[${level.toUpperCase()}] ${message}`, context || '');
        break;
    }
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  error(message: string, error?: any) {
    const context = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...error }
      : error;
    this.log('error', message, context);
  }
}

export const Logger = new LoggerService();