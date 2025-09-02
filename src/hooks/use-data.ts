
"use client";

import { useContext } from 'react';
import { DataContext } from '@/providers/data-provider';
import { IDataSource } from '@/lib/data-adapter';

export function useData(): IDataSource {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
