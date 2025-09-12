import { useRef, useCallback, useEffect } from 'react';
import { intelligentPrefetcher } from '@/utils/prefetching';

interface PrefetchOnHoverOptions {
  delay?: number;
  threshold?: number;
  enabled?: boolean;
}

interface UsePrefetchOnHoverReturn {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  prefetchProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

export const usePrefetchOnHover = (
  url: string,
  options: PrefetchOnHoverOptions = {}
): UsePrefetchOnHoverReturn => {
  const {
    delay = 100,
    threshold = 0.65,
    enabled = true
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchedRef = useRef(false);
  const hoverStartRef = useRef<number>(0);

  const clearPendingPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPrefetch = useCallback(() => {
    if (!enabled || prefetchedRef.current) return;

    hoverStartRef.current = Date.now();
    
    timeoutRef.current = setTimeout(async () => {
      try {
        console.log('🎯 Hover prefetch triggered:', url);
        await intelligentPrefetcher.prefetch(url, { 
          priority: 'high',
          timeout: 2000 
        });
        prefetchedRef.current = true;
      } catch (error) {
        console.warn('Hover prefetch failed:', url, error);
      }
    }, delay);
  }, [url, delay, enabled]);

  const handleMouseEnter = useCallback(() => {
    if (!enabled) return;
    startPrefetch();
  }, [enabled, startPrefetch]);

  const handleMouseLeave = useCallback(() => {
    if (!enabled) return;
    
    clearPendingPrefetch();
    
    // Track hover duration for learning
    if (hoverStartRef.current > 0) {
      const duration = Date.now() - hoverStartRef.current;
      
      // If user hovered for less than threshold, they might not be interested
      if (duration < threshold * 1000 && prefetchedRef.current) {
        console.log('⚡ Short hover detected, resource may not be needed:', url);
      }
      
      hoverStartRef.current = 0;
    }
  }, [enabled, threshold, url, clearPendingPrefetch]);

  const handleFocus = useCallback(() => {
    if (!enabled) return;
    
    // Keyboard navigation - prefetch immediately
    startPrefetch();
  }, [enabled, startPrefetch]);

  const handleBlur = useCallback(() => {
    if (!enabled) return;
    clearPendingPrefetch();
  }, [enabled, clearPendingPrefetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPendingPrefetch();
    };
  }, [clearPendingPrefetch]);

  const prefetchProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur
  };

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    prefetchProps
  };
};

// Hook for prefetching multiple resources on hover
export const usePrefetchMultipleOnHover = (
  urls: string[],
  options: PrefetchOnHoverOptions = {}
): UsePrefetchOnHoverReturn => {
  const {
    delay = 150,
    enabled = true
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchedRef = useRef(new Set<string>());

  const clearPendingPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPrefetch = useCallback(() => {
    if (!enabled || urls.length === 0) return;

    timeoutRef.current = setTimeout(async () => {
      console.log('🎯 Multiple hover prefetch triggered:', urls.length, 'resources');
      
      // Prefetch in parallel with different priorities
      const prefetchPromises = urls.map((url, index) => {
        if (prefetchedRef.current.has(url)) return Promise.resolve();
        
        const priority = index < 2 ? 'high' : 'low'; // First 2 are high priority
        const timeout = priority === 'high' ? 2000 : 5000;
        
        return intelligentPrefetcher.prefetch(url, { priority, timeout })
          .then(() => {
            prefetchedRef.current.add(url);
          })
          .catch(error => {
            console.warn('Multiple hover prefetch failed:', url, error);
          });
      });

      await Promise.allSettled(prefetchPromises);
    }, delay);
  }, [urls, delay, enabled]);

  const handleMouseEnter = useCallback(() => {
    if (!enabled) return;
    startPrefetch();
  }, [enabled, startPrefetch]);

  const handleMouseLeave = useCallback(() => {
    if (!enabled) return;
    clearPendingPrefetch();
  }, [enabled, clearPendingPrefetch]);

  const handleFocus = useCallback(() => {
    if (!enabled) return;
    startPrefetch();
  }, [enabled, startPrefetch]);

  const handleBlur = useCallback(() => {
    if (!enabled) return;
    clearPendingPrefetch();
  }, [enabled, clearPendingPrefetch]);

  useEffect(() => {
    return () => {
      clearPendingPrefetch();
    };
  }, [clearPendingPrefetch]);

  const prefetchProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur
  };

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    prefetchProps
  };
};

// Hook for intersection-based prefetching (viewport awareness)
export const usePrefetchOnIntersection = (
  url: string,
  options: {
    rootMargin?: string;
    threshold?: number;
    triggerOnce?: boolean;
  } = {}
) => {
  const {
    rootMargin = '100px',
    threshold = 0.1,
    triggerOnce = true
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const prefetchedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || prefetchedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !prefetchedRef.current) {
            console.log('👀 Intersection prefetch triggered:', url);
            
            intelligentPrefetcher.prefetch(url, { 
              priority: 'low',
              timeout: 3000 
            }).catch(error => {
              console.warn('Intersection prefetch failed:', url, error);
            });

            prefetchedRef.current = true;
            
            if (triggerOnce) {
              observer.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [url, rootMargin, threshold, triggerOnce]);

  return elementRef;
};

// Hook for route-based prefetching
export const usePrefetchRoute = (
  targetRoute: string,
  options: {
    prefetchData?: boolean;
    prefetchAssets?: boolean;
  } = {}
) => {
  const {
    prefetchData = true,
    prefetchAssets = false
  } = options;

  const prefetch = useCallback(async () => {
    const resourcesToPreload = [];

    // Add the route itself
    resourcesToPreload.push(targetRoute);

    // Add route-specific data
    if (prefetchData) {
      resourcesToPreload.push(`/api${targetRoute}/data`);
    }

    // Add route-specific assets
    if (prefetchAssets) {
      const routeName = targetRoute.replace('/', '') || 'home';
      resourcesToPreload.push(
        `/assets/${routeName}.css`,
        `/assets/images/${routeName}-hero.jpg`
      );
    }

    console.log('🛣️ Route prefetch triggered:', targetRoute, resourcesToPreload.length, 'resources');

    const prefetchPromises = resourcesToPreload.map(resource =>
      intelligentPrefetcher.prefetch(resource, { 
        priority: 'low',
        timeout: 4000 
      }).catch(error => {
        console.warn('Route prefetch failed:', resource, error);
      })
    );

    await Promise.allSettled(prefetchPromises);
  }, [targetRoute, prefetchData, prefetchAssets]);

  return { prefetch };
};

export default usePrefetchOnHover;