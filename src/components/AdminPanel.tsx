import React, { useEffect, useState } from 'react';
import { MenuItem, CustomizationOption, UserProfile, Order, UserRole } from '../types';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, AlertTriangle, Coffee, Users, ArrowUpRight, Filter, Calendar, XCircle, Search, CheckCircle2, Leaf, Cake, Utensils, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';

export default function AdminPanel() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [customs, setCustoms] = useState<CustomizationOption[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [roleChangeRequest, setRoleChangeRequest] = useState<{ user: UserProfile, role: any } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Menu Management filter/sort states
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuSortKey, setMenuSortKey] = useState<keyof MenuItem>('name');
  const [menuSortOrder, setMenuSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const { profile, loading: authLoading } = useAuth();
  
  // New product state
  const [newProduct, setNewProduct] = useState<Partial<MenuItem>>({ name: '', price: 0, category: 'Coffee', available: true, imageUrl: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const CATEGORIES = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Other'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Max 5MB.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // New customization state
  const [newCustom, setNewCustom] = useState<Partial<CustomizationOption>>({ name: '', additionalPrice: 0, stockLevel: 0, threshold: 5 });
  const [editingCustom, setEditingCustom] = useState<CustomizationOption | null>(null);

  // User Management state
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'Customer' as UserRole });

  const fetchData = async () => {
    try {
      const [p, c, u, o] = await Promise.all([
        apiFetch('/api/menu'),
        apiFetch('/api/customizations'),
        apiFetch('/api/admin/users'), // Need to add this endpoint
        apiFetch('/api/orders')
      ]);
      setProducts(p);
      setCustoms(c);
      setUsers(u);
      setOrders(o);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !profile || profile.role !== 'Admin') return;
    fetchData();
    
    socket.on('order-received', fetchData);
    socket.on('menu-updated', fetchData);
    
    return () => {
      socket.off('order-received');
      socket.off('menu-updated');
    };
  }, [profile, authLoading]);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesCustomer = order.customerName.toLowerCase().includes(customerFilter.toLowerCase()) || 
                          order.customerId.toLowerCase().includes(customerFilter.toLowerCase());
    const orderDate = new Date(order.timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    const matchesDate = (!start || orderDate >= start) && (!end || orderDate <= end);
    return matchesStatus && matchesCustomer && matchesDate;
  });

  const clearFilters = () => {
    setStatusFilter('all');
    setCustomerFilter('');
    setStartDate('');
    setEndDate('');
  };

  const addProduct = async () => {
    if (!newProduct.name?.trim() || !newProduct.price || newProduct.price <= 0) {
      toast.error('Valid name and price required');
      return;
    }
    setUploading(true);
    try {
      await apiFetch('/api/admin/menu', {
        method: 'POST',
        body: JSON.stringify({
          ...newProduct,
          imageData: previewUrl // Send base64 data
        })
      });
      setNewProduct({ name: '', price: 0, category: 'Coffee', available: true, imageUrl: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success(`${newProduct.name} deployed to menu`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Abort this product listing?')) return;
    try {
      await apiFetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
      toast.success('Product eliminated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addCustom = async () => {
    if (!newCustom.name) return;
    try {
      await apiFetch('/api/admin/customizations', {
        method: 'POST',
        body: JSON.stringify(newCustom)
      });
      setNewCustom({ name: '', additionalPrice: 0, stockLevel: 0, threshold: 5 });
      toast.success('Customization added');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateRole = async () => {
    if (!roleChangeRequest) return;
    try {
      await apiFetch(`/api/admin/users/${roleChangeRequest.user.uid}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: roleChangeRequest.role })
      });
      setRoleChangeRequest(null);
      toast.success('User role updated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const lowStock = customs.filter(c => c.stockLevel <= c.threshold);

  const filteredAndSortedProducts = products
    .filter(p => p.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) || p.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
    .sort((a: any, b: any) => {
      const valA = a[menuSortKey];
      const valB = b[menuSortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return menuSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return menuSortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-orange-400" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading tactical intel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      <header className="space-y-1">
        <h1 className="font-black italic text-6xl text-foreground tracking-tighter uppercase leading-none">Command <span className="text-orange-400">Center.</span></h1>
        <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.4em]">Operational Oversight & Strategic Control</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        <Card className="bg-slate-950 text-white border-none shadow-2xl shadow-slate-950/20 rounded-[2.5rem] p-4">
          <CardHeader className="p-6">
             <span className="text-orange-400 uppercase text-[9px] font-black tracking-[0.3em] mb-2 block">Active Inventory</span>
             <CardTitle className="text-4xl md:text-5xl font-black italic tracking-tighter">{products.length}</CardTitle>
             <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">Ready for deployment</p>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-xl rounded-[2.5rem] p-4">
          <CardHeader className="p-6">
             <span className="text-muted-foreground uppercase text-[9px] font-black tracking-[0.3em] mb-2 block">Operative Force</span>
             <CardTitle className="text-4xl md:text-5xl font-black italic tracking-tighter text-foreground">{users.length}</CardTitle>
             <p className="text-muted-foreground text-[10px] font-bold uppercase mt-1">Authorized personnel</p>
          </CardHeader>
        </Card>
        <Card className={cn("border-none shadow-xl rounded-[2.5rem] p-4 sm:col-span-2 lg:col-span-1", lowStock.length > 0 ? "bg-red-50" : "bg-green-50")}>
          <CardHeader className="p-6">
             <span className={cn("uppercase text-[9px] font-black tracking-[0.3em] mb-2 block", lowStock.length > 0 ? "text-red-400" : "text-green-400")}>Supply Chain</span>
             <CardTitle className={cn("text-4xl md:text-5xl font-black italic tracking-tighter", lowStock.length > 0 ? "text-red-600" : "text-green-600")}>
               {lowStock.length > 0 ? 'CRITICAL' : 'STABLE'}
             </CardTitle>
             <p className={cn("text-[10px] font-bold uppercase mt-1", lowStock.length > 0 ? "text-red-400" : "text-green-400")}>
                {lowStock.length > 0 ? `${lowStock.length} items low` : 'All systems go'}
             </p>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="bg-card p-1 md:p-2 rounded-2xl border border-border mb-8 h-auto flex flex-wrap lg:inline-flex shadow-sm gap-1 md:gap-2">
          <TabsTrigger value="menu" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Menu</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Orders</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Team</TabsTrigger>
          <TabsTrigger value="inventory" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Supply</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <Card className="rounded-[2.5rem] border-none bg-white shadow-xl p-6 lg:col-span-1 h-fit sticky top-8">
                <CardHeader className="px-2 pt-2">
                  <CardTitle className="text-2xl font-black italic uppercase tracking-tight">Stage Asset</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Add new items to the operational menu.</CardDescription>
                </CardHeader>
                <CardContent className="px-2 space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Name</Label>
                    <Input className="h-12 rounded-xl bg-slate-50" placeholder="Product name" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost (PHP)</Label>
                    <Input className="h-12 rounded-xl bg-slate-50" type="number" placeholder="0.00" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset Visual (Image)</Label>
                    <div className="space-y-4">
                      {previewUrl && (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                          <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                          <button 
                            onClick={() => {setPreviewUrl(null); setSelectedFile(null);}}
                            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full text-foreground hover:bg-background"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      <div className="relative group cursor-pointer">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                          onChange={handleFileChange}
                        />
                        <div className="h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 group-hover:border-orange-400 transition-colors bg-muted">
                          <Plus size={20} className="text-muted-foreground group-hover:text-orange-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Image</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                    <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted border-none ring-offset-background">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground rounded-xl border border-border shadow-2xl">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black italic uppercase tracking-tighter shadow-xl shadow-primary/20" onClick={addProduct}>
                    Deploy to Menu
                  </Button>
                </CardContent>
              </Card>

                  <div className="lg:col-span-3 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                       <Input 
                        placeholder="Search assets..." 
                        className="h-14 pl-12 rounded-2xl border-none shadow-sm bg-card" 
                        value={menuSearchTerm}
                        onChange={e => setMenuSearchTerm(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAndSortedProducts.map(p => (
                      <Card key={p.id} className="border-none bg-card shadow-md rounded-[2rem] overflow-hidden group">
                         <div className="flex h-32">
                            <div className="w-32 bg-muted shrink-0 overflow-hidden">
                               <img src={p.imageUrl || `https://picsum.photos/seed/${p.name}/200`} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" alt={p.name} referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 p-6 flex flex-col justify-between">
                               <div>
                                  <div className="flex justify-between items-start">
                                     <h3 className="font-black italic uppercase tracking-tight text-foreground">{p.name}</h3>
                                     <Badge variant="ghost" className="text-[8px] font-black uppercase text-muted-foreground bg-muted px-2 rounded-md tracking-widest">{p.category}</Badge>
                                  </div>
                                  <p className="text-xl font-black italic text-foreground mt-1">₱{p.price.toFixed(2)}</p>
                               </div>
                               <div className="flex justify-between items-center">
                                  <Badge className={cn("text-[9px] font-black uppercase border-none px-2 rounded-md", p.available ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600")}>
                                    {p.available ? 'Ready' : 'Out'}
                                  </Badge>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-xl" onClick={() => deleteProduct(p.id)}>
                                    <Trash2 size={16} />
                                  </Button>
                               </div>
                            </div>
                         </div>
                      </Card>
                    ))}
                 </div>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="orders">
           <Card className="rounded-[2.5rem] border-none shadow-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                   <TableHeader className="bg-muted">
                      <TableRow>
                         <TableHead className="px-8 h-16 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Descriptor</TableHead>
                         <TableHead className="h-16 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Customer</TableHead>
                         <TableHead className="h-16 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Value</TableHead>
                         <TableHead className="h-16 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Operational Status</TableHead>
                         <TableHead className="h-16 text-[10px] font-black uppercase tracking-widest text-right px-8 text-muted-foreground whitespace-nowrap">Temporal Data</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {filteredOrders.map(o => (
                        <TableRow key={o.id} className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedOrder(o)}>
                           <TableCell className="px-8 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">#PL-{o.id.slice(-4)}</TableCell>
                           <TableCell className="font-black italic text-foreground uppercase tracking-tight whitespace-nowrap">{o.customerName}</TableCell>
                           <TableCell className="font-black italic text-foreground">₱{o.totalPrice.toFixed(2)}</TableCell>
                           <TableCell>
                              <Badge className={cn(
                                "text-[9px] font-black uppercase tracking-widest border-none px-3 h-6 rounded-lg whitespace-nowrap",
                                o.status === 'Completed' ? 'bg-green-500 text-white' : 
                                o.status === 'Preparing' ? 'bg-orange-400 text-white' : 'bg-muted text-muted-foreground'
                              )}>
                                {o.status}
                              </Badge>
                           </TableCell>
                           <TableCell className="px-8 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">
                              {new Date(o.timestamp).toLocaleString()}
                           </TableCell>
                        </TableRow>
                      ))}
                   </TableBody>
                </Table>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="users">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map(u => (
                <Card key={u.uid} className="border-none bg-card shadow-xl rounded-[2.5rem] p-8 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-950 dark:bg-primary text-white dark:text-primary-foreground rounded-2xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-slate-950/20">
                         {u.name.charAt(0)}
                      </div>
                      <div>
                         <h3 className="font-black italic uppercase tracking-tight text-foreground text-lg leading-none mb-1">{u.name}</h3>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{u.email}</p>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <span className="text-[8px] font-black uppercase text-muted-foreground/50 tracking-[0.3em]">Clearance Level</span>
                         <Select value={u.role} onValueChange={(r) => setRoleChangeRequest({ user: u, role: r })}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted border-none font-bold text-xs ring-offset-background">
                               <SelectValue placeholder={u.role} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl">
                               <SelectItem value="Customer">Customer</SelectItem>
                               <SelectItem value="Barista">Barista</SelectItem>
                               <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                   </div>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="rounded-[2.5rem] border-none bg-card shadow-xl p-8 h-fit">
                 <h2 className="text-xl font-black italic uppercase tracking-tight mb-6">Stage Component</h2>
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Component Name</Label>
                       <Input className="h-12 rounded-xl bg-muted border-none" value={newCustom.name || ''} onChange={e => setNewCustom({...newCustom, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Additional Price</Label>
                       <Input className="h-12 rounded-xl bg-muted border-none" type="number" value={newCustom.additionalPrice || ''} onChange={e => setNewCustom({...newCustom, additionalPrice: parseFloat(e.target.value)})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Stock Level</Label>
                          <Input className="h-12 rounded-xl bg-muted border-none" type="number" value={newCustom.stockLevel || ''} onChange={e => setNewCustom({...newCustom, stockLevel: parseInt(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alert Threshold</Label>
                          <Input className="h-12 rounded-xl bg-muted border-none" type="number" value={newCustom.threshold || ''} onChange={e => setNewCustom({...newCustom, threshold: parseInt(e.target.value)})} />
                       </div>
                    </div>
                    <Button className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black italic uppercase shadow-xl hover:bg-primary/90" onClick={addCustom}>
                       Add Component
                    </Button>
                 </div>
              </Card>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {customs.map(c => (
                   <Card key={c.id} className={cn("border-none shadow-md rounded-[2.5rem] p-8 transition-colors", c.stockLevel <= c.threshold ? "bg-destructive/10" : "bg-card")}>
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <h3 className="font-black italic uppercase tracking-tight text-lg text-foreground">{c.name}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Ref: #{c.id.slice(0, 6)}</p>
                         </div>
                         <Badge className={cn("text-[9px] font-black border-none uppercase px-3 h-6 rounded-lg", c.stockLevel <= c.threshold ? "bg-destructive text-destructive-foreground" : "bg-green-500/10 text-green-600")}>
                            {c.stockLevel <= c.threshold ? 'REPLENISH' : 'ADEQUATE'}
                         </Badge>
                      </div>
                      
                      <div className="flex justify-between items-end border-t border-border pt-6">
                         <div>
                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] block mb-1">Available Quantity</span>
                            <span className="text-3xl font-black italic text-foreground tracking-tighter">{c.stockLevel}</span>
                         </div>
                         <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive">
                            <Trash2 size={20} />
                         </Button>
                      </div>
                   </Card>
                 ))}
              </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <Dialog open={!!roleChangeRequest} onOpenChange={() => setRoleChangeRequest(null)}>
         <DialogContent className="bg-card border-none rounded-[2rem] p-10 max-w-sm">
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto">
                  <Shield size={40} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-foreground leading-none">Security Clearance</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                     Confirm clearance elevation for operative <span className="font-bold text-foreground italic">"{roleChangeRequest?.user.name}"</span> to <span className="font-bold text-orange-500 italic">"{roleChangeRequest?.role}"</span> level?
                  </p>
               </div>
               <div className="flex flex-col gap-3">
                  <Button className="h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 hover:bg-primary/90" onClick={updateRole}>
                     Authorize Elevation
                  </Button>
                  <Button variant="ghost" className="h-14 text-muted-foreground font-black uppercase tracking-widest text-[10px]" onClick={() => setRoleChangeRequest(null)}>
                     Abort Protocol
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}
