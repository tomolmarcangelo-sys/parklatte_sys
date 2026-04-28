import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Coffee, User, LogOut, LayoutDashboard, Settings, ShoppingBag, ListChecks, UserCircle, Sun, Moon, X } from 'lucide-react';
import { useTheme } from '../hooks/use-theme';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Navbar({ isOpen, onClose }: NavbarProps) {
  const { user, profile, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Menu', icon: Coffee, roles: ['Customer', 'Barista', 'Admin'] },
    { to: '/orders', label: 'Orders', icon: ListChecks, roles: ['Customer', 'Barista', 'Admin'] },
    { to: '/profile', label: 'Profile', icon: UserCircle, roles: ['Customer', 'Barista', 'Admin'] },
    { to: '/barista', label: 'Barista', icon: LayoutDashboard, roles: ['Barista', 'Admin'] },
    { to: '/admin', label: 'Admin', icon: Settings, roles: ['Admin'] },
  ];

  const filteredLinks = navLinks.filter(link => 
    profile && link.roles.includes(profile.role)
  );

  const NavContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center text-slate-950">
            <Coffee size={20} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-orange-400 uppercase leading-none">Parking <br/><span className="text-white">Latte</span></span>
        </div>
        
        {/* Close Button Mobile */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-1">
        {filteredLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              location.pathname === link.to 
                ? "bg-orange-400 text-slate-950 shadow-lg shadow-orange-400/20" 
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <link.icon size={16} />
            {link.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto pt-6 space-y-2">
        <Button 
          variant="ghost" 
          onClick={toggleTheme} 
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-900 gap-3 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light Protocol' : 'Dark Protocol'}
        </Button>

        {user && !loading && (
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="text-[8px] text-slate-500 uppercase font-black tracking-[0.3em] mb-2">
              Authorized Operative
            </div>
            <div className="text-xs font-black italic uppercase text-white truncate">
              {profile?.name}
            </div>
            <div className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">
              {profile?.role}
            </div>
          </div>
        )}
        
        {user ? (
          <Button 
            variant="ghost" 
            onClick={logout} 
            className="w-full justify-start text-slate-500 hover:text-red-400 hover:bg-red-400/10 gap-3 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest mt-2"
          >
            <LogOut size={16} />
            Abort Session
          </Button>
        ) : (
          <div className="text-slate-600 text-[8px] font-black uppercase tracking-widest text-center py-4">
            Awaiting Credentials
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="w-64 bg-slate-950 text-slate-50 hidden lg:flex flex-col p-6 h-screen sticky top-0 shrink-0 border-r border-slate-900">
        {NavContent}
      </nav>

      {/* Mobile Navbar */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-72 bg-slate-950 text-slate-50 z-50 flex flex-col p-6 shadow-2xl lg:hidden"
          >
            {NavContent}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

