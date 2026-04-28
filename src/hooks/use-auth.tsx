import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null; // Simulating the Firebase User object
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>; // Google login not supported locally without extra setup
  emailSignIn: (email: string, pass: string) => Promise<void>;
  emailSignUp: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setUser({ uid: data.id, email: data.email });
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async () => {
    alert('Google login is not implemented in the local MySQL version. Please use email/password.');
  };

  const emailSignIn = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    
    const { token, user: userData } = await res.json();
    localStorage.setItem('token', token);
    setProfile(userData);
    setUser({ uid: userData.id, email: userData.email });
  };

  const emailSignUp = async (email: string, pass: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    
    const { token, user: userData } = await res.json();
    localStorage.setItem('token', token);
    setProfile(userData);
    setUser({ uid: userData.id, email: userData.email });
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, emailSignIn, emailSignUp, logout }}>
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
