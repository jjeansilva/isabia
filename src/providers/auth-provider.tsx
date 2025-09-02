
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
      // Provide a mock pb object for type consistency if needed, but it won't be used.
      return { pb: null as any, dataSource: dsInstance };
    }
  }, [usePocketBase]);

  useEffect(() => {
    if (!usePocketBase) {
      setUser({ name: "Usuário Mock" }); // Mock user
      setIsLoading(false);
      return;
    }

    // This handles auth changes, including login, logout, and token refresh.
    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model);
        // Important: Ensure the dataSource's pb instance is always current with the auth state
        if (dataSource instanceof PocketBaseDataSource) {
            dataSource.pb.authStore.loadFromCookie(pb.authStore.exportToCookie());
        }
        setIsLoading(false); // Stop loading once we have an auth state.
    }, true); // `true` calls the callback immediately with the initial state.
    
    return () => {
      unsubscribe();
    };
  }, [pb, dataSource, usePocketBase]);
  

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthenticated = usePocketBase ? pb.authStore.isValid : !!user;
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [pathname, router, user, isLoading, usePocketBase, pb?.authStore?.isValid]);

  const login = async (email:string, pass:string) => {
    // The pb.authStore.onChange will handle setting the user and updating the datasource
    return await pb.collection('users').authWithPassword(email, pass);
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
    }
    // For mock, setting user to null will trigger redirect logic
    setUser(null); 
  };
  
  if (isLoading && !user) {
     return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }
  
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
