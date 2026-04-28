/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { CartProvider } from './hooks/use-cart';
import { Toaster } from 'sonner';
import { ThemeProvider } from './hooks/use-theme';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CustomerMenu from './components/CustomerMenu';
import BaristaDashboard from './components/BaristaDashboard';
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import MyOrders from './components/MyOrders';
import CartDialog from './components/CartDialog';
import ProtectedRoute from './components/ProtectedRoute';

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isLoginPage = location.pathname === '/login';

  // Close mobile menu when location changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster position="top-right" richColors />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <Navbar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 lg:hidden text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm md:text-lg font-bold text-foreground truncate max-w-[150px] md:max-w-none uppercase tracking-tight">
              {location.pathname === '/barista' ? 'Order Queue' : 
               location.pathname === '/admin' ? 'Admin Panel' : 
               location.pathname === '/orders' ? 'Order Hub' : 'Menu'}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-sm font-bold text-foreground leading-none">
                {loading ? '...' : (profile?.name || 'Guest')}
              </span>
              {profile?.role && (
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-tighter">
                  {profile.role}
                </span>
              )}
            </div>
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profile?.name?.[0] || 'G'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
          <CartDialog />
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const content = (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <ConditionalLayout>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <CustomerMenu />
                  </ProtectedRoute>
                } />
                <Route path="/barista" element={
                  <ProtectedRoute allowedRoles={['Barista', 'Admin']}>
                    <BaristaDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                } />
              </Routes>
            </ConditionalLayout>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );

  if (!clientId) {
    return content;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {content}
    </GoogleOAuthProvider>
  );
}


