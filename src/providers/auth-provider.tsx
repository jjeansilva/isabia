

"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IDataSource, PocketBaseDataSource, MockDataSource } from '@/lib/data-adapter';
import PocketBase from 'pocketbase';
import { seedLocalStorage } from '@/lib/seed';
import { User } from '@/types';

interface AuthContextType {
  user: User | null; 
  login: (email:string, pass:string) => Promise<any>;
  logout: () => void;
  signup: (email:string, pass:string, passConfirm:string, name:string) => Promise<any>;
  isLoading: boolean;
  dataSource: IDataSource;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = usePathname();
  const navRouter = useRouter();
  const usePocketBase = !!process.env.NEXT_PUBLIC_PB_URL || true; // Force pocketbase

  // Create a single, memoized PocketBase instance and DataSource
  const { pb, dataSource } = useMemo(() => {
    if (usePocketBase) {
      const pocketbaseInstance = new PocketBase("https://isabia-bd.wartiger.com.br/");
      const ds = new PocketBaseDataSource(pocketbaseInstance);
      return { pb: pocketbaseInstance, dataSource: ds };
    } else {
      seedLocalStorage();
      const ds = new MockDataSource();
      return { pb: null, dataSource: ds };
    }
  }, [usePocketBase]);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!pb) {
      // For mock data source, we just set a mock user and finish loading.
      setUser({ id: 'localuser', email: 'user@mock.com', name: 'Mock User' } as User);
      setIsLoading(false);
      return;
    }

    const unsubscribe = pb.authStore.onChange((token, model) => {
        setUser(model as User);
        // This is the key: we are now sure about auth state, so we can stop loading.
        setIsLoading(false);
    }, true); // `true` calls the callback immediately with the initial state.

    return () => {
      unsubscribe();
    };
  }, [pb]); 
  
  // This effect handles routing based on authentication state.
  useEffect(() => {
    if (isLoading) return; // Don't route until we know the auth status.

    const isPublicRoute = PUBLIC_ROUTES.includes(router);
    const isAuthenticated = pb ? pb.authStore.isValid : !!user;
    
    if (!isAuthenticated && !isPublicRoute) {
      navRouter.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      navRouter.push('/dashboard');
    }
  }, [router, navRouter, user, isLoading, pb]);

  const login = async (email:string, pass:string) => {
    if (!pb) throw new Error("PocketBase is not initialized.");
    const authData = await pb.collection('users').authWithPassword(email, pass);
    // The `onChange` listener will automatically update the user state.
    return authData;
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
    if (pb) {
        pb.authStore.clear();
    }
    // The `onChange` listener will set the user to null.
    // The routing effect will redirect to /login
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
