'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';

function isInvalidCredentialsError(e: { message?: string } | null): boolean {
  if (!e?.message) return false;
  const m = e.message.toLowerCase();
  return m.includes('invalid') && (m.includes('credential') || m.includes('login'));
}

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }
    // Never leave the page stuck on "Yükleniyor..." if Supabase is slow or unreachable.
    const timeout = setTimeout(() => setLoading(false), 8000);
    client.auth
      .getUser()
      .then(async ({ data: { user: u } }) => {
        if (u) {
          const { data: { session: s } } = await client.auth.getSession();
          setSession(s);
        } else {
          setSession(null);
        }
      })
      .catch((err) => {
        console.error('Auth init error:', err);
        setSession(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase yapılandırılmamış') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && isInvalidCredentialsError(error)) return { error: new Error(t('auth.invalidCredentials')) };
    return { error: error ?? null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!supabase) return { error: new Error('Supabase yapılandırılmamış') };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    return { error: error ?? null };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading: Boolean(loading),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
