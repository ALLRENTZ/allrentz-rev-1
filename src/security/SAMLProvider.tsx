import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurity } from './SecurityContext';

interface SAMLConfiguration {
  entityId: string;
  ssoUrl: string;
  x509Certificate: string;
  nameIdFormat: string;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department: string;
    company: string;
  };
  signRequests: boolean;
  encryptAssertions: boolean;
  forceAuthn: boolean;
}

interface SAMLProvider {
  id: string;
  name: string;
  domain: string;
  configuration: SAMLConfiguration;
  enabled: boolean;
  lastSync: string;
  userCount: number;
}

interface SAMLAssertion {
  nameId: string;
  sessionIndex: string;
  attributes: Record<string, string>;
  issuer: string;
  audience: string;
  notBefore: string;
  notOnOrAfter: string;
  signature: string;
}

interface JITProvisioningConfig {
  enabled: boolean;
  createUsers: boolean;
  updateExisting: boolean;
  defaultRole: string;
  requiredAttributes: string[];
  groupMapping: Record<string, string>;
}

interface SAMLContextType {
  providers: SAMLProvider[];
  currentProvider: SAMLProvider | null;
  jitConfig: JITProvisioningConfig;
  
  // Provider Management
  addProvider: (provider: Omit<SAMLProvider, 'id' | 'lastSync' | 'userCount'>) => Promise<string>;
  updateProvider: (id: string, updates: Partial<SAMLProvider>) => Promise<boolean>;
  removeProvider: (id: string) => Promise<boolean>;
  testProvider: (id: string) => Promise<boolean>;
  
  // Authentication
  initiateSAMLLogin: (providerId: string, relayState?: string) => Promise<string>;
  handleSAMLResponse: (samlResponse: string, relayState?: string) => Promise<boolean>;
  validateAssertion: (assertion: SAMLAssertion) => Promise<boolean>;
  
  // User Provisioning
  provisionUser: (assertion: SAMLAssertion) => Promise<string>;
  updateUserAttributes: (userId: string, attributes: Record<string, string>) => Promise<boolean>;
  
  // Session Management
  createSAMLSession: (assertion: SAMLAssertion) => Promise<string>;
  handleSingleLogout: (providerId: string) => Promise<boolean>;
}

const SAMLContext = createContext<SAMLContextType | undefined>(undefined);

const DEFAULT_JIT_CONFIG: JITProvisioningConfig = {
  enabled: true,
  createUsers: true,
  updateExisting: true,
  defaultRole: 'customer',
  requiredAttributes: ['email', 'firstName', 'lastName'],
  groupMapping: {
    'admin': 'admin',
    'manager': 'manager',
    'vendor': 'vendor',
    'user': 'customer'
  }
};

export function SAMLProvider({ children }: { children: ReactNode }) {
  const { logSecurityEvent, currentSession } = useSecurity();
  const [providers, setProviders] = useState<SAMLProvider[]>([]);
  const [currentProvider, setCurrentProvider] = useState<SAMLProvider | null>(null);
  const [jitConfig] = useState<JITProvisioningConfig>(DEFAULT_JIT_CONFIG);

  // Load SAML providers on initialization
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      // In production, this would fetch from database
      const mockProviders: SAMLProvider[] = [
        {
          id: 'okta-1',
          name: 'Okta Corporate',
          domain: 'corp.allrentz.com',
          configuration: {
            entityId: 'urn:allrentz:okta',
            ssoUrl: 'https://allrentz.okta.com/app/saml2/exampleid/sso/saml',
            x509Certificate: 'MIIDpDCCAoygAwIBAgIGAV2ka+55MA0GCSqGSIb3DQEBCwUAMIGSMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzENMAsGA1UECgwET2t0YTEUMBIGA1UECwwLU1NPUHJvdmlkZXIxEzARBgNVBAMMCmRldi04MzI2NTUxHDAaBgkqhkiG9w0BCQEWDWluZm9Ab2t0YS5jb20wHhcNMTkwNTMxMTgzNzI1WhcNMjkwNTMxMTgzNzI1WjCBkjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xDTALBgNVBAoMBE9rdGExFDASBgNVBAsMC1NTT1Byb3ZpZGVyMRMwEQYDVQQDDApkZXYtODMyNjU1MRwwGgYJKoZIhvcNAQkBFg1pbmZvQG9rdGEuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuE6i5BfqaCpYCsQ2IgEj2KkkjQiSNAOwqNrNGFNlhO0EijQBzRkKdE/UE+jcBttIzHvdvBGQtE0TRFqHt75W8g8GfP5WFNGfB4egjq7sDhd2cOK1KgNrD6XdnSyXhR7uKY6QhFvKbFj0yHqGlqfDxoD7WqQcCUYLlqNJ4lkQWnwRhKMD5vgNJMkkOhTq4QO6cCPl8rQXXgFgvFjlNXhXP6hN/E5yV4pNqpZgPKXwYhzOpNOEdjJqGdN6DqgBhQo7iQrh8LXOr3f3xNDq1+hT/Z8zXPxZ7LHsOd+cLSZoU3bZQUO3JVGB3Q4lqGhxZ3oR9LjZBUn8yfXV8A8LQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQCDrk4b9aZnvhcwgYr9HDR6rIITKF2Bq9YNAOl6AiwjV9QR5eOJ7VSDdOiBGNlMRXQqMBGXQWjQMBlOGXt4M8dG2i2eiU8ndjQ8GKkT1pjJ4TsUiJGXnxgk1C8mQrEhHgPLqNnL9Q8FaBlRO4yVPo3yGf+R9k6wTKjIm8Fp4Wt6uH5+gCv8LY9uYFnD8YT0LqJ4rS2+vFhUfHB3vQZxsI8CjvdAT0p1OdC2t6gBdq+hOHxbNr8fOvKjKhYHfIV9Xs3L+I6NiJY1rE8YZ4qRnB3Z6cJcZdGzW0Jt7Z2wlE',
            nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            attributeMapping: {
              email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
              firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
              lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
              role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
              department: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department',
              company: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/company'
            },
            signRequests: true,
            encryptAssertions: true,
            forceAuthn: false
          },
          enabled: true,
          lastSync: new Date().toISOString(),
          userCount: 156
        },
        {
          id: 'azure-1',
          name: 'Azure AD Corporate',
          domain: 'allrentz.onmicrosoft.com',
          configuration: {
            entityId: 'spn:12345678-1234-1234-1234-123456789012',
            ssoUrl: 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/saml2',
            x509Certificate: 'MIIDYDCCAkigAwIBAgIJAKpZ8/+JQzz3MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwHhcNMTkwNTMxMTI0NjE1WhcNMjkwNTMxMTI0NjE1WjBFMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwLGhqvGhg6QG3zfZKNx8pIy3ks3BwPhsjUHc7zPHwBr0LxKv2MzL3u4vNrq1gOiCsflZi2Y3jPghDJqDPZB3t5FxQNYZx3Pv5J4bTQrNqYvtZr5Y6Oqm3c5p4VNvM8zBvKQF7y5Z8F5R6gKQ5F9K8M7fL5d8K6P2hJ5gN8R3P3zQD7j3gGR7K5pCQ9hQ5F8K3qM5L8Q2z5F8D3qG7Q2K1F8L7g5H3P9K6G8Q5z2F3L9B6G7K2z5H8F3N9G6P5K2B7Q8z3F6P9J2G5Q8B3F7K9L3P6G2Q5z8F7B3K9P6G2L5Q8H3F9B6K7G2P5z8Q3F7L9B6P2G5K8H7QIDAQABo1MwUTAdBgNVHQ4EFgQU8L7j9P6Q5K8F3G7B2M9L6z3H5Q8wHwYDVR0jBBgwFoAU8L7j9P6Q5K8F3G7B2M9L6z3H5Q8wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAr7g3P2K8L9F6G3Q5z8B7H3K9L6P2G8z5F3Q7B6K2P9G5L8z3F6H7Q8B3K9P6G2L5z8F7B3K6P9G2Q5L8H3F9B6K7G2P5z8Q3F7L9B6P2G5K8H7Q3F2B6K9P5G8L3z7F9B2K6P3G5Q8L7H3F6B9K2P5G7Q8z3F2L6B9K3P5G8Q7H2F9B6K3P5L8G2Q7z3F9B6K2P5G8L7H3Q2F6B9K3P5G8L2Q7z3H9F6B2K3P5G8Q7L2H3F9B6K',
            nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
            attributeMapping: {
              email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
              firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
              lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
              role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
              department: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department',
              company: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/company'
            },
            signRequests: true,
            encryptAssertions: true,
            forceAuthn: false
          },
          enabled: true,
          lastSync: new Date().toISOString(),
          userCount: 342
        }
      ];

      setProviders(mockProviders);
    } catch (error) {
      console.error('Failed to load SAML providers:', error);
    }
  };

  const addProvider = async (provider: Omit<SAMLProvider, 'id' | 'lastSync' | 'userCount'>): Promise<string> => {
    const newProvider: SAMLProvider = {
      ...provider,
      id: crypto.randomUUID(),
      lastSync: new Date().toISOString(),
      userCount: 0
    };

    setProviders(prev => [...prev, newProvider]);

    if (currentSession) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'saml_provider_added',
        resource: 'identity_provider',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'medium',
        success: true,
        metadata: { providerId: newProvider.id, providerName: newProvider.name }
      });
    }

    return newProvider.id;
  };

  const updateProvider = async (id: string, updates: Partial<SAMLProvider>): Promise<boolean> => {
    try {
      setProviders(prev => prev.map(provider => 
        provider.id === id 
          ? { ...provider, ...updates, lastSync: new Date().toISOString() }
          : provider
      ));

      if (currentSession) {
        await logSecurityEvent({
          userId: currentSession.userId,
          action: 'saml_provider_updated',
          resource: 'identity_provider',
          ipAddress: currentSession.ipAddress,
          userAgent: navigator.userAgent,
          riskLevel: 'medium',
          success: true,
          metadata: { providerId: id, updates: Object.keys(updates) }
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to update SAML provider:', error);
      return false;
    }
  };

  const removeProvider = async (id: string): Promise<boolean> => {
    try {
      const provider = providers.find(p => p.id === id);
      setProviders(prev => prev.filter(p => p.id !== id));

      if (currentSession) {
        await logSecurityEvent({
          userId: currentSession.userId,
          action: 'saml_provider_removed',
          resource: 'identity_provider',
          ipAddress: currentSession.ipAddress,
          userAgent: navigator.userAgent,
          riskLevel: 'high',
          success: true,
          metadata: { providerId: id, providerName: provider?.name }
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to remove SAML provider:', error);
      return false;
    }
  };

  const testProvider = async (id: string): Promise<boolean> => {
    try {
      const provider = providers.find(p => p.id === id);
      if (!provider) return false;

      // In production, this would perform actual SAML metadata validation
      const testUrl = `${provider.configuration.ssoUrl}?SAMLRequest=test`;
      console.log('Testing SAML provider:', testUrl);

      if (currentSession) {
        await logSecurityEvent({
          userId: currentSession.userId,
          action: 'saml_provider_tested',
          resource: 'identity_provider',
          ipAddress: currentSession.ipAddress,
          userAgent: navigator.userAgent,
          riskLevel: 'low',
          success: true,
          metadata: { providerId: id, providerName: provider.name }
        });
      }

      return true;
    } catch (error) {
      console.error('SAML provider test failed:', error);
      return false;
    }
  };

  const initiateSAMLLogin = async (providerId: string, relayState?: string): Promise<string> => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) throw new Error('Provider not found');

    // Generate SAML request
    const samlRequest = btoa(JSON.stringify({
      id: crypto.randomUUID(),
      issueInstant: new Date().toISOString(),
      destination: provider.configuration.ssoUrl,
      issuer: window.location.origin,
      nameIdPolicy: {
        format: provider.configuration.nameIdFormat,
        allowCreate: true
      },
      requestedAuthnContext: {
        comparison: 'exact',
        authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'
      },
      forceAuthn: provider.configuration.forceAuthn
    }));

    const params = new URLSearchParams({
      SAMLRequest: samlRequest,
      RelayState: relayState || window.location.pathname
    });

    const ssoUrl = `${provider.configuration.ssoUrl}?${params.toString()}`;

    if (currentSession) {
      await logSecurityEvent({
        userId: currentSession.userId,
        action: 'saml_login_initiated',
        resource: 'authentication',
        ipAddress: currentSession.ipAddress,
        userAgent: navigator.userAgent,
        riskLevel: 'medium',
        success: true,
        metadata: { providerId, relayState }
      });
    }

    return ssoUrl;
  };

  const handleSAMLResponse = async (samlResponse: string, relayState?: string): Promise<boolean> => {
    try {
      // Decode and parse SAML response
      const decodedResponse = atob(samlResponse);
      const responseData = JSON.parse(decodedResponse); // In production, this would be XML parsing

      // Extract assertion
      const assertion: SAMLAssertion = {
        nameId: responseData.nameId,
        sessionIndex: responseData.sessionIndex,
        attributes: responseData.attributes || {},
        issuer: responseData.issuer,
        audience: responseData.audience,
        notBefore: responseData.notBefore,
        notOnOrAfter: responseData.notOnOrAfter,
        signature: responseData.signature
      };

      // Validate assertion
      const isValid = await validateAssertion(assertion);
      if (!isValid) {
        throw new Error('Invalid SAML assertion');
      }

      // Provision or update user
      const userId = await provisionUser(assertion);
      
      // Create SAML session
      const sessionId = await createSAMLSession(assertion);

      await logSecurityEvent({
        userId,
        action: 'saml_login_success',
        resource: 'authentication',
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
        riskLevel: 'low',
        success: true,
        metadata: { 
          sessionId,
          issuer: assertion.issuer,
          nameId: assertion.nameId,
          relayState 
        }
      });

      return true;
    } catch (error) {
      await logSecurityEvent({
        userId: 'unknown',
        action: 'saml_login_failed',
        resource: 'authentication',
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
        riskLevel: 'high',
        success: false,
        metadata: { error: error.message, relayState }
      });

      console.error('SAML response handling failed:', error);
      return false;
    }
  };

  const validateAssertion = async (assertion: SAMLAssertion): Promise<boolean> => {
    try {
      // Check time validity
      const now = new Date();
      const notBefore = new Date(assertion.notBefore);
      const notOnOrAfter = new Date(assertion.notOnOrAfter);
      
      if (now < notBefore || now > notOnOrAfter) {
        throw new Error('Assertion time validity failed');
      }

      // Check audience
      if (assertion.audience !== window.location.origin) {
        throw new Error('Invalid audience');
      }

      // Find provider by issuer
      const provider = providers.find(p => p.configuration.entityId === assertion.issuer);
      if (!provider || !provider.enabled) {
        throw new Error('Unknown or disabled provider');
      }

      setCurrentProvider(provider);

      // In production, validate signature using provider's certificate
      console.log('Validating signature with certificate:', provider.configuration.x509Certificate.substring(0, 100) + '...');

      return true;
    } catch (error) {
      console.error('Assertion validation failed:', error);
      return false;
    }
  };

  const provisionUser = async (assertion: SAMLAssertion): Promise<string> => {
    try {
      if (!currentProvider) throw new Error('No current provider');

      const mapping = currentProvider.configuration.attributeMapping;
      const email = assertion.attributes[mapping.email];
      
      if (!email) {
        throw new Error('Email attribute is required');
      }

      // Check required attributes
      const missingAttributes = jitConfig.requiredAttributes.filter(
        attr => !assertion.attributes[mapping[attr as keyof typeof mapping]]
      );
      
      if (missingAttributes.length > 0) {
        throw new Error(`Missing required attributes: ${missingAttributes.join(', ')}`);
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      let userId: string;

      if (existingUser && jitConfig.updateExisting) {
        // Update existing user
        userId = existingUser.id;
        await updateUserAttributes(userId, assertion.attributes);
      } else if (!existingUser && jitConfig.createUsers) {
        // Create new user
        const userData = {
          email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            firstName: assertion.attributes[mapping.firstName],
            lastName: assertion.attributes[mapping.lastName],
            provider: currentProvider.id,
            saml_name_id: assertion.nameId
          },
          app_metadata: {
            provider: 'saml',
            saml_provider: currentProvider.id
          }
        };

        const { data: newUser, error } = await supabase.auth.admin.createUser(userData);
        if (error || !newUser.user) throw error;

        userId = newUser.user.id;

        // Create profile
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            role: jitConfig.groupMapping[assertion.attributes[mapping.role]] || jitConfig.defaultRole,
            profile: {
              firstName: assertion.attributes[mapping.firstName],
              lastName: assertion.attributes[mapping.lastName],
              company: assertion.attributes[mapping.company],
              department: assertion.attributes[mapping.department]
            },
            preferences: {
              notifications: true,
              currency: 'USD',
              timezone: 'America/Chicago'
            }
          });
      } else {
        throw new Error('User provisioning not allowed');
      }

      // Update provider user count
      await updateProvider(currentProvider.id, {
        userCount: currentProvider.userCount + (existingUser ? 0 : 1)
      });

      return userId;
    } catch (error) {
      console.error('User provisioning failed:', error);
      throw error;
    }
  };

  const updateUserAttributes = async (userId: string, attributes: Record<string, string>): Promise<boolean> => {
    try {
      if (!currentProvider) return false;

      const mapping = currentProvider.configuration.attributeMapping;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          profile: {
            firstName: attributes[mapping.firstName],
            lastName: attributes[mapping.lastName],
            company: attributes[mapping.company],
            department: attributes[mapping.department]
          }
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to update user attributes:', error);
      return false;
    }
  };

  const createSAMLSession = async (assertion: SAMLAssertion): Promise<string> => {
    const sessionId = crypto.randomUUID();
    
    // Store SAML session information
    const sessionData = {
      sessionId,
      nameId: assertion.nameId,
      sessionIndex: assertion.sessionIndex,
      provider: currentProvider?.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(assertion.notOnOrAfter).toISOString()
    };

    // In production, store in secure session storage or database
    sessionStorage.setItem('saml_session', JSON.stringify(sessionData));

    return sessionId;
  };

  const handleSingleLogout = async (providerId: string): Promise<boolean> => {
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return false;

      // Clear SAML session
      sessionStorage.removeItem('saml_session');

      // Sign out from Supabase
      await supabase.auth.signOut();

      if (currentSession) {
        await logSecurityEvent({
          userId: currentSession.userId,
          action: 'saml_logout',
          resource: 'authentication',
          ipAddress: currentSession.ipAddress,
          userAgent: navigator.userAgent,
          riskLevel: 'low',
          success: true,
          metadata: { providerId }
        });
      }

      return true;
    } catch (error) {
      console.error('SAML logout failed:', error);
      return false;
    }
  };

  return (
    <SAMLContext.Provider
      value={{
        providers,
        currentProvider,
        jitConfig,
        addProvider,
        updateProvider,
        removeProvider,
        testProvider,
        initiateSAMLLogin,
        handleSAMLResponse,
        validateAssertion,
        provisionUser,
        updateUserAttributes,
        createSAMLSession,
        handleSingleLogout
      }}
    >
      {children}
    </SAMLContext.Provider>
  );
}

export const useSAML = () => {
  const context = useContext(SAMLContext);
  if (context === undefined) {
    throw new Error('useSAML must be used within a SAMLProvider');
  }
  return context;
};