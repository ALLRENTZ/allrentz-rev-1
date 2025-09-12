import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  level: 'page' | 'section' | 'component';
  name?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, name } = this.props;
    const { errorId } = this.state;

    // Log error details for monitoring
    console.group(`🚨 ErrorBoundary Caught Error [${name || 'Unknown'}]`);
    console.error('Error ID:', errorId);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: null, // TODO: Get from auth context
      level: this.props.level,
      boundaryName: this.props.name
    };

    // Example: Send to monitoring service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);

    console.info('Error report prepared:', errorReport);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderPageLevelError = () => {
    const { error, errorId } = this.state;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We encountered an unexpected error. Our team has been notified.
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left bg-red-50 border border-red-200 rounded-md p-4">
                <summary className="cursor-pointer text-red-800 font-semibold">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap break-all">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          
          <div className="flex flex-col space-y-3">
            <Button
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={this.handleGoHome}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Go to Homepage</span>
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Error ID: {errorId}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Need help?{' '}
                <a href="mailto:support@allrentz.com" className="text-allrentz-red hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  private renderSectionLevelError = () => {
    const { error, errorId } = this.state;
    
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <span>Section Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-700">
            This section encountered an error and couldn't load properly.
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="bg-red-100 border border-red-300 rounded p-3">
              <summary className="cursor-pointer text-red-800 text-sm font-medium">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              onClick={this.handleRetry}
              size="sm"
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
            
            <p className="text-xs text-gray-600 flex items-center">
              ID: {errorId}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  private renderComponentLevelError = () => {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800">
              Component temporarily unavailable
            </p>
            <button
              onClick={this.handleRetry}
              className="text-sm text-yellow-800 hover:text-yellow-900 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback, level } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use level-appropriate error UI
      switch (level) {
        case 'page':
          return this.renderPageLevelError();
        case 'section':
          return this.renderSectionLevelError();
        case 'component':
          return this.renderComponentLevelError();
        default:
          return this.renderPageLevelError();
      }
    }

    return children;
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary level="component" name={Component.displayName || Component.name} {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for manual error reporting
export const useErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    const errorId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    console.error('Manual Error Report:', {
      errorId,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // In production, send to error reporting
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error service
    }

    return errorId;
  };

  return { reportError };
};

export default ErrorBoundary;