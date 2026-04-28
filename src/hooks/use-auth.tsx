import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { sanitize } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  emailSignIn: (email: string, pass: string) => Promise<void>;
  emailSignUp: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isAdminEmail = user.email?.toLowerCase() === 'tomolmarcangelo@gmail.com';
          
          if (userDoc.exists()) {
            const currentProfile = userDoc.data() as UserProfile;
            
            // Force admin role for the designated test email (case-insensitive)
            if (isAdminEmail && currentProfile.role !== 'Admin') {
              const updatedProfile = sanitize({ ...currentProfile, role: 'Admin' as UserRole });
              await setDoc(doc(db, 'users', user.uid), updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(currentProfile);
            }
          } else {
            // New user setup
            const newProfile: UserProfile = sanitize({
              uid: user.uid,
              name: user.displayName || 'Guest',
              email: user.email || '',
              role: isAdminEmail ? 'Admin' : 'Customer'
            });
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error in onAuthStateChanged:', error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('onAuthStateChanged error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const emailSignIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const emailSignUp = async (email: string, pass: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, { displayName: name });
    
    // Explicitly create the profile to ensure the name is set correctly from the start
    const isAdminEmail = email.toLowerCase() === 'tomolmarcangelo@gmail.com';
    const newProfile: UserProfile = sanitize({
      uid: user.uid,
      name: name,
      email: email,
      role: isAdminEmail ? 'Admin' : 'Customer'
    });
    await setDoc(doc(db, 'users', user.uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await signOut(auth);
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
