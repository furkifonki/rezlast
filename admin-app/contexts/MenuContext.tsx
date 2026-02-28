import React, { createContext, useContext, useState, useCallback } from 'react';

type NavigateFn = (name: string, params?: object) => void;

type MenuContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  navigate: NavigateFn;
};

const MenuContext = createContext<MenuContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  navigate: () => {},
});

export function MenuProvider({
  children,
  navigateFn,
}: {
  children: React.ReactNode;
  navigateFn: NavigateFn;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value: MenuContextType = {
    isOpen,
    open,
    close,
    navigate: navigateFn,
  };
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  return useContext(MenuContext);
}
