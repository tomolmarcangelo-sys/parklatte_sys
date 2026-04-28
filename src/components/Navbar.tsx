import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Coffee, User, LogOut, LayoutDashboard, Settings, ShoppingBag, ListChecks, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { user, profile, logout, loading } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Customer Menu', icon: Coffee, roles: ['Customer', 'Barista', 'Admin'] },
    { to: '/orders', label: 'My Orders', icon: ListChecks, roles: ['Customer', 'Barista', 'Admin'] },
    { to: '/profile', label: 'My Profile', icon: UserCircle, roles: ['Customer', 'Barista', 'Admin'] },
    { to: '/barista', label: 'Barista Queue', icon: LayoutDashboard, roles: ['Barista', 'Admin'] },
    { to: '/admin', label: 'Admin Management', icon: Settings, roles: ['Admin'] },
  ];

  const filteredLinks = navLinks.filter(link => 
    profile && link.roles.includes(profile.role)
  );

  return (
    <nav className="w-60 bg-slate-950 text-slate-50 flex flex-col p-6 h-screen sticky top-0 shrink-0">
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center text-slate-950">
          <Coffee size={20} weight="bold" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-orange-400 uppercase">Parking Latte</span>
      </div>

      <div className="flex-1 space-y-2">
        {filteredLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              location.pathname === link.to 
                ? "bg-slate-800 text-white" 
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <link.icon size={18} />
            {link.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto pt-6 space-y-4">
        {user && !loading && (
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
              Active Session
            </div>
            <div className="text-sm font-semibold truncate">
              {profile?.name}
            </div>
            <div className="text-[10px] text-orange-400 font-bold">
              {profile?.role}
            </div>
          </div>
        )}
        
        {user ? (
          <Button 
            variant="ghost" 
            onClick={logout} 
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-400/10 gap-3"
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        ) : (
          <div className="text-slate-500 text-xs text-center">
            Sign in to access features
          </div>
        )}
      </div>
    </nav>
  );
}

