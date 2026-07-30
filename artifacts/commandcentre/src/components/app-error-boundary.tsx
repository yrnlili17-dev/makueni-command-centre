import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected application error",
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("Application error boundary:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl">
          <AlertTriangle className="h-9 w-9 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">The page could not be displayed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your data has not been deleted. Refresh the page to retry.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded border bg-secondary p-3 text-xs">
            {this.state.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh application
          </button>
        </div>
      </div>
    );
  }
}
