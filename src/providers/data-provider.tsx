
"use client";

import React, { createContext, ReactNode } from 'react';
import { IDataSource } from '@/lib/data-adapter';
import { useAuth } from './auth-provider';

export const DataContext = createContext<IDataSource | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { dataSource } = useAuth();

  return (
    <DataContext.Provider value={dataSource}>
      {children}
    </DataContext.Provider>
  );
}
