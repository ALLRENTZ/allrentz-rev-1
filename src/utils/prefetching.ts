// ALLRENTZ Intelligent Resource Prefetching
// Optimizes performance by predicting and preloading resources

interface PrefetchConfig {
  priority: 'low' | 'high' | 'auto';
  timeout?: number;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

interface PrefetchMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  averageLoadTime: number;
  lastAccessed: number;
}

interface ResourcePrediction {
  url: string;
  probability: number;
  reason: string;
  priority: 'low' | 'high';
}

class IntelligentPrefetcher {
  private prefetchedResources = new Set<string>();
  private prefetchPromises = new Map<string, Promise<void>>();
  private userBehavior = new Map<string, PrefetchMetrics>();
  private routeTransitions = new Map<string, Map<string, number>>();
  private equipmentCategories = new Set<string>();
  private recentSearches: string[] = [];
  private userLocation: { lat?: number; lng?: number } = {};

  constructor() {
    this.loadUserBehaviorData();
    this.setupIntersectionObserver();
    this.setupUserBehaviorTracking();
    this.initializeRouteTracking();
  }

  // Main prefetching orchestrator
  public async initiatePrefetching(context: {
    currentRoute: string;
    userRole?: string;
    recentEquipment?: string[];
    searchQuery?: string;
    location?: { lat: number; lng: number };
  }): Promise<void> {
    this.updateContext(context);

    const predictions = this.generatePredictions(context);
    console.log('🎯 Generated prefetch predictions:', predictions);

    // Execute prefetching with prioritization
    await this.executePrefetchingStrategy(predictions);
  }

  // Generate intelligent predictions based on user behavior
  private generatePredictions(context: {
    currentRoute: string;
    userRole?: string;
    recentEquipment?: string[];
    searchQuery?: string;
  }): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];

    // Route-based predictions
    predictions.push(...this.predictRouteTransitions(context.currentRoute));

    // Equipment category predictions
    if (context.recentEquipment) {
      predictions.push(...this.predictEquipmentResources(context.recentEquipment));
    }

    // Search-based predictions
    if (context.searchQuery) {
      predictions.push(...this.predictSearchResources(context.searchQuery));
    }

    // Role-based predictions
    if (context.userRole) {
      predictions.push(...this.predictRoleBasedResources(context.userRole));
    }

    // Geographic predictions
    if (this.userLocation.lat && this.userLocation.lng) {
      predictions.push(...this.predictGeographicResources());
    }

    // Sort by probability and priority
    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10); // Limit to top 10 predictions
  }

  // Predict likely route transitions based on historical data
  private predictRouteTransitions(currentRoute: string): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];
    const transitions = this.routeTransitions.get(currentRoute);

    if (transitions) {
      const totalTransitions = Array.from(transitions.values()).reduce((sum, count) => sum + count, 0);

      for (const [targetRoute, count] of transitions) {
        const probability = count / totalTransitions;
        
        if (probability > 0.2) { // 20% threshold
          predictions.push({
            url: targetRoute,
            probability,
            reason: `High likelihood transition from ${currentRoute}`,
            priority: probability > 0.5 ? 'high' : 'low'
          });

          // Also prefetch route-specific resources
          predictions.push(...this.getRouteResources(targetRoute, probability * 0.8));
        }
      }
    }

    return predictions;
  }

  // Predict equipment-related resources
  private predictEquipmentResources(recentEquipment: string[]): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];

    // Prefetch related equipment categories
    recentEquipment.forEach(category => {
      this.equipmentCategories.add(category);
      
      predictions.push({
        url: `/api/equipment?category=${encodeURIComponent(category)}`,
        probability: 0.8,
        reason: `Recently viewed equipment category: ${category}`,
        priority: 'high'
      });

      // Prefetch equipment images
      predictions.push({
        url: `/assets/equipment/${category.toLowerCase().replace(/\s+/g, '-')}-hero.jpg`,
        probability: 0.6,
        reason: `Equipment category hero image: ${category}`,
        priority: 'low'
      });
    });

    // Prefetch complementary equipment
    const complementary = this.getComplementaryEquipment(recentEquipment);
    complementary.forEach(category => {
      predictions.push({
        url: `/api/equipment?category=${encodeURIComponent(category)}`,
        probability: 0.4,
        reason: `Complementary equipment category: ${category}`,
        priority: 'low'
      });
    });

    return predictions;
  }

  // Predict search-related resources
  private predictSearchResources(searchQuery: string): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];
    this.recentSearches.unshift(searchQuery);
    this.recentSearches = this.recentSearches.slice(0, 5);

    // Prefetch similar searches
    const similarQueries = this.generateSimilarSearches(searchQuery);
    similarQueries.forEach(query => {
      predictions.push({
        url: `/api/search?q=${encodeURIComponent(query)}`,
        probability: 0.3,
        reason: `Similar search query: ${query}`,
        priority: 'low'
      });
    });

    // Prefetch autocomplete suggestions
    predictions.push({
      url: `/api/search/suggestions?q=${encodeURIComponent(searchQuery.slice(0, -1))}`,
      probability: 0.7,
      reason: 'Autocomplete suggestions for partial query',
      priority: 'high'
    });

    return predictions;
  }

  // Role-based resource predictions
  private predictRoleBasedResources(userRole: string): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];

    switch (userRole) {
      case 'customer':
        predictions.push(
          {
            url: '/api/equipment/popular',
            probability: 0.6,
            reason: 'Popular equipment for customers',
            priority: 'high'
          },
          {
            url: '/api/vendors/nearby',
            probability: 0.5,
            reason: 'Nearby vendors for customers',
            priority: 'low'
          }
        );
        break;

      case 'vendor':
        predictions.push(
          {
            url: '/api/requests/active',
            probability: 0.8,
            reason: 'Active equipment requests for vendors',
            priority: 'high'
          },
          {
            url: '/api/analytics/performance',
            probability: 0.4,
            reason: 'Performance analytics for vendors',
            priority: 'low'
          }
        );
        break;

      case 'admin':
        predictions.push(
          {
            url: '/api/admin/dashboard',
            probability: 0.9,
            reason: 'Admin dashboard data',
            priority: 'high'
          },
          {
            url: '/api/admin/reports',
            probability: 0.6,
            reason: 'Admin reports and analytics',
            priority: 'low'
          }
        );
        break;
    }

    return predictions;
  }

  // Geographic-based predictions
  private predictGeographicResources(): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];

    // Prefetch local equipment and vendors
    predictions.push(
      {
        url: `/api/equipment/local?lat=${this.userLocation.lat}&lng=${this.userLocation.lng}`,
        probability: 0.7,
        reason: 'Local equipment based on user location',
        priority: 'high'
      },
      {
        url: `/api/vendors/local?lat=${this.userLocation.lat}&lng=${this.userLocation.lng}`,
        probability: 0.6,
        reason: 'Local vendors based on user location',
        priority: 'low'
      }
    );

    return predictions;
  }

  // Execute prefetching strategy with resource management
  private async executePrefetchingStrategy(predictions: ResourcePrediction[]): Promise<void> {
    const highPriority = predictions.filter(p => p.priority === 'high');
    const lowPriority = predictions.filter(p => p.priority === 'low');

    // Execute high priority prefetches immediately
    if (highPriority.length > 0) {
      console.log('⚡ Prefetching high priority resources:', highPriority.length);
      await Promise.allSettled(
        highPriority.map(prediction => this.prefetchResource(prediction.url, { priority: 'high' }))
      );
    }

    // Execute low priority prefetches with delay and network consideration
    if (lowPriority.length > 0) {
      // Check network conditions
      const networkInfo = this.getNetworkInfo();
      if (networkInfo.effectiveType !== 'slow-2g' && networkInfo.effectiveType !== '2g') {
        console.log('📡 Prefetching low priority resources:', lowPriority.length);
        
        // Delay low priority prefetching
        setTimeout(() => {
          Promise.allSettled(
            lowPriority.map(prediction => 
              this.prefetchResource(prediction.url, { priority: 'low', timeout: 5000 })
            )
          );
        }, 2000);
      }
    }
  }

  // Core prefetching function
  private async prefetchResource(url: string, config: PrefetchConfig = { priority: 'auto' }): Promise<void> {
    if (this.prefetchedResources.has(url)) {
      console.log('📦 Resource already prefetched:', url);
      return;
    }

    // Check if prefetch is already in progress
    if (this.prefetchPromises.has(url)) {
      return this.prefetchPromises.get(url);
    }

    const prefetchPromise = this.executePrefetch(url, config);
    this.prefetchPromises.set(url, prefetchPromise);

    try {
      await prefetchPromise;
      this.prefetchedResources.add(url);
      console.log('✅ Prefetched resource:', url);
    } catch (error) {
      console.warn('❌ Prefetch failed:', url, error);
    } finally {
      this.prefetchPromises.delete(url);
    }
  }

  // Execute the actual prefetch
  private async executePrefetch(url: string, config: PrefetchConfig): Promise<void> {
    const startTime = performance.now();

    // Determine prefetch method based on resource type
    if (url.startsWith('/api/')) {
      // API prefetch using fetch
      await this.prefetchAPI(url, config);
    } else if (this.isImageResource(url)) {
      // Image prefetch using link preload
      await this.prefetchImage(url, config);
    } else if (url.startsWith('/')) {
      // Route prefetch using link prefetch
      await this.prefetchRoute(url, config);
    } else {
      // Generic resource prefetch
      await this.prefetchGeneric(url, config);
    }

    // Track performance metrics
    const loadTime = performance.now() - startTime;
    this.updatePrefetchMetrics(url, loadTime);
  }

  // Prefetch API endpoints
  private async prefetchAPI(url: string, config: PrefetchConfig): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 3000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'X-Prefetch': 'true' },
        priority: config.priority as RequestPriority || 'auto'
      });

      if (response.ok) {
        // Cache the response data
        const data = await response.json();
        this.cacheAPIResponse(url, data);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Prefetch images
  private async prefetchImage(url: string, config: PrefetchConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      
      if (config.crossOrigin) {
        link.crossOrigin = config.crossOrigin;
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload image: ${url}`));

      document.head.appendChild(link);

      // Cleanup after timeout
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, config.timeout || 10000);
    });
  }

  // Prefetch routes
  private async prefetchRoute(url: string, config: PrefetchConfig): Promise<void> {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    
    document.head.appendChild(link);

    // Track prefetch completion
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 1000);
    });
  }

  // Generic resource prefetch
  private async prefetchGeneric(url: string, config: PrefetchConfig): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 5000);

    try {
      await fetch(url, {
        signal: controller.abort(),
        mode: 'no-cors',
        priority: config.priority as RequestPriority || 'auto'
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Update context with user data
  private updateContext(context: { location?: { lat: number; lng: number } }): void {
    if (context.location) {
      this.userLocation = context.location;
    }
  }

  // Helper functions

  private getRouteResources(route: string, baseProbability: number): ResourcePrediction[] {
    const resources = [];
    
    // Route-specific CSS and JS
    resources.push({
      url: `/assets/${route.replace('/', '')}.css`,
      probability: baseProbability,
      reason: `Route-specific stylesheet for ${route}`,
      priority: 'low' as const
    });

    // Route-specific data
    if (route.includes('dashboard')) {
      resources.push({
        url: `/api${route}/data`,
        probability: baseProbability * 0.9,
        reason: `Dashboard data for ${route}`,
        priority: 'high' as const
      });
    }

    return resources;
  }

  private getComplementaryEquipment(categories: string[]): string[] {
    const complementaryMap: Record<string, string[]> = {
      'Steam Boilers': ['Pressure Vessels', 'Safety Equipment'],
      'Frac Tanks': ['Pumping Equipment', 'Containment Systems'],
      'Heavy Machinery': ['Safety Equipment', 'Power Generation'],
      'Power Generation': ['Electrical Equipment', 'Fuel Systems']
    };

    const complementary = new Set<string>();
    categories.forEach(category => {
      const related = complementaryMap[category] || [];
      related.forEach(item => complementary.add(item));
    });

    return Array.from(complementary);
  }

  private generateSimilarSearches(query: string): string[] {
    // Simple similar search generation (in production, use ML/AI)
    const variations = [];
    const words = query.toLowerCase().split(' ');
    
    // Partial queries
    if (words.length > 1) {
      variations.push(words.slice(0, -1).join(' '));
    }
    
    // Synonyms for common industrial terms
    const synonyms: Record<string, string[]> = {
      'boiler': ['steam generator', 'heating unit'],
      'tank': ['vessel', 'container', 'storage'],
      'pump': ['compressor', 'pumping unit'],
      'generator': ['genset', 'power unit']
    };

    words.forEach(word => {
      if (synonyms[word]) {
        synonyms[word].forEach(synonym => {
          variations.push(query.replace(word, synonym));
        });
      }
    });

    return variations.slice(0, 3);
  }

  private isImageResource(url: string): boolean {
    return /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(url);
  }

  private getNetworkInfo(): { effectiveType: string } {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection || { effectiveType: '4g' };
  }

  private cacheAPIResponse(url: string, data: any): void {
    // Simple in-memory cache (in production, use more sophisticated caching)
    const cache = new Map();
    cache.set(url, { data, timestamp: Date.now() });
  }

  private updatePrefetchMetrics(url: string, loadTime: number): void {
    const existing = this.userBehavior.get(url) || {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      averageLoadTime: 0,
      lastAccessed: Date.now()
    };

    existing.totalRequests++;
    existing.averageLoadTime = (existing.averageLoadTime * (existing.totalRequests - 1) + loadTime) / existing.totalRequests;
    existing.lastAccessed = Date.now();

    this.userBehavior.set(url, existing);
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const prefetchUrl = element.getAttribute('data-prefetch');
          if (prefetchUrl) {
            this.prefetchResource(prefetchUrl, { priority: 'low' });
          }
        }
      });
    }, { rootMargin: '50px' });

    // Observe elements with data-prefetch attribute
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-prefetch]').forEach(el => {
        observer.observe(el);
      });
    });
  }

  private setupUserBehaviorTracking(): void {
    // Track route transitions
    let currentRoute = window.location.pathname;
    
    const trackRouteChange = () => {
      const newRoute = window.location.pathname;
      if (newRoute !== currentRoute) {
        this.recordRouteTransition(currentRoute, newRoute);
        currentRoute = newRoute;
      }
    };

    window.addEventListener('popstate', trackRouteChange);
    
    // Override history methods to track programmatic navigation
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      trackRouteChange();
    };
  }

  private recordRouteTransition(from: string, to: string): void {
    if (!this.routeTransitions.has(from)) {
      this.routeTransitions.set(from, new Map());
    }
    
    const transitions = this.routeTransitions.get(from)!;
    transitions.set(to, (transitions.get(to) || 0) + 1);
  }

  private initializeRouteTracking(): void {
    // Initialize with common route patterns
    const commonTransitions = [
      ['/', '/browse'],
      ['/browse', '/equipment/'],
      ['/', '/customer-dashboard'],
      ['/vendor-dashboard', '/equipment/manage']
    ];

    commonTransitions.forEach(([from, to]) => {
      this.recordRouteTransition(from, to);
    });
  }

  private loadUserBehaviorData(): void {
    try {
      const stored = localStorage.getItem('allrentz_prefetch_behavior');
      if (stored) {
        const data = JSON.parse(stored);
        this.userBehavior = new Map(data.userBehavior || []);
        this.routeTransitions = new Map(
          (data.routeTransitions || []).map(([key, value]: [string, [string, number][]]) => [
            key,
            new Map(value)
          ])
        );
        this.equipmentCategories = new Set(data.equipmentCategories || []);
        this.recentSearches = data.recentSearches || [];
      }
    } catch (error) {
      console.warn('Failed to load user behavior data:', error);
    }
  }

  // Public API for manual prefetch requests
  public prefetch(url: string, config?: PrefetchConfig): Promise<void> {
    return this.prefetchResource(url, config);
  }

  public getPrefetchMetrics(): { [url: string]: PrefetchMetrics } {
    return Object.fromEntries(this.userBehavior);
  }

  public clearCache(): void {
    this.prefetchedResources.clear();
    this.prefetchPromises.clear();
    localStorage.removeItem('allrentz_prefetch_behavior');
  }
}

// Export singleton instance
export const intelligentPrefetcher = new IntelligentPrefetcher();

// React hook for components
export const usePrefetching = () => {
  return {
    prefetch: intelligentPrefetcher.prefetch.bind(intelligentPrefetcher),
    metrics: intelligentPrefetcher.getPrefetchMetrics(),
    clearCache: intelligentPrefetcher.clearCache.bind(intelligentPrefetcher)
  };
};

export default intelligentPrefetcher;