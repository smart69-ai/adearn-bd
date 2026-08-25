import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash, CheckCircle, XCircle, Loader2, Plus, Edit, Save, Search, User, History, Ban, Unlock, DollarSign, X, Calendar, Zap, Shield, PieChart, Activity, Settings as SettingsIcon, MessageSquare, Headphones, Send, CornerDownRight, Check, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc, setDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, handleFirestoreError } from '../contexts/AuthContext';
import { Transaction, UserProfile, AdPlan, SupportTicket } from '../types';
import { cn } from '../lib/utils';
import Logo from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';

export default function Admin() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'support' | 'users' | 'plans' | 'settings'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [plans, setPlans] = useState<AdPlan[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'pending' | 'open' | 'closed'>('all');
  const [replyInputs, setReplyInputs] = useState<{ [ticketId: string]: string }>({});
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [paymentNumbers, setPaymentNumbers] = useState({ 
    bkash: '', 
    nagad: '', 
    minDeposit: 100,
    maxDeposit: 25000,
    minWithdraw: 200,
    maxWithdraw: 10000,
    withdrawalLimitPerTx: 1000,
    withdrawalLimitPerDay: 5000
  });
  const [exclusiveOffers, setExclusiveOffers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserTransactions, setSelectedUserTransactions] = useState<Transaction[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newBalance, setNewBalance] = useState<string>('');
  const [isDeactivationModalOpen, setIsDeactivationModalOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<AdPlan> | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });

  useEffect(() => {
    if (!profile?.isAdmin && user?.email !== 'sonjitkumar051@gmail.com') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Pending Transactions
        const qTransactions = query(collection(db, 'transactions'), where('status', '==', 'pending'));
        const transactionsSnap = await getDocs(qTransactions);
        const transList = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(transList);

        // Fetch Plans
        const plansSnap = await getDocs(collection(db, 'plans'));
        const plansList = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdPlan));
        setPlans(plansList);

        // Fetch Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'payment'));
        if (settingsSnap.exists()) {
          setPaymentNumbers(settingsSnap.data() as any);
        }

        const offersSnap = await getDoc(doc(db, 'settings', 'offers'));
        if (offersSnap.exists()) {
          setExclusiveOffers(offersSnap.data().offers || []);
        } else {
          // Default offers if none exist
          setExclusiveOffers([
            { id: '1', title: 'Earn Bonus Rewards', description: 'Watch premium video ads to earn double today!', tag: 'Sponsored' },
            { id: '2', title: 'Weekly Special', description: 'Complete 50 tasks this week to win ৳100 extra.', tag: 'Featured' }
          ]);
        }

        // Calculate pending stats from fetched list
        const pDep = transList.filter(t => t.type === 'deposit').length;
        const pWid = transList.filter(t => t.type === 'withdraw').length;

        // Fetch Support Tickets
        try {
          const ticketsSnap = await getDocs(collection(db, 'support_tickets'));
          const ticketsList = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setSupportTickets(ticketsList);
        } catch (ticketErr) {
          console.error("Error fetching support tickets:", ticketErr);
        }

        // Fetch User Stats
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setUsers(usersList);
        
        let totalBal = 0;
        usersList.forEach(u => {
          totalBal += (u.balance || 0);
        });

        setStats({
          totalUsers: usersList.length,
          totalBalance: totalBal,
          pendingDeposits: pDep,
          pendingWithdrawals: pWid
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, navigate]);

  const handleStatusUpdate = async (transaction: Transaction, newStatus: 'completed' | 'rejected', reason?: string) => {
    setProcessing(transaction.id);
    try {
      // 1. Update Transaction Status
      const updates: any = { status: newStatus };
      if (reason) updates.rejectionReason = reason;
      await updateDoc(doc(db, 'transactions', transaction.id), updates);

      // 2. If Deposit and Completed, Update User Balance
      if (transaction.type === 'deposit' && newStatus === 'completed') {
        const userRef = doc(db, 'users', transaction.userId);
        await updateDoc(userRef, { 
          balance: increment(transaction.amount),
          hasDeposited: true
        });
        
        // Handle referral bonus if applicable
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() as UserProfile;
        if (userData.referredBy) {
           // Find referrer and give bonus (simplified: find user with referralCode == referredBy)
           const referrersQ = query(collection(db, 'users'), where('referralCode', '==', userData.referredBy));
           const referrersSnap = await getDocs(referrersQ);
           if (!referrersSnap.empty) {
             const referrerDoc = referrersSnap.docs[0];
             await updateDoc(doc(db, 'users', referrerDoc.id), { balance: increment(20) });
           }
        }
      }

      // 3. If Withdraw and Rejected, Refund User Balance (Already deducted during request in a strict system, but here we just process pending)
      // Note: In our current implementation we don't deduct during request for simplicity, so just mark as completed.
      // In a real app we'd deduct during request and refund during rejection.

      setTransactions(prev => prev.filter(t => t.id !== transaction.id));
      setStats(prev => ({
        ...prev,
        totalBalance: (transaction.type === 'deposit' && newStatus === 'completed') ? prev.totalBalance + transaction.amount : prev.totalBalance,
        pendingDeposits: (transaction.type === 'deposit') ? prev.pendingDeposits - 1 : prev.pendingDeposits,
        pendingWithdrawals: (transaction.type === 'withdraw') ? prev.pendingWithdrawals - 1 : prev.pendingWithdrawals
      }));
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `transactions/${transaction.id}`);
    } finally {
      setProcessing(null);
    }
  };

  const checkAndProcessLimitViolations = async () => {
    const withdrawals = transactions.filter(t => t.type === 'withdraw');
    if (withdrawals.length === 0) {
      alert('No pending withdrawals to check.');
      return;
    }

    setLoading(true);
    let rejectedCount = 0;

    try {
      for (const t of withdrawals) {
        let shouldReject = false;
        let reason = '';

        // 1. Check Per Transaction Limit
        if (t.amount > paymentNumbers.withdrawalLimitPerTx) {
          shouldReject = true;
          reason = `Withdrawal amount (৳${t.amount}) exceeds the per-transaction limit of ৳${paymentNumbers.withdrawalLimitPerTx}.`;
        }

        // 2. Check Daily Limit (requires fetching user's transactions for today)
        if (!shouldReject) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const q = query(
            collection(db, 'transactions'),
            where('userId', '==', t.userId),
            where('type', '==', 'withdraw'),
            where('status', '==', 'completed')
          );
          const snap = await getDocs(q);
          const completedToday = snap.docs
            .map(doc => doc.data() as Transaction)
            .filter(trans => trans.createdAt?.toDate() >= today);
          
          const totalToday = completedToday.reduce((sum, current) => sum + current.amount, 0);
          
          if (totalToday + t.amount > paymentNumbers.withdrawalLimitPerDay) {
            shouldReject = true;
            reason = `Withdrawal would exceed your daily limit of ৳${paymentNumbers.withdrawalLimitPerDay}. You have already withdrawn ৳${totalToday} today.`;
          }
        }

        if (shouldReject) {
          await handleStatusUpdate(t, 'rejected', reason);
          rejectedCount++;
        }
      }

      if (rejectedCount > 0) {
        alert(`Successfully auto-rejected ${rejectedCount} withdrawal(s) for exceeding limits.`);
      } else {
        alert('No limit violations found.');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing violations.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentNumbers);
      await setDoc(doc(db, 'settings', 'offers'), { offers: exclusiveOffers });
      alert('Settings updated successfully');
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan?.name || !editingPlan?.price) return;
    
    setLoading(true);
    try {
      const planId = editingPlan.id || `plan-${Date.now()}`;
      const planData = {
        ...editingPlan,
        id: planId,
        price: Number(editingPlan.price),
        dailyAds: Number(editingPlan.dailyAds),
        earningPerAd: Number(editingPlan.earningPerAd),
        durationDays: Number(editingPlan.durationDays) || 30
      };

      await setDoc(doc(db, 'plans', planId), planData);
      
      setPlans(prev => {
        const index = prev.findIndex(p => p.id === planId);
        if (index >= 0) {
          const newPlans = [...prev];
          newPlans[index] = planData as AdPlan;
          return newPlans;
        }
        return [...prev, planData as AdPlan];
      });
      
      setIsPlanModalOpen(false);
      setEditingPlan(null);
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'plans');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (u: UserProfile) => {
    setSelectedUser(u);
    setNewBalance(u.balance.toString());
    setLoading(true);
    try {
      const q = query(
        collection(db, 'transactions'), 
        where('userId', '==', u.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setSelectedUserTransactions(list);
      setIsUserModalOpen(true);
    } catch (err) {
      handleFirestoreError(err, 'list' as any, `transactions for ${u.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;
    const balance = parseFloat(newBalance);
    if (isNaN(balance)) return;

    setProcessing(selectedUser.uid);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), { balance });
      setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, balance } : u));
      setSelectedUser(prev => prev ? { ...prev, balance } : null);
      alert('Balance updated successfully');
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `users/${selectedUser.uid}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleDeactivation = async () => {
    if (!selectedUser) return;
    
    // If we are about to deactivate, open the reason modal first
    if (!selectedUser.isDeactivated) {
      setIsDeactivationModalOpen(true);
      setDeactivationReason('');
      return;
    }

    // If activating, just do it
    setProcessing(selectedUser.uid);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), { 
        isDeactivated: false,
        deactivationReason: null
      });
      setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, isDeactivated: false, deactivationReason: undefined } : u));
      setSelectedUser(prev => prev ? { ...prev, isDeactivated: false, deactivationReason: undefined } : null);
      alert('Account activated successfully');
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `users/${selectedUser.uid}`);
    } finally {
      setProcessing(null);
    }
  };

  const confirmDeactivation = async () => {
    if (!selectedUser || !deactivationReason.trim()) return;

    setProcessing(selectedUser.uid);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), { 
        isDeactivated: true,
        deactivationReason: deactivationReason.trim()
      });
      setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, isDeactivated: true, deactivationReason: deactivationReason.trim() } : u));
      setSelectedUser(prev => prev ? { ...prev, isDeactivated: true, deactivationReason: deactivationReason.trim() } : null);
      setIsDeactivationModalOpen(false);
      alert('Account deactivated successfully');
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `users/${selectedUser.uid}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    
    setProcessing(planId);
    try {
      await deleteDoc(doc(db, 'plans', planId));
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      handleFirestoreError(err, 'delete' as any, `plans/${planId}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const replyText = replyInputs[ticketId]?.trim();
    if (!replyText) return;
    setReplyingTicketId(ticketId);
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        reply: replyText,
        status: 'open',
        repliedAt: serverTimestamp()
      });
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, reply: replyText, status: 'open', repliedAt: new Date() } : t));
      setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `support_tickets/${ticketId}`);
    } finally {
      setReplyingTicketId(null);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: 'pending' | 'open' | 'closed') => {
    setProcessing(ticketId);
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status });
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `support_tickets/${ticketId}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this support message?')) return;
    setProcessing(ticketId);
    try {
      await deleteDoc(doc(db, 'support_tickets', ticketId));
      setSupportTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (err) {
      handleFirestoreError(err, 'delete' as any, `support_tickets/${ticketId}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleRefreshTickets = async () => {
    setLoading(true);
    try {
      const ticketsSnap = await getDocs(collection(db, 'support_tickets'));
      const ticketsList = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSupportTickets(ticketsList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <div className="bg-white/80 backdrop-blur-xl p-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <div className="flex items-center gap-3">
            <Logo iconSize={20} textSize="text-xl" />
            <div className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-gray-200">
               Management
            </div>
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-2xl">
           <Activity size={18} className="text-gray-400" />
        </div>
      </div>

      <div className="p-6 space-y-10">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Capital', value: `৳${stats.totalBalance.toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending Deposits', value: stats.pendingDeposits, icon: ArrowLeft, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{stat.label}</p>
                <p className={cn("text-2xl font-black tracking-tight", stat.color)}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 p-1.5 rounded-[24px] flex gap-1 border border-gray-100 shadow-inner overflow-x-auto">
          {[
            { id: 'requests', label: 'Requests', count: transactions.length },
            { id: 'support', label: 'Support', count: supportTickets.filter(t => t.status === 'pending').length },
            { id: 'users', label: 'Users', count: users.length },
            { id: 'plans', label: 'Plans', count: plans.length },
            { id: 'settings', label: 'Settings', count: null },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 min-w-[68px] py-4 px-2 rounded-[20px] font-black uppercase tracking-[0.12em] text-[9px] transition-all relative overflow-hidden flex items-center justify-center gap-1",
                activeTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100' 
                  : 'text-gray-400'
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[8px] font-black",
                  tab.id === 'support' && tab.count > 0
                    ? "bg-red-500 text-white animate-pulse"
                    : activeTab === tab.id ? "bg-red-50 text-red-500" : "bg-gray-200 text-gray-500"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'requests' ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                   <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Requests</h2>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending transactions queue</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={checkAndProcessLimitViolations}
                    disabled={loading || transactions.filter(t => t.type === 'withdraw').length === 0}
                    className="text-[10px] bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-orange-200 transition-colors disabled:opacity-50 border border-orange-200"
                  >
                    Check Limits
                  </button>
                </div>
              </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="animate-spin text-red-600" size={40} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Querying Queue...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center p-20 text-gray-300 font-black uppercase italic bg-gray-50 rounded-[40px] border border-dashed border-gray-200 opacity-60">
                Queue Empty / Zero Packets
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((t) => (
                  <div key={t.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <div className={cn("w-2 h-2 rounded-full", t.type === 'deposit' ? 'bg-emerald-500' : 'bg-red-500')}></div>
                           <p className="text-xs font-black text-gray-900 uppercase tracking-widest">{t.type} Request</p>
                        </div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">{t.method} • {t.accountNumber}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-2xl font-black text-gray-900 tracking-tight">৳{t.amount}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="space-y-2">
                        {t.trxId && (
                          <div className="text-[9px] bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black uppercase tracking-widest w-fit border border-blue-100">
                             TRXID: {t.trxId}
                          </div>
                        )}
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">
                          ID: {t.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          disabled={!!processing}
                          onClick={() => handleStatusUpdate(t, 'rejected')}
                          className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-100/50 flex items-center justify-center disabled:opacity-50 active:scale-90"
                        >
                          {processing === t.id ? <Loader2 size={24} className="animate-spin" /> : <XCircle size={24} strokeWidth={2.5} />}
                        </button>
                        <button 
                          disabled={!!processing}
                          onClick={() => handleStatusUpdate(t, 'completed')}
                          className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-100/50 flex items-center justify-center disabled:opacity-50 active:scale-90"
                        >
                          {processing === t.id ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : activeTab === 'users' ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="px-2 space-y-6">
              <div className="space-y-1">
                 <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">User Directory</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage registered accounts</p>
              </div>
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input 
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-[24px] py-5 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                />
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="animate-spin text-red-600" size={40} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Nodes...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users
                  .filter(u => 
                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    u.phone.includes(searchTerm)
                  )
                  .map((u) => (
                    <div 
                      key={u.uid} 
                      onClick={() => handleUserClick(u)}
                      className={cn(
                        "bg-white p-6 rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 flex items-center gap-6 cursor-pointer active:scale-95 transition-all group",
                        u.isDeactivated && "opacity-40 grayscale"
                      )}
                    >
                      <div className="w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center text-2xl font-black text-gray-900 shadow-inner group-hover:bg-white transition-colors">
                        {u.name?.[0] || 'U'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-gray-900 truncate uppercase italic tracking-tight">{u.name}</p>
                          <p className="text-sm font-black text-orange-600 italic">৳ {u.balance.toFixed(2)}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">{u.phone}</p>
                        {u.activePlanId && (
                          <div className="pt-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-red-50 text-red-600 px-2 py-0.5 rounded-lg border border-red-100">
                               {u.activePlanId.split('-').pop()} Node
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        ) : activeTab === 'plans' ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                 <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Investment Plans</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earnings configuration</p>
              </div>
              <button 
                onClick={() => {
                  setEditingPlan({});
                  setIsPlanModalOpen(true);
                }}
                className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 flex items-center justify-between group">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{plan.id}</p>
                      <h3 className="text-2xl font-black text-indigo-950 italic uppercase">{plan.name}</h3>
                    </div>
                    <div className="flex gap-4">
                       <div className="bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 italic">
                          <span className="text-[10px] font-black text-orange-600 uppercase">৳{plan.price}</span>
                       </div>
                       <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-100 italic">
                          <span className="text-[10px] font-black text-green-600 uppercase">৳{plan.earningPerAd}/AD</span>
                       </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsPlanModalOpen(true);
                      }}
                      className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center active:scale-90"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      disabled={processing === plan.id}
                      onClick={() => handleDeletePlan(plan.id)}
                      className="w-12 h-12 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center active:scale-90"
                    >
                      {processing === plan.id ? <Loader2 size={20} className="animate-spin" /> : <Trash size={20} />}
                    </button>
                  </div>
                </div>
              ))}
              {plans.length === 0 && (
                <div className="text-center p-20 text-gray-300 font-black uppercase italic bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                  Zero Logic Gates Active
                </div>
              )}
            </div>
          </section>
        ) : activeTab === 'support' ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Support Inquiries</h2>
                  {supportTickets.filter(t => t.status === 'pending').length > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      {supportTickets.filter(t => t.status === 'pending').length} New
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Incoming customer support tickets & inquiries</p>
              </div>
              <button 
                onClick={handleRefreshTickets}
                disabled={loading}
                className="p-3 bg-gray-50 text-gray-600 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100 flex items-center gap-2 text-xs font-bold"
                title="Refresh Tickets"
              >
                <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 px-1">
              {[
                { id: 'all', label: 'All Inquiries', count: supportTickets.length },
                { id: 'pending', label: 'Pending', count: supportTickets.filter(t => t.status === 'pending').length },
                { id: 'open', label: 'Replied / Open', count: supportTickets.filter(t => t.status === 'open').length },
                { id: 'closed', label: 'Closed', count: supportTickets.filter(t => t.status === 'closed').length },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTicketStatusFilter(f.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                    ticketStatusFilter === f.id
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative group px-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text"
                placeholder="Search by user, phone, category or message..."
                value={ticketSearchTerm}
                onChange={(e) => setTicketSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[24px] py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="animate-spin text-red-600" size={40} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Support Tickets...</p>
              </div>
            ) : supportTickets.length === 0 ? (
              <div className="text-center p-16 text-gray-400 font-bold bg-gray-50 rounded-[40px] border border-dashed border-gray-200 space-y-3">
                <Headphones size={36} className="mx-auto text-gray-300" />
                <p className="text-xs uppercase tracking-widest">No support tickets found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {supportTickets
                  .filter(t => {
                    const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
                    const search = ticketSearchTerm.toLowerCase();
                    const matchesSearch = 
                      (t.userName?.toLowerCase() || '').includes(search) ||
                      (t.userPhone || '').includes(search) ||
                      (t.category?.toLowerCase() || '').includes(search) ||
                      (t.message?.toLowerCase() || '').includes(search) ||
                      t.id.toLowerCase().includes(search);
                    return matchesStatus && matchesSearch;
                  })
                  .map((t) => (
                    <div key={t.id} className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-5 hover:shadow-md transition-shadow">
                      {/* Ticket Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-100">
                            {t.userName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-gray-900">{t.userName || 'User'}</h4>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-lg">
                                {t.userPhone || 'No Phone'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              UID: {t.userId?.slice(-6).toUpperCase()} • {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border",
                            t.category?.includes('Deposit') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            t.category?.includes('Withdraw') ? "bg-red-50 text-red-700 border-red-200" :
                            t.category?.includes('Task') ? "bg-orange-50 text-orange-700 border-orange-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {t.category}
                          </span>

                          <span className={cn(
                            "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider",
                            t.status === 'pending' ? "bg-amber-100 text-amber-800 animate-pulse" :
                            t.status === 'open' ? "bg-emerald-100 text-emerald-800" :
                            "bg-gray-100 text-gray-600"
                          )}>
                            {t.status === 'pending' ? 'Pending' : t.status === 'open' ? 'Replied' : 'Closed'}
                          </span>
                        </div>
                      </div>

                      {/* User's Message */}
                      <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">User Message:</p>
                        <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">{t.message}</p>
                      </div>

                      {/* Admin's Previous Reply if exists */}
                      {t.reply && (
                        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle size={12} className="text-emerald-600" />
                              Admin Response:
                            </span>
                            {t.repliedAt && (
                              <span className="text-[9px] font-bold text-emerald-700/80">
                                {t.repliedAt?.toDate ? t.repliedAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-emerald-950 leading-relaxed whitespace-pre-wrap">{t.reply}</p>
                        </div>
                      )}

                      {/* Reply Input Box */}
                      <div className="space-y-3 pt-2">
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder={t.reply ? "Update your reply to user..." : "Type reply to this user..."}
                            value={replyInputs[t.id] ?? (t.reply || '')}
                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [t.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply(t.id);
                              }
                            }}
                            className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-inner"
                          />
                          <button
                            onClick={() => handleSendReply(t.id)}
                            disabled={replyingTicketId === t.id || !(replyInputs[t.id]?.trim() || t.reply)}
                            className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-black transition-all flex items-center gap-2 disabled:opacity-40 active:scale-95 shadow-md shadow-gray-200"
                          >
                            {replyingTicketId === t.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <span>{t.reply ? 'Update' : 'Send'}</span>
                          </button>
                        </div>

                        {/* Status Change & Delete Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            {t.status !== 'closed' ? (
                              <button
                                onClick={() => handleUpdateTicketStatus(t.id, 'closed')}
                                disabled={processing === t.id}
                                className="text-[10px] font-black text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors"
                              >
                                Mark as Closed
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateTicketStatus(t.id, 'open')}
                                disabled={processing === t.id}
                                className="text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors border border-emerald-200"
                              >
                                Re-Open Ticket
                              </button>
                            )}

                            {t.status !== 'pending' && (
                              <button
                                onClick={() => handleUpdateTicketStatus(t.id, 'pending')}
                                disabled={processing === t.id}
                                className="text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors border border-amber-200"
                              >
                                Mark Pending
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            disabled={processing === t.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete Ticket"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-1 px-2">
               <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase text-center">Platform Settings</h2>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Global system configuration</p>
            </div>
            
            <form onSubmit={handleUpdateSettings} className="space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-2">
                   <Shield size={16} className="text-emerald-500" />
                   <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Payment Numbers</h3>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">bKash (Personal)</label>
                    <input 
                      type="text"
                      value={paymentNumbers.bkash}
                      onChange={e => setPaymentNumbers(prev => ({ ...prev, bkash: e.target.value }))}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                      placeholder="017XXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Nagad (Personal)</label>
                    <input 
                      type="text"
                      value={paymentNumbers.nagad}
                      onChange={e => setPaymentNumbers(prev => ({ ...prev, nagad: e.target.value }))}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                      placeholder="017XXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 px-2">
                   <PieChart size={16} className="text-red-500" />
                   <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest italic">Capital Thresholds</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 space-y-4">
                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic px-1">Min Deposit</label>
                    <input 
                      type="number"
                      value={paymentNumbers.minDeposit || ''}
                      onChange={e => setPaymentNumbers(prev => ({ ...prev, minDeposit: Number(e.target.value) }))}
                      className="w-full bg-transparent border-0 p-0 text-xl font-black text-gray-900 focus:ring-0 outline-none italic"
                    />
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 space-y-4">
                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic px-1">Min Withdraw</label>
                    <input 
                      type="number"
                      value={paymentNumbers.minWithdraw || ''}
                      onChange={e => setPaymentNumbers(prev => ({ ...prev, minWithdraw: Number(e.target.value) }))}
                      className="w-full bg-transparent border-0 p-0 text-xl font-black text-gray-900 focus:ring-0 outline-none italic"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                     <Zap size={16} className="text-red-500" />
                     <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest italic">Offer Stream</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setExclusiveOffers(prev => [...prev, { id: Date.now().toString(), title: '', description: '', tag: 'Sponsored' }])}
                    className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {exclusiveOffers.map((offer, index) => (
                    <div key={offer.id} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-xl shadow-gray-100 space-y-6 relative group">
                      <button 
                        type="button"
                        onClick={() => setExclusiveOffers(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-6 right-6 w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Trash size={18} />
                      </button>
                      <div className="space-y-4">
                        <input 
                          type="text"
                          value={offer.tag}
                          onChange={e => {
                            const newOffers = [...exclusiveOffers];
                            newOffers[index].tag = e.target.value;
                            setExclusiveOffers(newOffers);
                          }}
                          className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 text-[10px] font-black text-gray-400 focus:ring-2 focus:ring-red-500/10 transition-all uppercase italic tracking-widest shadow-inner"
                          placeholder="TAG"
                        />
                        <input 
                          type="text"
                          value={offer.title}
                          onChange={e => {
                            const newOffers = [...exclusiveOffers];
                            newOffers[index].title = e.target.value;
                            setExclusiveOffers(newOffers);
                          }}
                          className="w-full bg-white border-0 p-0 text-lg font-black text-gray-900 focus:ring-0 outline-none uppercase italic"
                          placeholder="OFFER TITLE"
                        />
                        <textarea 
                          rows={2}
                          value={offer.description}
                          onChange={e => {
                            const newOffers = [...exclusiveOffers];
                            newOffers[index].description = e.target.value;
                            setExclusiveOffers(newOffers);
                          }}
                          className="w-full bg-white border-0 p-0 text-xs font-medium text-gray-400 focus:ring-0 outline-none resize-none leading-relaxed"
                          placeholder="Offer body content..."
                        />
                      </div>
                    </div>
                  ))}
                  {exclusiveOffers.length === 0 && (
                    <div className="text-center p-20 text-gray-300 font-black uppercase italic bg-gray-50 rounded-[40px] border border-dashed border-gray-200 opacity-60">
                      Offer Stream Depleted
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-gray-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 uppercase italic tracking-widest text-sm"
                  >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    Sync Configuration
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}
      </div>

      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[48px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border border-gray-100"
          >
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{editingPlan?.id ? 'Edit Plan' : 'New Plan'}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Configure investment parameters</p>
                </div>
                <button onClick={() => setIsPlanModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Plan Name</label>
                  <input 
                    required
                    type="text"
                    value={editingPlan?.name || ''}
                    onChange={e => setEditingPlan(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border-0 rounded-[24px] py-5 px-6 text-sm font-bold text-gray-900 placeholder:text-gray-200 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                    placeholder="e.g. Diamond Plan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Price (৳)</label>
                    <input 
                      required
                      type="number"
                      value={editingPlan?.price || ''}
                      onChange={e => setEditingPlan(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full bg-gray-50 border-0 rounded-[24px] py-5 px-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Daily Ads</label>
                    <input 
                      required
                      type="number"
                      value={editingPlan?.dailyAds || ''}
                      onChange={e => setEditingPlan(prev => ({ ...prev, dailyAds: Number(e.target.value) }))}
                      className="w-full bg-gray-50 border-0 rounded-[24px] py-5 px-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Earning Per Ad (৳)</label>
                    <input 
                      required
                      type="number"
                      value={editingPlan?.earningPerAd || ''}
                      onChange={e => setEditingPlan(prev => ({ ...prev, earningPerAd: Number(e.target.value) }))}
                      className="w-full bg-gray-50 border-0 rounded-[24px] py-5 px-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Duration (Days)</label>
                    <input 
                      required
                      type="number"
                      value={editingPlan?.durationDays || ''}
                      onChange={e => setEditingPlan(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                      className="w-full bg-gray-50 border-0 rounded-[24px] py-5 px-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                    />
                  </div>
                </div>
                
                <div className="pt-4 flex gap-4">
                   <button 
                    disabled={loading}
                    type="submit"
                    className="flex-1 bg-gray-900 text-white font-black py-5 rounded-[24px] shadow-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {isUserModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] border border-gray-100"
          >
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[28px] border border-white/10 flex items-center justify-center text-3xl font-black">
                  {selectedUser.name?.[0] || 'U'}
                </div>
                <div>
                  <h2 className="font-black text-2xl leading-none uppercase tracking-tight">{selectedUser.name}</h2>
                  <p className="text-[10px] font-bold text-white/70 mt-2 uppercase tracking-[0.3em]">{selectedUser.phone}</p>
                </div>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors flex items-center justify-center relative z-10">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 shadow-inner">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Balance</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tighter">৳{selectedUser.balance.toFixed(0)}</p>
                </div>
                <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 shadow-inner flex flex-col justify-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", selectedUser.isDeactivated ? "bg-red-500" : "bg-emerald-500")}></div>
                    <span className={cn("text-xs font-black uppercase tracking-widest", selectedUser.isDeactivated ? "text-red-600" : "text-emerald-600")}>
                        {selectedUser.isDeactivated ? "Banned" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Management Sector */}
               <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <SettingsIcon size={16} className="text-blue-500" />
                   <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Account Management</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="relative flex-1 group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300">৳</span>
                      <input 
                        type="number" 
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="w-full bg-gray-50 border-0 rounded-[28px] py-6 pl-12 pr-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <button 
                      onClick={handleUpdateBalance}
                      disabled={processing === selectedUser.uid}
                      className="bg-gray-900 text-white px-10 rounded-[28px] font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleToggleDeactivation}
                    disabled={processing === selectedUser.uid}
                    className={cn(
                      "w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95",
                      selectedUser.isDeactivated 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-red-50 text-red-600 border border-red-100"
                    )}
                  >
                    {selectedUser.isDeactivated ? <Unlock size={18} strokeWidth={3}/> : <Ban size={18} strokeWidth={3}/>}
                    {selectedUser.isDeactivated ? 'Activate Account' : 'Deactivate Account'}
                  </button>
                </div>
              </div>

              {/* Data History */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <History size={16} className="text-blue-500" />
                   <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Transaction History</h3>
                </div>
                <div className="space-y-3">
                  {selectedUserTransactions.length > 0 ? selectedUserTransactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex justify-between items-center group hover:border-gray-200 transition-colors">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{t.type}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          {t.method} • {t.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={cn(
                          "text-sm font-black",
                          t.type === 'deposit' ? "text-emerald-600" : "text-red-600"
                        )}>
                          {t.type === 'deposit' ? '+' : '-'}৳{t.amount}
                        </p>
                        <p className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border inline-block",
                          t.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : t.status === 'pending' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-red-50 text-red-600 border-red-100"
                        )}>
                          {t.status}
                        </p>
                      </div>
                    </div>
                  )) : (
                     <div className="text-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-100">
                        <p className="text-xs text-gray-300 font-black uppercase tracking-widest">No transaction history</p>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isDeactivationModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Ban size={32} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">Deactivate User</h2>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  Please provide a reason for deactivating <strong>{selectedUser?.name}</strong>'s account.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Reason</label>
                <textarea 
                  required
                  rows={3}
                  value={deactivationReason}
                  onChange={e => setDeactivationReason(e.target.value)}
                  className="w-full bg-gray-50 border-0 rounded-2xl p-4 text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-red-500 transition-all shadow-inner resize-none"
                  placeholder="e.g. Policy violation, suspicious activity..."
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeactivationModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-400 font-bold py-4 rounded-2xl active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeactivation}
                  disabled={!deactivationReason.trim() || !!processing}
                  className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
