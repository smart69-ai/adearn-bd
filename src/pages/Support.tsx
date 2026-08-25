import React, { useState, useEffect } from 'react';
import { ArrowLeft, Headphones, ChevronDown, CheckCircle2, Ticket, Clock, MessageSquare, Zap, Shield, Search, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type Tab = 'new' | 'my';

interface SupportTicket {
  id: string;
  category: string;
  message: string;
  status: 'pending' | 'open' | 'closed';
  createdAt: any;
  reply?: string;
}

export default function Support() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [fetchingTickets, setFetchingTickets] = useState(false);
  
  const [formData, setFormData] = useState({
    category: 'Deposit Problem',
    message: ''
  });

  useEffect(() => {
    if (activeTab === 'my' && profile) {
      fetchTickets();
    }
  }, [activeTab, profile]);

  const fetchTickets = async () => {
    if (!profile) return;
    setFetchingTickets(true);
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', profile.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTickets(data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setFetchingTickets(false);
    }
  };

  const categories = [
    'Deposit Problem',
    'Withdrawal Problem',
    'Task/Ads Issue',
    'Account Security',
    'Package Inquiry',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: profile.uid,
        userName: profile.name,
        userPhone: profile.phone,
        category: formData.category,
        message: formData.message,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setSuccess(true);
      setFormData({ category: 'Deposit Problem', message: '' });
      setTimeout(() => setSuccess(false), 3000);
      if (activeTab === 'my') fetchTickets();
    } catch (err: any) {
      handleFirestoreError(err, 'write' as any, 'support_tickets');
    } finally {
      setLoading(false);
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
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <div className="bg-white/80 backdrop-blur-xl p-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Customer Support</h1>
        </div>
        <div className="p-3 bg-gray-50 rounded-2xl">
           <Headphones size={18} className="text-gray-400" />
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-6 space-y-8"
      >
        <motion.div 
          variants={item}
          className="bg-gray-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500 rounded-full blur-[80px] -mr-20 -mt-20 opacity-20"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
               <Zap size={14} className="fill-emerald-500" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">24/7 Support Desk</p>
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-none italic uppercase">How Can We Help?</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Submit a support ticket and our team will get back to you promptly.
            </p>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-gray-50 p-1.5 rounded-[24px] flex gap-1 border border-gray-100 shadow-inner">
          <button 
            onClick={() => setActiveTab('new')}
            className={cn(
              "flex-1 py-4 rounded-[20px] font-black uppercase tracking-[0.2em] text-[10px] transition-all",
              activeTab === 'new' 
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100' 
                : 'text-gray-400'
            )}
          >
            New Ticket
          </button>
          <button 
            onClick={() => setActiveTab('my')}
            className={cn(
              "flex-1 py-4 rounded-[20px] font-black uppercase tracking-[0.2em] text-[10px] transition-all",
              activeTab === 'my' 
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100' 
                : 'text-gray-400'
            )}
          >
            My Tickets
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'new' ? (
            <motion.form 
              key="form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onSubmit={handleSubmit} 
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Name</label>
                    <div className="bg-gray-50 rounded-[20px] p-4 text-gray-900 font-black text-xs uppercase shadow-inner border border-gray-100 truncate">
                      {profile?.name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone</label>
                    <div className="bg-gray-50 rounded-[20px] p-4 text-gray-900 font-black text-xs uppercase shadow-inner border border-gray-100 truncate">
                      {profile?.phone}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                  <div className="relative">
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-white border border-gray-50 rounded-[24px] py-5 px-6 font-black text-gray-900 shadow-xl shadow-gray-100 appearance-none focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all uppercase text-[11px] tracking-tight"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                      <ChevronDown size={20} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Message</label>
                  <div className="bg-white border border-gray-50 rounded-[32px] p-6 shadow-xl shadow-gray-100 focus-within:ring-4 focus-within:ring-emerald-50/50 transition-all">
                    <textarea 
                      required
                      placeholder="Describe your issue or question in detail..."
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows={5}
                      className="w-full bg-transparent font-medium text-gray-900 placeholder:text-gray-300 outline-none resize-none text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || success}
                className={cn(
                  "w-full py-6 rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95",
                  success 
                    ? 'bg-green-500 text-white shadow-green-100' 
                    : 'bg-gray-900 text-white shadow-gray-200 hover:bg-black disabled:opacity-50'
                )}
              >
                {success ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                    <CheckCircle2 size={18} strokeWidth={4} />
                    <span>Ticket Submitted</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    <span>{loading ? "Submitting..." : "Submit Ticket"}</span>
                  </div>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {fetchingTickets ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <Loader2 className="animate-spin text-emerald-500" size={40} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Loading Tickets...</p>
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-6">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-xl shadow-gray-100 space-y-4 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 rounded-xl">
                            <MessageSquare size={14} className="text-gray-900" />
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{ticket.category}</span>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic shadow-sm",
                          ticket.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                          ticket.status === 'open' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-400'
                        )}>
                          {ticket.status}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-800 leading-relaxed">{ticket.message}</p>
                      
                      {ticket.reply && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-950 p-5 rounded-[24px] border border-emerald-900/20 shadow-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 bg-emerald-500 rounded-lg">
                              <Shield size={10} className="text-emerald-950" />
                            </div>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">Support Reply</span>
                          </div>
                          <p className="text-xs font-medium text-gray-200 leading-relaxed">{ticket.reply}</p>
                        </motion.div>
                      )}
                      
                      <div className="pt-2 flex items-center justify-between border-t border-gray-50">
                        <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">
                           Ticket #{ticket.id.slice(0, 8)}
                        </p>
                        <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">
                          {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-20 rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 text-center space-y-6 opacity-40">
                  <div className="w-24 h-24 bg-gray-50 text-gray-300 rounded-[32px] flex items-center justify-center mx-auto">
                    <Clock size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">No Tickets</h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">You haven't submitted any support tickets yet.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
