import React, { createContext, useContext, type ReactNode } from 'react';
import type { RootStackParamList } from './types';

type StackEntry =
  | { screen: 'Main'; params: undefined }
  | { screen: 'BusinessDetail'; params: { businessId: string } }
  | { screen: 'ReservationFlow'; params: { businessId: string; businessName: string } }
  | { screen: 'ProfileAccount'; params: undefined }
  | { screen: 'ProfilePoints'; params: undefined }
  | { screen: 'ProfileAppointments'; params: undefined }
  | { screen: 'ProfileFavorites'; params: undefined }
  | { screen: 'ProfilePayments'; params: undefined }
  | { screen: 'ProfileSettings'; params: undefined }
  | { screen: 'LegalText'; params: { legalKey: 'kvkk' | 'etk' } }
  | { screen: 'MessagesList'; params: undefined }
  | { screen: 'Chat'; params: { conversationId: string; businessName?: string; messagingDisabled?: boolean } }
  | { screen: 'ExploreMap'; params: undefined }
  | { screen: 'BusinessReviews'; params: { businessId: string; businessName: string } };

type SimpleStackContextValue = {
  navigate: <K extends keyof RootStackParamList>(screen: K, params: RootStackParamList[K]) => void;
  goBack: () => void;
  popToTop: () => void;
};

const SimpleStackContext = createContext<SimpleStackContextValue | null>(null);

export function useSimpleStack() {
  const ctx = useContext(SimpleStackContext);
  if (!ctx) throw new Error('useSimpleStack must be used within SimpleStackProvider');
  return ctx;
}

type SimpleStackProviderProps = {
  children: ReactNode;
  stack: StackEntry[];
  setStack: React.Dispatch<React.SetStateAction<StackEntry[]>>;
};

export function SimpleStackProvider({ children, stack, setStack }: SimpleStackProviderProps) {
  const value: SimpleStackContextValue = {
    navigate(screen, params) {
      setStack((prev) => [...prev, { screen, params } as StackEntry]);
    },
    goBack() {
      setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    },
    popToTop() {
      setStack((prev) => (prev.length > 0 ? [prev[0]] : prev));
    },
  };
  return (
    <SimpleStackContext.Provider value={value}>
      {children}
    </SimpleStackContext.Provider>
  );
}

export type { StackEntry };
