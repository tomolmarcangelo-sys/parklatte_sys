import { useEffect, useState, useRef } from 'react';
import { Order } from '../types';
import { useAuth } from '../hooks/use-auth';
import { useCart } from '../hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';

export default function MyOrders() {
  const { user } = useAuth();
  const { addItem, setShowCart } = useCart();
  const [allUserOrders, setAllUserOrders] = useState<Order[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [localProducts, setLocalProducts] = useState<any[]>([]);

  const fetchUserOrders = async () => {
    try {
      const data = await apiFetch('/api/orders');
      setAllUserOrders(data);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiFetch('/api/menu');
      setLocalProducts(data);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchUserOrders();
    fetchItems();

    const handleStatusUpdate = (data: { id: string, status: string }) => {
      setAllUserOrders(prev => prev.map(o => o.id === data.id ? { ...o, status: data.status as any } : o));
      
      if (data.status === 'Preparing') {
        toast.info(`Tactical Update: Order #${data.id.slice(-4).toUpperCase()} is now being prepared.`);
      } else if (data.status === 'Completed') {
        toast.success(`Extraction Ready: Order #${data.id.slice(-4).toUpperCase()} is ready for pickup!`);
      }
    };

    socket.emit('join-room', user.uid);
    socket.on('status-updated', handleStatusUpdate);

    return () => {
      socket.off('status-updated', handleStatusUpdate);
    };
  }, [user]);

  const activeOrders = allUserOrders.filter(o => ['Pending', 'Preparing', 'Completed'].includes(o.status));
  const orderHistory = allUserOrders.filter(o => ['PickedUp', 'Cancelled'].includes(o.status));

  const cancelOrder = async (orderId: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Cancelled' })
      });
      setAllUserOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
      toast.success('Mission aborted successfully.');
    } catch (error) {
      toast.error('Failed to abort mission.');
    }
  };

  const reorder = (order: Order) => {
    let allAvailable = true;
    order.items.forEach(item => {
      const product = localProducts.find(p => p.name === item.name);
      if (product) {
        if (product.available) {
          addItem(product, item.customizations);
        } else {
          allAvailable = false;
        }
      }
    });

    if (!allAvailable) {
      toast.warning('Some assets are currently unavailable.');
    } else {
      toast.success('Assets added to tactical loadout');
    }
    setShowCart(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic tracking-tighter text-slate-950 uppercase leading-none">
          Mission <span className="text-orange-400">Control.</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium">Tracking your active deployments and historical archives.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-400 rounded-full" />
            <h2 className="text-xl font-black uppercase tracking-tight italic text-slate-950">Active Ops</h2>
          </div>

          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="p-12 rounded-[2rem] bg-white border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                  <Coffee size={32} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active deployments</p>
              </div>
            ) : (
              <AnimatePresence>
                {activeOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="border-none bg-slate-950 text-white p-6 rounded-[2rem] relative overflow-hidden group shadow-xl shadow-slate-950/20">
                      <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Coffee size={64} className="group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="relative z-10 space-y-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">ID: #PL-{order.id.slice(-4).toUpperCase()}</span>
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter leading-none mt-1">{order.status}</h4>
                          </div>
                          {order.status === 'Completed' ? (
                            <div className="bg-orange-400 text-slate-950 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-2 animate-pulse">
                              Ready for extraction
                            </div>
                          ) : (
                            <div className="flex h-2 w-2 rounded-full bg-slate-700 mt-2" />
                          )}
                        </div>

                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="text-xs font-bold text-slate-300 flex items-center gap-2">
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              {item.name}
                            </p>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Deployed {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {order.status === 'Pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-4 text-red-400 hover:text-red-500 hover:bg-red-400/10 text-[9px] font-black uppercase tracking-widest rounded-xl"
                              onClick={() => cancelOrder(order.id)}
                            >
                              Abort Mission
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-slate-200 rounded-full" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-slate-950">Field Archives</h2>
            </div>
            {orderHistory.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFullHistory(!showFullHistory)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-950 uppercase tracking-widest"
              >
                {showFullHistory ? 'Compact View' : `Expand History (${orderHistory.length})`}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(showFullHistory ? orderHistory : orderHistory.slice(0, 6)).map(order => (
              <Card 
                key={order.id} 
                className="border border-slate-100 bg-white p-6 rounded-[2rem] hover:border-slate-300 transition-all cursor-pointer group shadow-sm hover:shadow-xl hover:shadow-slate-200/50"
                onClick={() => setViewingOrder(order)}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-slate-400 uppercase">#PL-{order.id.slice(-4).toUpperCase()}</span>
                      <p className="text-sm font-black text-slate-950 uppercase italic tracking-tighter">
                        {new Date(order.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge className={cn(
                      "border-none text-[8px] font-black px-2 h-5 rounded-lg",
                      order.status === 'PickedUp' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    )}>
                      {order.status === 'PickedUp' ? 'EXTRACTED' : 'ABORTED'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-2xl font-black text-slate-950 italic tracking-tighter">₱{order.totalPrice.toFixed(2)}</p>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        reorder(order);
                      }}
                      className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-md bg-white border-none rounded-[2.5rem] overflow-hidden p-0">
          {viewingOrder && (
            <div className="flex flex-col">
              <div className="p-10 bg-slate-950 text-white shrink-0">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Operational Record</div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">#PL-{viewingOrder.id.slice(-4).toUpperCase()}</h2>
                  </div>
                  <Badge className={cn(
                    "border-none text-[10px] font-black px-4 h-7 rounded-full",
                    viewingOrder.status === 'PickedUp' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  )}>
                    {viewingOrder.status === 'PickedUp' ? 'SUCCESS' : viewingOrder.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                  <Clock size={16} className="text-slate-600" />
                  {new Date(viewingOrder.timestamp).toLocaleString()}
                </div>
              </div>

              <div className="p-10 overflow-y-auto max-h-[40vh] custom-scrollbar bg-white">
                <div className="space-y-6">
                  {viewingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-6 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="space-y-2">
                        <p className="font-black text-slate-950 uppercase tracking-tight text-sm italic">{item.name}</p>
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.customizations.map((c, cidx) => (
                              <Badge key={cidx} className="bg-slate-50 text-slate-400 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                + {c.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-black text-slate-950 shrink-0 text-sm italic">₱{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 bg-slate-50 shrink-0 border-t border-slate-100">
                <div className="flex justify-between items-end mb-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Deployment Cost</span>
                  <span className="text-4xl font-black italic tracking-tighter text-slate-950">₱{viewingOrder.totalPrice.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full h-16 bg-slate-950 hover:bg-slate-800 text-white rounded-[1.25rem] text-lg font-black italic tracking-tighter uppercase flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-950/20"
                  onClick={() => {
                    reorder(viewingOrder);
                    setViewingOrder(null);
                  }}
                >
                  <RotateCcw size={20} className="text-orange-400" /> Duplicate Deployment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
