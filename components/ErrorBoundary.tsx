import React from 'react';
import { reportError } from '../services/observability';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, `ErrorBoundary:${info.componentStack ?? 'unknown'}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
          <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
            <p className="text-slate-600">Reload the page to continue. If this keeps happening, contact an administrator.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
