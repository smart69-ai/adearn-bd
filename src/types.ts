export interface NotificationPrefs {
  withdrawals: boolean;
  newAds: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  activePlanId?: string;
  hasDeposited?: boolean;
  createdAt: any;
  isAdmin: boolean;
  isDeactivated?: boolean;
  deactivationReason?: string;
  notificationPrefs?: NotificationPrefs;
}

export interface AdPlan {
  id: string;
  name: string;
  price: number;
  dailyAds: number;
  earningPerAd: number;
  durationDays: number;
  description: string;
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  videoUrl?: string; // Optional if we use videos instead of images
  rewardAmount: number;
  durationSeconds: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  method: 'bkash' | 'nagad' | 'rocket';
  accountNumber: string;
  status: 'pending' | 'completed' | 'rejected';
  rejectionReason?: string;
  createdAt: any;
}

export interface AdView {
  id: string;
  userId: string;
  adId: string;
  earned: number;
  viewedAt: any;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  category: string;
  message: string;
  status: 'pending' | 'open' | 'closed';
  createdAt: any;
  reply?: string;
  repliedAt?: any;
}
