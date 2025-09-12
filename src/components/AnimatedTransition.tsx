import React, { useEffect, useRef, useState } from 'react';
import { animationOrchestrator } from '@/utils/animations';
import { cn } from '@/lib/utils';

interface AnimatedTransitionProps {
  show: boolean;
  children: React.ReactNode;
  type?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';
  duration?: number;
  delay?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  show,
  children,
  type = 'fade',
  duration = 300,
  delay = 0,
  className = '',
  onEnter,
  onExit
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (!ref.current) return;

    if (show) {
      setShouldRender(true);
      onEnter?.();
      
      // Wait for next frame to ensure element is rendered
      requestAnimationFrame(() => {
        if (!ref.current) return;

        const enterKeyframes = getEnterKeyframes(type);
        
        setTimeout(() => {
          animationOrchestrator.animate(ref.current!, enterKeyframes, {
            duration,
            easing: 'ease-out',
            fill: 'forwards'
          });
        }, delay);
      });
    } else {
      onExit?.();
      
      const exitKeyframes = getExitKeyframes(type);
      const animation = animationOrchestrator.animate(ref.current, exitKeyframes, {
        duration: duration * 0.8, // Exit slightly faster
        easing: 'ease-in',
        fill: 'forwards'
      });

      if (animation) {
        animation.addEventListener('finish', () => {
          setShouldRender(false);
        });
      } else {
        // Fallback if animations are disabled
        setTimeout(() => setShouldRender(false), duration * 0.8);
      }
    }
  }, [show, type, duration, delay, onEnter, onExit]);

  if (!shouldRender) return null;

  const initialStyle = getInitialStyle(type, show);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={initialStyle}
    >
      {children}
    </div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  direction = 'horizontal',
  className = ''
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const keyframes = direction === 'horizontal'
      ? [
          { opacity: 0, transform: 'translateX(20px)' },
          { opacity: 1, transform: 'translateX(0)' }
        ]
      : [
          { opacity: 0, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ];

    animationOrchestrator.animate(ref.current, keyframes, {
      duration: 400,
      easing: 'ease-out'
    });
  }, [direction]);

  return (
    <div ref={ref} className={cn('opacity-0', className)}>
      {children}
    </div>
  );
};

// List item stagger animation
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 100,
  direction = 'up',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.children;
    
    Array.from(items).forEach((item, index) => {
      const keyframes = getDirectionKeyframes(direction);
      
      setTimeout(() => {
        animationOrchestrator.animate(item as Element, keyframes, {
          duration: 400,
          easing: 'ease-out',
          fill: 'forwards'
        });
      }, index * staggerDelay);
    });
  }, [staggerDelay, direction]);

  return (
    <div ref={containerRef} className={cn(className)}>
      {children.map((child, index) => (
        <div key={index} style={{ opacity: 0 }}>
          {child}
        </div>
      ))}
    </div>
  );
};

// Modal transition wrapper
interface ModalTransitionProps {
  show: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  show,
  children,
  onClose,
  closeOnBackdropClick = true
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      
      // Animate in
      requestAnimationFrame(() => {
        if (backdropRef.current && modalRef.current) {
          const { backdrop, modal } = animationOrchestrator.animateModalEntrance(
            backdropRef.current,
            modalRef.current
          );
        }
      });
    } else if (shouldRender) {
      document.body.style.overflow = '';
      
      // Animate out
      if (backdropRef.current && modalRef.current) {
        const backdropAnimation = animationOrchestrator.animate(backdropRef.current, [
          { opacity: 1 },
          { opacity: 0 }
        ], { duration: 200, easing: 'ease-in' });

        const modalAnimation = animationOrchestrator.animate(modalRef.current, [
          { opacity: 1, transform: 'scale(1) translateY(0)' },
          { opacity: 0, transform: 'scale(0.95) translateY(-20px)' }
        ], { duration: 200, easing: 'ease-in' });

        modalAnimation?.addEventListener('finish', () => {
          setShouldRender(false);
        });
      } else {
        setTimeout(() => setShouldRender(false), 200);
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [show, shouldRender]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && closeOnBackdropClick) {
      onClose?.();
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      style={{ opacity: 0 }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
        style={{ opacity: 0, transform: 'scale(0.95) translateY(-20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Toast transition wrapper
interface ToastTransitionProps {
  show: boolean;
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
  onClose?: () => void;
}

export const ToastTransition: React.FC<ToastTransitionProps> = ({
  show,
  children,
  position = 'top-right',
  duration = 4000,
  onClose
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(show);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      
      requestAnimationFrame(() => {
        if (ref.current) {
          animationOrchestrator.animateToastEntrance(ref.current, 'right');
        }
      });

      // Auto close
      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          onClose?.();
        }, duration);
      }
    } else if (shouldRender) {
      if (ref.current) {
        const animation = animationOrchestrator.animate(ref.current, [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(100%)' }
        ], { duration: 200, easing: 'ease-in' });

        animation?.addEventListener('finish', () => {
          setShouldRender(false);
        });
      } else {
        setTimeout(() => setShouldRender(false), 200);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration, onClose, shouldRender]);

  if (!shouldRender) return null;

  const getPositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    };
    return positions[position];
  };

  return (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 max-w-sm',
        getPositionClasses()
      )}
      style={{ opacity: 0, transform: 'translateX(100%)' }}
    >
      {children}
    </div>
  );
};

// Utility functions
function getEnterKeyframes(type: string): Keyframe[] {
  switch (type) {
    case 'slide':
    case 'slideUp':
      return [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ];
    case 'slideDown':
      return [
        { opacity: 0, transform: 'translateY(-20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ];
    case 'slideLeft':
      return [
        { opacity: 0, transform: 'translateX(20px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ];
    case 'slideRight':
      return [
        { opacity: 0, transform: 'translateX(-20px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ];
    case 'scale':
      return [
        { opacity: 0, transform: 'scale(0.9)' },
        { opacity: 1, transform: 'scale(1)' }
      ];
    default: // fade
      return [
        { opacity: 0 },
        { opacity: 1 }
      ];
  }
}

function getExitKeyframes(type: string): Keyframe[] {
  switch (type) {
    case 'slide':
    case 'slideUp':
      return [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-20px)' }
      ];
    case 'slideDown':
      return [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(20px)' }
      ];
    case 'slideLeft':
      return [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(-20px)' }
      ];
    case 'slideRight':
      return [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(20px)' }
      ];
    case 'scale':
      return [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.9)' }
      ];
    default: // fade
      return [
        { opacity: 1 },
        { opacity: 0 }
      ];
  }
}

function getInitialStyle(type: string, show: boolean): React.CSSProperties {
  if (show) {
    // Starting state for enter animation
    switch (type) {
      case 'slide':
      case 'slideUp':
        return { opacity: 0, transform: 'translateY(20px)' };
      case 'slideDown':
        return { opacity: 0, transform: 'translateY(-20px)' };
      case 'slideLeft':
        return { opacity: 0, transform: 'translateX(20px)' };
      case 'slideRight':
        return { opacity: 0, transform: 'translateX(-20px)' };
      case 'scale':
        return { opacity: 0, transform: 'scale(0.9)' };
      default: // fade
        return { opacity: 0 };
    }
  }
  return { opacity: 1 };
}

function getDirectionKeyframes(direction: string): Keyframe[] {
  switch (direction) {
    case 'down':
      return [
        { opacity: 0, transform: 'translateY(-20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ];
    case 'left':
      return [
        { opacity: 0, transform: 'translateX(20px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ];
    case 'right':
      return [
        { opacity: 0, transform: 'translateX(-20px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ];
    default: // up
      return [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ];
  }
}

export default AnimatedTransition;