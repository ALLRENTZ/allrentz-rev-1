// Enterprise Security Module
// Centralized exports for all security components and services

export { SecurityProvider, useSecurity } from './SecurityContext';
export { MFAProvider, useMFA } from './MFAProvider';
export { SAMLProvider, useSAML } from './SAMLProvider';
export { ZeroTrustValidator, withZeroTrust, useZeroTrustValidation } from './ZeroTrustValidator';
export { encryptionService } from './EncryptionService';

export type {
  SecurityConfig,
  SecurityEvent,
  DeviceInfo,
  SessionInfo
} from './SecurityContext';

export type {
  MFAConfig,
  MFAChallenge
} from './MFAProvider';

export type {
  SAMLConfiguration,
  SAMLProvider as SAMLProviderType,
  SAMLAssertion,
  JITProvisioningConfig
} from './SAMLProvider';

export type {
  EncryptedData,
  EncryptionKey,
  FieldEncryptionRule,
  EncryptionConfig
} from './EncryptionService';

// Security utility functions
export const SecurityUtils = {
  // Generate secure random string
  generateSecureRandom: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  },

  // Validate password strength
  validatePasswordStrength: (password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 12) {
      feedback.push('Password must be at least 12 characters long');
    } else {
      score += 20;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain lowercase letters');
    } else {
      score += 10;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain uppercase letters');
    } else {
      score += 10;
    }

    if (!/[0-9]/.test(password)) {
      feedback.push('Password must contain numbers');
    } else {
      score += 10;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Password must contain special characters');
    } else {
      score += 20;
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password should not contain repeated characters');
      score -= 10;
    }

    if (/123456|qwerty|password|admin/i.test(password)) {
      feedback.push('Password should not contain common patterns');
      score -= 20;
    }

    // Bonus for length
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;

    return {
      isValid: feedback.length === 0 && score >= 70,
      score: Math.max(0, Math.min(100, score)),
      feedback
    };
  },

  // Generate CSRF token
  generateCSRFToken: (): string => {
    return crypto.randomUUID();
  },

  // Validate email format
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Sanitize input to prevent XSS
  sanitizeInput: (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  // Check if running in secure context
  isSecureContext: (): boolean => {
    return window.isSecureContext;
  },

  // Generate content security policy nonce
  generateCSPNonce: (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
};

// Security constants
export const SecurityConstants = {
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes in milliseconds
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  PASSWORD_MIN_LENGTH: 12,
  MFA_CODE_LENGTH: 6,
  MFA_CODE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  CSRF_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  
  // Risk levels
  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const,
  
  // Encryption algorithms
  ENCRYPTION: {
    AES_GCM: 'AES-GCM',
    AES_CBC: 'AES-CBC',
    RSA_OAEP: 'RSA-OAEP'
  } as const,
  
  // Security headers
  SECURITY_HEADERS: {
    CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
    X_FRAME_OPTIONS: 'X-Frame-Options',
    X_XSS_PROTECTION: 'X-XSS-Protection',
    X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
    STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security'
  } as const
};

// Security middleware for API calls
export const securityMiddleware = {
  // Add security headers to requests
  addSecurityHeaders: (headers: Record<string, string> = {}): Record<string, string> => {
    return {
      ...headers,
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': SecurityUtils.generateCSRFToken(),
      'Content-Type': 'application/json'
    };
  },

  // Validate response for security issues
  validateResponse: (response: Response): boolean => {
    // Check for suspicious redirects
    if (response.redirected && response.url !== response.url) {
      console.warn('Suspicious redirect detected:', response.url);
      return false;
    }

    // Check security headers
    const xFrameOptions = response.headers.get('X-Frame-Options');
    if (!xFrameOptions) {
      console.warn('Missing X-Frame-Options header');
    }

    return true;
  }
};

// Initialize security module
export const initializeSecurity = () => {
  // Set up global error handler for security events
  window.addEventListener('error', (event) => {
    if (event.error && event.error.name === 'SecurityError') {
      console.error('Security error detected:', event.error);
      // Log to security monitoring system
    }
  });

  // Set up CSP violation handler
  document.addEventListener('securitypolicyviolation', (event) => {
    console.error('CSP violation:', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy
    });
    // Log to security monitoring system
  });

  // Validate secure context
  if (!SecurityUtils.isSecureContext()) {
    console.warn('Application is not running in a secure context (HTTPS)');
  }

  console.log('🔒 ALLRENTZ Security Module Initialized');
};