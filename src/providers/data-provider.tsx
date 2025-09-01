"use client";

import React, { createContext, ReactNode, useMemo } from 'react';
import { getDataSource, IDataSource } from '@/lib/data-adapter';
// We are no longer seeding by default. The user will reset data from the settings page.
import { seedLocalStorage } from '@/lib/seed';

export const DataContext = createContext<IDataSource | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const dataSource = useMemo(() => {
    // Seed data on first load only if there is no backend configured
    // AND if it has never been seeded before.
    if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_PB_URL && !localStorage.getItem('isab_seeded')) {
        seedLocalStorage();
    }
    return getDataSource();
  }, []);

  return (
    <DataContext.Provider value={dataSource}>
      {children}
    </DataContext.Provider>
  );
}
