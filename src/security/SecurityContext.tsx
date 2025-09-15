import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SecurityConfig {
  mfaEnabled: boolean;
  sessionTimeout: number; // minutes
  maxFailedAttempts: number;
  passwordMinLength: number;
  requireHardwareKeys: boolean;
  auditLogging: boolean;
}

interface SecurityEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  metadata?: Record<string, any>;
}

interface DeviceInfo {
  deviceId: string;
  trusted: boolean;
  lastVerified: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  fingerprint: string;
}

interface SessionInfo {
  sessionId: string;
  userId: string;
  startTime: string;
  lastActivity: string;
  ipAddress: string;
  deviceInfo: DeviceInfo;
  riskScore: number;
  permissions: string[];
}

interface SecurityContextType {
  securityConfig: SecurityConfig;
  currentSession: SessionInfo | null;
  deviceTrust: DeviceInfo | null;
  securityEvents: SecurityEvent[];
  
  // Session Management
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  terminateSession: () => Promise<void>;
  
  // Device Management
  registerDevice: () => Promise<DeviceInfo>;
  verifyDevice: (deviceId: string) => Promise<boolean>;
  revokeDevice: (deviceId: string) => Promise<void>;
  
  // Security Monitoring
  logSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => Promise<void>;
  checkRiskLevel: () => Promise<'low' | 'medium' | 'high' | 'critical'>;
  
  // Zero-Trust Validation
  validateAccess: (resource: string, action: string) => Promise<boolean>;
  checkContinuousVerification: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  mfaEnabled: true,
  sessionTimeout: 15, // 15 minutes for industrial environments
  maxFailedAttempts: 3,
  passwordMinLength: 12,
  requireHardwareKeys: false, // Set to true for admin users
  auditLogging: true
};

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [securityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [deviceTrust, setDeviceTrust] = useState<DeviceInfo | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [lastVerification, setLastVerification] = useState<string>(new Date().toISOString());

  // Generate device fingerprint
  const generateDeviceFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('ALLRENTZ-Security', 10, 10);
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = btoa(JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasFingerprint,
      timestamp: Date.now()
    }));
    
    return fingerprint;
  };

  // Initialize session on component mount
  useEffect(() => {
    initializeSession();
    
    // Set up continuous verification
    const verificationInterval = setInterval(checkContinuousVerification, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(verificationInterval);
  }, []);

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const deviceInfo = await registerDevice();
        const sessionInfo: SessionInfo = {
          sessionId: crypto.randomUUID(),
          userId: user.id,
          startTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          ipAddress: 'unknown', // Would be populated by backend
          deviceInfo,
          riskScore: 0,
          permissions: await getUserPermissions(user)
        };
        
        setCurrentSession(sessionInfo);
        await logSecurityEvent({
          userId: user.id,
          action: 'session_start',
          resource: 'authentication',
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
          riskLevel: 'low',
          success: true
        });
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const getUserPermissions = async (user: User): Promise<string[]> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const rolePermissions: Record<string, string[]> = {
        'admin': ['*'],
        'manager': ['read_all', 'write_equipment', 'read_analytics', 'manage_users'],
        'vendor': ['read_own', 'write_own', 'read_marketplace'],
        'customer': ['read_marketplace', 'write_requests', 'read_own']
      };
      
      return rolePermissions[profile?.role] || ['read_marketplace'];
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return ['read_marketplace'];
    }
  };

  const validateSession = async (): Promise<boolean> => {
    if (!currentSession) return false;
    
    const now = new Date();
    const lastActivity = new Date(currentSession.lastActivity);
    const timeDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60); // minutes
    
    if (timeDiff > securityConfig.sessionTimeout) {
      await terminateSession();
      return false;
    }
    
    // Update last activity
    setCurrentSession(prev => prev ? {
      ...prev,
      lastActivity: now.toISOString()
    } : null);
    
    return true;
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        await terminateSession();
        return false;
      }
      
      // Refresh session tokens
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await terminateSession();
        return false;
      }
      
      await logSecurityEvent({
        userId: user.id,
        action: 'session_refresh',
        resource: 'authentication',
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
        riskLevel: 'low',
        success: true
      });
      
      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  };

  const terminateSession = async (): Promise<void> => {
    if (currentSession) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'session_terminate',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'low',
        success: true
      });
    }
    
    setCurrentSession(null);
    setDeviceTrust(null);
    await supabase.auth.signOut();
  };

  const registerDevice = async (): Promise<DeviceInfo> => {
    const fingerprint = generateDeviceFingerprint();
    const deviceInfo: DeviceInfo = {
      deviceId: crypto.randomUUID(),
      trusted: true, // Initially trusted, can be revoked
      lastVerified: new Date().toISOString(),
      deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      fingerprint
    };
    
    setDeviceTrust(deviceInfo);
    
    // Store device info in localStorage for persistence
    localStorage.setItem('allrentz_device_info', JSON.stringify(deviceInfo));
    
    return deviceInfo;
  };

  const verifyDevice = async (deviceId: string): Promise<boolean> => {
    const storedDevice = localStorage.getItem('allrentz_device_info');
    if (!storedDevice) return false;
    
    try {
      const deviceInfo: DeviceInfo = JSON.parse(storedDevice);
      const currentFingerprint = generateDeviceFingerprint();
      
      // Verify device fingerprint matches
      if (deviceInfo.deviceId === deviceId && deviceInfo.fingerprint === currentFingerprint) {
        setDeviceTrust({
          ...deviceInfo,
          lastVerified: new Date().toISOString()
        });
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  };

  const revokeDevice = async (deviceId: string): Promise<void> => {
    if (deviceTrust?.deviceId === deviceId) {
      setDeviceTrust(null);
      localStorage.removeItem('allrentz_device_info');
      await terminateSession();
    }
  };

  const logSecurityEvent = async (event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> => {
    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };
    
    setSecurityEvents(prev => [...prev.slice(-99), securityEvent]); // Keep last 100 events
    
    // In production, send to security monitoring system
    if (securityConfig.auditLogging) {
      console.log('Security Event:', securityEvent);
    }
  };

  const checkRiskLevel = async (): Promise<'low' | 'medium' | 'high' | 'critical'> => {
    if (!currentSession || !deviceTrust) return 'critical';
    
    let riskScore = 0;
    
    // Check session age
    const sessionAge = (Date.now() - new Date(currentSession.startTime).getTime()) / (1000 * 60 * 60); // hours
    if (sessionAge > 8) riskScore += 20;
    
    // Check device trust
    const deviceAge = (Date.now() - new Date(deviceTrust.lastVerified).getTime()) / (1000 * 60 * 60 * 24); // days
    if (deviceAge > 30) riskScore += 30;
    
    // Check recent failed attempts
    const recentFailures = securityEvents.filter(
      event => event.success === false && 
      new Date(event.timestamp).getTime() > Date.now() - (1000 * 60 * 60) // last hour
    ).length;
    
    riskScore += recentFailures * 15;
    
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  };

  const validateAccess = async (resource: string, action: string): Promise<boolean> => {
    if (!currentSession) return false;
    
    const isValidSession = await validateSession();
    if (!isValidSession) return false;
    
    const riskLevel = await checkRiskLevel();
    if (riskLevel === 'critical') return false;
    
    // Check permissions
    const hasWildcard = currentSession.permissions.includes('*');
    const hasSpecificPermission = currentSession.permissions.includes(`${action}_${resource}`) ||
                                currentSession.permissions.includes(`${action}_all`);
    
    const hasAccess = hasWildcard || hasSpecificPermission;
    
    await logSecurityEvent({
      userId: currentSession.userId,
      action: `access_${action}`,
      resource,
      ipAddress: currentSession.ipAddress,
      userAgent: navigator.userAgent,
      riskLevel,
      success: hasAccess
    });
    
    return hasAccess;
  };

  const checkContinuousVerification = async (): Promise<boolean> => {
    const now = new Date().toISOString();
    const lastVerificationTime = new Date(lastVerification);
    const timeDiff = (new Date(now).getTime() - lastVerificationTime.getTime()) / (1000 * 60); // minutes
    
    // Require verification every 15 minutes
    if (timeDiff > 15) {
      const isValid = await validateSession();
      if (isValid) {
        setLastVerification(now);
        return true;
      } else {
        await terminateSession();
        return false;
      }
    }
    
    return true;
  };

  return (
    <SecurityContext.Provider
      value={{
        securityConfig,
        currentSession,
        deviceTrust,
        securityEvents,
        validateSession,
        refreshSession,
        terminateSession,
        registerDevice,
        verifyDevice,
        revokeDevice,
        logSecurityEvent,
        checkRiskLevel,
        validateAccess,
        checkContinuousVerification
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};