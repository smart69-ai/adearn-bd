import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Packages from './pages/Packages';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Tasks from './pages/Tasks';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Refer from './pages/Refer';
import Admin from './pages/Admin';
import Transactions from './pages/Transactions';
import Terms from './pages/Terms';
import Support from './pages/Support';

import { Ban } from 'lucide-react';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-red-600">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (profile?.isDeactivated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-red-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl space-y-6 max-w-sm w-full border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Ban size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-gray-900">Account Banned</h1>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Your account has been deactivated. {profile?.deactivationReason ? (
                <span className="block mt-2 text-red-600 font-bold bg-red-50 p-3 rounded-2xl border border-red-100">
                  Reason: {profile.deactivationReason}
                </span>
              ) : (
                "Please contact support if you believe this is a mistake."
              )}
            </p>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/packages" element={<PrivateRoute><Packages /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
            <Route path="/deposit" element={<PrivateRoute><Deposit /></PrivateRoute>} />
            <Route path="/withdraw" element={<PrivateRoute><Withdraw /></PrivateRoute>} />
            <Route path="/refer" element={<PrivateRoute><Refer /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}
