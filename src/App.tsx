/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { CartProvider } from './hooks/use-cart';
import { Toaster } from 'sonner';
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

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
        <Toaster position="top-right" richColors />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-bold text-slate-900">
            {location.pathname === '/barista' ? 'Order Queue' : 
             location.pathname === '/admin' ? 'Admin Panel' : 
             location.pathname === '/orders' ? 'Order Hub' : 'Menu'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-sm font-bold text-slate-900 leading-none">
                {loading ? '...' : (profile?.name || 'Guest')}
              </span>
              {profile?.role && (
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-tighter">
                  {profile.role}
                </span>
              )}
            </div>
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {profile?.name?.[0] || 'G'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
          <CartDialog />
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default function App() {
  return (
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
  );
}


