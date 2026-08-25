import React from 'react';
import { Home, Package, User, LayoutGrid, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Plans', icon: Package, path: '/packages' },
    { label: 'Tasks', icon: LayoutGrid, path: '/tasks' },
    { label: 'Me', icon: User, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 pt-3 pb-8 flex justify-between items-center z-50 rounded-t-[32px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <button
            key={item.path}
            id={`nav-${item.label.toLowerCase()}`}
            onClick={() => navigate(item.path)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 transition-all duration-300",
              isActive ? "text-orange-600 scale-110" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              isActive ? "bg-orange-50" : "bg-transparent"
            )}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-tighter transition-opacity",
              isActive ? "opacity-100" : "opacity-0"
            )}>
              {item.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -bottom-2 w-1 h-1 bg-orange-600 rounded-full"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
