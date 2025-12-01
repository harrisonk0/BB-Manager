/**
 * @file logger.ts
 * @description Centralized logging service.
 * Currently wraps console methods but designed to be easily extended 
 * with a remote logging provider (e.g., Sentry, LogRocket) in the future.
 */

type LogLevel = 'info' | 'warn' | 'error';

class LoggerService {
  private log(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const payload = { timestamp, level, message, context };

    // In a real production app, send 'payload' to Sentry/Datadog here.
    
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
    // Extract meaningful info from Error objects
    const context = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...error }
      : error;
    this.log('error', message, context);
  }
}

export const Logger = new LoggerService();