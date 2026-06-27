'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CommandPalette } from '@/components/command-palette';
import { NotificationCenter } from '@/components/notification-center';

interface GlobalUIContextType {
  openSearch: () => void;
  openNotifications: () => void;
}

const GlobalUIContext = createContext<GlobalUIContextType>({
  openSearch: () => {},
  openNotifications: () => {},
});

export function useGlobalUI() {
  return useContext(GlobalUIContext);
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openNotifications = useCallback(() => setNotificationsOpen(true), []);

  return (
    <GlobalUIContext.Provider value={{ openSearch, openNotifications }}>
      {children}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationCenter open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </GlobalUIContext.Provider>
  );
}
