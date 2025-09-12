import { useRef, useCallback, useEffect } from 'react';
import { animationOrchestrator, AnimationTiming, AnimationEasing, AnimationDirection } from '@/utils/animations';

interface UseAnimationOptions {
  timing?: AnimationTiming;
  easing?: AnimationEasing;
  delay?: number;
  respectMotionPreference?: boolean;
}

interface UseAnimationReturn {
  ref: React.RefObject<HTMLElement>;
  animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => Animation | null;
  fadeIn: () => Animation | null;
  fadeOut: () => Animation | null;
  slideUp: () => Animation | null;
  slideDown: () => Animation | null;
  scaleIn: () => Animation | null;
  scaleOut: () => Animation | null;
  shake: () => Animation | null;
  pulse: () => Animation | null;
  isAnimating: boolean;
}

export const useAnimation = (options: UseAnimationOptions = {}): UseAnimationReturn => {
  const ref = useRef<HTMLElement>(null);
  const isAnimatingRef = useRef(false);
  const currentAnimationRef = useRef<Animation | null>(null);

  const animate = useCallback((
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    animationOptions?: KeyframeAnimationOptions
  ): Animation | null => {
    if (!ref.current) return null;

    // Cancel any current animation
    if (currentAnimationRef.current) {
      currentAnimationRef.current.cancel();
    }

    isAnimatingRef.current = true;
    
    const animation = animationOrchestrator.animate(ref.current, keyframes, {
      ...options,
      ...animationOptions
    });

    currentAnimationRef.current = animation;

    if (animation) {
      animation.addEventListener('finish', () => {
        isAnimatingRef.current = false;
        currentAnimationRef.current = null;
      });

      animation.addEventListener('cancel', () => {
        isAnimatingRef.current = false;
        currentAnimationRef.current = null;
      });
    } else {
      isAnimatingRef.current = false;
    }

    return animation;
  }, [options]);

  const fadeIn = useCallback(() => {
    return animate([
      { opacity: 0 },
      { opacity: 1 }
    ], { 
      duration: 250,
      easing: 'ease-out'
    });
  }, [animate]);

  const fadeOut = useCallback(() => {
    return animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-in'
    });
  }, [animate]);

  const slideUp = useCallback(() => {
    return animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 300,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });
  }, [animate]);

  const slideDown = useCallback(() => {
    return animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(20px)' }
    ], {
      duration: 200,
      easing: 'ease-in'
    });
  }, [animate]);

  const scaleIn = useCallback(() => {
    return animate([
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' }
    ], {
      duration: 250,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    });
  }, [animate]);

  const scaleOut = useCallback(() => {
    return animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.95)' }
    ], {
      duration: 200,
      easing: 'ease-in'
    });
  }, [animate]);

  const shake = useCallback(() => {
    return animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' }
    ], {
      duration: 500,
      easing: 'ease-out'
    });
  }, [animate]);

  const pulse = useCallback(() => {
    return animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ], {
      duration: 600,
      iterations: 3,
      easing: 'ease-in-out'
    });
  }, [animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
      }
    };
  }, []);

  return {
    ref,
    animate,
    fadeIn,
    fadeOut,
    slideUp,
    slideDown,
    scaleIn,
    scaleOut,
    shake,
    pulse,
    isAnimating: isAnimatingRef.current
  };
};

// Hook for staggered list animations
export const useStaggeredAnimation = (dependencies: any[] = []) => {
  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  
  const registerElement = useCallback((element: HTMLElement | null, index: number) => {
    elementsRef.current[index] = element;
  }, []);

  const animateList = useCallback((
    direction: AnimationDirection = 'up',
    stagger: number = 100
  ) => {
    const elements = elementsRef.current.filter(el => el !== null) as HTMLElement[];
    if (elements.length === 0) return;

    return animationOrchestrator.animateListItems(elements, direction, 'medium');
  }, []);

  const fadeInList = useCallback((stagger: number = 100) => {
    const elements = elementsRef.current.filter(el => el !== null) as HTMLElement[];
    
    return elements.map((element, index) => {
      return animationOrchestrator.animate(element, [
        { opacity: 0 },
        { opacity: 1 }
      ], {
        duration: 300,
        delay: index * stagger,
        easing: 'ease-out'
      });
    });
  }, []);

  return {
    registerElement,
    animateList,
    fadeInList
  };
};

// Hook for hover animations
export const useHoverAnimation = (
  hoverKeyframes: Keyframe[],
  restKeyframes?: Keyframe[]
) => {
  const ref = useRef<HTMLElement>(null);
  const isHoveringRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!ref.current || isHoveringRef.current) return;
    
    isHoveringRef.current = true;
    animationOrchestrator.animate(ref.current, hoverKeyframes, {
      duration: 200,
      easing: 'ease-out',
      fill: 'forwards'
    });
  }, [hoverKeyframes]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current || !isHoveringRef.current) return;
    
    isHoveringRef.current = false;
    const keyframes = restKeyframes || [
      { transform: 'scale(1) translateY(0)' }
    ];
    
    animationOrchestrator.animate(ref.current, keyframes, {
      duration: 200,
      easing: 'ease-out',
      fill: 'forwards'
    });
  }, [restKeyframes]);

  return {
    ref,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
};

// Hook for button press animations
export const useButtonAnimation = () => {
  const ref = useRef<HTMLElement>(null);

  const handleMouseDown = useCallback(() => {
    if (!ref.current) return;
    
    animationOrchestrator.animate(ref.current, [
      { transform: 'scale(1)' },
      { transform: 'scale(0.98)' }
    ], {
      duration: 100,
      easing: 'ease-out',
      fill: 'forwards'
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!ref.current) return;
    
    animationOrchestrator.animate(ref.current, [
      { transform: 'scale(0.98)' },
      { transform: 'scale(1)' }
    ], {
      duration: 100,
      easing: 'ease-out',
      fill: 'forwards'
    });
  }, []);

  const handleClick = useCallback(() => {
    if (!ref.current) return;
    
    // Ripple effect
    animationOrchestrator.animate(ref.current, [
      { transform: 'scale(1)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' }
    ], {
      duration: 200,
      easing: 'ease-out'
    });
  }, []);

  return {
    ref,
    buttonProps: {
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onClick: handleClick
    }
  };
};

// Hook for loading animations
export const useLoadingAnimation = () => {
  const ref = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);

  const startLoading = useCallback(() => {
    if (!ref.current || animationRef.current) return;
    
    animationRef.current = animationOrchestrator.animate(ref.current, [
      { opacity: 0.6 },
      { opacity: 1 },
      { opacity: 0.6 }
    ], {
      duration: 1000,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  }, []);

  const stopLoading = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }
    
    if (ref.current) {
      animationOrchestrator.animate(ref.current, [
        { opacity: 1 }
      ], {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards'
      });
    }
  }, []);

  return {
    ref,
    startLoading,
    stopLoading
  };
};

// Hook for toast notifications
export const useToastAnimation = () => {
  const ref = useRef<HTMLElement>(null);

  const slideIn = useCallback(() => {
    if (!ref.current) return null;
    
    return animationOrchestrator.animate(ref.current, [
      { opacity: 0, transform: 'translateX(100%)' },
      { opacity: 1, transform: 'translateX(0)' }
    ], {
      duration: 300,
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });
  }, []);

  const slideOut = useCallback(() => {
    if (!ref.current) return null;
    
    return animationOrchestrator.animate(ref.current, [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(100%)' }
    ], {
      duration: 200,
      easing: 'ease-in'
    });
  }, []);

  return {
    ref,
    slideIn,
    slideOut
  };
};

export default useAnimation;