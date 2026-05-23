
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  showDemoTour: boolean;
  setShowDemoTour: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loginAsDemo: (type: 'customer' | 'vendor') => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const { toast } = useToast();

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const loginAsDemo = async (type: 'customer' | 'vendor') => {
    const demoCredentials = {
      customer: { email: 'demo.customer@allrentz.com', password: 'demo123456' },
      vendor: { email: 'demo.vendor@allrentz.com', password: 'demo123456' }
    };

    try {
      // Try to sign in first
      const { error: signInError } = await signIn(
        demoCredentials[type].email,
        demoCredentials[type].password
      );

      if (signInError) {
        toast({
          title: "Demo login failed",
          description: "Please try again or contact support.",
          variant: "destructive",
        });
        return;
      }

      // Show demo tour after successful login
      setShowDemoTour(true);

      toast({
        title: `Welcome to the ${type === 'customer' ? 'Customer' : 'Vendor'} Demo!`,
        description: `You're now exploring ALLRENTZ as ${type === 'customer' ? 'Gulf Coast Refinery' : 'Pat-Rentals Equipment Co'}.`,
      });
    } catch (error) {
      console.error('Demo login error:', error);
      toast({
        title: "Demo login failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return profile?.role_type === role;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid potential issues
          setTimeout(() => {
            refreshProfile();
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          refreshProfile();
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    profile,
    loading,
    showDemoTour,
    setShowDemoTour,
    signIn,
    signUp,
    signOut,
    loginAsDemo,
    hasRole,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
