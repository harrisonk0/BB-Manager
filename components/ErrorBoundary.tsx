import React from "react";
import { reportError } from "../services/observability";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, `ErrorBoundary:${info.componentStack ?? "unknown"}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="bb-fatal-error">
          <div>
            <h1>Something went wrong</h1>
            <p>
              Reload the page to continue. If this keeps happening, contact an
              administrator.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bb-button bb-button--primary"
            >
              Reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
