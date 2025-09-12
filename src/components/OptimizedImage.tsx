import React, { useState, useRef, useEffect, memo } from 'react';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  blurDataURL?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  aspectRatio?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoadComplete?: () => void;
  onError?: () => void;
  placeholderColor?: string;
}

const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  className = '',
  fallback,
  blurDataURL,
  priority = false,
  quality = 75,
  sizes,
  aspectRatio,
  objectFit = 'cover',
  loading = 'lazy',
  onLoadComplete,
  onError,
  placeholderColor = 'bg-gray-200',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoadComplete?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Generate optimized src with quality parameters
  const getOptimizedSrc = (originalSrc: string) => {
    if (!originalSrc.startsWith('https://images.unsplash.com')) {
      return originalSrc;
    }
    
    // Add Unsplash optimization parameters
    const url = new URL(originalSrc);
    if (quality && quality !== 75) {
      url.searchParams.set('q', quality.toString());
    }
    if (props.width) {
      url.searchParams.set('w', props.width.toString());
    }
    if (props.height) {
      url.searchParams.set('h', props.height.toString());
    }
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('auto', 'format');
    
    return url.toString();
  };

  // Generate responsive srcSet for different screen densities
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc.startsWith('https://images.unsplash.com') || !props.width) {
      return undefined;
    }

    const baseWidth = typeof props.width === 'string' ? parseInt(props.width) : props.width;
    const densities = [1, 1.5, 2];
    
    return densities
      .map(density => {
        const width = Math.round(baseWidth * density);
        const url = new URL(baseSrc);
        url.searchParams.set('w', width.toString());
        if (props.height) {
          const height = typeof props.height === 'string' ? parseInt(props.height) : props.height;
          url.searchParams.set('h', Math.round(height * density).toString());
        }
        return `${url.toString()} ${density}x`;
      })
      .join(', ');
  };

  const optimizedSrc = getOptimizedSrc(src);
  const srcSet = generateSrcSet(src);

  // Default fallback component
  const defaultFallback = (
    <div 
      className={`flex items-center justify-center ${placeholderColor} ${className}`}
      style={{ aspectRatio: aspectRatio?.toString() }}
    >
      <ImageIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
    </div>
  );

  // Container styles for aspect ratio and object fit
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(aspectRatio && { aspectRatio: aspectRatio.toString() }),
  };

  const imageStyles: React.CSSProperties = {
    objectFit,
    transition: isLoading ? 'none' : 'opacity 0.3s ease-in-out',
    opacity: isLoading ? 0 : 1,
  };

  // Show error fallback
  if (hasError) {
    return <>{fallback || defaultFallback}</>;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={containerStyles}
    >
      {/* Blur placeholder */}
      {blurDataURL && isLoading && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Loading placeholder */}
      {isLoading && !blurDataURL && (
        <div className={`absolute inset-0 animate-pulse ${placeholderColor}`} />
      )}

      {/* Main image */}
      {(isInView || priority) && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full"
          style={imageStyles}
          {...props}
        />
      )}

      {/* Loading indicator overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-allrentz-red" />
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Hook for preloading images
export const useImagePreloader = () => {
  const preloadImage = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
      img.src = src;
    });
  };

  const preloadImages = async (sources: string[]) => {
    try {
      await Promise.all(sources.map(preloadImage));
    } catch (error) {
      console.warn('Image preloading failed:', error);
    }
  };

  return { preloadImage, preloadImages };
};

// Utility function to generate blur data URLs
export const generateBlurDataURL = (width = 8, height = 8) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient blur placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

export default OptimizedImage;