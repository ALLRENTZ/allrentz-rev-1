import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { animationOrchestrator } from '@/utils/animations';
import { useAnimation } from '@/hooks/useAnimation';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number; // 0-100
  status?: 'loading' | 'success' | 'error' | 'idle';
  showLabel?: boolean;
  animated?: boolean;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status = 'idle',
  showLabel = true,
  animated = true,
  height = 'md',
  className = ''
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate progress changes
  useEffect(() => {
    if (!animated) {
      setDisplayProgress(progress);
      return;
    }

    if (barRef.current) {
      animationOrchestrator.animateProgressBar(barRef.current, displayProgress, progress);
    }

    // Also animate the number for screen readers
    const startTime = Date.now();
    const duration = 500;
    const startProgress = displayProgress;
    const targetProgress = progress;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progressRatio, 3);
      
      const current = startProgress + (targetProgress - startProgress) * easedProgress;
      setDisplayProgress(Math.round(current));

      if (progressRatio < 1) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [progress, animated, displayProgress]);

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'loading':
        return 'bg-blue-500 animate-pulse';
      default:
        return 'bg-allrentz-red';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-gray-700">Progress</span>
          <span className={cn(
            'font-medium',
            status === 'success' ? 'text-green-600' : 
            status === 'error' ? 'text-red-600' : 'text-gray-900'
          )}>
            {displayProgress}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        heightClasses[height]
      )}>
        <div
          ref={barRef}
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            getStatusColor()
          )}
          style={{ width: `${displayProgress}%` }}
          role="progressbar"
          aria-valuenow={displayProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

// Circular progress indicator
interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  status?: 'loading' | 'success' | 'error' | 'idle';
  showLabel?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  status = 'idle',
  showLabel = true,
  className = ''
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'stroke-green-500';
      case 'error':
        return 'stroke-red-500';
      case 'loading':
        return 'stroke-blue-500';
      default:
        return 'stroke-allrentz-red';
    }
  };

  const getStatusIcon = () => {
    if (status === 'success') {
      return <CheckCircle className="w-8 h-8 text-green-500" />;
    }
    if (status === 'error') {
      return <AlertCircle className="w-8 h-8 text-red-500" />;
    }
    if (status === 'loading') {
      return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
    }
    return null;
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (displayProgress / 100) * circumference}
          className={cn('transition-all duration-700 ease-out', getStatusColor())}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {showLabel && (
          <div className="text-center">
            {getStatusIcon() || (
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(displayProgress)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Step progress indicator
interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface StepProgressProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  orientation = 'horizontal',
  className = ''
}) => {
  const { ref, fadeIn } = useAnimation();

  useEffect(() => {
    fadeIn();
  }, [fadeIn]);

  const getStepIcon = (step: Step, index: number) => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-shake">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
        );
      case 'active':
        return (
          <div className="w-8 h-8 bg-allrentz-red rounded-full flex items-center justify-center animate-glow">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">{index + 1}</span>
          </div>
        );
    }
  };

  const getConnectorClass = (step: Step) => {
    return step.status === 'completed' 
      ? 'bg-green-500' 
      : step.status === 'error'
      ? 'bg-red-500'
      : 'bg-gray-300';
  };

  if (orientation === 'vertical') {
    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex items-start">
            {/* Step Icon */}
            <div className="flex-shrink-0 mr-4">
              {getStepIcon(step, index)}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                'text-lg font-medium',
                step.status === 'active' ? 'text-allrentz-red' : 
                step.status === 'completed' ? 'text-green-700' : 
                step.status === 'error' ? 'text-red-700' : 'text-gray-900'
              )}>
                {step.title}
              </h3>
              {step.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  'absolute left-4 top-8 w-0.5 h-8 -ml-px transition-colors duration-300',
                  getConnectorClass(step)
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center text-center">
            {/* Step Icon */}
            {getStepIcon(step, index)}
            
            {/* Step Label */}
            <div className="mt-2 max-w-24">
              <h3 className={cn(
                'text-sm font-medium leading-tight',
                step.status === 'active' ? 'text-allrentz-red' : 
                step.status === 'completed' ? 'text-green-700' : 
                step.status === 'error' ? 'text-red-700' : 'text-gray-500'
              )}>
                {step.title}
              </h3>
            </div>
          </div>

          {/* Connector */}
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-4 transition-colors duration-300',
              getConnectorClass(step)
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Loading skeleton with animations
interface LoadingSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height = '1rem',
  lines = 1,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-300 rounded';

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(baseClasses, 'h-4')}
            style={{
              width: index === lines - 1 && lines > 1 ? '75%' : width
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={cn(baseClasses, 'rounded-full', className)}
        style={{ width: width, height: height }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className={cn(baseClasses, 'h-48 w-full')} />
        <div className="space-y-2">
          <div className={cn(baseClasses, 'h-4 w-3/4')} />
          <div className={cn(baseClasses, 'h-4 w-1/2')} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, className)}
      style={{ width: width, height: height }}
    />
  );
};

// Animated counter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  formatter = (v) => v.toString(),
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      animationOrchestrator.animateCounter(ref.current, displayValue, value, formatter);
    }
    setDisplayValue(value);
  }, [value, formatter, displayValue]);

  return (
    <span ref={ref} className={className}>
      {formatter(displayValue)}
    </span>
  );
};

export default ProgressBar;