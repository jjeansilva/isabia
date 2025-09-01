
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
  const router = useRouter();
  const pathname = usePathname();
  const dataSource = getDataSource() as any; // Assuming it's the PocketBase instance
  const pb = dataSource.pb as PocketBase;


  useEffect(() => {
    // Sync user state from authStore
    const handleAuthChange = () => {
      setUser(pb.authStore.model);
    };

    const unsubscribe = pb.authStore.onChange(handleAuthChange, true);

    return () => {
      unsubscribe();
    };
  }, [pb]);

  useEffect(() => {
    // Route protection
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthenticated = pb.authStore.isValid;
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [pathname, router, pb.authStore.isValid]);


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
  
  // Render children immediately if the route is public, otherwise wait for auth check
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (pb.authStore.isLoading && !isPublicRoute) {
      return <div>Loading...</div>; // Or a proper loading spinner
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
