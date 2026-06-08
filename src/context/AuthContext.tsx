'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  active: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isMock: boolean;
  login: (email: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  toggleMockRole: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && url !== '' && !url.includes('your-project-id') && key && key !== '';
};

// Default Mock User Profile
const MOCK_PROFILE: UserProfile = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  name: 'Lucas 👋',
  email: 'lucas@solucionesya.com.ar',
  role: 'USER',
  active: true,
  createdAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(true);

  // Load profile from database for real Supabase user
  const fetchRealProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/profile?id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (isMock) {
      const saved = localStorage.getItem('mock_profile');
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } else if (user) {
      await fetchRealProfile(user.id);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Mock Auth Mode
      setIsMock(true);
      const savedProfile = localStorage.getItem('mock_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setUser({ id: parsed.id, email: parsed.email });
      } else {
        localStorage.setItem('mock_profile', JSON.stringify(MOCK_PROFILE));
        setProfile(MOCK_PROFILE);
        setUser({ id: MOCK_PROFILE.id, email: MOCK_PROFILE.email });
      }
      setLoading(false);
      return;
    }

    // Real Supabase Mode
    setIsMock(false);
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchRealProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session) {
        setUser(session.user);
        await fetchRealProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, passwordHash: string) => {
    if (isMock) {
      // Mock login validation
      const role: 'USER' | 'ADMIN' = email.includes('admin') ? 'ADMIN' : 'USER';
      const mockUser = {
        id: role === 'ADMIN' ? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        name: email.includes('admin') ? 'Lucas Admin' : 'Lucas 👋',
        email,
        role,
        active: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('mock_profile', JSON.stringify(mockUser));
      setProfile(mockUser);
      setUser({ id: mockUser.id, email: mockUser.email });
      return { success: true };
    }

    // Real login
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordHash, // Note: password matches hash input in standard flow
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const signUp = async (name: string, email: string, passwordHash: string) => {
    if (isMock) {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        name,
        email,
        role: 'USER' as const,
        active: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('mock_profile', JSON.stringify(mockUser));
      setProfile(mockUser);
      setUser({ id: mockUser.id, email: mockUser.email });
      return { success: true };
    }

    try {
      // Sign up via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordHash,
        options: {
          data: {
            display_name: name,
          },
        },
      });
      
      if (error) throw error;

      if (data.user) {
        // Register in our public users table via profile sync API
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            name,
            email,
          }),
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const signOut = async () => {
    if (isMock) {
      localStorage.removeItem('mock_profile');
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const toggleMockRole = () => {
    if (!isMock || !profile) return;
    const newRole: 'USER' | 'ADMIN' = profile.role === 'USER' ? 'ADMIN' : 'USER';
    const updated = {
      ...profile,
      role: newRole,
      id: newRole === 'ADMIN' ? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: newRole === 'ADMIN' ? 'Lucas Admin' : 'Lucas 👋',
    };
    localStorage.setItem('mock_profile', JSON.stringify(updated));
    setProfile(updated);
    setUser({ id: updated.id, email: updated.email });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isMock, login, signUp, signOut, toggleMockRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
