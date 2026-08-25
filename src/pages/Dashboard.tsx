import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Logo from '../components/Logo';
import { HelpCircle, ArrowUpRight, ArrowDownLeft, Calendar, Users, Briefcase, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'offers'));
        if (snap.exists()) {
          setOffers(snap.data().offers || []);
        } else {
          setOffers([
            { id: '1', title: 'Earn Bonus Rewards', description: 'Watch premium video ads to earn double today!', tag: 'Sponsored', color: 'from-orange-500 to-red-600' },
            { id: '2', title: 'Weekly Special', description: 'Complete 50 tasks this week to win ৳100 extra.', tag: 'Featured', color: 'from-blue-600 to-indigo-700' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching offers:', err);
      }
    }
    fetchOffers();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 space-y-8 pb-10"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between px-2 pt-2">
        <Logo iconSize={24} textSize="text-2xl" />
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/support')}
            className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:border-orange-100 transition-all active:scale-90"
          >
            <HelpCircle size={22} />
          </button>
          <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 font-black">
            ৳
          </div>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div 
        variants={item}
        whileHover={{ scale: 1.01 }}
        id="balance-card" 
        className="relative overflow-hidden bg-white rounded-[40px] p-8 text-gray-900 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-transform"
      >
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 mb-2">
            <Zap size={14} className="text-blue-500 fill-blue-500" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Total Balance</p>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tight flex items-center justify-center gap-1">
              <span className="text-2xl font-medium text-gray-400">৳</span>
              {profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
              <span className="text-xl font-medium text-gray-300">.00</span>
            </h1>
          </div>

          <div className="bg-gray-50/80 w-full rounded-[24px] p-5 flex justify-between items-center group cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate('/tasks')}>
             <div className="text-left">
                <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Tasks Completed</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-lg font-black text-gray-900">{profile?.completedTasks || 0}</p>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">+ Today</span>
                </div>
             </div>
             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowUpRight size={18} className="text-gray-400" />
             </div>
          </div>
        </div>
      </motion.div>
      
      {/* Action Buttons Grid */}
      <motion.div variants={item} id="action-buttons" className="grid grid-cols-4 gap-4">
        {[
          { label: 'Deposit', icon: ArrowUpRight, color: 'text-emerald-600 bg-emerald-50', path: '/deposit' },
          { label: 'Withdraw', icon: ArrowDownLeft, color: 'text-rose-600 bg-rose-50', path: '/withdraw' },
          { label: 'Earn', icon: Briefcase, color: 'text-blue-600 bg-blue-50', path: '/tasks' },
          { label: 'Network', icon: Users, color: 'text-indigo-600 bg-indigo-50', path: '/refer' },
        ].map((action) => (
          <button
            key={action.label}
            id={`action-${action.label.toLowerCase()}`}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2.5 group"
          >
            <div className={`w-full aspect-square ${action.color} rounded-[24px] flex items-center justify-center shadow-sm border border-transparent group-hover:shadow-md transition-all active:scale-95`}>
              <action.icon size={22} className="" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Exclusive Offers Slider */}
      <motion.div variants={item} id="ads-section" className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Today's Deals</h2>
          <button className="text-orange-600 text-xs font-black uppercase tracking-widest hover:underline px-2">View All</button>
        </div>
        
        <div className="flex gap-5 overflow-x-auto pb-6 px-1 scrollbar-hide snap-x">
          {offers.map((offer) => (
            <motion.div 
              key={offer.id} 
              whileTap={{ scale: 0.98 }}
              className={`min-w-[88%] aspect-[16/10] bg-gradient-to-br ${offer.color || 'from-gray-900 to-gray-800'} rounded-[40px] p-8 text-white flex flex-col justify-between snap-start shadow-xl shadow-gray-200 group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={100} />
              </div>
              
              <div className="flex justify-between items-start">
                <span className="bg-white/20 backdrop-blur-md text-[9px] uppercase font-black tracking-widest px-3 py-1 rounded-full border border-white/20">{offer.tag}</span>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <ArrowUpRight size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black leading-tight">{offer.title}</h3>
                <p className="text-[11px] text-white/70 font-medium leading-relaxed max-w-[80%] line-clamp-2">{offer.description}</p>
              </div>
            </motion.div>
          ))}
          {offers.length === 0 && (
             <div className="min-w-[88%] aspect-[16/10] bg-white rounded-[40px] p-8 text-gray-300 flex flex-col items-center justify-center snap-start border border-dashed border-gray-200">
               <Briefcase size={40} className="mb-4 opacity-20" />
               <p className="text-sm font-bold uppercase tracking-widest">No active offers</p>
             </div>
          )}
        </div>
      </motion.div>

      {/* Daily Motivation/Stats Bar */}
      <motion.div 
        variants={item}
        className="mx-2 bg-gradient-to-r from-orange-50 to-orange-100/50 p-6 rounded-[32px] border border-orange-100 flex items-center gap-4 shadow-sm"
      >
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
           <Zap size={24} className="fill-orange-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Level Up Fast</p>
          <p className="text-[10px] text-gray-500 font-medium leading-tight">Upgrade your package to unlock high-yield tasks instantly.</p>
        </div>
        <button 
          onClick={() => navigate('/packages')}
          className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-2xl active:scale-95 transition-transform shadow-lg shadow-gray-900/20"
        >
          GO
        </button>
      </motion.div>
    </motion.div>
  );
}
