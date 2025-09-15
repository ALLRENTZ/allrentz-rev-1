import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRepository } from '@/contexts/RepositoryContext';
import { User } from '@/repositories/interfaces';

export type UserRole = 'customer' | 'vendor' | 'admin' | 'manager';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role_type: UserRole;
  company_name: string | null;
  company_type: string | null;
  status: string | null;
  onboarding_completed: boolean | null;
  profile_completion_score: number | null;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  csvUser: User | null;
  loading: boolean;
  showDemoTour: boolean;
  setShowDemoTour: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loginAsDemo: (type: 'customer' | 'vendor') => Promise<void>;
  loginWithCsv: (email: string, password: string) => Promise<{ error: any }>;
  hasRole: (role: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const CsvAuthContext = createContext<AuthContextType | undefined>(undefined);

export const CsvAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [csvUser, setCsvUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const { toast } = useToast();
  const userRepository = useUserRepository();

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // If Supabase fails, try to load from localStorage (CSV auth)
        const savedCsvUser = localStorage.getItem('csv_auth_user');
        if (savedCsvUser && mounted) {
          try {
            const csvUserData = JSON.parse(savedCsvUser);
            setCsvUser(csvUserData);
            setProfile({
              id: csvUserData.id,
              email: csvUserData.email,
              full_name: csvUserData.name,
              role_type: csvUserData.role as UserRole,
              company_name: csvUserData.company_id,
              company_type: null,
              status: csvUserData.status,
              onboarding_completed: true,
              profile_completion_score: 100
            });
          } catch (parseError) {
            console.error('Error parsing saved CSV user:', parseError);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // If Supabase fails, try CSV authentication
        return await loginWithCsv(email, password);
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const loginWithCsv = async (email: string, password: string) => {
    try {
      // Find user in CSV repository
      const users = await userRepository.findBy({ email });
      const csvUserData = users.find(u => u.email === email);
      
      if (!csvUserData) {
        return { error: { message: 'User not found' } };
      }

      // Simple password check (in production, use proper hashing)
      if (csvUserData.password_hash !== password) {
        return { error: { message: 'Invalid password' } };
      }

      // Set CSV user as authenticated
      setCsvUser(csvUserData);
      setProfile({
        id: csvUserData.id,
        email: csvUserData.email,
        full_name: csvUserData.name,
        role_type: csvUserData.role as UserRole,
        company_name: csvUserData.company_id,
        company_type: null,
        status: csvUserData.status,
        onboarding_completed: true,
        profile_completion_score: 100
      });

      // Save to localStorage for persistence
      localStorage.setItem('csv_auth_user', JSON.stringify(csvUserData));

      toast({
        title: 'Login Successful',
        description: `Welcome back, ${csvUserData.name}! (CSV Authentication)`,
      });

      return { error: null };
    } catch (error) {
      console.error('CSV login error:', error);
      return { error: { message: 'CSV authentication failed' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear CSV authentication
      setCsvUser(null);
      localStorage.removeItem('csv_auth_user');
      
      setProfile(null);
      setShowDemoTour(false);
      
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loginAsDemo = async (type: 'customer' | 'vendor') => {
    try {
      // Try to find demo user in CSV first
      const demoEmail = `demo.${type}@allrentz.com`;
      const users = await userRepository.findBy({ email: demoEmail });
      let demoUser = users[0];

      if (!demoUser) {
        // Create demo user in CSV if not exists
        const newDemoUser = {
          name: type === 'customer' ? 'Demo Customer' : 'Demo Vendor',
          email: demoEmail,
          password_hash: 'demo123456', // Simple demo password
          role: type,
          status: 'active',
          company_id: type === 'customer' ? 'comp_003' : 'comp_001',
          phone: '555-DEMO',
          preferences: {
            notifications: true,
            demo_mode: true
          },
          profile: {
            bio: `Demo ${type} account for testing`,
            location: 'Houston, TX'
          }
        };

        demoUser = await userRepository.create(newDemoUser);
      }

      // Set as authenticated CSV user
      setCsvUser(demoUser);
      setProfile({
        id: demoUser.id,
        email: demoUser.email,
        full_name: demoUser.name,
        role_type: demoUser.role as UserRole,
        company_name: demoUser.company_id,
        company_type: type,
        status: demoUser.status,
        onboarding_completed: true,
        profile_completion_score: 100
      });

      // Save to localStorage
      localStorage.setItem('csv_auth_user', JSON.stringify(demoUser));

      setShowDemoTour(true);
      
      toast({
        title: `${type} Demo Mode`,
        description: `Welcome to the demo! Explore as a ${type}.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error logging in as demo:', error);
      toast({
        title: 'Demo Login Failed',
        description: 'Could not access demo mode.',
        variant: 'destructive',
      });
    }
  };

  const hasRole = useCallback((role: UserRole): boolean => {
    return profile?.role_type === role;
  }, [profile]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    } else if (csvUser) {
      // Refresh CSV user profile
      try {
        const updatedUser = await userRepository.getById(csvUser.id);
        if (updatedUser) {
          setCsvUser(updatedUser);
          setProfile({
            id: updatedUser.id,
            email: updatedUser.email,
            full_name: updatedUser.name,
            role_type: updatedUser.role as UserRole,
            company_name: updatedUser.company_id,
            company_type: null,
            status: updatedUser.status,
            onboarding_completed: true,
            profile_completion_score: 100
          });
          localStorage.setItem('csv_auth_user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error refreshing CSV profile:', error);
      }
    }
  };

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    csvUser,
    loading,
    showDemoTour,
    setShowDemoTour,
    signIn,
    signUp,
    signOut,
    loginAsDemo,
    loginWithCsv,
    hasRole,
    refreshProfile,
  }), [user, session, profile, csvUser, loading, showDemoTour, hasRole]);

  return (
    <CsvAuthContext.Provider value={contextValue}>
      {children}
    </CsvAuthContext.Provider>
  );
};

export const useCsvAuth = () => {
  const context = useContext(CsvAuthContext);
  if (context === undefined) {
    throw new Error('useCsvAuth must be used within a CsvAuthProvider');
  }
  return context;
};

// Backwards compatibility with existing useAuth
export const useAuthContext = useCsvAuth;
export { useCsvAuth as useAuth };