import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { handleFirestoreError } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, User, Phone, Mail, Lock, Gift } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    referralCode: searchParams.get('ref') || ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.password) {
      setError('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let email = formData.email || `${formData.phone}@adearn.local`;
      if (formData.email && !formData.email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const user = userCredential.user;

      const userProfile = {
        uid: user.uid,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        balance: 80,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        referredBy: formData.referralCode || null,
        hasDeposited: false,
        isAdmin: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Configuration Error: Please enable Email/Password provider in Firebase Console.');
      } else {
        setError(err.message || 'An error occurred during registration');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
          email: user.email,
          balance: 80,
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          referredBy: formData.referralCode || null,
          hasDeposited: false,
          isAdmin: user.email === 'sonjitkumar051@gmail.com',
          createdAt: serverTimestamp(),
        };
        await setDoc(docRef, userProfile);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred with Google Sign-Up');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8 bg-white justify-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-blue-50 rounded-full blur-3xl -ml-32 -mt-32 opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -mr-24 -mb-24 opacity-40"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm mx-auto space-y-8"
      >
        <div className="flex flex-col items-center gap-3">
          <Logo iconSize={32} textSize="text-3xl" />
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Create Account</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Join our professional community</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 text-red-600 rounded-[20px] text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3 shadow-sm mx-1"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner text-sm"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                required
                className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner text-sm"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner text-sm"
                placeholder="Gmail ID (Optional)"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <Gift size={18} />
              </div>
              <input
                type="text"
                className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] py-4 px-14 focus:bg-white focus:border-orange-100 focus:ring-0 transition-all font-bold text-gray-900 shadow-inner text-sm"
                placeholder="Referral Code (Optional)"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gray-900 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[24px] shadow-2xl shadow-gray-200 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Creating account...' : 'Sign Up Now'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </div>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-3 text-gray-300 font-black tracking-[0.3em]">Or Register With</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignup}
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
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-orange-600 hover:underline">Login</button>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
