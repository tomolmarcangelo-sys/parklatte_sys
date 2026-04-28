import { useState } from 'react';
import { useCart } from '../hooks/use-cart';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingBag, ArrowRight, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../lib/socket';
import { apiFetch } from '../lib/api';

export default function CartDialog() {
  const { items, removeItem, clearCart, total, showCart, setShowCart } = useCart();
  const { user, profile, login } = useAuth();
  const [isOrdering, setIsOrdering] = useState(false);

  const placeOrder = async () => {
    if (!user) {
      alert('Please log in to place an order.');
      return;
    }

    if (items.length === 0) return;

    setIsOrdering(true);
    try {
      const orderData = {
        customerId: user.uid,
        customerName: profile?.name || 'Guest',
        totalPrice: total,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          customizations: item.customizations.map(c => ({ name: c.name, price: c.price }))
        }))
      };

      const newOrder = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      
      // Socket notification is already handled in server.ts, but we check if we need redundancy
      // socket.emit('new-order', newOrder); 
      
      clearCart();
      setShowCart(false);
      toast.success('Order placed successfully! Mission in progress.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to place order.');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div 
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            className="fixed bottom-10 right-10 z-40"
          >
            <Button 
              className="h-16 w-16 rounded-full shadow-2xl bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center p-0 transition-transform active:scale-95"
              onClick={() => setShowCart(true)}
            >
              <div className="relative">
                <ShoppingBag size={28} />
                <span className="absolute -top-3 -right-3 bg-orange-400 text-slate-950 rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-black border-2 border-slate-50">
                  {items.length}
                </span>
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md bg-white border-none p-0 overflow-hidden rounded-[2.5rem] shadow-premium">
          <DialogHeader className="p-10 bg-slate-950 text-white space-y-2">
            <DialogTitle className="text-4xl font-black italic tracking-tighter">TACTICAL LOADOUT</DialogTitle>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Configuration for high-performance extraction</p>
          </DialogHeader>
          
          <div className="p-10 pb-4 space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar">
            {items.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <ShoppingBag size={40} />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No assets deployed in current loadout</p>
              </div>
            ) : items.map(item => (
              <div key={item.id} className="group p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 relative">
                <div className="flex justify-between items-start pr-10">
                  <div className="space-y-2">
                    <p className="font-black text-slate-950 uppercase tracking-tight italic text-base leading-none">{item.name}</p>
                    {item.customizations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.customizations.map((c, idx) => (
                          <span key={idx} className="text-[9px] font-black uppercase text-orange-400 bg-orange-50 px-2 py-0.5 rounded-md">
                            + {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="font-black text-slate-950 text-base italic">₱{item.price.toFixed(2)}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-5 right-5 h-8 w-8 rounded-xl bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500 border border-slate-100"
                  onClick={() => removeItem(item.id)}
                >
                  <Minus size={14} />
                </Button>
              </div>
            ))}
          </div>

          <div className="p-10 pt-4 space-y-8">
            <div className="flex justify-between items-end border-t border-slate-100 pt-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none">Global Deployment Cost</span>
                <p className="text-5xl font-black text-slate-950 italic tracking-tighter">₱{total.toFixed(2)}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearCart}
                className="text-slate-300 hover:text-red-500 text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl"
              >
                Clear Loadout
              </Button>
            </div>
            
            <Button 
              className="w-full h-16 bg-slate-950 hover:bg-slate-800 text-white rounded-[1.25rem] text-xl font-black italic tracking-tighter uppercase flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl shadow-slate-950/30"
              disabled={isOrdering || items.length === 0}
              onClick={placeOrder}
            >
              {isOrdering ? 'TRANSMITTING REQUEST...' : (
                <>EXECUTE DEPLOYMENT <ArrowRight size={24} className="text-orange-400" /></>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
