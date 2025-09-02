
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IDataSource, PocketBaseDataSource, MockDataSource } from '@/lib/data-adapter';
import PocketBase from 'pocketbase';
import { seedLocalStorage } from '@/lib/seed';

interface AuthContextType {
  user: any; 
  pb: PocketBase;
  dataSource: IDataSource;
  login: (email:string, pass:string) => Promise<any>;
  logout: () => void;
  signup: (email:string, pass:string, passConfirm:string, name:string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const usePocketBase = !!process.env.NEXT_PUBLIC_PB_URL;

  const { pb, dataSource } = useMemo(() => {
    if (usePocketBase) {
      const pbInstance = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);
      const dsInstance = new PocketBaseDataSource(pbInstance);
      return { pb: pbInstance, dataSource: dsInstance };
    } else {
      const dsInstance = new MockDataSource();
      return { pb: null as any, dataSource: dsInstance };
    }
  }, [usePocketBase]);

  const [user, setUser] = useState<any>(pb?.authStore?.model);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!usePocketBase) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model);
    }, true); 

    // Initial check
    setUser(pb.authStore.model);
    setIsLoading(false);

    return () => {
      unsubscribe();
    };
  }, [pb, usePocketBase]);
  

  useEffect(() => {
    if (isLoading || !usePocketBase) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthenticated = pb.authStore.isValid;
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [pathname, router, pb?.authStore?.isValid, isLoading, usePocketBase]);

  const login = async (email:string, pass:string) => {
    return pb.collection('users').authWithPassword(email, pass);
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
    pb.authStore.clear();
  };
  
  if (isLoading && usePocketBase) {
     return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  const value = { user, pb, dataSource, login, logout, signup };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
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
