import React, { useEffect, useRef } from 'react';
import { usePrefetchOnHover, usePrefetchOnIntersection } from '@/hooks/usePrefetchOnHover';
import { intelligentPrefetcher } from '@/utils/prefetching';

interface SmartPrefetchProps {
  children: React.ReactNode;
  url: string;
  mode?: 'hover' | 'intersection' | 'both';
  priority?: 'low' | 'high';
  delay?: number;
  className?: string;
}

export const SmartPrefetch: React.FC<SmartPrefetchProps> = ({
  children,
  url,
  mode = 'hover',
  priority = 'low',
  delay = 100,
  className = ''
}) => {
  const { prefetchProps } = usePrefetchOnHover(url, {
    delay,
    enabled: mode === 'hover' || mode === 'both'
  });

  const intersectionRef = usePrefetchOnIntersection(url, {
    rootMargin: '50px',
    triggerOnce: true
  });

  // Combine refs when using both modes
  const combinedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'both' || mode === 'intersection') {
      if (combinedRef.current && intersectionRef.current !== combinedRef.current) {
        (intersectionRef as any).current = combinedRef.current;
      }
    }
  }, [mode, intersectionRef]);

  const wrapperProps = {
    ref: mode === 'both' || mode === 'intersection' ? combinedRef : undefined,
    className,
    ...(mode === 'hover' || mode === 'both' ? prefetchProps : {})
  };

  return <div {...wrapperProps}>{children}</div>;
};

// Component for prefetching equipment images
interface EquipmentImagePrefetchProps {
  category: string;
  equipmentId?: string;
  children: React.ReactNode;
  className?: string;
}

export const EquipmentImagePrefetch: React.FC<EquipmentImagePrefetchProps> = ({
  category,
  equipmentId,
  children,
  className = ''
}) => {
  const imageUrls = [
    `/assets/equipment/${category.toLowerCase().replace(/\s+/g, '-')}-hero.jpg`,
    ...(equipmentId ? [`/api/equipment/${equipmentId}/images`] : []),
    `/assets/equipment/${category.toLowerCase().replace(/\s+/g, '-')}-thumbnail.jpg`
  ];

  const { prefetchProps } = usePrefetchOnHover('', { enabled: false });

  const handleMouseEnter = () => {
    console.log('🖼️ Prefetching equipment images:', imageUrls.length);
    imageUrls.forEach(url => {
      intelligentPrefetcher.prefetch(url, { 
        priority: 'low',
        timeout: 3000 
      }).catch(error => {
        console.warn('Equipment image prefetch failed:', url, error);
      });
    });
  };

  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
};

// Component for intelligent route prefetching
interface RoutePrefetchProps {
  targetRoute: string;
  children: React.ReactNode;
  prefetchData?: boolean;
  className?: string;
}

export const RoutePrefetch: React.FC<RoutePrefetchProps> = ({
  targetRoute,
  children,
  prefetchData = true,
  className = ''
}) => {
  const resources = [
    targetRoute,
    ...(prefetchData ? [`/api${targetRoute}`, `/api${targetRoute}/data`] : [])
  ];

  const { prefetchProps } = usePrefetchOnHover('', { 
    enabled: false,
    delay: 200 
  });

  const handleMouseEnter = () => {
    console.log('🛣️ Prefetching route resources:', targetRoute);
    resources.forEach(resource => {
      intelligentPrefetcher.prefetch(resource, { 
        priority: 'low',
        timeout: 2000 
      }).catch(error => {
        console.warn('Route prefetch failed:', resource, error);
      });
    });
  };

  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
};

// Component for search suggestion prefetching
interface SearchPrefetchProps {
  searchQuery: string;
  children: React.ReactNode;
  className?: string;
}

export const SearchPrefetch: React.FC<SearchPrefetchProps> = ({
  searchQuery,
  children,
  className = ''
}) => {
  const handleFocus = () => {
    if (searchQuery.length > 2) {
      const suggestionUrls = [
        `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`,
        `/api/equipment/search?q=${encodeURIComponent(searchQuery)}`,
        `/api/vendors/search?q=${encodeURIComponent(searchQuery)}`
      ];

      console.log('🔍 Prefetching search resources:', suggestionUrls.length);
      suggestionUrls.forEach(url => {
        intelligentPrefetcher.prefetch(url, { 
          priority: 'high',
          timeout: 1500 
        }).catch(error => {
          console.warn('Search prefetch failed:', url, error);
        });
      });
    }
  };

  return (
    <div 
      className={className}
      onFocus={handleFocus}
    >
      {children}
    </div>
  );
};

// Component for vendor detail prefetching
interface VendorPrefetchProps {
  vendorId: string;
  children: React.ReactNode;
  className?: string;
}

export const VendorPrefetch: React.FC<VendorPrefetchProps> = ({
  vendorId,
  children,
  className = ''
}) => {
  const vendorUrls = [
    `/api/vendors/${vendorId}`,
    `/api/vendors/${vendorId}/equipment`,
    `/api/vendors/${vendorId}/reviews`,
    `/api/vendors/${vendorId}/certifications`
  ];

  const { prefetchProps } = usePrefetchOnHover('', { 
    enabled: false,
    delay: 150 
  });

  const handleMouseEnter = () => {
    console.log('🏢 Prefetching vendor details:', vendorId);
    vendorUrls.forEach(url => {
      intelligentPrefetcher.prefetch(url, { 
        priority: 'high',
        timeout: 2000 
      }).catch(error => {
        console.warn('Vendor prefetch failed:', url, error);
      });
    });
  };

  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
};

// HOC for adding prefetch capabilities to any component
export function withPrefetch<T extends object>(
  Component: React.ComponentType<T>,
  prefetchConfig: {
    urls?: string[];
    mode?: 'hover' | 'intersection' | 'both';
    priority?: 'low' | 'high';
  }
) {
  return function PrefetchedComponent(props: T) {
    const { urls = [], mode = 'hover', priority = 'low' } = prefetchConfig;

    const handlePrefetch = () => {
      if (urls.length === 0) return;

      console.log('🎯 HOC prefetch triggered:', urls.length, 'resources');
      urls.forEach(url => {
        intelligentPrefetcher.prefetch(url, { 
          priority,
          timeout: priority === 'high' ? 2000 : 4000 
        }).catch(error => {
          console.warn('HOC prefetch failed:', url, error);
        });
      });
    };

    const wrapperProps = mode === 'hover' ? {
      onMouseEnter: handlePrefetch,
      onFocus: handlePrefetch
    } : {};

    return (
      <div {...wrapperProps}>
        <Component {...props} />
      </div>
    );
  };
}

// Context-aware prefetching component
interface ContextPrefetchProps {
  userRole?: string;
  currentRoute: string;
  recentEquipment?: string[];
  searchHistory?: string[];
  children: React.ReactNode;
}

export const ContextPrefetch: React.FC<ContextPrefetchProps> = ({
  userRole,
  currentRoute,
  recentEquipment,
  searchHistory,
  children
}) => {
  useEffect(() => {
    // Initialize intelligent prefetching with current context
    intelligentPrefetcher.initiatePrefetching({
      currentRoute,
      userRole,
      recentEquipment,
      searchQuery: searchHistory?.[0]
    });
  }, [userRole, currentRoute, recentEquipment, searchHistory]);

  return <>{children}</>;
};

export default SmartPrefetch;