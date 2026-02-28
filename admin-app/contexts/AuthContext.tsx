import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  signOut: async () => {},
});

export function AuthProvider({ children, initialSession }: { children: React.ReactNode; initialSession: Session | null }) {
  const [session, setSession] = useState<Session | null>(initialSession);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialSession !== undefined && initialSession !== null) {
      setSession(initialSession);
    }
  }, [initialSession]);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
