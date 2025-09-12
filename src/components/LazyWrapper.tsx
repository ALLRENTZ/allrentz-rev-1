import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  name?: string;
}

// Higher-order component for intelligent lazy loading with error boundaries
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWrapperProps = {}
) {
  const LazyComponent = React.lazy(importFn);
  
  const WrappedComponent: React.FC<P> = (props) => {
    const { fallback, errorFallback, name } = options;
    
    return (
      <ErrorBoundary 
        level="component" 
        name={name || 'Lazy Component'}
        fallback={errorFallback}
      >
        <Suspense fallback={fallback || <LoadingSkeleton variant="card" />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withLazyLoading(${name || 'Component'})`;
  return WrappedComponent;
}

// Pre-configured lazy wrappers for common component types
export const LazyCard = withLazyLoading;
export const LazyModal = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, {
    fallback: <div className="animate-pulse bg-gray-200 rounded-lg h-64 w-full" />,
    name: 'Modal Component'
  });

export const LazyChart = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, {
    fallback: <LoadingSkeleton variant="dashboard" />,
    name: 'Chart Component'
  });

export const LazyForm = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, {
    fallback: <LoadingSkeleton variant="form" />,
    name: 'Form Component'
  });

// Preload strategy for anticipated component loads
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>();
  
  static preload(importFn: () => Promise<any>, componentName: string) {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }
    
    // Preload component in background
    importFn().catch((error) => {
      console.warn(`Failed to preload component ${componentName}:`, error);
    });
    
    this.preloadedComponents.add(componentName);
  }
  
  static preloadOnHover(
    importFn: () => Promise<any>, 
    componentName: string
  ) {
    return {
      onMouseEnter: () => this.preload(importFn, componentName),
      onFocus: () => this.preload(importFn, componentName),
    };
  }
}

export default withLazyLoading;