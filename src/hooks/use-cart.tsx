import React, { createContext, useContext, useState } from 'react';
import { MenuItem, OrderItem } from '../types';

interface CartContextType {
  items: OrderItem[];
  addItem: (product: MenuItem, customizations: { id?: string; name: string; price: number }[]) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
  showCart: boolean;
  setShowCart: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const addItem = (product: MenuItem, selectedCustoms: { id?: string; name: string; price: number }[]) => {
    if (product.available === false) return; // Prevent adding unavailable items
    
    const customizationPrice = selectedCustoms.reduce((sum, c) => sum + c.price, 0);
    const newItem: OrderItem = {
      id: Math.random().toString(36).substring(2, 11),
      productId: product.id || 'unknown',
      name: product.name || 'Unknown Product',
      price: (product.price || 0) + customizationPrice,
      customizationIds: selectedCustoms.map(c => c.id).filter((id): id is string => id !== undefined),
      customizations: selectedCustoms.map(c => ({ 
        name: c.name || 'Unknown', 
        price: c.price || 0 
      }))
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, showCart, setShowCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
