import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Lock, Loader2, CheckCircle2, Clock, Zap, Target, Sparkles, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, handleFirestoreError } from '../contexts/AuthContext';
import { Ad, AdPlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Tasks() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAd, setViewingAd] = useState<Ad | null>(null);
  const [timer, setTimer] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [viewsToday, setViewsToday] = useState(0);
  const [plan, setPlan] = useState<AdPlan | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const adsSnap = await getDocs(collection(db, 'ads'));
        let adsData = adsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
        
        if (adsData.length === 0) {
          adsData = Array.from({ length: 15 }).map((_, i) => ({
            id: `ad${i + 1}`,
            title: `Premium Ad Node #${i + 1}`,
            rewardAmount: 5,
            durationSeconds: 15,
            imageUrl: ''
          }));
        }
        
        let dailyLimit = 1;
        let currentPlan: AdPlan | null = null;
        if (profile?.activePlanId) {
          const planDoc = await getDoc(doc(db, 'plans', profile.activePlanId));
          if (planDoc.exists()) {
            currentPlan = { id: planDoc.id, ...planDoc.data() } as AdPlan;
            setPlan(currentPlan);
            dailyLimit = currentPlan.dailyAds + 1;
          }
        }
        
        adsData = adsData.map(ad => ({
          ...ad,
          rewardAmount: currentPlan ? currentPlan.earningPerAd : ad.rewardAmount
        }));

        setAds(adsData);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const viewsSnap = await getDocs(query(
          collection(db, `users/${user.uid}/adViews`),
          where('viewedAt', '>=', today)
        ));
        setViewsToday(viewsSnap.size);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  useEffect(() => {
    let interval: any;
    if (viewingAd && timer < viewingAd.durationSeconds) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else if (viewingAd && timer >= viewingAd.durationSeconds) {
      setCanClaim(true);
    }
    return () => clearInterval(interval);
  }, [viewingAd, timer]);

  const dailyLimitValue = (plan?.dailyAds || 0) + 1;

  const startAd = (ad: Ad) => {
    if (viewsToday >= dailyLimitValue) return;
    setViewingAd(ad);
    setTimer(0);
    setCanClaim(false);
  };

  const claimReward = async () => {
    if (!user || !viewingAd || !canClaim) return;
    
    setClaiming(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/adViews`), {
        userId: user.uid,
        adId: viewingAd.id,
        earned: viewingAd.rewardAmount,
        viewedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(viewingAd.rewardAmount)
      });

      setViewsToday(prev => prev + 1);
      setViewingAd(null);
    } catch (err: any) {
      handleFirestoreError(err, 'write' as any, `users/${user.uid}`);
    } finally {
      setClaiming(false);
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
    <div className="min-h-screen bg-white pb-24 font-sans">
      <AnimatePresence>
        {viewingAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            <div className="p-6 flex justify-between items-center text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Watching Advertisement</p>
                <h3 className="text-lg font-black tracking-tight">{viewingAd.title}</h3>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-black">
                  <Clock size={14} />
                  {timer} / {viewingAd.durationSeconds}s
                </div>
                <div className="w-full h-1 bg-white/10 mt-2 rounded-full overflow-hidden">
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(timer / viewingAd.durationSeconds) * 100}%` }}
                      className="h-full bg-blue-500"
                   />
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')] opacity-10"></div>
              <div className="space-y-6 text-center z-10">
                <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto border-4 border-blue-600 animate-pulse">
                   <Play size={40} className="fill-blue-600 text-blue-600 ml-2" />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Please wait...</p>
              </div>
            </div>

            <motion.div 
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="p-8 bg-gray-900 border-t border-white/5 rounded-t-[40px] space-y-6"
            >
              {canClaim ? (
                <button 
                  onClick={claimReward}
                  disabled={claiming}
                  className="w-full bg-blue-600 text-white font-black uppercase tracking-[0.2em] py-6 rounded-[24px] shadow-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-[11px]"
                >
                  {claiming ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {claiming ? 'Processing Reward...' : `Claim ৳${viewingAd.rewardAmount.toFixed(0)} Reward`}
                </button>
              ) : (
                <div className="w-full bg-white/5 text-white/40 font-black uppercase tracking-[0.2em] py-6 rounded-[24px] text-center text-[10px] border border-white/5">
                  Complete Ad to Claim
                </div>
              )}
              <button 
                onClick={() => setViewingAd(null)}
                className="w-full text-white/30 text-[10px] font-black uppercase tracking-widest py-2 hover:text-white/60 transition-colors"
              >
                Cancel Task
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/80 backdrop-blur-xl p-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Available Tasks</h1>
        </div>
        <div className="bg-blue-600 px-4 py-2 rounded-full flex items-center gap-2">
           <Zap size={14} className="fill-white text-white" />
           <span className="text-[10px] font-black text-white uppercase tracking-widest">
             {Math.max(0, dailyLimitValue - viewsToday)} Left
           </span>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-6 space-y-8"
      >
        {!profile?.activePlanId ? (
          <motion.div 
            variants={item}
            className="bg-blue-50/50 border-2 border-blue-100 rounded-[40px] p-8 text-center space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full blur-[60px] -mr-16 -mt-16 opacity-30"></div>
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-xl shadow-blue-100 border-2 border-white relative z-10">
              ⚡
            </div>
            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-black text-blue-900 tracking-tight leading-none uppercase">Basic Member</h3>
              <p className="text-xs text-blue-700/60 font-bold uppercase tracking-widest">Upgrade to unlock more tasks</p>
            </div>
            <button 
              onClick={() => navigate('/packages')}
              className="bg-blue-600 text-white font-black uppercase tracking-[0.2em] px-10 py-5 rounded-[24px] shadow-xl shadow-blue-100 active:scale-95 transition-all text-[11px] relative z-10"
            >
              Browse Plans
            </button>
          </motion.div>
        ) : (
          <motion.div 
            variants={item}
            className="bg-gray-900 rounded-[40px] p-8 text-white flex items-center justify-between relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"></div>
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                 <Shield size={14} />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">{plan?.name || 'Verified'}</p>
              </div>
              <h3 className="text-2xl font-black tracking-tight leading-none">Task Rewards</h3>
              <p className="text-[10px] font-bold text-gray-400">Daily progress: {Math.round((viewsToday / dailyLimitValue) * 100)}% Completed</p>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center z-10">
              <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-blue-500" strokeDasharray={`${(viewsToday / dailyLimitValue) * 175.8} 175.8`} strokeLinecap="round" />
              </svg>
              <span className="text-[12px] font-black">{viewsToday}/{dailyLimitValue}</span>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Daily Feed</h2>
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                <Target size={14} />
                Live List
             </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Tasks...</p>
            </div>
          ) : ads.map((ad) => {
            const isLocked = (!profile?.activePlanId && viewsToday >= 1) || viewsToday >= dailyLimitValue;
            
            return (
              <motion.div 
                key={ad.id} 
                variants={item}
                className={cn(
                  "bg-white p-6 rounded-[32px] border flex items-center justify-between transition-all group lg:hover:shadow-xl lg:hover:border-blue-100",
                  isLocked ? "opacity-40 border-gray-50" : "border-gray-50 shadow-sm"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-[20px] flex items-center justify-center transition-all group-hover:scale-105",
                    isLocked ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-500 shadow-lg shadow-blue-50"
                  )}>
                    {isLocked ? <Lock size={22} strokeWidth={2.5} /> : <Play size={22} fill="currentColor" strokeWidth={0} />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">{ad.title}</h4>
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                         ৳{ad.rewardAmount.toFixed(0)}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Payout Verified</span>
                    </div>
                  </div>
                </div>
                
                {!isLocked && (
                  <button 
                    onClick={() => startAd(ad)}
                    className="bg-gray-900 text-white text-[10px] uppercase font-black px-6 py-4 rounded-[20px] shadow-2xl shadow-gray-200 active:scale-95 transition-all outline-none"
                  >
                    Start
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
