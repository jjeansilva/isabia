
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IDataSource, PocketBaseDataSource, MockDataSource } from '@/lib/data-adapter';
import PocketBase from 'pocketbase';
import { seedLocalStorage } from '@/lib/seed';

interface AuthContextType {
  user: any; 
  login: (email:string, pass:string) => Promise<any>;
  logout: () => void;
  signup: (email:string, pass:string, passConfirm:string, name:string) => Promise<any>;
  isLoading: boolean;
  dataSource: IDataSource;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const usePocketBase = !!process.env.NEXT_PUBLIC_PB_URL;

  const dataSource = useMemo<IDataSource>(() => {
    if (usePocketBase) {
      const pbInstance = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);
      return new PocketBaseDataSource(pbInstance);
    } else {
      seedLocalStorage();
      return new MockDataSource();
    }
  }, [usePocketBase]);

  const pb = usePocketBase ? (dataSource as PocketBaseDataSource).pb : null;
  
  const [user, setUser] = useState<any>(pb ? pb.authStore.model : { name: "Usuário Mock" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!usePocketBase || !pb) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model);
        setIsLoading(false);
    }, true); 
    
    return () => {
      unsubscribe();
    };
  }, [pb, usePocketBase]);
  
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthenticated = usePocketBase ? pb?.authStore.isValid : !!user;
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [pathname, router, user, isLoading, usePocketBase, pb?.authStore?.isValid]);

  const login = async (email:string, pass:string) => {
    if (!pb) throw new Error("PocketBase is not initialized.");
    return await pb.collection('users').authWithPassword(email, pass);
  };

  const signup = async (email:string, pass:string, passConfirm:string, name:string) => {
    if (!pb) throw new Error("PocketBase is not initialized.");
    return pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: passConfirm,
      name,
    });
  };

  const logout = () => {
    if (usePocketBase && pb) {
        pb.authStore.clear();
    }
    setUser(null); 
  };
  
  const value = { user, login, logout, signup, isLoading, dataSource };
  
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
