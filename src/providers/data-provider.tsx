
"use client";

import React, { createContext, ReactNode, useMemo } from 'react';
import { IDataSource, MockDataSource } from '@/lib/data-adapter';
import { seedLocalStorage } from '@/lib/seed';
import { useAuth } from './auth-provider';

export const DataContext = createContext<IDataSource | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const authContext = useAuth();

  const dataSource = useMemo(() => {
    const usePocketBase = !!process.env.NEXT_PUBLIC_PB_URL;

    if (usePocketBase) {
      // We get the authenticated dataSource from the AuthContext
      return authContext.dataSource;
    }
    
    // Fallback to mock data source if PocketBase is not configured
    if (typeof window !== 'undefined' && !localStorage.getItem('isab_seeded')) {
        seedLocalStorage();
    }
    return new MockDataSource();

  }, [authContext]);

  return (
    <DataContext.Provider value={dataSource}>
      {children}
    </DataContext.Provider>
  );
}
