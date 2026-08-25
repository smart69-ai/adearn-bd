import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, Edit3, LogOut, ChevronRight, ShieldCheck, History, Gift, Scale, Headset, Hash, User } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationPrefs } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '' });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const startEditing = () => {
    setEditData({
      name: profile?.name || '',
      phone: profile?.phone || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving('profile');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editData.name,
        phone: editData.phone
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(null);
    }
  };

  const togglePreference = async (key: keyof NotificationPrefs) => {
    if (!user || !profile) return;
    
    setSaving(key);
    try {
      const currentPrefs = profile.notificationPrefs || { withdrawals: true, newAds: true };
      const newPrefs = {
        ...currentPrefs,
        [key]: !currentPrefs[key]
      };
      
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPrefs: newPrefs
      });
    } catch (error) {
      console.error("Error updating pref:", error);
    } finally {
      setSaving(null);
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
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 pb-28 space-y-8 max-w-lg mx-auto"
    >
      {/* Profile Header Card */}
      <motion.div variants={item} className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative group">
            <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-5xl text-blue-600 font-black border-4 border-white shadow-xl capitalize transition-transform group-hover:scale-105">
              {profile?.name ? profile.name[0] : 'U'}
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="editing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full mt-8 space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Full Name</label>
                  <input 
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full text-center text-lg font-bold text-gray-900 bg-gray-50 border-none rounded-3xl p-4 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Phone Number</label>
                  <input 
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full text-center text-gray-600 font-bold bg-gray-50 border-none rounded-3xl p-4 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    placeholder="Phone Number"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                   <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-black uppercase tracking-widest rounded-3xl text-[10px] active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving === 'profile'}
                    className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-3xl text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                  >
                    {saving === 'profile' && <Loader2 size={14} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-6 space-y-2"
              >
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{profile?.name || 'User Name'}</h2>
                <p className="text-gray-400 font-bold tracking-wide flex items-center justify-center gap-2">
                  <User size={14} className="text-blue-400" />
                  {profile?.phone || '01XXXXXXXXX'}
                </p>
                <button 
                  onClick={startEditing}
                  className="flex items-center gap-2 mx-auto text-[10px] font-black text-blue-600 uppercase tracking-widest mt-6 px-6 py-2 bg-blue-50 hover:bg-blue-100 rounded-full transition-all active:scale-95"
                >
                  <Edit3 size={12} />
                  Edit Profile
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Stats Quick View */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4">
        {[
          { label: 'Net Assets', value: `৳${profile?.balance?.toLocaleString() || '0'}`, icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Referrals', value: profile?.referralCount || '0', icon: User, color: 'text-blue-600 bg-blue-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-1">
             <div className="flex items-center justify-between mb-2">
               <div className={`p-2 rounded-xl ${stat.color}`}>
                 <stat.icon size={18} strokeWidth={2.5} />
               </div>
               <ChevronRight size={14} className="text-gray-300" />
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
             <p className="text-xl font-black text-gray-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Settings Sections */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Bell className="text-blue-600" size={20} strokeWidth={2.5} />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none">Settings</h3>
        </div>
        
        <div className="bg-white rounded-[40px] p-2 border border-gray-100 shadow-sm overflow-hidden">
          {[
            { key: 'withdrawals', label: 'Payment Alerts', desc: 'Real-time order notifications' },
            { key: 'newAds', label: 'Market Alerts', desc: 'New investment opportunity pings' }
          ].map((pref, i) => (
            <div key={i} className={cn(
              "flex items-center justify-between p-6 transition-colors",
              i === 0 ? "border-b border-gray-50" : ""
            )}>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-800">{pref.label}</p>
                <p className="text-[11px] text-gray-400 font-medium">{pref.desc}</p>
              </div>
              <button 
                onClick={() => togglePreference(pref.key as keyof NotificationPrefs)}
                disabled={!!saving}
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none",
                  (profile?.notificationPrefs?.[pref.key as keyof NotificationPrefs] ?? true) ? "bg-blue-600 shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300",
                  (profile?.notificationPrefs?.[pref.key as keyof NotificationPrefs] ?? true) ? "translate-x-6" : "translate-x-1"
                )} />
                {saving === pref.key && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-full">
                    <Loader2 className="animate-spin text-white" size={12} />
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Link List */}
      <motion.div variants={item} className="bg-white rounded-[40px] p-2 shadow-sm border border-gray-100 overflow-hidden">
        {[
          { icon: History, label: 'Withdraw History', path: '/transactions', color: 'text-indigo-600 bg-indigo-50' },
          { icon: Gift, label: 'Refer & Earn', path: '/refer', color: 'text-pink-600 bg-pink-50' },
          { icon: Scale, label: 'Agreements', path: '/terms', color: 'text-emerald-600 bg-emerald-50' },
          { icon: Headset, label: 'Customer Support', path: '/support', color: 'text-sky-600 bg-sky-50' },
          { 
            icon: LogOut, 
            label: 'Sign Out Account', 
            color: 'text-red-600 bg-red-50', 
            onClick: handleLogout,
            isLast: true
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.onClick || (() => item.path && navigate(item.path))}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 rounded-[28px] transition-all group active:scale-98"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl transition-transform group-hover:rotate-6", item.color)}>
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <span className={cn("text-xs font-black uppercase tracking-widest text-gray-700")}>{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </motion.div>
      
      { (profile?.isAdmin || user?.email === 'sonjitkumar051@gmail.com') && (
        <motion.button 
          variants={item}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin')}
          className="w-full bg-gray-900 text-white font-black uppercase tracking-widest p-6 rounded-[32px] shadow-2xl shadow-gray-200 border border-gray-800 flex items-center justify-center gap-3 mt-4"
        >
          <ShieldCheck size={20} className="text-orange-500" />
          Admin Dashboard
        </motion.button>
      )}

      <motion.p variants={item} className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em] pt-4">
        Ad Earn BD • Established 2024
      </motion.p>
    </motion.div>
  );
}
