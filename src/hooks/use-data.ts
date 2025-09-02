
"use client";

import { useAuth } from '@/providers/auth-provider';
import { IDataSource } from '@/lib/data-adapter';

export function useData(): IDataSource {
  const { dataSource } = useAuth();
  if (!dataSource) {
      // This should technically not happen if useAuth is used within AuthProvider
      throw new Error('DataSource not found in AuthContext');
  }
  return dataSource;
}
