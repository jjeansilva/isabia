
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDataSource, IDataSource } from '@/lib/data-adapter';
import PocketBase, { BaseAuthStore } from 'pocketbase';

interface AuthContextType {
  user: any; // You might want to type this more strictly
  login: (email:string, pass:string) => Promise<any>;
  logout: () => void;
  signup: (email:string, pass:string, passConfirm:string, name:string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const dataSource = getDataSource() as any; 
  const pb = dataSource.pb as PocketBase;


  useEffect(() => {
    // This effect runs once on mount to check the initial auth state
    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model);
        // Important: Re-initialize the data source with the new auth state
        if (pb.authStore.isValid && token && model) {
            dataSource.pb.authStore.save(token, model);
        }
        setIsLoading(false);
    }, true); // `true` calls the handler immediately with the current state

    return () => {
      unsubscribe();
    };
  }, [pb, dataSource]);

  useEffect(() => {
    // This effect handles route protection after the initial auth check is complete
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
    // setUser(null) will be triggered by the onChange listener
    router.push('/login');
  };
  
  if (isLoading && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
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
