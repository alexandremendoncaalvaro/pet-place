export type Role = 'admin' | 'resident';
export type PaymentStatus = 'pending' | 'analyzing' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  dogName: string;
  photoUrl?: string;
  role: Role;
  email: string;
  fcmToken?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  month: string;
  amount: number;
  proofUrl: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  userName?: string; // transient for UI
  userDog?: string;  // transient for UI
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  amount: number;
  receiptUrl: string;
  createdBy: string;
  createdAt: string;
}

export interface AppConfig {
  pixKey: string;
  monthlyAmount: number;
  dueDateDay: number;
  paymentInstructions: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  photoUrl: string;
  breed: string;
  createdAt: string;
}

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'event' | 'announcement';
  notify24h?: boolean;
  notify1h?: boolean;
  notifyNow?: boolean;
  readBy?: string[];
  createdBy: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // 'all' or uid
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
