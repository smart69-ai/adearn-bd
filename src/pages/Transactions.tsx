import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Transactions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': 
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg">
             <CheckCircle2 size={12} strokeWidth={3} />
             <span className="text-[10px] font-black uppercase tracking-widest">Settled</span>
          </div>
        );
      case 'rejected': 
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg">
             <XCircle size={12} strokeWidth={3} />
             <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
          </div>
        );
      default: 
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg">
             <Clock size={12} strokeWidth={3} />
             <span className="text-[10px] font-black uppercase tracking-widest">In Review</span>
          </div>
        );
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-white/80 backdrop-blur-xl p-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Transaction History</h1>
        </div>
        <div className="p-3 bg-gray-50 rounded-2xl">
           <Search size={18} className="text-gray-400" />
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-6 space-y-4"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-orange-600" size={40} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 opacity-40">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center">
               <History size={32} className="text-gray-300" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">No transactions found</p>
          </div>
        ) : (
          transactions.map((t) => (
            <motion.div 
              key={t.id} 
              variants={item}
              className="bg-white p-6 rounded-[32px] border border-gray-50 flex items-center justify-between shadow-sm lg:hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-14 h-14 rounded-[20px] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105",
                  t.type === 'deposit' ? 'bg-green-50 text-green-600 shadow-green-50' : 'bg-red-50 text-red-600 shadow-red-50'
                )}>
                  {t.type === 'deposit' ? <ArrowDownLeft size={24} strokeWidth={2.5} /> : <ArrowUpRight size={24} strokeWidth={2.5} />}
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-gray-900 capitalize tracking-tight">{t.type} via {t.method}</h4>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(t.status)}
                    <span className="text-[10px] font-bold text-gray-400">
                      {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Prereq...'}
                    </span>
                  </div>
                  {t.status === 'rejected' && t.rejectionReason && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-[9px] text-red-500 font-extrabold mt-1 leading-tight max-w-[180px] bg-red-50/50 p-2 rounded-xl"
                    >
                      NOTE: {t.rejectionReason}
                    </motion.p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-lg font-black tracking-tighter italic",
                  t.type === 'deposit' ? 'text-green-600' : 'text-red-500'
                )}>
                  {t.type === 'deposit' ? '+' : '-'}৳{t.amount.toLocaleString()}
                </p>
                <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest mt-1">Ref: {t.id.slice(0, 8)}</p>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
