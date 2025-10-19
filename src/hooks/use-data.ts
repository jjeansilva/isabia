
"use client";

import { useAuth } from '@/providers/auth-provider';
import { IDataSource } from '@/lib/data-adapter';
import { useEffect, useRef } from 'react';

export function useData(): IDataSource {
  const { dataSource } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    // Criar um novo AbortController para cada montagem do componente
    abortControllerRef.current = new AbortController();
    
    return () => {
      // Cancelar requisições pendentes quando o componente for desmontado
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  if (!dataSource) {
      throw new Error('DataSource not found in AuthContext');
  }
  return dataSource;
}