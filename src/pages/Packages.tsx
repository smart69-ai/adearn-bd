import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, query, where, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, handleFirestoreError } from '../contexts/AuthContext';
import { AdPlan } from '../types';
import { Check, Loader2, AlertCircle, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Packages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<AdPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'plans'));
        const plansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdPlan));

        if (plansData.length === 0) {
          const defaults = [
            { id: 'standard', name: 'Standard Plan', price: 500, dailyAds: 10, earningPerAd: 5, durationDays: 30, description: 'Basic earning plan' },
            { id: 'premium', name: 'Premium Plan', price: 2000, dailyAds: 25, earningPerAd: 10, durationDays: 30, description: 'High yield earning plan' }
          ];
          
          for (const d of defaults) {
            await setDoc(doc(db, 'plans', d.id), d);
          }
          
          setPlans(defaults as AdPlan[]);
        } else {
          setPlans(plansData);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleBuy = async (plan: AdPlan) => {
    if (!user || !profile) return;
    
    if (profile.balance < plan.price) {
      setError('Insufficient balance in your wallet');
      return;
    }

    setBuying(plan.id);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(-plan.price),
        activePlanId: plan.id
      });

      if (profile.referredBy) {
        const referrersQuery = query(
          collection(db, 'users'),
          where('referralCode', '==', profile.referredBy)
        );
        const referrerSnap = await getDocs(referrersQuery);
        
        if (!referrerSnap.empty) {
          const referrerDoc = referrerSnap.docs[0];
          await updateDoc(referrerDoc.ref, {
            balance: increment(120)
          });

          await addDoc(collection(db, 'transactions'), {
            userId: referrerDoc.id,
            amount: 120,
            type: 'deposit',
            method: 'system',
            accountNumber: 'Referral Bonus',
            status: 'completed',
            createdAt: serverTimestamp()
          });
        }
      }
      
      navigate('/');
    } catch (err: any) {
      handleFirestoreError(err, 'update' as any, `users/${user.uid}`);
    } finally {
      setBuying(null);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 space-y-8 pb-10"
    >
      <motion.div variants={item} className="space-y-2 px-2 pt-4">
        <div className="flex items-center gap-2 text-blue-600">
           <Zap size={20} className="fill-blue-600" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Investment Selection</p>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">Market Plans</h1>
        <p className="text-xs text-gray-400 font-medium">Choose a package that fits your investment goals.</p>
      </motion.div>
      
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 text-red-600 rounded-3xl border border-red-100 flex items-center gap-3 text-xs font-bold mx-2 shadow-sm"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div id="plans-list" className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-orange-600" size={40} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Loading Market Data...</p>
          </div>
        ) : plans.map((plan) => (
          <motion.div 
            key={plan.id} 
            variants={item}
            whileHover={{ y: -4 }}
            className={cn(
              "relative bg-white p-8 rounded-[40px] border shadow-sm transition-all overflow-hidden",
              profile?.activePlanId === plan.id ? "border-blue-200 ring-4 ring-blue-50/50 shadow-xl" : "border-gray-100"
            )}
          >
            {profile?.activePlanId === plan.id && (
              <div className="absolute top-0 right-0 p-6">
                 <div className="bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-blue-200">
                   Subscribed
                 </div>
              </div>
            )}

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                 <div className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                   plan.price > 1000 ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                 )}>
                   {plan.price > 1000 ? <Sparkles size={24} /> : <TrendingUp size={24} />}
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none">{plan.name}</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Tier Level {plan.price > 1000 ? 'Gold' : 'Basic'}</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Daily Tasks</p>
                  <p className="text-xl font-black text-gray-900 leading-none">{plan.dailyAds}</p>
                </div>
                <div className="bg-emerald-50/30 p-5 rounded-3xl border border-emerald-100/50">
                  <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-2">Daily Return</p>
                  <p className="text-xl font-black text-emerald-600 leading-none">৳{plan.dailyAds * plan.earningPerAd}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Entry Fee</p>
                   <p className="text-3xl font-black text-gray-900 tracking-tighter">৳{plan.price.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handleBuy(plan)}
                  disabled={!!buying || profile?.activePlanId === plan.id}
                  className={cn(
                    "px-10 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50",
                    profile?.activePlanId === plan.id 
                      ? "bg-emerald-600 text-white shadow-emerald-200" 
                      : "bg-gray-900 text-white shadow-gray-200"
                  )}
                >
                  {buying === plan.id ? <Loader2 size={16} className="animate-spin" /> : profile?.activePlanId === plan.id ? <Check size={18} strokeWidth={3} /> : 'Purchase'}
                </button>
              </div>
            </div>

            {/* Subtle card background pattern */}
            <div className="absolute bottom-0 right-0 opacity-[0.03] group-hover:opacity-[0.05] pointer-events-none -mr-10 -mb-10 transition-opacity">
               <Zap size={150} />
            </div>
          </motion.div>
        ))}
      </div>
      
      <motion.div variants={item} className="mx-2 bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
          <AlertCircle size={20} />
        </div>
        <p className="text-[10px] font-bold text-gray-400 leading-tight">
          Payments are handled securely. All plans are active for <strong>{plans[0]?.durationDays || 30} days</strong> from the date of purchase.
        </p>
      </motion.div>
    </motion.div>
  );
}
