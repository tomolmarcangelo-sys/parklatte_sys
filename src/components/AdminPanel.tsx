import { useEffect, useState, DragEvent } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { MenuItem, CustomizationOption, UserProfile, Order, OrderStatus, UserRole } from '../types';
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
import { Plus, Trash2, Edit2, AlertTriangle, Coffee, Settings, Users, ArrowUpRight, ShoppingCart, Filter, Calendar, XCircle, Search, Image, Upload, X, Leaf, Utensils, Cake, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn, sanitize } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function AdminPanel() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [customs, setCustoms] = useState<CustomizationOption[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [roleChangeRequest, setRoleChangeRequest] = useState<{ user: UserProfile, role: any } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
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
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const CATEGORIES = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Other'];
  
  // New customization state
  const [newCustom, setNewCustom] = useState<Partial<CustomizationOption>>({ name: '', additionalPrice: 0, stockLevel: 0, threshold: 5 });
  const [editingCustom, setEditingCustom] = useState<CustomizationOption | null>(null);

  // User Management state
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'Customer' as UserRole });

  useEffect(() => {
    if (authLoading || !profile || profile.role !== 'Admin') return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
    }, (error) => console.error("Admin products listener error:", error));
    
    const unsubCustoms = onSnapshot(collection(db, 'customizations'), (snapshot) => {
      setCustoms(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CustomizationOption)));
    }, (error) => console.error("Admin customs listener error:", error));
    
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
    }, (error) => console.error("Admin users listener error:", error));

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    }, (error) => console.error("Admin orders listener error:", error));

    return () => {
      unsubProducts();
      unsubCustoms();
      unsubUsers();
      unsubOrders();
    };
  }, [profile, authLoading]);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesCustomer = order.customerName.toLowerCase().includes(customerFilter.toLowerCase()) || 
                          order.customerId.toLowerCase().includes(customerFilter.toLowerCase());
    
    // Date range filtering
    const orderDate = new Date(order.timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Set hours to include the full day
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    const matchesDate = (!start || orderDate >= start) && (!end || orderDate <= end);
    
    return matchesStatus && matchesCustomer && matchesDate;
  });

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [imageFile]);

  const clearFilters = () => {
    setStatusFilter('all');
    setCustomerFilter('');
    setStartDate('');
    setEndDate('');
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        toast.success(`Tactical asset "${file.name}" staged`);
      } else {
        toast.error('File type not recognized for tactical deployment');
      }
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const storageRef = ref(storage, `products/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (error) {
      console.error("Storage Error:", error);
      throw new Error("Failed to upload image. Please check your network or storage permissions.");
    }
  };

  const addProduct = async () => {
    if (!newProduct.name?.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!newProduct.price || newProduct.price <= 0) {
      toast.error('A valid price greater than 0 is required');
      return;
    }
    if (!newProduct.category) {
      toast.error('Please select a category');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      const productPayload = { 
        name: newProduct.name.trim(),
        price: Number(newProduct.price),
        category: newProduct.category,
        imageUrl: imageUrl,
        available: true,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'products'), sanitize(productPayload));
      
      // Reset state
      setNewProduct({ name: '', price: 0, category: 'Coffee', available: true, imageUrl: '' });
      setImageFile(null);
      setPreviewUrl(null);
      
      toast.success(`Successfully deployed ${newProduct.name} to the menu!`);
    } catch (error: any) {
      console.error("Creation Error:", error);
      toast.error(error.message || 'Critical failure during menu deployment');
    } finally {
      setUploading(false);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    setUploading(true);
    try {
      let imageUrl = editingProduct.imageUrl || '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      const { id, ...data } = editingProduct;
      const updatePayload = sanitize({ 
        ...data, 
        imageUrl,
        price: Number(data.price),
        updatedAt: new Date().toISOString()
      });
      
      await updateDoc(doc(db, 'products', id), updatePayload);
      
      setEditingProduct(null);
      setImageFile(null);
      setPreviewUrl(null);
      toast.success('Tactical data updated');
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error.message || 'Failed to update product intel');
    } finally {
      setUploading(false);
    }
  };

  const toggleAvailability = async (product: MenuItem) => {
    const ref = doc(db, 'products', product.id);
    await updateDoc(ref, { available: !product.available });
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const addCustom = async () => {
    if (!newCustom.name) return;
    try {
      const sanitized = sanitize(newCustom);
      await addDoc(collection(db, 'customizations'), sanitized);
      setNewCustom({ name: '', additionalPrice: 0, stockLevel: 0, threshold: 5 });
      toast.success('Customization added');
    } catch (error) {
      toast.error('Failed to add customization');
    }
  };

  const updateCustom = async () => {
    if (!editingCustom) return;
    try {
      const { id, ...data } = editingCustom;
      await updateDoc(doc(db, 'customizations', id), sanitize(data));
      setEditingCustom(null);
      toast.success('Inventory updated');
    } catch (error) {
      toast.error('Failed to update inventory');
    }
  };

  const deleteCustom = async (id: string) => {
    if (confirm('Delete this customization?')) {
      try {
        await deleteDoc(doc(db, 'customizations', id));
        toast.success('Removed from inventory');
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const updateRole = async () => {
    if (!roleChangeRequest) return;
    const { user, role } = roleChangeRequest;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role });
      setRoleChangeRequest(null);
      toast.success(`Role updated for ${user.name}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setUserToDelete(null);
      toast.success(`User ${userToDelete.name} deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleCreateUser = async () => {
    if (!userFormData.email || !userFormData.password || !userFormData.name) {
      toast.error('Email, password, and name are required');
      return;
    }
    setUploading(true);
    try {
      // Create secondary app to avoid signing out current admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const { user: newUser } = await createUserWithEmailAndPassword(secondaryAuth, userFormData.email, userFormData.password);
      await updateProfile(newUser, { displayName: userFormData.name });
      
      const newProfile: UserProfile = sanitize({
        uid: newUser.uid,
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role
      });
      
      await setDoc(doc(db, 'users', newUser.uid), newProfile);
      
      // Clean up secondary app
      await deleteApp(secondaryApp);
      
      setIsCreatingUser(false);
      setUserFormData({ name: '', email: '', password: '', role: 'Customer' });
      toast.success('Team member recruited successfully');
    } catch (error: any) {
      console.error(error);
      let message = 'Failed to create user';
      if (error.code === 'auth/email-already-in-use') message = 'Email already registered';
      if (error.code === 'auth/weak-password') message = 'Password is too weak';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setUploading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), sanitize({
        name: editingUser.name,
        role: editingUser.role
      }));
      setEditingUser(null);
      toast.success('Operative profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  const lowStock = customs.filter(c => c.stockLevel <= c.threshold);

  const filteredAndSortedProducts = products
    .filter(p => p.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) || p.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
    .sort((a, b) => {
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

  const toggleSort = (key: keyof MenuItem) => {
    if (menuSortKey === key) {
      setMenuSortOrder(menuSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setMenuSortKey(key);
      setMenuSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-black italic text-5xl text-slate-950 tracking-tighter uppercase">Command Center</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Operational Oversight & Strategic Control</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-950 text-white border-none shadow-premium rounded-3xl">
          <CardHeader>
            <CardTitle className="text-slate-500 uppercase text-[10px] font-black tracking-[0.2em] flex items-center gap-2">
              <Coffee size={14} className="text-orange-400" /> Active Menu
            </CardTitle>
            <div className="text-4xl font-extrabold">{products.length} Items</div>
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-premium rounded-3xl">
          <CardHeader>
            <CardTitle className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] flex items-center gap-2">
              <Users size={14} className="text-slate-800" /> Team Size
            </CardTitle>
            <div className="text-4xl font-extrabold text-slate-800">{users.length} Users</div>
          </CardHeader>
        </Card>
        <Card className={`border-none shadow-premium rounded-3xl ${lowStock.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <CardHeader>
            <CardTitle className={`uppercase text-[10px] font-black tracking-[0.2em] flex items-center gap-2 ${lowStock.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
              <AlertTriangle size={14} /> Inventory Status
            </CardTitle>
            <div className={`text-4xl font-extrabold ${lowStock.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {lowStock.length > 0 ? `${lowStock.length} Alerts` : 'All Healthy'}
            </div>
          </CardHeader>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4 text-orange-950">
            <div className="w-12 h-12 bg-orange-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-orange-400/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Inventory Critical</h2>
              <p className="text-sm font-medium opacity-70">
                {lowStock.length} items are currently below their safety threshold.
              </p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-md no-scrollbar">
            {lowStock.map(item => (
              <Badge key={item.id} className="bg-white border-orange-200 text-orange-400 font-bold px-3 py-1 whitespace-nowrap">
                {item.name}: {item.stockLevel} left
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 gap-8 mb-8">
          <TabsTrigger value="menu" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold text-slate-400 data-[state=active]:text-slate-950">Menu Management</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold text-slate-400 data-[state=active]:text-slate-950">Order Ledger</TabsTrigger>
          <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold text-slate-400 data-[state=active]:text-slate-950">Team & Roles</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold text-slate-400 data-[state=active]:text-slate-950">Inventory Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="rounded-3xl border-stone-200">
              <CardHeader>
                <CardTitle className="font-serif">Add New Product</CardTitle>
                <CardDescription>Fill in details to add a new drink.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Espresso" value={newProduct.name ?? ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Price (₱)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={newProduct.price ?? ''} 
                    onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Category</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setNewProduct({...newProduct, category: cat})}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 group",
                          newProduct.category === cat 
                            ? "border-slate-950 bg-slate-50 ring-2 ring-slate-950/5" 
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        )}
                      >
                        {newProduct.category === cat && (
                          <div className="absolute top-2 right-2 text-slate-950">
                            <CheckCircle2 size={16} className="fill-slate-950 text-white shadow-sm" />
                          </div>
                        )}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                          newProduct.category === cat ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                        )}>
                          {cat === 'Coffee' && <Coffee size={18} />}
                          {cat === 'Tea' && <Leaf size={18} />}
                          {cat === 'Pastry' && <Cake size={18} />}
                          {cat === 'Sandwich' && <Utensils size={18} />}
                          {cat === 'Other' && <Plus size={18} />}
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-tight",
                          newProduct.category === cat ? "text-slate-950" : "text-slate-400"
                        )}>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Image Asset</Label>
                  <div className="flex flex-col gap-3">
                    {previewUrl ? (
                      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl group">
                        <img 
                          src={previewUrl} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt="Preview"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-between items-end">
                          <div className="text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ready to Deploy</p>
                            <p className="text-xs font-bold truncate max-w-[150px]">{imageFile?.name}</p>
                          </div>
                          <Button 
                            variant="destructive"
                            size="icon"
                            onClick={() => setImageFile(null)}
                            className="h-10 w-10 rounded-xl shadow-lg border-2 border-white/20 transition-transform active:scale-90"
                          >
                            <X size={18} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "flex flex-col items-center justify-center aspect-[16/10] rounded-2xl border-4 border-dashed transition-all cursor-pointer group relative overflow-hidden",
                          isDragging 
                            ? "border-orange-400 bg-orange-50/50 scale-[0.98]" 
                            : "border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className="flex flex-col items-center gap-4 text-slate-400 group-hover:text-slate-600 transition-all">
                          <div className={cn(
                            "w-16 h-16 rounded-3xl flex items-center justify-center transition-all",
                            isDragging ? "bg-orange-400 text-white shadow-2xl shadow-orange-400/40 animate-bounce" : "bg-white shadow-sm"
                          )}>
                            {isDragging ? <Upload size={32} /> : <Image size={32} />}
                          </div>
                          <div className="text-center space-y-1">
                            <span className="text-sm font-black uppercase tracking-widest block italic">
                              {isDragging ? "RELEASE TO DROP" : "DEPLOY INTEL"}
                            </span>
                            <span className="text-[10px] font-bold opacity-60 block">DRAG & DROP OR EXPLORE FILES</span>
                          </div>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <Button 
                  className="w-full h-12 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-black italic tracking-tighter uppercase transition-all shadow-lg shadow-slate-950/20 mt-4" 
                  onClick={addProduct}
                  disabled={uploading}
                >
                  {uploading ? "Deploying Assets..." : "Create Item"}
                </Button>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input 
                    placeholder="Search menu..." 
                    value={menuSearchTerm || ''}
                    onChange={e => setMenuSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <Select value={`${menuSortKey}-${menuSortOrder}`} onValueChange={(val) => {
                  const [key, order] = val.split('-') as [keyof MenuItem, 'asc' | 'desc'];
                  setMenuSortKey(key);
                  setMenuSortOrder(order);
                }}>
                  <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                    <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                    <SelectItem value="category-asc">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="cursor-pointer hover:text-slate-950 transition-colors" onClick={() => toggleSort('name')}>
                        Item {menuSortKey === 'name' && (menuSortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-slate-950 transition-colors" onClick={() => toggleSort('category')}>
                        Category {menuSortKey === 'category' && (menuSortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-slate-950 transition-colors" onClick={() => toggleSort('price')}>
                        Price {menuSortKey === 'price' && (menuSortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedProducts.length > 0 ? filteredAndSortedProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Coffee size={18} />
                                </div>
                              )}
                            </div>
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="font-bold uppercase text-[9px] tracking-widest">{product.category}</Badge></TableCell>
                        <TableCell>₱{product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-black uppercase tracking-tighter border-none",
                            product.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          )}>
                            {product.available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => setEditingProduct(product)}>
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-orange-400" onClick={() => toggleAvailability(product)}>
                            <Coffee size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteProduct(product.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic font-medium">No results found in menu.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 outline-none">
          <div className="flex flex-col xl:flex-row gap-4 items-end bg-white p-6 rounded-2xl border border-slate-100 mb-6">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                <Users size={12} /> Filter by Customer
              </Label>
              <Input 
                placeholder="Search by name or UID..." 
                value={customerFilter || ''} 
                onChange={e => setCustomerFilter(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50/50 h-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full xl:w-auto">
              <div className="space-y-2 flex-1">
                <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <Calendar size={12} /> Start Date
                </Label>
                <Input 
                  type="date"
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/50 h-10"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <Calendar size={12} /> End Date
                </Label>
                <Input 
                  type="date"
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/50 h-10"
                />
              </div>
            </div>

            <div className="space-y-2 w-full sm:w-[200px]">
              <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                <Filter size={12} /> Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-10">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-white border-none shadow-premium rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Preparing">Preparing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="PickedUp">Paid / Picked Up</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="h-10 text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-xl"
              title="Clear Filters"
            >
              <XCircle size={18} />
            </Button>
          </div>

          <Card className="rounded-3xl border-stone-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-bold">Order ID</TableHead>
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="font-bold">Items</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-right">Total</TableHead>
                  <TableHead className="font-bold text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                  <TableRow 
                    key={order.id} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell className="font-mono text-xs text-slate-400 uppercase">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        #PL-{order.id.slice(-4)}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{order.customerName}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">{item.name}</span>
                            {item.customizations && item.customizations.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.customizations.map((c, cidx) => (
                                  <span key={cidx} className="text-[9px] text-orange-500 font-medium">+ {c.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-tighter border-none",
                        order.status === 'Completed' || order.status === 'PickedUp' ? 'bg-green-100 text-green-700' :
                        order.status === 'Preparing' ? 'bg-orange-100 text-orange-700' :
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      )}>
                        {order.status === 'PickedUp' ? 'Paid' : order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-coffee-accent">₱{order.totalPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs text-slate-400">
                      {new Date(order.timestamp).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">No orders found matching filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="outline-none space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-serif font-bold text-slate-950">Active Operatives</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Manage your specialized team and their clearance levels.</p>
            </div>
            <Button 
              className="bg-slate-950 text-white rounded-xl flex items-center gap-2 h-10 px-6 font-black uppercase tracking-widest text-[10px]"
              onClick={() => setIsCreatingUser(true)}
            >
              <Plus size={16} /> Recruit Operative
            </Button>
          </div>

          <Card className="rounded-3xl border-stone-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-bold">Team Member</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold text-right">Role & Access</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-slate-900">{user.name}</TableCell>
                    <TableCell className="text-slate-500 font-medium">{user.email}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-none",
                        user.role === 'Admin' ? 'bg-slate-950 text-white' :
                        user.role === 'Barista' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="outline-none space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="rounded-3xl border-stone-200 h-fit">
              <CardHeader>
                <CardTitle className="font-serif">Add Stock Item</CardTitle>
                <CardDescription>Add new customizations or ingredients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input placeholder="Oat Milk, Extra Shot..." value={newCustom.name ?? ''} onChange={e => setNewCustom({...newCustom, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (₱)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={newCustom.additionalPrice ?? ''} 
                      onChange={e => setNewCustom({...newCustom, additionalPrice: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Level</Label>
                    <Input 
                      type="number" 
                      value={newCustom.stockLevel ?? ''} 
                      onChange={e => setNewCustom({...newCustom, stockLevel: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Threshold</Label>
                  <Input 
                    type="number" 
                    value={newCustom.threshold ?? ''} 
                    onChange={e => setNewCustom({...newCustom, threshold: parseInt(e.target.value) || 0})} 
                  />
                </div>
                <Button className="w-full bg-slate-900 text-white" onClick={addCustom}>Register Stock</Button>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customs.map(c => (
                  <Card key={c.id} className={cn(
                    "rounded-2xl border-stone-200 transition-all",
                    c.stockLevel <= c.threshold ? "bg-amber-50 border-amber-200" : "bg-white"
                  )}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.name}</span>
                          {c.stockLevel <= c.threshold && (
                            <Badge variant="destructive" className="text-[8px] h-4">Low</Badge>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 font-medium">
                          Stock: <span className={cn("font-bold", c.stockLevel <= c.threshold ? "text-amber-600" : "text-slate-900")}>{c.stockLevel}</span> / Threshold: {c.threshold}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => setEditingCustom(c)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteCustom(c.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="bg-white border-none rounded-3xl max-w-md w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 text-slate-950">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-serif text-2xl font-bold">Edit Product</DialogTitle>
            <DialogDescription className="text-slate-500">Modify product details for {editingProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tactical Name</Label>
              <Input 
                className="rounded-xl border-slate-200 bg-slate-50/50"
                value={editingProduct?.name ?? ''} 
                onChange={e => editingProduct && setEditingProduct({...editingProduct, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Price (₱)</Label>
              <Input 
                className="rounded-xl border-slate-200 bg-slate-50/50"
                type="number" 
                step="0.01"
                value={editingProduct?.price ?? ''} 
                onChange={e => editingProduct && setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-slate-400">Tactical Category</Label>
              {editingProduct && (
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setEditingProduct({...editingProduct, category: cat})}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 group",
                        editingProduct.category === cat 
                          ? "border-slate-950 bg-slate-50 ring-2 ring-slate-950/5" 
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      )}
                    >
                      {editingProduct.category === cat && (
                        <div className="absolute top-2 right-2 text-slate-950">
                          <CheckCircle2 size={16} className="fill-slate-950 text-white shadow-sm" />
                        </div>
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        editingProduct.category === cat ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                      )}>
                        {cat === 'Coffee' && <Coffee size={18} />}
                        {cat === 'Tea' && <Leaf size={18} />}
                        {cat === 'Pastry' && <Cake size={18} />}
                        {cat === 'Sandwich' && <Utensils size={18} />}
                        {cat === 'Other' && <Plus size={18} />}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tight",
                        editingProduct.category === cat ? "text-slate-950" : "text-slate-400"
                      )}>{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Product Image Asset</Label>
              <div className="flex flex-col gap-3">
                {previewUrl ? (
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border-4 border-slate-200 shadow-lg group">
                    <img 
                      src={previewUrl} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt="Preview"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-end">
                      <div className="text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Staged Update</p>
                        <p className="text-xs font-bold truncate max-w-[150px]">{imageFile?.name}</p>
                      </div>
                      <Button 
                        variant="destructive"
                        size="icon"
                        onClick={() => setImageFile(null)}
                        className="h-10 w-10 rounded-xl shadow-lg border-2 border-white/20"
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  </div>
                ) : editingProduct?.imageUrl ? (
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-sm">
                    <img 
                      src={editingProduct.imageUrl} 
                      className="w-full h-full object-cover grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                      alt="Current"
                      referrerPolicy="no-referrer"
                    />
                    <label 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all cursor-pointer",
                        isDragging ? "bg-orange-400/40 backdrop-blur-md opacity-100" : "bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]"
                      )}
                    >
                      <div className={cn(
                        "flex flex-col items-center gap-2 text-white transition-all",
                        isDragging ? "scale-110" : "scale-90 group-hover:scale-100"
                      )}>
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                          isDragging ? "bg-white text-orange-400 shadow-2xl animate-bounce" : "bg-white/20 backdrop-blur"
                        )}>
                          <Upload size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {isDragging ? "DROP TO REPLACE" : "REPLACE ASSET"}
                        </span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                ) : (
                  <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "flex flex-col items-center justify-center aspect-[16/10] rounded-2xl border-4 border-dashed transition-all cursor-pointer group relative overflow-hidden",
                      isDragging 
                        ? "border-orange-400 bg-orange-50/50 scale-[0.98]" 
                        : "border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-all">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                        isDragging ? "bg-orange-400 text-white shadow-xl animate-pulse" : "bg-white shadow-sm font-black"
                      )}>
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-black uppercase tracking-widest block italic">
                          {isDragging ? "RELEASE TO DROP" : "DEPLOY TACTICAL INTEL"}
                        </span>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 shrink-0 bg-slate-50/50">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setEditingProduct(null); setImageFile(null); }}>Cancel</Button>
            <Button 
              className="bg-slate-950 text-white rounded-xl font-bold h-11 px-8 shadow-lg shadow-slate-950/20" 
              onClick={updateProduct}
              disabled={uploading}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Updating...
                </div>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleChangeRequest} onOpenChange={() => setRoleChangeRequest(null)}>
        <DialogContent className="bg-white border-none rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Confirm Role Change</DialogTitle>
            <DialogDescription className="text-stone-500 pt-2">
              Are you sure you want to change <span className="font-bold text-slate-900">{roleChangeRequest?.user.name}</span>'s role to <span className="font-bold text-orange-400 uppercase tracking-widest text-[10px]">{roleChangeRequest?.role}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRoleChangeRequest(null)}>Cancel</Button>
            <Button className="bg-slate-950 text-white rounded-xl" onClick={updateRole}>Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCustom} onOpenChange={() => setEditingCustom(null)}>
        <DialogContent className="bg-white border-none rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Update Stock Item</DialogTitle>
            <DialogDescription>Adjust inventory levels for {editingCustom?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stock Level</Label>
              <Input 
                type="number" 
                value={editingCustom?.stockLevel ?? ''} 
                onChange={e => editingCustom && setEditingCustom({...editingCustom, stockLevel: parseInt(e.target.value) || 0})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input 
                type="number" 
                value={editingCustom?.threshold ?? ''} 
                onChange={e => editingCustom && setEditingCustom({...editingCustom, threshold: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCustom(null)}>Cancel</Button>
            <Button className="bg-slate-950 text-white rounded-xl" onClick={updateCustom}>Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md bg-white border-none rounded-3xl overflow-hidden p-0">
          {selectedOrder && (
            <div className="flex flex-col">
              <div className="p-8 bg-slate-950 text-white shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Operational Record</div>
                    <h2 className="text-2xl font-serif font-bold">#PL-{selectedOrder.id.slice(-4).toUpperCase()}</h2>
                  </div>
                  <Badge className={cn(
                    "border-none text-[10px] font-black px-3 h-6",
                    selectedOrder.status === 'PickedUp' || selectedOrder.status === 'Completed' ? 'bg-green-500 text-white' : 
                    selectedOrder.status === 'Cancelled' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'
                  )}>
                    {selectedOrder.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Users size={14} />
                    {selectedOrder.customerName}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Clock size={14} />
                    {new Date(selectedOrder.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[50vh] custom-scrollbar bg-white">
                <div className="space-y-6">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="space-y-2">
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-slate-200" />
                          {item.name}
                        </p>
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 ml-5">
                            {item.customizations.map((c, cidx) => (
                              <Badge key={cidx} variant="secondary" className="bg-orange-50 text-orange-600 border-none text-[9px] font-black tracking-widest px-2 py-0">
                                + {c.name.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-slate-950 shrink-0">₱{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-slate-50 shrink-0 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</span>
                  <span className="text-3xl font-serif font-black text-slate-950">₱{selectedOrder.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
        <DialogContent className="bg-white border-none rounded-3xl max-w-md w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-8 pb-0 shrink-0">
            <DialogTitle className="font-serif text-2xl font-bold">Recruit Operative</DialogTitle>
            <DialogDescription className="text-slate-500">Register a new team member with specific clearance.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Full Operational Name</Label>
              <Input 
                className="rounded-xl border-slate-200 bg-slate-50/50 h-11"
                placeholder="Tactical Agent Name" 
                value={userFormData.name} 
                onChange={e => setUserFormData({...userFormData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gmail Address (Clearance ID)</Label>
              <Input 
                className="rounded-xl border-slate-200 bg-slate-50/50 h-11"
                type="email" 
                placeholder="agent@gmail.com" 
                value={userFormData.email} 
                onChange={e => setUserFormData({...userFormData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Initial Crypt Key (Password)</Label>
              <Input 
                className="rounded-xl border-slate-200 bg-slate-50/50 h-11"
                type="password" 
                placeholder="••••••••" 
                value={userFormData.password} 
                onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Clearance Level</Label>
              <Select value={userFormData.role} onValueChange={(val: UserRole) => setUserFormData({...userFormData, role: val})}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-slate-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-none shadow-premium rounded-xl">
                  <SelectItem value="Customer" className="text-[10px] font-black uppercase tracking-widest py-3">Customer (External)</SelectItem>
                  <SelectItem value="Barista" className="text-[10px] font-black uppercase tracking-widest py-3">Barista (Frontline)</SelectItem>
                  <SelectItem value="Admin" className="text-[10px] font-black uppercase tracking-widest py-3">Admin (Command)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-8 pt-0 shrink-0 bg-slate-50/50">
            <Button variant="ghost" className="rounded-xl" onClick={() => setIsCreatingUser(false)}>Abort</Button>
            <Button 
              className="bg-slate-950 text-white rounded-xl font-bold px-8 h-11 shadow-lg shadow-slate-950/20" 
              onClick={handleCreateUser}
              disabled={uploading}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Recruiting...
                </div>
              ) : "Confirm Recruitment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-white border-none rounded-3xl max-w-md w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-8 pb-0 shrink-0">
            <DialogTitle className="font-serif text-2xl font-bold">Update Operative</DialogTitle>
            <DialogDescription className="text-slate-500">Modify clearance and profile for {editingUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {editingUser && (
              <>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Operational Name</Label>
                  <Input 
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-11"
                    value={editingUser.name} 
                    onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Clearance Level</Label>
                  <Select value={editingUser.role} onValueChange={(val: UserRole) => setEditingUser({...editingUser, role: val})}>
                    <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-slate-50/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-none shadow-premium rounded-xl">
                      <SelectItem value="Customer" className="text-[10px] font-black uppercase tracking-widest py-3">Customer</SelectItem>
                      <SelectItem value="Barista" className="text-[10px] font-black uppercase tracking-widest py-3">Barista</SelectItem>
                      <SelectItem value="Admin" className="text-[10px] font-black uppercase tracking-widest py-3">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Security Protocol: Email addresses and system crypt-keys are strictly immutable from this terminal to maintain operational integrity.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="p-8 pt-0 shrink-0 bg-slate-50/50">
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button 
              className="bg-slate-950 text-white rounded-xl font-bold px-8 h-11 shadow-lg shadow-slate-950/20" 
              onClick={handleUpdateUser}
              disabled={uploading}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Updating...
                </div>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent className="bg-white border-none rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-2 text-red-600">
              <AlertTriangle size={24} /> Delete User
            </DialogTitle>
            <DialogDescription className="text-stone-500 pt-2">
              Are you sure you want to delete <span className="font-bold text-slate-900">{userToDelete?.name}</span>? 
              This action cannot be undone and they will lose all access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" className="rounded-xl" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl" onClick={deleteUser}>Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
