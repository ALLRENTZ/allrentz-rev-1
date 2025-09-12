import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';
import { useState, useEffect } from 'react';

export interface PerformanceMetrics {
  CLS: number | null; // Cumulative Layout Shift
  INP: number | null; // Interaction to Next Paint
  FCP: number | null; // First Contentful Paint
  LCP: number | null; // Largest Contentful Paint
  TTFB: number | null; // Time to First Byte
}

export interface PerformanceThresholds {
  CLS: { good: number; poor: number };
  INP: { good: number; poor: number };
  FCP: { good: number; poor: number };
  LCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
}

// Core Web Vitals thresholds (Google's standards)
export const WEB_VITALS_THRESHOLDS: PerformanceThresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 }
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    CLS: null,
    INP: null,
    FCP: null,
    LCP: null,
    TTFB: null
  };

  private observers: PerformanceObserver[] = [];
  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];

  constructor() {
    this.initializeWebVitals();
    this.setupPerformanceObservers();
    this.trackRouteChanges();
  }

  // Initialize Core Web Vitals tracking
  private initializeWebVitals(): void {
    onCLS((metric) => this.handleMetric(metric, 'CLS'));
    onINP((metric) => this.handleMetric(metric, 'INP'));
    onFCP((metric) => this.handleMetric(metric, 'FCP'));
    onLCP((metric) => this.handleMetric(metric, 'LCP'));
    onTTFB((metric) => this.handleMetric(metric, 'TTFB'));
  }

  private handleMetric(metric: Metric, type: keyof PerformanceMetrics): void {
    this.metrics[type] = metric.value;
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const threshold = WEB_VITALS_THRESHOLDS[type];
      const status = metric.value <= threshold.good ? 'GOOD' : 
                    metric.value <= threshold.poor ? 'NEEDS_IMPROVEMENT' : 'POOR';
      
      console.log(`📊 ${type}: ${metric.value.toFixed(2)}ms [${status}]`, {
        metric,
        threshold,
        rating: metric.rating
      });
    }

    // Report to analytics service
    this.reportMetric(metric, type);
    
    // Notify listeners
    this.listeners.forEach(listener => listener(this.metrics));
  }

  // Set up additional performance observers
  private setupPerformanceObservers(): void {
    // Long Task API - detect blocking tasks > 50ms
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn(`🐌 Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
              
              // Report long tasks for optimization
              this.reportLongTask({
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
                url: window.location.href
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }

      // Navigation timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.reportNavigation(entry as PerformanceNavigationTiming);
          }
        });

        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // Resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resource = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resource.duration > 1000) {
              console.warn(`🐌 Slow resource: ${resource.name} (${resource.duration.toFixed(2)}ms)`);
            }

            // Track large resources
            if (resource.transferSize && resource.transferSize > 500000) { // 500KB
              console.warn(`📦 Large resource: ${resource.name} (${(resource.transferSize / 1024).toFixed(2)}KB)`);
            }
          }
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  // Track route changes for SPA performance
  private trackRouteChanges(): void {
    let previousPath = window.location.pathname;
    
    const trackRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== previousPath) {
        const startTime = performance.now();
        
        // Wait for next frame to measure route change performance
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          console.log(`🚪 Route change: ${previousPath} → ${currentPath} (${duration.toFixed(2)}ms)`);
          
          this.reportRouteChange({
            from: previousPath,
            to: currentPath,
            duration,
            timestamp: Date.now()
          });
          
          previousPath = currentPath;
        });
      }
    };

    // Listen to history changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      trackRouteChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      trackRouteChange();
    };

    window.addEventListener('popstate', trackRouteChange);
  }

  // Report metric to analytics service
  private reportMetric(metric: Metric, type: string): void {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with your analytics service (GA4, Mixpanel, etc.)
      // Example:
      // gtag('event', 'web_vitals', {
      //   event_category: 'Web Vitals',
      //   event_label: type,
      //   value: Math.round(metric.value),
      //   custom_map: { metric_id: metric.id }
      // });
      
      console.log(`📈 Metric ${type}:`, metric.value);
    }
  }

  private reportLongTask(task: {
    duration: number;
    startTime: number;
    name: string;
    url: string;
  }): void {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Report to monitoring service
      console.log('Long task reported:', task);
    }
  }

  private reportNavigation(navigation: PerformanceNavigationTiming): void {
    const metrics = {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      tls: navigation.requestStart - navigation.secureConnectionStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      download: navigation.responseEnd - navigation.responseStart,
      domInteractive: navigation.domInteractive - navigation.navigationStart,
      domComplete: navigation.domComplete - navigation.navigationStart,
      loadComplete: navigation.loadEventEnd - navigation.navigationStart
    };

    if (process.env.NODE_ENV !== 'production') {
      console.table(metrics);
    }

    // Report navigation timing
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to analytics
      console.log('Navigation metrics:', metrics);
    }
  }

  private reportRouteChange(change: {
    from: string;
    to: string;
    duration: number;
    timestamp: number;
  }): void {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Report to analytics
      console.log('Route change tracked:', change);
    }
  }

  // Public API
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public onMetricsUpdate(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const scores = Object.entries(this.metrics).map(([key, value]) => {
      if (value === null) return null;
      
      const threshold = WEB_VITALS_THRESHOLDS[key as keyof PerformanceThresholds];
      if (value <= threshold.good) return 100;
      if (value <= threshold.poor) return 70;
      return 40;
    }).filter(score => score !== null);

    if (scores.length === 0) return 'F';

    const average = scores.reduce((sum, score) => sum + (score || 0), 0) / scores.length;
    
    if (average >= 90) return 'A';
    if (average >= 80) return 'B';
    if (average >= 70) return 'C';
    if (average >= 60) return 'D';
    return 'F';
  }

  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.listeners = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());
  const [grade, setGrade] = useState<'A' | 'B' | 'C' | 'D' | 'F'>('F');

  useEffect(() => {
    const unsubscribe = performanceMonitor.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
      setGrade(performanceMonitor.getPerformanceGrade());
    });

    return unsubscribe;
  }, []);

  return { metrics, grade };
};

// Performance budget checker
export const checkPerformanceBudget = (budgets: Partial<PerformanceThresholds>) => {
  const metrics = performanceMonitor.getMetrics();
  const violations = [];

  for (const [key, budget] of Object.entries(budgets)) {
    const value = metrics[key as keyof PerformanceMetrics];
    if (value !== null && budget && value > budget.good) {
      violations.push({
        metric: key,
        value,
        threshold: budget.good,
        severity: value > budget.poor ? 'critical' : 'warning'
      });
    }
  }

  return violations;
};

export default performanceMonitor;