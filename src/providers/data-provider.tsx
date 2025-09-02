
"use client";

import React, { createContext, ReactNode } from 'react';
import { IDataSource } from '@/lib/data-adapter';

// Create a context with a default undefined value
export const DataContext = createContext<IDataSource | undefined>(undefined);

// The provider component
export function DataProvider({ children, value }: { children: ReactNode; value: IDataSource }) {
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
