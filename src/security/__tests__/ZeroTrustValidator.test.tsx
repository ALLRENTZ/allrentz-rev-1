import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZeroTrustValidator, withZeroTrust, useZeroTrustValidation } from '../ZeroTrustValidator';
import { SecurityProvider, useSecurity } from '../SecurityContext';
import { MFAProvider, useMFA } from '../MFAProvider';

// Mock security contexts
const mockSecurityContext = {
  validateAccess: vi.fn(),
  checkRiskLevel: vi.fn(),
  currentSession: null,
  checkContinuousVerification: vi.fn()
};

const mockMFAContext = {
  startChallenge: vi.fn(),
  verifyChallenge: vi.fn(),
  isEnrolled: false
};

vi.mock('../SecurityContext', () => ({
  SecurityProvider: ({ children }: any) => children,
  useSecurity: () => mockSecurityContext
}));

vi.mock('../MFAProvider', () => ({
  MFAProvider: ({ children }: any) => children,
  useMFA: () => mockMFAContext
}));

// Test components
function TestProtectedComponent() {
  return <div data-testid="protected-content">Protected Content</div>;
}

function TestValidationHook() {
  const { isValidated, isValidating, validate } = useZeroTrustValidation('equipment', 'read');
  
  return (
    <div>
      <div data-testid="is-validated">{isValidated.toString()}</div>
      <div data-testid="is-validating">{isValidating.toString()}</div>
      <button data-testid="validate-btn" onClick={validate}>
        Validate
      </button>
    </div>
  );
}

const TestWrappedComponent = withZeroTrust(TestProtectedComponent, {
  resource: 'equipment',
  action: 'read'
});

describe('ZeroTrustValidator', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSecurityContext.validateAccess.mockResolvedValue(true);
    mockSecurityContext.checkRiskLevel.mockResolvedValue('low');
    mockSecurityContext.checkContinuousVerification.mockResolvedValue(true);
    mockSecurityContext.currentSession = {
      sessionId: 'test-session',
      userId: 'test-user',
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: '127.0.0.1',
      deviceInfo: {
        deviceId: 'test-device',
        trusted: true,
        lastVerified: new Date().toISOString(),
        deviceType: 'desktop',
        fingerprint: 'test-fingerprint'
      },
      riskScore: 10,
      permissions: ['read_marketplace']
    };
    
    mockMFAContext.isEnrolled = true;
    mockMFAContext.startChallenge.mockResolvedValue({
      challengeId: 'test-challenge',
      method: 'totp',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      maxAttempts: 3
    });
    mockMFAContext.verifyChallenge.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading state during validation', () => {
    render(
      <ZeroTrustValidator resource="equipment" action="read">
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    expect(screen.getByText('Validating access...')).toBeInTheDocument();
  });

  it('should grant access when all validations pass', async () => {
    render(
      <ZeroTrustValidator resource="equipment" action="read">
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    expect(mockSecurityContext.validateAccess).toHaveBeenCalledWith('equipment', 'read');
    expect(mockSecurityContext.checkRiskLevel).toHaveBeenCalled();
    expect(mockSecurityContext.checkContinuousVerification).toHaveBeenCalled();
  });

  it('should deny access when no session exists', async () => {
    mockSecurityContext.currentSession = null;

    render(
      <ZeroTrustValidator resource="equipment" action="read" showFallback={true}>
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should deny access when continuous verification fails', async () => {
    mockSecurityContext.checkContinuousVerification.mockResolvedValue(false);

    render(
      <ZeroTrustValidator resource="equipment" action="read" showFallback={true}>
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should deny access when user lacks permissions', async () => {
    mockSecurityContext.validateAccess.mockResolvedValue(false);

    render(
      <ZeroTrustValidator resource="equipment" action="read" showFallback={true}>
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should deny access when risk level exceeds threshold', async () => {
    mockSecurityContext.checkRiskLevel.mockResolvedValue('critical');

    render(
      <ZeroTrustValidator 
        resource="equipment" 
        action="read" 
        riskThreshold="high"
        showFallback={true}
      >
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should require MFA when not enrolled and MFA is required', async () => {
    mockMFAContext.isEnrolled = false;

    render(
      <ZeroTrustValidator 
        resource="equipment" 
        action="read" 
        requireMFA={true}
        showFallback={true}
      >
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should show MFA challenge when verification is needed', async () => {
    // Set up scenario requiring additional auth
    mockSecurityContext.checkRiskLevel.mockResolvedValue('high');

    render(
      <ZeroTrustValidator 
        resource="equipment" 
        action="read" 
        riskThreshold="medium"
        showFallback={true}
      >
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    const verifyButton = screen.getByText('Verify Identity');
    await user.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText('Additional Verification Required')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });
  });

  it('should handle MFA verification flow', async () => {
    // Set up scenario requiring additional auth
    mockSecurityContext.checkRiskLevel.mockResolvedValue('high');

    render(
      <ZeroTrustValidator 
        resource="equipment" 
        action="read" 
        riskThreshold="medium"
        showFallback={true}
      >
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    // Start MFA challenge
    const verifyButton = screen.getByText('Verify Identity');
    await user.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText('Additional Verification Required')).toBeInTheDocument();
    });

    // Enter MFA code
    const codeInput = screen.getByPlaceholderText('000000');
    await user.type(codeInput, '123456');

    // Submit MFA code
    const submitButton = screen.getByText('Verify Code');
    await user.click(submitButton);

    expect(mockMFAContext.verifyChallenge).toHaveBeenCalledWith('current-challenge-id', '123456');
  });

  it('should retry validation when requested', async () => {
    mockSecurityContext.validateAccess.mockResolvedValue(false);

    render(
      <ZeroTrustValidator resource="equipment" action="read" showFallback={true}>
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Retry Validation');
    await user.click(retryButton);

    // Validation should be called again
    expect(mockSecurityContext.validateAccess).toHaveBeenCalledTimes(2);
  });

  it('should work with withZeroTrust HOC', async () => {
    render(<TestWrappedComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('should display custom fallback message', async () => {
    mockSecurityContext.validateAccess.mockResolvedValue(false);

    const customMessage = 'Custom access denied message';

    render(
      <ZeroTrustValidator 
        resource="equipment" 
        action="read" 
        showFallback={true}
        fallbackMessage={customMessage}
      >
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  it('should hide fallback when showFallback is false', async () => {
    mockSecurityContext.validateAccess.mockResolvedValue(false);

    render(
      <ZeroTrustValidator 
        resource="equipment" 
        action="read" 
        showFallback={false}
      >
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  it('should handle validation errors gracefully', async () => {
    mockSecurityContext.validateAccess.mockRejectedValue(new Error('Validation failed'));

    render(
      <ZeroTrustValidator resource="equipment" action="read" showFallback={true}>
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should show risk level indicator', async () => {
    mockSecurityContext.validateAccess.mockResolvedValue(false);
    mockSecurityContext.checkRiskLevel.mockResolvedValue('high');

    render(
      <ZeroTrustValidator resource="equipment" action="read" showFallback={true}>
        <TestProtectedComponent />
      </ZeroTrustValidator>
    );

    await waitFor(() => {
      expect(screen.getByText('Current Risk Level:')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  describe('useZeroTrustValidation hook', () => {
    it('should provide validation state and function', () => {
      render(<TestValidationHook />);

      expect(screen.getByTestId('is-validated')).toHaveTextContent('false');
      expect(screen.getByTestId('is-validating')).toHaveTextContent('false');
      expect(screen.getByTestId('validate-btn')).toBeInTheDocument();
    });

    it('should validate access when called', async () => {
      render(<TestValidationHook />);

      const validateButton = screen.getByTestId('validate-btn');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByTestId('is-validated')).toHaveTextContent('true');
      });

      expect(mockSecurityContext.validateAccess).toHaveBeenCalledWith('equipment', 'read');
      expect(mockSecurityContext.checkRiskLevel).toHaveBeenCalled();
    });

    it('should show validating state during validation', async () => {
      let resolveValidation: (value: boolean) => void;
      mockSecurityContext.validateAccess.mockReturnValue(
        new Promise((resolve) => {
          resolveValidation = resolve;
        })
      );

      render(<TestValidationHook />);

      const validateButton = screen.getByTestId('validate-btn');
      await user.click(validateButton);

      // Should show validating state
      expect(screen.getByTestId('is-validating')).toHaveTextContent('true');

      // Resolve validation
      await act(async () => {
        resolveValidation!(true);
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-validating')).toHaveTextContent('false');
        expect(screen.getByTestId('is-validated')).toHaveTextContent('true');
      });
    });

    it('should handle validation failure', async () => {
      mockSecurityContext.validateAccess.mockResolvedValue(false);
      mockSecurityContext.checkRiskLevel.mockResolvedValue('critical');

      render(<TestValidationHook />);

      const validateButton = screen.getByTestId('validate-btn');
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByTestId('is-validated')).toHaveTextContent('false');
      });
    });
  });
});