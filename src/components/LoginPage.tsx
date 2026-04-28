import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coffee, LogIn, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function LoginPage() {
  const { user, loading: authLoading, login, emailSignIn, emailSignUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!formData.name) throw new Error('Name is required');
        await emailSignUp(formData.email.trim(), formData.password, formData.name);
        toast.success('Account created successfully!');
      } else {
        await emailSignIn(formData.email.trim(), formData.password);
        toast.success('Logged in successfully!');
      }
    } catch (error: any) {
      console.error(error);
      let message = 'Authentication failed';
      if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup closed before completion.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (error.message) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await login();
      toast.success('Google authentication successful');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled: Popup closed.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore parallel popup requests
      } else {
        toast.error('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[grid-slate-100] [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_25%),_radial-gradient(circle_at_bottom_left,_var(--tw-gradient-from)_0%,_transparent_25%)] from-orange-100 opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="border-none shadow-premium rounded-3xl overflow-hidden bg-white/90 backdrop-blur-md">
          <div className="h-2 bg-gradient-to-r from-orange-400 to-amber-500" />
          
          <CardHeader className="pt-10 pb-6 text-center">
            <motion.div 
              layout
              className="mx-auto w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-orange-400 shadow-xl mb-6"
            >
              <Coffee size={32} />
            </motion.div>
            <CardTitle className="text-3xl font-black italic text-slate-950 tracking-tighter uppercase">
              {isSignUp ? "Join the Team" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
              Champion's Brew Performance Hub
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        required
                        placeholder="John Doe"
                        className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-slate-950 focus:border-slate-950 transition-all font-medium"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gmail Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    required
                    type="email"
                    placeholder="name@gmail.com"
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-slate-950 focus:border-slate-950 transition-all font-medium"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secret Key</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-slate-950 focus:border-slate-950 transition-all font-medium"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 text-lg font-black italic tracking-tighter uppercase transition-all active:scale-[0.98] shadow-lg shadow-slate-950/20"
              >
                {loading ? "AUTHENTICATING..." : isSignUp ? (
                  <>Create Account <UserPlus size={20} className="text-orange-400" /></>
                ) : (
                  <>Sign In <LogIn size={20} className="text-orange-400" /></>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] bg-white px-4 text-slate-300">
                OR Tactical Entry
              </div>
            </div>

            <Button 
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full h-14 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center gap-3 text-base font-bold transition-all disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale opacity-70 group-hover:opacity-100" />
              Continue with Google
            </Button>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors"
              >
                {isSignUp ? "Already a champion? Sign In" : "New operative? Create Account"}
              </button>
            </div>

            <p className="text-[9px] text-slate-300 text-center mt-8 font-bold uppercase tracking-widest leading-loose">
              By deploying, you agree to our <br /> protocols and performance standards.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
