import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return data?.role as AppRole;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  };

  useEffect(() => {
    let roleFetchTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear any pending role fetch
        if (roleFetchTimeout) {
          clearTimeout(roleFetchTimeout);
        }
        
        // Defer role fetch to avoid deadlock and reduce rapid API calls
        if (session?.user) {
          // Add a small delay to batch operations and avoid rate limits
          roleFetchTimeout = setTimeout(() => {
            if (isMounted) {
              fetchUserRole(session.user.id).then((role) => {
                if (isMounted) {
                  setRole(role);
                }
              });
            }
          }, 100);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Add delay to avoid immediate API call after session check
        roleFetchTimeout = setTimeout(() => {
          if (isMounted) {
            fetchUserRole(session.user.id).then((role) => {
              if (isMounted) {
                setRole(role);
              }
            });
          }
        }, 100);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (roleFetchTimeout) {
        clearTimeout(roleFetchTimeout);
      }
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      // Convert Supabase error to standard Error format
      if (error) {
        return { 
          error: new Error(error.message || 'Signup failed. Please try again.') 
        };
      }

      return { error: null };
    } catch (err: any) {
      // Handle network errors, rate limits, etc.
      const errorMessage = err.message || 'An unexpected error occurred. Please try again later.';
      return { 
        error: new Error(errorMessage) 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
