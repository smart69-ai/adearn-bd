import React from 'react';
import { Navigation } from './Navigation';
import { useLocation } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const noNavPaths = ['/login', '/register'];
  const showNav = !noNavPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      {showNav && <Navigation />}
    </div>
  );
}
