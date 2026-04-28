import { useEffect, useState } from 'react';
import { MenuItem, CustomizationOption } from '../types';
import { useCart } from '../hooks/use-cart';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingBag, ArrowRight, Coffee, Search, Settings, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../lib/socket';
import { cn } from '@/lib/utils';
import { apiFetch } from '../lib/api';

export default function CustomerMenu() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [customs, setCustoms] = useState<CustomizationOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [selectedCustoms, setSelectedCustoms] = useState<CustomizationOption[]>([]);
  const { items, addItem, removeItem, clearCart, total, showCart, setShowCart } = useCart();
  const { user, profile, login } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productData = await apiFetch('/api/menu');
        const customData = await apiFetch('/api/customizations');
        setProducts(productData);
        setCustoms(customData);
      } catch (err) {
        console.error('Error fetching menu:', err);
      }
    };

    fetchData();
    
    // Listen for menu updates via socket if needed
    socket.on('menu-updated', fetchData);
    return () => {
      socket.off('menu-updated');
    };
  }, []);

  const handleAddToCart = () => {
    if (selectedProduct) {
      const mappedCustoms = selectedCustoms.map(c => ({ id: c.id, name: c.name, price: c.additionalPrice }));
      addItem(selectedProduct, mappedCustoms);
      setSelectedProduct(null);
      setSelectedCustoms([]);
      toast.success(`Added ${selectedProduct.name} to cart`);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const allCategories = Array.from(new Set(products.map(p => p.category)));
  const displayedCategories = Array.from(new Set(filteredProducts.map(p => p.category)));

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-32">
      {/* Search & Hero Focus */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 py-8">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-none italic">
            CHAMPION'S <br />
            <span className="text-orange-400">BREW.</span>
          </h1>
          <p className="text-slate-500 max-w-md text-sm font-medium leading-relaxed">
            Crafting pure performance in every cup. Artisanal coffee for those who never settle for second place.
          </p>
        </div>
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="What's your fuel today?" 
            className="pl-12 h-14 w-full bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 focus:border-slate-950 transition-all text-base shadow-sm outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>
      
      {/* Category Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
        <Button 
          variant={selectedCategory === null ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "rounded-full h-10 px-6 text-[11px] font-black uppercase tracking-widest transition-all shrink-0",
            selectedCategory === null ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20" : "text-slate-400 hover:text-slate-950 hover:bg-slate-100"
          )}
        >
          All Menu
        </Button>
        {allCategories.map(category => (
          <Button 
            key={category}
            variant={selectedCategory === category ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "rounded-full h-10 px-6 text-[11px] font-black uppercase tracking-widest transition-all shrink-0",
              selectedCategory === category ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20" : "text-slate-400 hover:text-slate-950 hover:bg-slate-100"
            )}
          >
            {category}
          </Button>
        ))}
      </div>

      {displayedCategories.length > 0 ? displayedCategories.map(category => (
        <div key={category} className="space-y-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.filter(p => p.category === category).map(product => (
              <motion.div key={product.id} whileHover={product.available ? { y: -4 } : {}}>
                <Card 
                  className={cn(
                    "overflow-hidden border border-slate-200 shadow-sm bg-white group cursor-pointer transition-all",
                    !product.available && "opacity-60 cursor-not-allowed filter grayscale-[0.5]"
                  )} 
                  onClick={() => {
                    if (product.available) {
                      setSelectedProduct(product);
                    } else {
                      toast.error(`${product.name} is currently out of stock.`);
                    }
                  }}
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    <img 
                      src={product.imageUrl || `https://picsum.photos/seed/${product.name}/400/300`} 
                      alt={product.name} 
                      className={cn(
                        "object-cover w-full h-full transition-transform duration-500",
                        product.available && "group-hover:scale-105"
                      )}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3 text-right">
                      <Badge className="bg-white/90 backdrop-blur text-slate-900 border-none px-3 font-bold block mb-1">
                        ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Badge>
                      {!product.available && (
                        <Badge variant="destructive" className="font-black uppercase tracking-widest text-[9px]">
                          Sold Out
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <CardTitle className="text-base font-bold text-slate-900">{product.name}</CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{product.category}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )) : (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Search size={40} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">No items found</h2>
          <p className="text-slate-500">We couldn't find anything matching "{searchTerm}".</p>
          <Button variant="outline" onClick={() => setSearchTerm('')} className="rounded-xl">Clear Search</Button>
        </div>
      )}

      {/* Customization Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="bg-white border-none sm:max-w-[500px] p-0 overflow-hidden rounded-3xl">
          {selectedProduct && (
              <div className="flex flex-col max-h-[85vh]">
                <div className="aspect-video relative overflow-hidden shrink-0">
                  <img 
                    src={selectedProduct.imageUrl || `https://picsum.photos/seed/${selectedProduct.name}/800/600`}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-6 left-8 right-8">
                    <Badge variant="secondary" className="mb-2 bg-white/20 text-white backdrop-blur border-none font-bold uppercase tracking-widest text-[10px]">
                      {selectedProduct.category}
                    </Badge>
                    <h3 className="text-3xl font-serif font-bold text-white leading-tight">{selectedProduct.name}</h3>
                  </div>
                </div>

                <div className="p-8 pb-0 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                       <Settings size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Personalize</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {customs.map(option => {
                        const isSelected = selectedCustoms.some(c => c.id === option.id);
                        const isAvailable = option.stockLevel > 0;
                        
                        return (
                          <button
                            key={option.id}
                            disabled={!isAvailable}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCustoms(selectedCustoms.filter(c => c.id !== option.id));
                              } else {
                                setSelectedCustoms([...selectedCustoms, option]);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                              !isAvailable ? "opacity-40 cursor-not-allowed border-slate-100" :
                              isSelected ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-950/20" : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                            )}
                          >
                            <div>
                               <p className="font-bold text-sm tracking-tight">{option.name}</p>
                              {!isAvailable && <p className="text-[10px] font-black text-red-500 uppercase mt-0.5">Sold Out</p>}
                            </div>
                            <span className={cn(
                              "text-xs font-black px-2 py-1 rounded-lg",
                              isSelected ? "bg-white/20" : "bg-white text-slate-400"
                            )}>
                              +₱{option.additionalPrice.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-8 shrink-0">
                  <Button 
                    className={cn(
                      "w-full h-14 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all",
                      selectedProduct.available ? "bg-slate-950 hover:bg-slate-800 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                    disabled={!selectedProduct.available}
                    onClick={handleAddToCart}
                  >
                    {selectedProduct.available ? (
                      <>Add to Cart — ₱{(selectedProduct.price + selectedCustoms.reduce((acc, c) => acc + c.additionalPrice, 0)).toFixed(2)}</>
                    ) : (
                      "Currently Unavailable"
                    )}
                  </Button>
                </div>
              </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
