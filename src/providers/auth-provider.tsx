
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IDataSource, PocketBaseDataSource, MockDataSource } from '@/lib/data-adapter';
import PocketBase from 'pocketbase';
import { seedLocalStorage } from '@/lib/seed';
import { DataProvider } from './data-provider';

interface AuthContextType {
  user: any; 
  login: (email:string, pass:string) => Promise<any>;
  logout: () => void;
  signup: (email:string, pass:string, passConfirm:string, name:string) => Promise<any>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const usePocketBase = !!process.env.NEXT_PUBLIC_PB_URL;

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { pb, dataSource } = useMemo(() => {
    if (usePocketBase) {
      const pbInstance = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);
      const dsInstance = new PocketBaseDataSource(pbInstance);
      return { pb: pbInstance, dataSource: dsInstance };
    } else {
      seedLocalStorage();
      const dsInstance = new MockDataSource();
      return { pb: null as any, dataSource: dsInstance };
    }
  }, [usePocketBase]);

  useEffect(() => {
    if (!usePocketBase) {
      setUser({ name: "Usuário Mock" }); // Mock user
      setIsLoading(false);
      return;
    }

    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model);
        if (dataSource && 'pb' in dataSource) {
            (dataSource.pb as any).authStore.loadFromCookie(pb.authStore.exportToCookie());
        }
    }, true);

    // Initial check
    setUser(pb.authStore.model);
    setIsLoading(false);

    return () => {
      unsubscribe();
    };
  }, [pb, dataSource, usePocketBase]);
  

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    
    let isAuthenticated = false;
    if(usePocketBase) {
        isAuthenticated = pb.authStore.isValid;
    } else {
        isAuthenticated = !!user;
    }
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [pathname, router, user, isLoading, usePocketBase, pb?.authStore?.isValid]);

  const login = async (email:string, pass:string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass);
     if (dataSource && 'pb' in dataSource) {
        (dataSource.pb as any).authStore.loadFromCookie(pb.authStore.exportToCookie());
    }
    return authData;
  };

  const signup = async (email:string, pass:string, passConfirm:string, name:string) => {
    return pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: passConfirm,
      name,
    });
  };

  const logout = () => {
    if (usePocketBase) {
        pb.authStore.clear();
    } else {
        setUser(null);
    }
  };
  
  if (isLoading) {
     return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  const value = { user, login, logout, signup, isLoading };
  
  return (
    <AuthContext.Provider value={value}>
      <DataProvider value={dataSource}>
        {children}
      </DataProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
