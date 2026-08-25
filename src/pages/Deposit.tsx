import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertCircle, Loader2, Copy, Wallet, History, ShieldCheck, Zap, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, handleFirestoreError } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Deposit() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [method, setMethod] = useState<'bkash' | 'nagad' | null>(null);
  const [amount, setAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [paymentNumbers, setPaymentNumbers] = useState({ 
    bkash: '', 
    nagad: '', 
    minDeposit: 100,
    maxDeposit: 25000
  });

  useEffect(() => {
    async function fetchNumbers() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'payment'));
        if (snap.exists()) {
          setPaymentNumbers(snap.data() as any);
        }
      } catch (err) {
        console.error('Error fetching payment numbers:', err);
      }
    }
    fetchNumbers();
  }, []);

  const methods = [
    { id: 'bkash', name: 'bKash', color: 'bg-[#D12053]', icon: 'https://cdn.vs.com.bd/logos/bkash-logo.png' },
    { id: 'nagad', name: 'Nagad', color: 'bg-[#F7941D]', icon: 'https://cdn.vs.com.bd/logos/nagad-logo.png' },
  ];

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !method || !amount || !trxId) {
      setError('Please fill all fields');
      return;
    }

    const amt = Number(amount);
    if (amt < (paymentNumbers.minDeposit || 100)) {
      setError(`Minimum deposit is ৳ ${paymentNumbers.minDeposit || 100}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: Number(amount),
        type: 'deposit',
        method,
        accountNumber: profile?.phone || 'Registered User',
        trxId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      handleFirestoreError(err, 'create' as any, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center mb-8 shadow-xl shadow-green-50"
        >
          <Check size={48} strokeWidth={3} />
        </motion.div>
        <div className="space-y-3 mb-10">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Deposit Submitted</h2>
          <p className="text-sm text-gray-400 font-medium max-w-[280px] mx-auto">Your transaction is being verified. Your balance will update shortly.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="w-full max-w-xs bg-gray-900 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[24px] shadow-2xl active:scale-95 transition-all text-[11px]"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-white/80 backdrop-blur-xl p-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Deposit</h1>
        </div>
        <button onClick={() => navigate('/transactions')} className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full active:scale-95 transition-all">
          <History size={14} />
          History
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-10"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Payment Method</h2>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-widest">
               <ShieldCheck size={12} />
               Secure Gateway
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id as any)}
                className={cn(
                  "relative flex flex-col items-center gap-4 p-6 rounded-[32px] border-2 transition-all overflow-hidden",
                  method === m.id ? "border-orange-500 bg-orange-50 ring-4 ring-orange-50" : "border-gray-50 bg-white"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg",
                  m.color
                )}>
                  {m.id.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{m.name}</span>
                {method === m.id && (
                  <motion.div layoutId="check" className="absolute top-2 right-2 bg-orange-500 rounded-full p-1 shadow-sm">
                    <Check size={8} className="text-white" strokeWidth={4} />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method ? (
            <motion.form 
              key={method}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={handleSubmit} 
              className="bg-white rounded-[40px] p-8 shadow-xl shadow-gray-100 border border-gray-100 space-y-8"
            >
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-[20px] flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-red-100">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                   <Zap size={16} className="fill-orange-600" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em]">Payment Instructions</p>
                </div>
                <div className="bg-gray-50/50 rounded-[32px] p-6 space-y-4 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    Send Money from your personal <span className="font-bold text-gray-900 capitalize">{method}</span> account to the number below:
                  </p>
                  
                  <button 
                    type="button"
                    onClick={() => handleCopy(paymentNumbers[method as keyof typeof paymentNumbers])}
                    className="w-full flex items-center justify-between bg-white border border-gray-100 p-4 rounded-[20px] active:scale-[0.98] transition-all group lg:hover:border-orange-200"
                  >
                    <span className="text-xl font-black text-gray-900 tracking-wider">
                      {paymentNumbers[method as keyof typeof paymentNumbers] || 'Fetching...'}
                    </span>
                    <div className="flex items-center gap-3 text-orange-600 font-black uppercase tracking-widest text-[9px]">
                      {copied ? 'Copied' : 'Copy'}
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Deposit Amount (৳)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                      <Wallet size={18} />
                    </div>
                    <input
                      type="number"
                      required
                      className="w-full bg-gray-50 border-none rounded-[24px] py-5 px-14 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all font-black text-gray-900 shadow-inner"
                      placeholder={`Min. ৳${paymentNumbers.minDeposit}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Transaction ID (TrxID)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                      <Zap size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50 border-none rounded-[24px] py-5 px-14 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all font-black text-gray-900 shadow-inner"
                      placeholder="e.g. 8A7B6C5D4E"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white font-black uppercase tracking-[0.2em] py-6 rounded-[24px] shadow-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-[11px]"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {loading ? 'Submitting Deposit...' : 'Confirm Deposit'}
              </button>
            </motion.form>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-40"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                 <Wallet size={32} className="text-gray-300" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Please select a payment method</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
