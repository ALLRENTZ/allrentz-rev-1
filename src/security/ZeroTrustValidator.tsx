import React, { useState, useEffect, ReactNode } from 'react';
import { useSecurity } from './SecurityContext';
import { useMFA } from './MFAProvider';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, Clock } from 'lucide-react';

interface ZeroTrustValidatorProps {
  children: ReactNode;
  resource: string;
  action: string;
  requireMFA?: boolean;
  riskThreshold?: 'low' | 'medium' | 'high';
  showFallback?: boolean;
  fallbackMessage?: string;
}

interface ValidationState {
  isValidating: boolean;
  isAuthorized: boolean;
  requiresAdditionalAuth: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastValidation: string | null;
  validationErrors: string[];
}

export function ZeroTrustValidator({
  children,
  resource,
  action,
  requireMFA = false,
  riskThreshold = 'high',
  showFallback = true,
  fallbackMessage = 'Access requires additional verification.'
}: ZeroTrustValidatorProps) {
  const { validateAccess, checkRiskLevel, currentSession, checkContinuousVerification } = useSecurity();
  const { startChallenge, verifyChallenge, isEnrolled } = useMFA();
  
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: true,
    isAuthorized: false,
    requiresAdditionalAuth: false,
    riskLevel: 'critical',
    lastValidation: null,
    validationErrors: []
  });

  const [mfaCode, setMfaCode] = useState('');
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);

  // Continuous validation every 30 seconds
  useEffect(() => {
    const validateInterval = setInterval(performValidation, 30000);
    performValidation(); // Initial validation
    
    return () => clearInterval(validateInterval);
  }, [resource, action, currentSession]);

  const performValidation = async () => {
    setValidationState(prev => ({ ...prev, isValidating: true, validationErrors: [] }));
    
    try {
      // Step 1: Check if user has an active session
      if (!currentSession) {
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          isAuthorized: false,
          requiresAdditionalAuth: true,
          validationErrors: ['No active session']
        }));
        return;
      }

      // Step 2: Validate continuous verification
      const isContinuouslyValid = await checkContinuousVerification();
      if (!isContinuouslyValid) {
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          isAuthorized: false,
          requiresAdditionalAuth: true,
          validationErrors: ['Session verification failed']
        }));
        return;
      }

      // Step 3: Check current risk level
      const riskLevel = await checkRiskLevel();
      
      // Step 4: Validate access permissions
      const hasAccess = await validateAccess(resource, action);
      if (!hasAccess) {
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          isAuthorized: false,
          riskLevel,
          validationErrors: ['Insufficient permissions']
        }));
        return;
      }

      // Step 5: Check if risk level exceeds threshold
      const riskLevels = ['low', 'medium', 'high', 'critical'];
      const currentRiskIndex = riskLevels.indexOf(riskLevel);
      const thresholdIndex = riskLevels.indexOf(riskThreshold);
      
      if (currentRiskIndex > thresholdIndex) {
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          isAuthorized: false,
          requiresAdditionalAuth: true,
          riskLevel,
          validationErrors: [`Risk level (${riskLevel}) exceeds threshold (${riskThreshold})`]
        }));
        return;
      }

      // Step 6: Check MFA requirements
      if (requireMFA && !isEnrolled) {
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          isAuthorized: false,
          requiresAdditionalAuth: true,
          riskLevel,
          validationErrors: ['MFA enrollment required']
        }));
        return;
      }

      // Step 7: All validations passed
      setValidationState({
        isValidating: false,
        isAuthorized: true,
        requiresAdditionalAuth: false,
        riskLevel,
        lastValidation: new Date().toISOString(),
        validationErrors: []
      });

    } catch (error) {
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        isAuthorized: false,
        requiresAdditionalAuth: true,
        validationErrors: [error.message || 'Validation failed']
      }));
    }
  };

  const handleMFAChallenge = async () => {
    try {
      setShowMFAChallenge(true);
      await startChallenge('totp');
    } catch (error) {
      console.error('Failed to start MFA challenge:', error);
    }
  };

  const handleMFAVerification = async () => {
    if (!mfaCode.trim()) return;
    
    try {
      const isValid = await verifyChallenge('current-challenge-id', mfaCode);
      if (isValid) {
        setShowMFAChallenge(false);
        setMfaCode('');
        await performValidation(); // Re-validate after successful MFA
      } else {
        alert('Invalid MFA code. Please try again.');
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <Shield className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <Lock className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  // Loading state
  if (validationState.isValidating) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-allrentz-gray">
          <Shield className="h-5 w-5 animate-pulse" />
          <span>Validating access...</span>
        </div>
      </div>
    );
  }

  // MFA Challenge UI
  if (showMFAChallenge) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-4">
          <Lock className="h-8 w-8 mx-auto text-allrentz-red mb-2" />
          <h3 className="text-lg font-semibold">Additional Verification Required</h3>
          <p className="text-sm text-gray-600 mt-1">
            Enter your 6-digit authenticator code
          </p>
        </div>
        
        <div className="space-y-4">
          <input
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full text-center text-2xl font-mono border rounded-lg py-3 px-4"
            maxLength={6}
          />
          
          <Button 
            onClick={handleMFAVerification}
            className="w-full bg-allrentz-red hover:bg-allrentz-red/90"
            disabled={mfaCode.length !== 6}
          >
            Verify Code
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowMFAChallenge(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Access denied UI
  if (!validationState.isAuthorized) {
    if (!showFallback) {
      return null;
    }

    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${getRiskColor(validationState.riskLevel)}`}>
            {getRiskIcon(validationState.riskLevel)}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Access Restricted
            </h3>
            
            <p className="text-red-700 mb-4">
              {fallbackMessage}
            </p>
            
            {validationState.validationErrors.length > 0 && (
              <Alert className="mb-4 border-red-300 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {validationState.validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center space-x-2 text-sm text-red-600 mb-4">
              <span>Current Risk Level:</span>
              <span className={`font-semibold ${getRiskColor(validationState.riskLevel)}`}>
                {validationState.riskLevel.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-2">
              {validationState.requiresAdditionalAuth && (
                <Button 
                  onClick={handleMFAChallenge}
                  size="sm"
                  className="bg-allrentz-red hover:bg-allrentz-red/90"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Verify Identity
                </Button>
              )}
              
              <Button 
                onClick={performValidation}
                variant="outline" 
                size="sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                Retry Validation
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Access granted - render children with security context
  return (
    <div className="zero-trust-validated">
      {/* Optional security status indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-mono">
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Validated</span>
            <span className={getRiskColor(validationState.riskLevel)}>
              ({validationState.riskLevel})
            </span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}

// Higher-order component for easier usage
export function withZeroTrust<T extends object>(
  Component: React.ComponentType<T>,
  config: {
    resource: string;
    action: string;
    requireMFA?: boolean;
    riskThreshold?: 'low' | 'medium' | 'high';
  }
) {
  return function ZeroTrustComponent(props: T) {
    return (
      <ZeroTrustValidator {...config}>
        <Component {...props} />
      </ZeroTrustValidator>
    );
  };
}

// Hook for programmatic zero-trust validation
export function useZeroTrustValidation(resource: string, action: string) {
  const { validateAccess, checkRiskLevel } = useSecurity();
  const [isValidated, setIsValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validate = async () => {
    setIsValidating(true);
    try {
      const hasAccess = await validateAccess(resource, action);
      const riskLevel = await checkRiskLevel();
      
      const isValid = hasAccess && riskLevel !== 'critical';
      setIsValidated(isValid);
      return isValid;
    } catch (error) {
      console.error('Zero-trust validation failed:', error);
      setIsValidated(false);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return { isValidated, isValidating, validate };
}