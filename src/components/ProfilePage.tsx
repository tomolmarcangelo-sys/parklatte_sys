import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Shield, Mail, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/api';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setRole(profile.role);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user || !profile) return;
    
    setIsSaving(true);
    try {
      const updates: any = { name };
      // Requirement: Admins can update their role
      if (profile.role === 'Admin') {
        updates.role = role;
      }
      
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  const isAdmin = profile.role === 'Admin';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-none shadow-premium rounded-3xl overflow-hidden bg-white">
          <div className="h-32 bg-slate-950 relative">
            <div className="absolute -bottom-12 left-10">
              <div className="w-24 h-24 rounded-3xl bg-orange-400 border-4 border-slate-50 flex items-center justify-center text-slate-950 shadow-xl">
                <User size={48} />
              </div>
            </div>
          </div>
          <CardHeader className="pt-16 pb-6 px-10">
            <CardTitle className="text-3xl font-extrabold text-slate-950 tracking-tight">Your Profile</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Manage your personal information and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 px-10 pb-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <Mail size={12} /> Email Address
                </Label>
                <div className="flex items-center gap-3 px-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-sm font-medium">
                  {profile.email}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <User size={12} /> Display Name
                </Label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-12 rounded-xl border-slate-200 focus:ring-orange-400"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                   <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                    <Shield size={12} /> Permission Level
                  </Label>
                  {!isAdmin && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-900 border-slate-200 font-bold px-3">
                      {profile.role}
                    </Badge>
                  )}
                </div>

                {isAdmin ? (
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-none shadow-premium rounded-xl">
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Barista">Barista</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Your role is managed by technical administrators. Contact support for elevation.
                  </p>
                )}
              </div>
            </div>

            <Button 
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="w-full h-14 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 text-lg font-bold transition-all shadow-lg shadow-slate-950/10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
