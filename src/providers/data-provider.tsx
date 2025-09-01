"use client";

import React, { createContext, ReactNode, useMemo } from 'react';
import { getDataSource, IDataSource } from '@/lib/data-adapter';
import { seedLocalStorage } from '@/lib/seed';

export const DataContext = createContext<IDataSource | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const dataSource = useMemo(() => {
    // Seed data on first load if not already seeded
    if (typeof window !== 'undefined') {
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
