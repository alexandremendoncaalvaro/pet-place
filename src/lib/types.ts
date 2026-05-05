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
  familyId?: string;
  userStatus?: 'pending' | 'active' | 'blocked';
  isOffline?: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  familyId: string;
  month: string;
  amount: number;
  proofUrl?: string;
  status: PaymentStatus;
  type?: 'mensalidade' | 'doacao' | 'rateio';
  description?: string;
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
  receiptUrl?: string;
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

export interface SupporterSubscription {
  familyId: string;
  status: 'active' | 'paused';
  activeSinceMonth?: string;
  pausedAt?: string;
  source: 'migration' | 'self' | 'admin';
  createdAt: string;
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

export interface AppPost {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  posterUrl?: string;
  mediaType?: 'image' | 'video';
  likedBy: string[];
  commentCount?: number;
  tags?: string[];
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // 'all' or uid
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: 'generic' | 'post_comment' | 'post_like' | 'payment' | 'event' | 'mention';
  actorId?: string;
  entityType?: 'post' | 'payment' | 'event' | 'comment';
  entityId?: string;
  aggregationKey?: string;
  count?: number;
  data?: Record<string, unknown>;
}

export interface IdentityLinkSuggestion {
  id: string;
  sourceUserId: string;
  sourceName: string;
  sourcePhone: string;
  targetUserId: string;
  targetName: string;
  targetPhone: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}
