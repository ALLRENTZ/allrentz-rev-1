import React, { forwardRef } from 'react';
import { useButtonAnimation } from '@/hooks/useAnimation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends React.ComponentProps<typeof Button> {
  ripple?: boolean;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    children, 
    className, 
    ripple = true, 
    loading = false,
    success = false,
    error = false,
    disabled,
    onClick,
    ...props 
  }, forwardedRef) => {
    const { ref, buttonProps } = useButtonAnimation();

    // Combine refs
    const combinedRef = (node: HTMLButtonElement) => {
      if (ref) {
        (ref as any).current = node;
      }
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else {
          forwardedRef.current = node;
        }
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        buttonProps.onClick();
      }
      onClick?.(e);
    };

    const getStatusClass = () => {
      if (success) return 'bg-green-500 hover:bg-green-600 text-white';
      if (error) return 'bg-red-500 hover:bg-red-600 text-white';
      return '';
    };

    const animatedProps = ripple && !disabled && !loading ? {
      onMouseDown: buttonProps.onMouseDown,
      onMouseUp: buttonProps.onMouseUp,
    } : {};

    return (
      <Button
        ref={combinedRef}
        className={cn(
          // Base transition
          'transition-all duration-200 ease-out',
          
          // Hover effects when not disabled/loading
          !disabled && !loading && [
            'hover:shadow-md hover:-translate-y-0.5',
            'active:translate-y-0 active:shadow-sm'
          ],
          
          // Loading state
          loading && 'opacity-75 cursor-not-allowed',
          
          // Status-specific classes
          getStatusClass(),
          
          // Custom className
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...animatedProps}
        {...props}
      >
        <div className="flex items-center justify-center gap-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {success && !loading && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {error && !loading && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {children}
        </div>
      </Button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

// Specialized button variants

export const PrimaryAnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (props, ref) => (
    <AnimatedButton
      ref={ref}
      className="bg-allrentz-red hover:bg-allrentz-red/90 text-white shadow-lg hover:shadow-xl"
      {...props}
    />
  )
);

PrimaryAnimatedButton.displayName = 'PrimaryAnimatedButton';

export const SecondaryAnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (props, ref) => (
    <AnimatedButton
      ref={ref}
      variant="outline"
      className="border-allrentz-gray hover:bg-allrentz-gray hover:text-white"
      {...props}
    />
  )
);

SecondaryAnimatedButton.displayName = 'SecondaryAnimatedButton';

export const FloatingActionButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, children, ...props }, ref) => (
    <AnimatedButton
      ref={ref}
      size="lg"
      className={cn(
        'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl',
        'bg-allrentz-red hover:bg-allrentz-red/90 text-white',
        'hover:scale-110 hover:shadow-3xl',
        'z-50',
        className
      )}
      {...props}
    >
      {children}
    </AnimatedButton>
  )
);

FloatingActionButton.displayName = 'FloatingActionButton';

export default AnimatedButton;