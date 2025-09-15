import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurity } from './SecurityContext';

interface MFAConfig {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email' | 'hardware_key')[];
  backupCodes: string[];
  enforceForRoles: string[];
}

interface MFAChallenge {
  challengeId: string;
  method: 'totp' | 'sms' | 'email' | 'hardware_key';
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
}

interface MFAContextType {
  mfaConfig: MFAConfig;
  currentChallenge: MFAChallenge | null;
  isEnrolled: boolean;
  
  // Enrollment
  startEnrollment: (method: 'totp' | 'sms' | 'email') => Promise<{ secret?: string; qrCode?: string }>;
  completeEnrollment: (code: string) => Promise<boolean>;
  
  // Authentication
  startChallenge: (method: 'totp' | 'sms' | 'email' | 'hardware_key') => Promise<MFAChallenge>;
  verifyChallenge: (challengeId: string, code: string) => Promise<boolean>;
  
  // Management
  generateBackupCodes: () => Promise<string[]>;
  verifyBackupCode: (code: string) => Promise<boolean>;
  disableMFA: (password: string) => Promise<boolean>;
  
  // Hardware Key Support
  registerHardwareKey: () => Promise<boolean>;
  verifyHardwareKey: (challengeId: string) => Promise<boolean>;
}

const MFAContext = createContext<MFAContextType | undefined>(undefined);

const DEFAULT_MFA_CONFIG: MFAConfig = {
  enabled: true,
  methods: ['totp', 'sms', 'email'],
  backupCodes: [],
  enforceForRoles: ['admin', 'manager']
};

export function MFAProvider({ children }: { children: ReactNode }) {
  const { logSecurityEvent, currentSession } = useSecurity();
  const [mfaConfig, setMfaConfig] = useState<MFAConfig>(DEFAULT_MFA_CONFIG);
  const [currentChallenge, setCurrentChallenge] = useState<MFAChallenge | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);

  // Check MFA enrollment status on initialization
  React.useEffect(() => {
    checkEnrollmentStatus();
  }, [currentSession]);

  const checkEnrollmentStatus = async () => {
    if (!currentSession) return;
    
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (!error && factors) {
        setIsEnrolled(factors.totp?.length > 0 || false);
      }
    } catch (error) {
      console.error('Failed to check MFA enrollment:', error);
    }
  };

  const generateTOTPSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateQRCode = (secret: string, email: string): string => {
    const issuer = 'ALLRENTZ';
    const otpauth = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(otpauth)}`;
  };

  const startEnrollment = async (method: 'totp' | 'sms' | 'email') => {
    if (!currentSession) throw new Error('No active session');

    try {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_enrollment_start',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'medium',
        success: true,
        metadata: { method }
      });

      if (method === 'totp') {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp'
        });

        if (error) throw error;

        const qrCode = generateQRCode(data.totp.qr_code, currentSession.userId);
        
        return {
          secret: data.totp.secret,
          qrCode
        };
      } else if (method === 'sms' || method === 'email') {
        // For SMS/Email, we would integrate with external providers
        // For demo purposes, we'll simulate the process
        return { secret: 'SMS/Email enrollment would be implemented here' };
      }

      return {};
    } catch (error) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_enrollment_failed',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'high',
        success: false,
        metadata: { method, error: error.message }
      });
      throw error;
    }
  };

  const completeEnrollment = async (code: string): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: 'temp-factor-id', // This would come from startEnrollment response
        code
      });

      if (error) throw error;

      setIsEnrolled(true);
      
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_enrollment_complete',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'low',
        success: true
      });

      return true;
    } catch (error) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_enrollment_failed',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'high',
        success: false,
        metadata: { error: error.message }
      });
      return false;
    }
  };

  const startChallenge = async (method: 'totp' | 'sms' | 'email' | 'hardware_key'): Promise<MFAChallenge> => {
    if (!currentSession) throw new Error('No active session');

    const challenge: MFAChallenge = {
      challengeId: crypto.randomUUID(),
      method,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      attempts: 0,
      maxAttempts: 3
    };

    try {
      if (method === 'totp') {
        const { data, error } = await supabase.auth.mfa.challenge({
          factorId: 'user-factor-id' // Would be stored during enrollment
        });
        
        if (error) throw error;
        challenge.challengeId = data.id;
      } else if (method === 'sms' || method === 'email') {
        // Send SMS/Email challenge
        console.log(`Sending ${method} challenge to user`);
      } else if (method === 'hardware_key') {
        // WebAuthn challenge would be initiated here
        console.log('Starting WebAuthn challenge');
      }

      setCurrentChallenge(challenge);

      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_challenge_start',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'medium',
        success: true,
        metadata: { method, challengeId: challenge.challengeId }
      });

      return challenge;
    } catch (error) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_challenge_failed',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'high',
        success: false,
        metadata: { method, error: error.message }
      });
      throw error;
    }
  };

  const verifyChallenge = async (challengeId: string, code: string): Promise<boolean> => {
    if (!currentSession || !currentChallenge || currentChallenge.challengeId !== challengeId) {
      return false;
    }

    if (new Date() > new Date(currentChallenge.expiresAt)) {
      setCurrentChallenge(null);
      return false;
    }

    if (currentChallenge.attempts >= currentChallenge.maxAttempts) {
      setCurrentChallenge(null);
      return false;
    }

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: challengeId,
        challengeId: challengeId,
        code
      });

      const success = !error;

      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_verify_attempt',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: success ? 'low' : 'high',
        success,
        metadata: { 
          challengeId, 
          attempt: currentChallenge.attempts + 1,
          method: currentChallenge.method
        }
      });

      if (success) {
        setCurrentChallenge(null);
        return true;
      } else {
        setCurrentChallenge({
          ...currentChallenge,
          attempts: currentChallenge.attempts + 1
        });
        return false;
      }
    } catch (error) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_verify_error',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'critical',
        success: false,
        metadata: { challengeId, error: error.message }
      });
      return false;
    }
  };

  const generateBackupCodes = async (): Promise<string[]> => {
    if (!currentSession) throw new Error('No active session');

    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    setMfaConfig(prev => ({
      ...prev,
      backupCodes: codes
    }));

    await logSecurityEvent({
      userId: currentSession.userId,
      action: 'backup_codes_generated',
      resource: 'authentication',
      ipAddress: currentSession.ipAddress,
      userAgent: navigator.userAgent,
      riskLevel: 'medium',
      success: true,
      metadata: { codeCount: codes.length }
    });

    return codes;
  };

  const verifyBackupCode = async (code: string): Promise<boolean> => {
    if (!currentSession) return false;

    const isValid = mfaConfig.backupCodes.includes(code.toUpperCase());
    
    if (isValid) {
      // Remove used backup code
      setMfaConfig(prev => ({
        ...prev,
        backupCodes: prev.backupCodes.filter(c => c !== code.toUpperCase())
      }));
    }

    await logSecurityEvent({
      userId: currentSession.userId,
      action: 'backup_code_used',
      resource: 'authentication',
      ipAddress: currentSession.ipAddress,
      userAgent: navigator.userAgent,
      riskLevel: isValid ? 'medium' : 'high',
      success: isValid
    });

    return isValid;
  };

  const disableMFA = async (password: string): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      // Verify password first
      const { error } = await supabase.auth.signInWithPassword({
        email: currentSession.userId, // This would need to be the user's email
        password
      });

      if (error) return false;

      // Unenroll all factors
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: 'user-factor-id'
      });

      const success = !unenrollError;

      if (success) {
        setIsEnrolled(false);
        setMfaConfig(prev => ({ ...prev, backupCodes: [] }));
      }

      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'mfa_disabled',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'high',
        success
      });

      return success;
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      return false;
    }
  };

  const registerHardwareKey = async (): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported');
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'ALLRENTZ',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(currentSession.userId),
            name: currentSession.userId,
            displayName: 'ALLRENTZ User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'cross-platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      };

      const credential = await navigator.credentials.create(credentialCreationOptions);
      
      if (credential) {
        await logSecurityEvent({
          userId: currentSession.userId,
          action: 'hardware_key_registered',
          resource: 'authentication',
          ipAddress: currentSession.ipAddress,
          userAgent: navigator.userAgent,
          riskLevel: 'low',
          success: true
        });
        return true;
      }

      return false;
    } catch (error) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'hardware_key_registration_failed',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'medium',
        success: false,
        metadata: { error: error.message }
      });
      return false;
    }
  };

  const verifyHardwareKey = async (challengeId: string): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          rpId: window.location.hostname,
          userVerification: 'required'
        }
      };

      const assertion = await navigator.credentials.get(credentialRequestOptions);
      
      const success = assertion !== null;

      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'hardware_key_verified',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: success ? 'low' : 'high',
        success
      });

      return success;
    } catch (error) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'hardware_key_verification_failed',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'high',
        success: false,
        metadata: { error: error.message }
      });
      return false;
    }
  };

  return (
    <MFAContext.Provider
      value={{
        mfaConfig,
        currentChallenge,
        isEnrolled,
        startEnrollment,
        completeEnrollment,
        startChallenge,
        verifyChallenge,
        generateBackupCodes,
        verifyBackupCode,
        disableMFA,
        registerHardwareKey,
        verifyHardwareKey
      }}
    >
      {children}
    </MFAContext.Provider>
  );
}

export const useMFA = () => {
  const context = useContext(MFAContext);
  if (context === undefined) {
    throw new Error('useMFA must be used within an MFAProvider');
  }
  return context;
};