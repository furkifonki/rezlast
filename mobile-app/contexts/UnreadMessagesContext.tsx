import React, { createContext, useContext, type ReactNode } from 'react';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';

type UnreadMessagesContextType = {
  unreadCount: number;
  refetchUnread: () => Promise<void>;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextType | null>(null);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { count, refetch } = useUnreadMessagesCount();
  return (
    <UnreadMessagesContext.Provider value={{ unreadCount: count, refetchUnread: refetch }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  return ctx ?? { unreadCount: 0, refetchUnread: async () => {} };
}
