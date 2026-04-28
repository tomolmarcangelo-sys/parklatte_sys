import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coffee, Play, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../lib/socket';
import { cn } from '@/lib/utils';
import { apiFetch } from '../lib/api';

export default function BaristaDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { profile, loading: authLoading } = useAuth();

  const fetchOrders = async () => {
    try {
      const data = await apiFetch('/api/orders');
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  useEffect(() => {
    if (authLoading || !profile || (profile.role !== 'Barista' && profile.role !== 'Admin')) return;

    fetchOrders();

    socket.emit('join-room', 'baristas');
    
    const handleNewOrder = (order: any) => {
      toast.info(`New Order from ${order.customerName}!`);
      // Update local state by adding the new order or refetching
      setOrders(prev => [order, ...prev]);
    };

    socket.on('order-received', handleNewOrder);

    return () => {
      socket.off('order-received', handleNewOrder);
    };
  }, [profile, authLoading]);

  const updateStatus = async (orderId: string, customerId: string, newStatus: OrderStatus) => {
    try {
      await apiFetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      // Update local state immediately for better UX
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
      toast.success(`Order status updated to: ${newStatus}`);
    } catch (error) {
      console.error("Status update error:", error);
      toast.error('Failed to update operational status');
    }
  };

  const pending = orders.filter(o => o.status === 'Pending');
  const preparing = orders.filter(o => o.status === 'Preparing');
  const completed = orders.filter(o => o.status === 'Completed');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      {/* Column rendering matches original logic */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Orders ({pending.length})</span>
          <div className="w-2 h-2 bg-slate-400 rounded-full" />
        </div>
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {pending.map(order => (
              <OrderCard key={order.id} order={order} onUpdate={updateStatus} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Preparing ({preparing.length})</span>
          <div className="w-2 h-2 bg-orange-400 rounded-full" />
        </div>
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {preparing.map(order => (
              <OrderCard key={order.id} order={order} onUpdate={updateStatus} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ready for Pickup ({completed.length})</span>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {completed.map(order => (
              <OrderCard key={order.id} order={order} onUpdate={updateStatus} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onUpdate: (id: string, customerId: string, status: OrderStatus) => Promise<void> | void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdate }) => {
  const isPreparing = order.status === 'Preparing';
  const isReady = order.status === 'Completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white border p-5 rounded-2xl shadow-sm transition-all",
        isPreparing ? "border-orange-400 bg-orange-50/30 ring-1 ring-orange-200" : "border-slate-200",
        isReady && "border-green-400 bg-green-50/30"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
          #PL-{order.id.slice(-4).toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={10} />
          <span className="text-[10px] font-bold">
            {Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000)}m
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="group">
            <div className="font-bold text-sm text-slate-950 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              {item.name}
            </div>
            {item.customizations && item.customizations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-3.5">
                {item.customizations.map((c, cidx) => (
                  <Badge key={cidx} variant="secondary" className="bg-slate-100/80 text-slate-500 border-none text-[9px] font-medium px-2 py-0">
                    + {c.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Deployment for</span>
          <span className="text-[10px] font-bold text-slate-900 truncate max-w-[80px]">{order.customerName}</span>
        </div>

        {order.status === 'Pending' && (
          <button 
            onClick={() => onUpdate(order.id, order.customerId, 'Preparing')}
            className="text-[9px] h-9 px-4 rounded-xl font-black uppercase tracking-widest bg-slate-950 text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-950/20 active:scale-95"
          >
            <Play size={10} fill="currentColor" />
            Start Preparing
          </button>
        )}

        {order.status === 'Preparing' && (
          <button 
            onClick={() => onUpdate(order.id, order.customerId, 'Completed')}
            className="text-[9px] h-9 px-4 rounded-xl font-black uppercase tracking-widest bg-orange-400 text-white hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-400/20 active:scale-95"
          >
            <CheckCircle2 size={12} />
            Complete Order
          </button>
        )}

        {order.status === 'Completed' && (
          <button 
            onClick={() => onUpdate(order.id, order.customerId, 'PickedUp')}
            className="text-[9px] h-9 px-4 rounded-xl font-black uppercase tracking-widest bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-green-400/20 active:scale-95"
          >
            <MapPin size={12} />
            Mark as Picked Up
          </button>
        )}
      </div>
    </motion.div>
  );
}
