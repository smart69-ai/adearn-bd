import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { handleFirestoreError } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, Lock, Phone } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.password) {
      setError('Please enter both phone/email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let email = formData.phone;
      if (!email.includes('@')) {
        email = `${formData.phone}@adearn.local`;
      }
      
      await signInWithEmailAndPassword(auth, email, formData.password);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' && !formData.phone.includes('@')) {
        setError('Invalid phone number or password. If you registered with Gmail, please use your email address.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Configuration Error: Please enable Email/Password provider in Firebase Console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid phone number or password');
      } else {
        setError(err.message || 'An error occurred during login');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
  
      if (!docSnap.exists()) {
        const userProfile = {
          uid: user.uid,
          name: user.displayName || 'Google User',
          phone: user.phoneNumber || '01000000000',
          balance: 80,
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          referredBy: null,
          hasDeposited: false,
          isAdmin: user.email === 'sonjitkumar051@gmail.com',
          createdAt: serverTimestamp(),
        };

        try {
          await setDoc(docRef, userProfile);
        } catch (err: any) {
          handleFirestoreError(err, 'write' as any, `users/${user.uid}`);
        }
      }
      navigate('/');
    } catch (err: any) {
      if (err.message.startsWith('{')) {
        const errObj = JSON.parse(err.message);
        setError(`Permission Denied: ${errObj.operationType} on ${errObj.path}`);
      } else {
        setError(err.message || 'An error occurred with Google Sign-In');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8 bg-white justify-center relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -ml-24 -mb-24 opacity-40"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-auto space-y-10"
      >
        <div className="flex flex-col items-center gap-4">
          <Logo iconSize={36} textSize="text-4xl" />
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Login to your account</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 text-red-600 rounded-[24px] text-[11px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3 shadow-sm"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Phone or Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Phone size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-5 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner"
                  placeholder="Phone or Gmail"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Password</label>
                <button type="button" className="text-[10px] font-black text-orange-600 tracking-widest uppercase hover:underline">Forgot?</button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-5 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gray-900 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[24px] shadow-2xl shadow-gray-200 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Logging in...' : 'Login Now'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </div>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-4 text-gray-300 font-black tracking-[0.3em]">Or Sign In With</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-gray-700 font-black uppercase tracking-widest py-5 rounded-[24px] border-2 border-gray-100 shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Don't have an account?{' '}
              <button type="button" onClick={() => navigate('/register')} className="text-orange-600 hover:underline">Sign Up</button>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
