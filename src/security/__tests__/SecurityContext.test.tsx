import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SecurityProvider, useSecurity } from '../SecurityContext';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Test component to access security context
function TestSecurityComponent() {
  const {
    securityConfig,
    currentSession,
    deviceTrust,
    validateSession,
    refreshSession,
    terminateSession,
    registerDevice,
    verifyDevice,
    checkRiskLevel,
    validateAccess
  } = useSecurity();

  return (
    <div>
      <div data-testid="mfa-enabled">{securityConfig.mfaEnabled.toString()}</div>
      <div data-testid="session-timeout">{securityConfig.sessionTimeout}</div>
      <div data-testid="current-session">{currentSession ? 'active' : 'none'}</div>
      <div data-testid="device-trust">{deviceTrust ? 'trusted' : 'none'}</div>
      <button data-testid="validate-session" onClick={() => validateSession()}>
        Validate Session
      </button>
      <button data-testid="refresh-session" onClick={() => refreshSession()}>
        Refresh Session
      </button>
      <button data-testid="terminate-session" onClick={() => terminateSession()}>
        Terminate Session
      </button>
      <button data-testid="register-device" onClick={() => registerDevice()}>
        Register Device
      </button>
      <button data-testid="verify-device" onClick={() => verifyDevice('test-device')}>
        Verify Device
      </button>
      <button data-testid="check-risk" onClick={async () => {
        const risk = await checkRiskLevel();
        document.body.setAttribute('data-risk-level', risk);
      }}>
        Check Risk Level
      </button>
      <button data-testid="validate-access" onClick={async () => {
        const access = await validateAccess('equipment', 'read');
        document.body.setAttribute('data-has-access', access.toString());
      }}>
        Validate Access
      </button>
    </div>
  );
}

describe('SecurityContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide default security configuration', () => {
    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    expect(screen.getByTestId('mfa-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('session-timeout')).toHaveTextContent('15');
  });

  it('should initialize without active session', () => {
    // Mock no authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    });

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    expect(screen.getByTestId('current-session')).toHaveTextContent('none');
    expect(screen.getByTestId('device-trust')).toHaveTextContent('none');
  });

  it('should initialize session for authenticated user', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock profile fetch
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    await waitFor(() => {
      expect(screen.getByTestId('device-trust')).toHaveTextContent('trusted');
    });
  });

  it('should validate active session within timeout', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    // Session should be valid immediately after creation
    const validateButton = screen.getByTestId('validate-session');
    await act(async () => {
      validateButton.click();
    });

    // Session should still be active
    expect(screen.getByTestId('current-session')).toHaveTextContent('active');
  });

  it('should refresh session successfully', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    const refreshButton = screen.getByTestId('refresh-session');
    await act(async () => {
      refreshButton.click();
    });

    expect(supabase.auth.refreshSession).toHaveBeenCalled();
  });

  it('should terminate session', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    const terminateButton = screen.getByTestId('terminate-session');
    await act(async () => {
      terminateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('none');
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should register device with fingerprint', async () => {
    // Mock canvas and other browser APIs
    const mockCanvas = {
      getContext: vi.fn(() => ({
        fillText: vi.fn()
      })),
      toDataURL: vi.fn(() => 'mock-canvas-data')
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    const registerButton = screen.getByTestId('register-device');
    await act(async () => {
      registerButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('device-trust')).toHaveTextContent('trusted');
    });

    // Check that device info was stored
    const storedDevice = localStorage.getItem('allrentz_device_info');
    expect(storedDevice).toBeTruthy();
  });

  it('should verify device by fingerprint', async () => {
    // Pre-store device info
    const deviceInfo = {
      deviceId: 'test-device',
      trusted: true,
      lastVerified: new Date().toISOString(),
      deviceType: 'desktop',
      fingerprint: 'test-fingerprint'
    };
    localStorage.setItem('allrentz_device_info', JSON.stringify(deviceInfo));

    // Mock canvas to return consistent fingerprint
    const mockCanvas = {
      getContext: vi.fn(() => ({
        fillText: vi.fn()
      })),
      toDataURL: vi.fn(() => 'mock-canvas-data')
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    const verifyButton = screen.getByTestId('verify-device');
    await act(async () => {
      verifyButton.click();
    });

    // Verification should update device trust
    await waitFor(() => {
      expect(screen.getByTestId('device-trust')).toHaveTextContent('trusted');
    });
  });

  it('should calculate risk level correctly', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    const checkRiskButton = screen.getByTestId('check-risk');
    await act(async () => {
      checkRiskButton.click();
    });

    await waitFor(() => {
      const riskLevel = document.body.getAttribute('data-risk-level');
      expect(['low', 'medium', 'high', 'critical']).toContain(riskLevel);
    });
  });

  it('should validate access permissions', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    const validateAccessButton = screen.getByTestId('validate-access');
    await act(async () => {
      validateAccessButton.click();
    });

    await waitFor(() => {
      const hasAccess = document.body.getAttribute('data-has-access');
      expect(['true', 'false']).toContain(hasAccess);
    });
  });

  it('should handle authentication errors gracefully', async () => {
    vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Auth failed'));

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    // Should render without crashing
    expect(screen.getByTestId('current-session')).toHaveTextContent('none');
  });

  it('should enforce session timeout', async () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'customer' },
            error: null
          })
        }))
      }))
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    render(
      <SecurityProvider>
        <TestSecurityComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('active');
    });

    // Mock Date.now to simulate time passage
    const originalNow = Date.now;
    Date.now = vi.fn(() => originalNow() + (20 * 60 * 1000)); // 20 minutes later

    const validateButton = screen.getByTestId('validate-session');
    await act(async () => {
      validateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('none');
    });

    // Restore Date.now
    Date.now = originalNow;
  });
});