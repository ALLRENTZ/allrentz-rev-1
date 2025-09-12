import React, { forwardRef } from 'react';
import { useHoverAnimation, useAnimation } from '@/hooks/useAnimation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AnimatedCardProps extends React.ComponentProps<typeof Card> {
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'none';
  animateOnMount?: boolean;
  delay?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    children,
    className,
    hoverEffect = 'lift',
    animateOnMount = false,
    delay = 0,
    selectable = false,
    selected = false,
    onSelect,
    onClick,
    ...props 
  }, forwardedRef) => {
    
    const { ref: mountRef, fadeIn } = useAnimation();
    
    const { ref: hoverRef, hoverProps } = useHoverAnimation(
      hoverEffect === 'lift' 
        ? [{ transform: 'scale(1.02) translateY(-4px)', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)' }]
        : hoverEffect === 'glow'
        ? [{ boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)', borderColor: 'rgb(220, 38, 38)' }]
        : hoverEffect === 'scale'
        ? [{ transform: 'scale(1.05)' }]
        : [{}],
      [{ transform: 'scale(1) translateY(0)', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }]
    );

    // Combine refs
    const combinedRef = (node: HTMLDivElement) => {
      if (mountRef) {
        (mountRef as any).current = node;
      }
      if (hoverRef) {
        (hoverRef as any).current = node;
      }
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else {
          forwardedRef.current = node;
        }
      }
    };

    React.useEffect(() => {
      if (animateOnMount) {
        const timer = setTimeout(() => {
          fadeIn();
        }, delay);
        return () => clearTimeout(timer);
      }
    }, [animateOnMount, delay, fadeIn]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectable && onSelect) {
        onSelect();
      }
      onClick?.(e);
    };

    const getHoverEffectClasses = () => {
      if (hoverEffect === 'none') return '';
      return 'transition-all duration-200 ease-out hover:shadow-lg';
    };

    return (
      <Card
        ref={combinedRef}
        className={cn(
          // Base styles
          'transition-all duration-200 ease-out',
          
          // Hover effects
          getHoverEffectClasses(),
          
          // Selection state
          selectable && [
            'cursor-pointer',
            selected ? 'ring-2 ring-allrentz-red bg-allrentz-red/5' : 'hover:bg-gray-50'
          ],
          
          // Initial state for mount animation
          animateOnMount && 'opacity-0',
          
          className
        )}
        onClick={handleClick}
        {...(hoverEffect !== 'none' ? hoverProps : {})}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';

// Equipment Card with specialized animations
interface EquipmentCardProps extends AnimatedCardProps {
  title: string;
  description?: string;
  image?: string;
  price?: string;
  availability?: 'available' | 'limited' | 'unavailable';
  vendor?: string;
}

export const EquipmentCard = forwardRef<HTMLDivElement, EquipmentCardProps>(
  ({ 
    title, 
    description, 
    image, 
    price, 
    availability = 'available',
    vendor,
    className,
    ...props 
  }, ref) => {
    const getAvailabilityBadge = () => {
      const badges = {
        available: 'bg-green-100 text-green-800 border-green-200',
        limited: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        unavailable: 'bg-red-100 text-red-800 border-red-200'
      };
      
      const labels = {
        available: 'Available',
        limited: 'Limited',
        unavailable: 'Unavailable'
      };

      return (
        <span className={cn(
          'px-2 py-1 text-xs font-medium rounded-full border',
          badges[availability]
        )}>
          {labels[availability]}
        </span>
      );
    };

    return (
      <AnimatedCard
        ref={ref}
        className={cn(
          'overflow-hidden group',
          availability === 'unavailable' && 'opacity-75',
          className
        )}
        hoverEffect={availability === 'unavailable' ? 'none' : 'lift'}
        {...props}
      >
        {image && (
          <div className="relative h-48 overflow-hidden bg-gray-100">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-equipment.jpg';
              }}
            />
            <div className="absolute top-2 right-2">
              {getAvailabilityBadge()}
            </div>
          </div>
        )}
        
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {title}
            </CardTitle>
            {price && (
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-allrentz-red">{price}</div>
                <div className="text-xs text-gray-500">per day</div>
              </div>
            )}
          </div>
          
          {vendor && (
            <div className="text-sm text-gray-600">
              by <span className="font-medium">{vendor}</span>
            </div>
          )}
        </CardHeader>

        {description && (
          <CardContent>
            <CardDescription className="line-clamp-3">
              {description}
            </CardDescription>
          </CardContent>
        )}
      </AnimatedCard>
    );
  }
);

EquipmentCard.displayName = 'EquipmentCard';

// Vendor Card with rating animation
interface VendorCardProps extends AnimatedCardProps {
  name: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  certifications?: string[];
  logo?: string;
}

export const VendorCard = forwardRef<HTMLDivElement, VendorCardProps>(
  ({ 
    name, 
    description, 
    rating = 0, 
    reviewCount = 0, 
    location, 
    certifications = [], 
    logo,
    className,
    ...props 
  }, ref) => {
    const renderStars = (rating: number) => {
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={cn(
                'w-4 h-4',
                star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              )}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-sm text-gray-600 ml-1">
            ({reviewCount})
          </span>
        </div>
      );
    };

    return (
      <AnimatedCard
        ref={ref}
        className={cn('group', className)}
        hoverEffect="glow"
        {...props}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            {logo && (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                <img
                  src={logo}
                  alt={`${name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1">{name}</CardTitle>
              {renderStars(rating)}
              {location && (
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {location}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {description && (
          <CardContent>
            <CardDescription className="line-clamp-2 mb-3">
              {description}
            </CardDescription>
            
            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {certifications.slice(0, 3).map((cert) => (
                  <span
                    key={cert}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {cert}
                  </span>
                ))}
                {certifications.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    +{certifications.length - 3} more
                  </span>
                )}
              </div>
            )}
          </CardContent>
        )}
      </AnimatedCard>
    );
  }
);

VendorCard.displayName = 'VendorCard';

// Stats Card with number animation
interface StatsCardProps extends AnimatedCardProps {
  title: string;
  value: number | string;
  change?: number;
  unit?: string;
  icon?: React.ReactNode;
  animateValue?: boolean;
}

export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ 
    title, 
    value, 
    change, 
    unit, 
    icon, 
    animateValue = true,
    className,
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(animateValue ? 0 : value);

    React.useEffect(() => {
      if (animateValue && typeof value === 'number') {
        const start = typeof displayValue === 'number' ? displayValue : 0;
        const end = value;
        const duration = 1000;
        const startTime = performance.now();

        const updateValue = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(start + (end - start) * easedProgress);
          
          setDisplayValue(current);

          if (progress < 1) {
            requestAnimationFrame(updateValue);
          }
        };

        requestAnimationFrame(updateValue);
      }
    }, [value, animateValue, displayValue]);

    return (
      <AnimatedCard
        ref={ref}
        className={cn('text-center', className)}
        hoverEffect="lift"
        animateOnMount
        {...props}
      >
        <CardContent className="pt-6">
          {icon && (
            <div className="text-3xl mb-2 text-allrentz-red">
              {icon}
            </div>
          )}
          
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {displayValue}{unit}
          </div>
          
          <div className="text-sm text-gray-600 mb-2">
            {title}
          </div>
          
          {typeof change === 'number' && (
            <div className={cn(
              'text-sm font-medium flex items-center justify-center gap-1',
              change >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {change >= 0 ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
              )}
              {Math.abs(change)}%
            </div>
          )}
        </CardContent>
      </AnimatedCard>
    );
  }
);

StatsCard.displayName = 'StatsCard';

export default AnimatedCard;