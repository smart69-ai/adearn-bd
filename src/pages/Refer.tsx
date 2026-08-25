import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Share2, Users, ArrowRight, Check, Gift, Sparkles, Trophy, ShieldCheck, History, Loader2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Refer() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referrals, setReferrals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchReferrals() {
      if (!profile?.referralCode) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('referredBy', '==', profile.referralCode)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => doc.data() as UserProfile);
        setReferrals(list);
      } catch (err) {
        console.error('Error fetching referrals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
  }, [profile?.referralCode]);

  const handleCopy = () => {
    if (!profile?.referralCode) return;
    navigator.clipboard.writeText(profile.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!profile?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${profile.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const referralCode = profile?.referralCode || "------";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <div className="bg-white/80 backdrop-blur-xl p-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight text-center flex-1 pr-10">Refer & Earn</h1>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-6 space-y-10"
      >
        <motion.div 
          variants={item}
          className="bg-gray-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500 rounded-full blur-[80px] -mr-20 -mt-20 opacity-20"></div>
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-600/20">
              <Gift size={28} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight leading-none italic uppercase">Refer Friends & Earn</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Invite friends and earn a <span className="text-orange-500">৳120</span> bonus when they sign up and activate an earning plan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
               <Trophy size={14} className="text-orange-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Referral Partner Program</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Your Referral Link & Code</h3>
          <div className="bg-white p-8 rounded-[40px] border border-gray-50 flex flex-col gap-8 shadow-xl shadow-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0"></div>
            
            {/* Referral Code Box */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Your Referral Code</span>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100/50">
                <div className="flex-1 text-center sm:text-left">
                  <span className="text-2xl font-black text-gray-900 tracking-[0.2em] uppercase italic px-4">
                    {referralCode}
                  </span>
                </div>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-6 rounded-2xl transition-all font-black uppercase tracking-wider text-[10px] shadow-md active:scale-95",
                    copied 
                      ? 'bg-green-500 text-white shadow-green-100' 
                      : 'bg-gray-900 text-white shadow-gray-200'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                        <Check size={14} strokeWidth={4} />
                        <span>Copied!</span>
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                        <Copy size={14} strokeWidth={2.5} />
                        <span>Copy Code</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <span className="relative bg-white px-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">OR</span>
            </div>

            {/* Referral Link Box */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Direct Referral Link</span>
              <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100/50">
                <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[11px] font-mono text-gray-500 break-all select-all text-center sm:text-left">
                  {`${window.location.origin}/register?ref=${referralCode}`}
                </div>
                <button 
                  onClick={handleCopyLink}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all font-black uppercase tracking-wider text-[10px] shadow-md active:scale-95",
                    copiedLink
                      ? 'bg-green-500 text-white shadow-green-100' 
                      : 'bg-orange-500 text-white shadow-orange-100'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {copiedLink ? (
                      <motion.div key="checkLink" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                        <Check size={14} strokeWidth={4} />
                        <span>Link Copied!</span>
                      </motion.div>
                    ) : (
                      <motion.div key="copyLink" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                        <Share2 size={14} strokeWidth={2.5} />
                        <span>Copy Link</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">My Referrals</h3>
            <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1 rounded-full">
              <History size={12} className="text-orange-600" />
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{referrals.length} Joined</span>
            </div>
          </div>
          
          <div className="bg-white rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-orange-600" size={32} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Referrals...</p>
              </div>
            ) : referrals.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {referrals.map((ref) => (
                  <div key={ref.uid} className="p-6 flex items-center justify-between transition-colors hover:bg-gray-50/50 group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-900 font-black text-xl shadow-inner group-hover:bg-white transition-colors">
                        {ref.name.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-gray-900 tracking-tight">{ref.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {ref.activePlanId ? (
                        <div className="space-y-1">
                          <p className="text-sm font-black text-green-600 italic">+৳120</p>
                          <div className="flex items-center justify-end gap-1 text-[9px] font-black text-green-500 uppercase tracking-widest">
                             <ShieldCheck size={10} />
                             Active
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-300 italic">+৳0</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center space-y-6 opacity-40">
                <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto">
                  <Users size={40} className="text-gray-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">No Referrals Yet</p>
                  <p className="text-xs text-gray-400 font-medium italic">Share your referral link with friends to start earning bonuses.</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-gray-50 rounded-[40px] p-10 space-y-8">
          <div className="space-y-1">
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">How It Works</h3>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Follow these steps to earn referral rewards</p>
          </div>
          <div className="space-y-8 relative">
             <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200/50"></div>
            {[
              { icon: <Share2 size={14} />, text: "Share your referral code or link with friends." },
              { icon: <Users size={14} />, text: "Friends sign up using your unique link." },
              { icon: <Zap size={14} strokeWidth={3} className="fill-orange-500 text-orange-500" />, text: "They activate any membership earning plan." },
              { icon: <Gift size={14} />, text: "৳120 bonus is instantly added to your account balance." },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6 relative z-10">
                <div className="w-6 h-6 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                  {item.icon}
                </div>
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
