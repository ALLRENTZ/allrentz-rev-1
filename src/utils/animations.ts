// ALLRENTZ Animation System - Enterprise-grade micro-interactions
// Provides consistent, purposeful animations across the platform

export type AnimationTiming = 'fast' | 'normal' | 'slow';
export type AnimationEasing = 'ease-out' | 'ease-in' | 'ease-in-out' | 'bounce' | 'elastic';
export type AnimationDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';

interface AnimationConfig {
  duration: number;
  delay?: number;
  easing: string;
  fill?: 'forwards' | 'backwards' | 'both' | 'none';
}

// Animation timing values (in milliseconds)
export const ANIMATION_TIMINGS: Record<AnimationTiming, number> = {
  fast: 150,
  normal: 250,
  slow: 400
};

// Easing functions for different animation types
export const ANIMATION_EASINGS: Record<AnimationEasing, string> = {
  'ease-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'ease-in': 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  'ease-in-out': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

// Stagger animation delays for list items
export const STAGGER_DELAYS = {
  short: 50,
  medium: 100,
  long: 150
};

class AnimationOrchestrator {
  private prefersReducedMotion: boolean;
  private activeAnimations = new Set<Animation>();

  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Listen for changes in motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      if (this.prefersReducedMotion) {
        this.cancelAllAnimations();
      }
    });
  }

  // Core animation method
  public animate(
    element: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions & { 
      timing?: AnimationTiming;
      easing?: AnimationEasing;
      respectMotionPreference?: boolean;
    } = {}
  ): Animation | null {
    if (this.prefersReducedMotion && options.respectMotionPreference !== false) {
      // Skip animation for users who prefer reduced motion
      return null;
    }

    const {
      timing = 'normal',
      easing = 'ease-out',
      duration = ANIMATION_TIMINGS[timing],
      ...animationOptions
    } = options;

    const config: KeyframeAnimationOptions = {
      duration,
      easing: ANIMATION_EASINGS[easing],
      fill: 'both',
      ...animationOptions
    };

    const animation = element.animate(keyframes, config);
    this.activeAnimations.add(animation);

    animation.addEventListener('finish', () => {
      this.activeAnimations.delete(animation);
    });

    animation.addEventListener('cancel', () => {
      this.activeAnimations.delete(animation);
    });

    return animation;
  }

  // Cancel all active animations
  private cancelAllAnimations(): void {
    this.activeAnimations.forEach(animation => {
      animation.cancel();
    });
    this.activeAnimations.clear();
  }

  // Equipment card hover animation
  public animateEquipmentHover(element: Element, hovering: boolean): Animation | null {
    const scale = hovering ? 1.02 : 1;
    const translateY = hovering ? -4 : 0;
    const boxShadow = hovering 
      ? '0 12px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)'
      : '0 2px 4px rgba(0, 0, 0, 0.1)';

    return this.animate(element, [
      { 
        transform: `scale(${scale}) translateY(${translateY}px)`,
        boxShadow 
      }
    ], {
      timing: 'fast',
      easing: 'ease-out'
    });
  }

  // Vendor card selection animation
  public animateVendorSelection(element: Element, selected: boolean): Animation | null {
    const borderColor = selected ? '#dc2626' : '#e5e7eb';
    const backgroundColor = selected ? 'rgba(220, 38, 38, 0.05)' : 'white';
    const scale = selected ? 1.01 : 1;

    return this.animate(element, [
      {
        borderColor,
        backgroundColor,
        transform: `scale(${scale})`
      }
    ], {
      timing: 'normal',
      easing: 'ease-out'
    });
  }

  // Loading state animation
  public animateLoadingPulse(element: Element): Animation | null {
    return this.animate(element, [
      { opacity: 0.6 },
      { opacity: 1 },
      { opacity: 0.6 }
    ], {
      duration: 1500,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  }

  // Success feedback animation
  public animateSuccess(element: Element): Animation | null {
    const sequence = [
      { transform: 'scale(1)', backgroundColor: 'transparent' },
      { transform: 'scale(1.05)', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
      { transform: 'scale(1)', backgroundColor: 'rgba(34, 197, 94, 0.05)' },
      { transform: 'scale(1)', backgroundColor: 'transparent' }
    ];

    return this.animate(element, sequence, {
      duration: 600,
      easing: 'bounce'
    });
  }

  // Error feedback animation
  public animateError(element: Element): Animation | null {
    const shakeDistance = 8;
    const sequence = [
      { transform: 'translateX(0)', borderColor: 'currentColor' },
      { transform: `translateX(-${shakeDistance}px)`, borderColor: '#ef4444' },
      { transform: `translateX(${shakeDistance}px)`, borderColor: '#ef4444' },
      { transform: `translateX(-${shakeDistance/2}px)`, borderColor: '#ef4444' },
      { transform: `translateX(${shakeDistance/2}px)`, borderColor: '#ef4444' },
      { transform: 'translateX(0)', borderColor: '#ef4444' },
      { transform: 'translateX(0)', borderColor: 'currentColor' }
    ];

    return this.animate(element, sequence, {
      duration: 500,
      easing: 'ease-out'
    });
  }

  // Staggered list animation
  public animateListItems(
    elements: Element[],
    direction: AnimationDirection = 'up',
    stagger: keyof typeof STAGGER_DELAYS = 'medium'
  ): (Animation | null)[] {
    const getInitialTransform = (dir: AnimationDirection) => {
      switch (dir) {
        case 'up': return 'translateY(20px)';
        case 'down': return 'translateY(-20px)';
        case 'left': return 'translateX(-20px)';
        case 'right': return 'translateX(20px)';
        case 'scale': return 'scale(0.9)';
        default: return 'translateY(20px)';
      }
    };

    const initialTransform = getInitialTransform(direction);
    const staggerDelay = STAGGER_DELAYS[stagger];

    return elements.map((element, index) => {
      const sequence = [
        { 
          opacity: 0, 
          transform: initialTransform 
        },
        { 
          opacity: 1, 
          transform: 'translateY(0) translateX(0) scale(1)' 
        }
      ];

      return this.animate(element, sequence, {
        duration: ANIMATION_TIMINGS.normal,
        delay: index * staggerDelay,
        easing: 'ease-out'
      });
    });
  }

  // Modal entrance animation
  public animateModalEntrance(
    backdropElement: Element,
    modalElement: Element
  ): { backdrop: Animation | null; modal: Animation | null } {
    const backdropAnimation = this.animate(backdropElement, [
      { opacity: 0 },
      { opacity: 1 }
    ], {
      timing: 'fast',
      easing: 'ease-out'
    });

    const modalAnimation = this.animate(modalElement, [
      { 
        opacity: 0, 
        transform: 'scale(0.95) translateY(-20px)' 
      },
      { 
        opacity: 1, 
        transform: 'scale(1) translateY(0)' 
      }
    ], {
      timing: 'normal',
      easing: 'bounce',
      delay: 50
    });

    return {
      backdrop: backdropAnimation,
      modal: modalAnimation
    };
  }

  // Toast notification slide-in
  public animateToastEntrance(element: Element, fromDirection: 'top' | 'bottom' | 'right' = 'right'): Animation | null {
    const getInitialTransform = () => {
      switch (fromDirection) {
        case 'top': return 'translateY(-100%)';
        case 'bottom': return 'translateY(100%)';
        case 'right': return 'translateX(100%)';
        default: return 'translateX(100%)';
      }
    };

    return this.animate(element, [
      { 
        opacity: 0, 
        transform: getInitialTransform() 
      },
      { 
        opacity: 1, 
        transform: 'translateX(0) translateY(0)' 
      }
    ], {
      timing: 'normal',
      easing: 'elastic'
    });
  }

  // Button press feedback
  public animateButtonPress(element: Element): Animation | null {
    return this.animate(element, [
      { transform: 'scale(1)' },
      { transform: 'scale(0.98)' },
      { transform: 'scale(1)' }
    ], {
      duration: 150,
      easing: 'ease-out'
    });
  }

  // Progress bar animation
  public animateProgressBar(element: Element, fromWidth: number, toWidth: number): Animation | null {
    return this.animate(element, [
      { width: `${fromWidth}%` },
      { width: `${toWidth}%` }
    ], {
      timing: 'normal',
      easing: 'ease-out'
    });
  }

  // Counter animation
  public animateCounter(
    element: Element,
    fromValue: number,
    toValue: number,
    formatter?: (value: number) => string
  ): Animation | null {
    if (this.prefersReducedMotion) {
      element.textContent = formatter ? formatter(toValue) : toValue.toString();
      return null;
    }

    const duration = ANIMATION_TIMINGS.slow;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth counting
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(fromValue + (toValue - fromValue) * easedProgress);
      
      element.textContent = formatter ? formatter(currentValue) : currentValue.toString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
    return null; // Custom animation, not using Web Animations API
  }

  // Page transition animation
  public animatePageTransition(
    outgoingElement: Element,
    incomingElement: Element,
    direction: 'slide-left' | 'slide-right' | 'fade' = 'fade'
  ): { outgoing: Animation | null; incoming: Animation | null } {
    let outgoingKeyframes: Keyframe[];
    let incomingKeyframes: Keyframe[];

    switch (direction) {
      case 'slide-left':
        outgoingKeyframes = [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(-100%)' }
        ];
        incomingKeyframes = [
          { opacity: 0, transform: 'translateX(100%)' },
          { opacity: 1, transform: 'translateX(0)' }
        ];
        break;
      case 'slide-right':
        outgoingKeyframes = [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(100%)' }
        ];
        incomingKeyframes = [
          { opacity: 0, transform: 'translateX(-100%)' },
          { opacity: 1, transform: 'translateX(0)' }
        ];
        break;
      default: // fade
        outgoingKeyframes = [
          { opacity: 1 },
          { opacity: 0 }
        ];
        incomingKeyframes = [
          { opacity: 0 },
          { opacity: 1 }
        ];
    }

    const outgoing = this.animate(outgoingElement, outgoingKeyframes, {
      timing: 'normal',
      easing: 'ease-in-out'
    });

    const incoming = this.animate(incomingElement, incomingKeyframes, {
      timing: 'normal',
      easing: 'ease-in-out',
      delay: 100
    });

    return { outgoing, incoming };
  }
}

// Export singleton instance
export const animationOrchestrator = new AnimationOrchestrator();

// Utility functions for common animations

export const fadeIn = (element: Element, timing: AnimationTiming = 'normal') => {
  return animationOrchestrator.animate(element, [
    { opacity: 0 },
    { opacity: 1 }
  ], { timing, easing: 'ease-out' });
};

export const fadeOut = (element: Element, timing: AnimationTiming = 'normal') => {
  return animationOrchestrator.animate(element, [
    { opacity: 1 },
    { opacity: 0 }
  ], { timing, easing: 'ease-in' });
};

export const slideUp = (element: Element, timing: AnimationTiming = 'normal') => {
  return animationOrchestrator.animate(element, [
    { opacity: 0, transform: 'translateY(20px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { timing, easing: 'ease-out' });
};

export const slideDown = (element: Element, timing: AnimationTiming = 'normal') => {
  return animationOrchestrator.animate(element, [
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(20px)' }
  ], { timing, easing: 'ease-in' });
};

export const scaleIn = (element: Element, timing: AnimationTiming = 'normal') => {
  return animationOrchestrator.animate(element, [
    { opacity: 0, transform: 'scale(0.9)' },
    { opacity: 1, transform: 'scale(1)' }
  ], { timing, easing: 'bounce' });
};

export const scaleOut = (element: Element, timing: AnimationTiming = 'normal') => {
  return animationOrchestrator.animate(element, [
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.9)' }
  ], { timing, easing: 'ease-in' });
};

// CSS-in-JS animation utilities (for consistent styling)
export const animationClasses = {
  // Base transition classes
  transition: 'transition-all duration-200 ease-out',
  transitionFast: 'transition-all duration-150 ease-out',
  transitionSlow: 'transition-all duration-300 ease-out',
  
  // Hover effects
  hoverLift: 'hover:transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg',
  hoverGlow: 'hover:shadow-lg hover:shadow-allrentz-red/20',
  hoverBorder: 'hover:border-allrentz-red hover:shadow-sm',
  
  // Focus states
  focusRing: 'focus:ring-2 focus:ring-allrentz-red focus:ring-offset-2 focus:outline-none',
  focusVisible: 'focus-visible:ring-2 focus-visible:ring-allrentz-red focus-visible:ring-offset-2',
  
  // Active states
  activeScale: 'active:transform active:scale-98',
  activePulse: 'active:animate-pulse',
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Entrance animations (using CSS animations as fallback)
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  scaleIn: 'animate-scale-in'
};

// Custom CSS keyframes for Tailwind
export const customKeyframes = {
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' }
  },
  'slide-up': {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' }
  },
  'scale-in': {
    '0%': { opacity: '0', transform: 'scale(0.9)' },
    '100%': { opacity: '1', transform: 'scale(1)' }
  },
  'shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-8px)' },
    '75%': { transform: 'translateX(8px)' }
  }
};

export default animationOrchestrator;