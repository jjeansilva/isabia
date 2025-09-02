
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IDataSource, PocketBaseDataSource } from '@/lib/data-adapter';
import PocketBase from 'pocketbase';

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
  
  // Create a single PocketBase instance to be used throughout the app.
  const pb = useMemo(() => new PocketBase(process.env.NEXT_PUBLIC_PB_URL), []);
  const dataSource = useMemo(() => new PocketBaseDataSource(pb), [pb]);

  const [user, setUser] = useState<any>(pb.authStore.model);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs once on mount to check the initial auth state from the cookie
    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model);
    }, true); 

    return () => {
      unsubscribe();
    };
  }, [pb]);
  
  useEffect(() => {
    // This effect handles route protection after the initial auth check is complete
    // We set loading to false only after the first auth check (from the cookie) is done.
    if(user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthenticated = pb.authStore.isValid;
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [pathname, router, pb.authStore.isValid, isLoading]);


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
    router.push('/login');
  };
  
  if (isLoading) {
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
