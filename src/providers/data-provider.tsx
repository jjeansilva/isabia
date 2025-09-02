
"use client";

import React, { createContext, ReactNode } from 'react';
import { IDataSource } from '@/lib/data-adapter';

export const DataContext = createContext<IDataSource | undefined>(undefined);

export function DataProvider({ children, dataSource }: { children: ReactNode, dataSource?: IDataSource }) {
  // If a dataSource is not provided directly, we'll rely on the AuthProvider's context
  // This setup is mainly for allowing the AuthProvider to be the single source of truth.
  return (
    <DataContext.Provider value={dataSource}>
      {children}
    </DataContext.Provider>
  );
}
