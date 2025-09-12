import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageCircle, Phone, Mail, ArrowUp } from 'lucide-react';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { cn } from '@/lib/utils';

interface FloatingAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FloatingAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showLabels?: boolean;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions = [],
  position = 'bottom-right',
  showLabels = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor scroll position for scroll-to-top functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close FAB when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6'
    };
    return positions[position];
  };

  const getActionPosition = (index: number) => {
    const isBottom = position.includes('bottom');
    const spacing = 60; // Distance between action buttons
    
    return isBottom 
      ? { bottom: `${(index + 1) * spacing + 20}px` }
      : { top: `${(index + 1) * spacing + 20}px` };
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const defaultActions: FloatingAction[] = [
    {
      id: 'contact',
      icon: <Phone className="w-5 h-5" />,
      label: 'Contact Support',
      onClick: () => console.log('Contact support'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'chat',
      icon: <MessageCircle className="w-5 h-5" />,
      label: 'Live Chat',
      onClick: () => console.log('Open chat'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'email',
      icon: <Mail className="w-5 h-5" />,
      label: 'Send Email',
      onClick: () => console.log('Send email'),
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  const actionsToShow = actions.length > 0 ? actions : defaultActions;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 flex flex-col items-end',
        getPositionClasses(),
        className
      )}
    >
      {/* Action Buttons */}
      <div className="relative mb-4">
        {actionsToShow.map((action, index) => (
          <AnimatedTransition
            key={action.id}
            show={isOpen}
            type="scale"
            delay={index * 50}
          >
            <div
              className="absolute flex items-center gap-3 mb-3"
              style={getActionPosition(index)}
            >
              {/* Label */}
              {showLabels && (
                <AnimatedTransition
                  show={isOpen}
                  type="slideRight"
                  delay={index * 50 + 100}
                >
                  <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg">
                    {action.label}
                  </div>
                </AnimatedTransition>
              )}
              
              {/* Action Button */}
              <AnimatedButton
                size="sm"
                className={cn(
                  'w-12 h-12 rounded-full shadow-lg text-white',
                  action.color || 'bg-allrentz-red hover:bg-allrentz-red/90'
                )}
                onClick={action.onClick}
                ripple
              >
                {action.icon}
              </AnimatedButton>
            </div>
          </AnimatedTransition>
        ))}
      </div>

      {/* Scroll to Top Button */}
      <AnimatedTransition
        show={showScrollTop}
        type="scale"
      >
        <AnimatedButton
          size="sm"
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 text-white shadow-lg mb-4"
          onClick={scrollToTop}
          ripple
        >
          <ArrowUp className="w-5 h-5" />
        </AnimatedButton>
      </AnimatedTransition>

      {/* Main FAB */}
      <AnimatedButton
        size="lg"
        className={cn(
          'w-14 h-14 rounded-full shadow-2xl text-white transition-transform duration-200',
          'bg-allrentz-red hover:bg-allrentz-red/90',
          isOpen && 'rotate-45'
        )}
        onClick={() => setIsOpen(!isOpen)}
        ripple
      >
        <Plus className={cn('w-6 h-6 transition-transform duration-200')} />
      </AnimatedButton>

      {/* Backdrop */}
      <AnimatedTransition
        show={isOpen}
        type="fade"
      >
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      </AnimatedTransition>
    </div>
  );
};

// Speed Dial Component (alternative design)
interface SpeedDialProps {
  trigger: React.ReactNode;
  actions: FloatingAction[];
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({
  trigger,
  actions,
  direction = 'up',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getActionStyles = (index: number) => {
    const distance = 60;
    const positions = {
      up: { transform: `translateY(-${(index + 1) * distance}px)` },
      down: { transform: `translateY(${(index + 1) * distance}px)` },
      left: { transform: `translateX(-${(index + 1) * distance}px)` },
      right: { transform: `translateX(${(index + 1) * distance}px)` }
    };
    
    return positions[direction];
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block', className)}
    >
      {/* Action Items */}
      {actions.map((action, index) => (
        <AnimatedTransition
          key={action.id}
          show={isOpen}
          type="scale"
          delay={index * 30}
        >
          <div
            className="absolute z-10"
            style={getActionStyles(index)}
          >
            <AnimatedButton
              size="sm"
              className={cn(
                'w-10 h-10 rounded-full shadow-lg text-white',
                action.color || 'bg-allrentz-red hover:bg-allrentz-red/90'
              )}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              ripple
            >
              {action.icon}
            </AnimatedButton>
          </div>
        </AnimatedTransition>
      ))}

      {/* Trigger Button */}
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
    </div>
  );
};

// Quick Action Toolbar
interface QuickActionToolbarProps {
  actions: FloatingAction[];
  position?: 'top' | 'bottom';
  className?: string;
}

export const QuickActionToolbar: React.FC<QuickActionToolbarProps> = ({
  actions,
  position = 'bottom',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide toolbar when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const getPositionClasses = () => {
    return position === 'top'
      ? 'top-4 transform -translate-y-full'
      : 'bottom-4 transform translate-y-full';
  };

  return (
    <AnimatedTransition
      show={isVisible}
      type={position === 'top' ? 'slideDown' : 'slideUp'}
    >
      <div
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-40',
          'bg-white/90 backdrop-blur-sm border border-gray-200',
          'rounded-full px-4 py-2 shadow-lg',
          getPositionClasses(),
          className
        )}
      >
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <AnimatedButton
              key={action.id}
              size="sm"
              variant="ghost"
              className="w-10 h-10 rounded-full hover:bg-allrentz-red/10"
              onClick={action.onClick}
              ripple
            >
              {action.icon}
            </AnimatedButton>
          ))}
        </div>
      </div>
    </AnimatedTransition>
  );
};

// Contextual Action Menu (appears near cursor/element)
interface ContextualMenuProps {
  show: boolean;
  position: { x: number; y: number };
  actions: FloatingAction[];
  onClose: () => void;
}

export const ContextualMenu: React.FC<ContextualMenuProps> = ({
  show,
  position,
  actions,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <AnimatedTransition
      show={show}
      type="scale"
    >
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-48"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        {actions.map((action, index) => (
          <button
            key={action.id}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 text-sm transition-colors"
            onClick={() => {
              action.onClick();
              onClose();
            }}
          >
            <div className="text-allrentz-red">{action.icon}</div>
            {action.label}
          </button>
        ))}
      </div>
    </AnimatedTransition>
  );
};

export default FloatingActionButton;