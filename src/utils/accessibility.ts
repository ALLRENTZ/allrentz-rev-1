// Initialize axe-core for development environment
export const initializeAxe = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { default: axe } = await import('@axe-core/react');
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');
    
    axe(React, ReactDOM, 1000, {
      // Configure axe-core rules
      rules: {
        // Focus all WCAG AA compliance
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-trap': { enabled: true },
        'aria-labels': { enabled: true },
        'semantic-structure': { enabled: true }
      },
      // Custom tags for ALLRENTZ
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      // Exclude certain selectors if needed (use sparingly)
      exclude: [
        // Example: '.third-party-widget' 
      ],
      // Include specific regions for testing
      include: [
        '[role="main"]',
        '[role="navigation"]',
        '[role="banner"]',
        '[role="contentinfo"]'
      ]
    });
    
    console.log('🛡️ Axe-core accessibility testing initialized');
  }
};

// Manual accessibility testing function for components
export const runAccessibilityTest = async (element: HTMLElement | null) => {
  if (process.env.NODE_ENV === 'production' || !element) {
    return null;
  }

  try {
    const { default: axeCore } = await import('axe-core');
    
    const results = await axeCore.run(element, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true }
      }
    });

    if (results.violations.length > 0) {
      console.group('🚨 Accessibility Violations Found');
      results.violations.forEach(violation => {
        console.error(`${violation.impact?.toUpperCase()}: ${violation.help}`);
        console.info(`Help URL: ${violation.helpUrl}`);
        violation.nodes.forEach(node => {
          console.warn(`Element: ${node.html}`);
          console.warn(`Failure summary: ${node.failureSummary}`);
        });
      });
      console.groupEnd();
    }

    if (results.incomplete.length > 0) {
      console.group('⚠️ Accessibility Checks Incomplete');
      results.incomplete.forEach(incomplete => {
        console.warn(`${incomplete.help}`);
      });
      console.groupEnd();
    }

    return results;
  } catch (error) {
    console.error('Accessibility testing failed:', error);
    return null;
  }
};

// Hook for component-level accessibility testing
export const useAccessibilityTest = (enabled: boolean = true) => {
  const testComponent = async (elementRef: React.RefObject<HTMLElement>) => {
    if (!enabled || !elementRef.current) {
      return null;
    }

    return await runAccessibilityTest(elementRef.current);
  };

  return { testComponent };
};

// Utility functions for common accessibility patterns
export const accessibility = {
  // Generate unique IDs for aria-describedby, aria-labelledby, etc.
  generateId: (prefix: string = 'allrentz') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  
  // Announce to screen readers
  announceToScreenReader: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
  
  // Focus management utilities
  focusManagement: {
    // Get all focusable elements within a container
    getFocusableElements: (container: HTMLElement): HTMLElement[] => {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    },
    
    // Trap focus within a container (for modals, dropdowns)
    trapFocus: (container: HTMLElement) => {
      const focusableElements = accessibility.focusManagement.getFocusableElements(container);
      if (focusableElements.length === 0) return () => {};
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };
      
      container.addEventListener('keydown', handleKeyDown);
      firstElement.focus();
      
      // Return cleanup function
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }
  },
  
  // Keyboard navigation helpers
  keyboard: {
    // Handle arrow key navigation for lists, menus, etc.
    handleArrowNavigation: (
      event: KeyboardEvent,
      items: HTMLElement[],
      currentIndex: number,
      onIndexChange: (newIndex: number) => void,
      options: {
        circular?: boolean;
        horizontal?: boolean;
      } = {}
    ) => {
      const { circular = true, horizontal = false } = options;
      const { key } = event;
      
      let newIndex = currentIndex;
      
      if (horizontal) {
        if (key === 'ArrowLeft') newIndex = currentIndex - 1;
        if (key === 'ArrowRight') newIndex = currentIndex + 1;
      } else {
        if (key === 'ArrowUp') newIndex = currentIndex - 1;
        if (key === 'ArrowDown') newIndex = currentIndex + 1;
      }
      
      // Handle bounds
      if (newIndex < 0) {
        newIndex = circular ? items.length - 1 : 0;
      } else if (newIndex >= items.length) {
        newIndex = circular ? 0 : items.length - 1;
      }
      
      if (newIndex !== currentIndex) {
        event.preventDefault();
        onIndexChange(newIndex);
        items[newIndex]?.focus();
      }
    }
  }
};

export default accessibility;