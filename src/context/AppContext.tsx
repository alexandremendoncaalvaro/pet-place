import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { UserProfile, Payment, Expense, AppConfig, Pet, AppEvent, AppNotification, AppPost } from '../lib/types';
import { 
  initBackend, 
  subscribeToAuth, 
  loginWithGoogle, 
  logout, 
  ensureCurrentMonthPayment,
  subscribeToMyPayments,
  subscribeToAllPayments,
  subscribeToAllExpenses,
  subscribeToAllUsers,
  subscribeToAllPublicProfiles,
  subscribeToAllPets,
  subscribeToConfig,
  subscribeToAllEvents,
  subscribeToMyNotifications,
  subscribeToAllPosts,
  isRealBackend,
  setMockRole,
  requestPushToken
} from '../services/api';

interface AppState {
  user: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  myPayments: Payment[];
  allPayments: Payment[];
  allExpenses: Expense[];
  allUsers: UserProfile[];
  publicProfiles: UserProfile[];
  appConfig: AppConfig | null;
  myPets: Pet[];
  allPets: Pet[];
  events: AppEvent[];
  myNotifications: AppNotification[];
  posts: AppPost[];
  loadMorePosts: () => void;
  postLimit: number;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isRealBackend: boolean;
  toggleMockRole: () => void;
  viewProfileId: string | null;
  setViewProfileId: (id: string | null) => void;
  viewPetId: string | null;
  setViewPetId: (id: string | null) => void;
  fullscreenImage: {url: string, title?: string} | null;
  setFullscreenImage: (img: {url: string, title?: string} | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);
  const [myPayments, setMyPayments] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<UserProfile[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  
  const myPets = useMemo(() => {
    if (!user) return [];
    const famId = user.familyId || user.uid;
    const famMembers = publicProfiles.filter(p => (p.familyId || p.uid) === famId);
    return allPets.filter(p => famMembers.some(m => p.ownerId === m.uid) || p.ownerId === user.uid);
  }, [user, allPets, publicProfiles]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [posts, setPosts] = useState<AppPost[]>([]);
  const [postLimit, setPostLimit] = useState(10);
  const ensuredPaymentsRef = useRef<Set<string>>(new Set());
  const pushRequestedRef = useRef<Set<string>>(new Set());
  
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [viewPetId, setViewPetId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, title?: string} | null>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    let unsubAuth: (() => void) | undefined;

    initBackend().then(() => {
      if (cancelled) return;
      setBackendReady(true);
      unsubAuth = subscribeToAuth((u) => {
        if (cancelled) return;
        setUser((current) => {
          if (JSON.stringify(current) === JSON.stringify(u)) return current;
          return u;
        });
        setLoading(false);
      });
    }).catch((error) => {
      console.error(error);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const loadMorePosts = () => setPostLimit(prev => prev + 10);

  useEffect(() => {
    if (!backendReady || !user) {
      setMyPayments([]);
      setAllPayments([]);
      setAllExpenses([]);
      setAllUsers([]);
      setPublicProfiles([]);
      setAllPets([]);
      setEvents([]);
      setMyNotifications([]);
      setPosts([]);
      return;
    }

    const familyId = user.familyId || user.uid;
    const unsubs = [
      subscribeToConfig(setAppConfig),
      subscribeToAllEvents(setEvents),
      subscribeToMyPayments(familyId, setMyPayments),
      subscribeToMyNotifications(user.uid, user.role, setMyNotifications),
      subscribeToAllExpenses(setAllExpenses),
      subscribeToAllPublicProfiles(setPublicProfiles),
      subscribeToAllPets(setAllPets),
      subscribeToAllPayments(setAllPayments),
    ];

    if (user.role === 'admin') {
      unsubs.push(subscribeToAllUsers(setAllUsers));
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const ensureKey = `${familyId}:${currentMonth}`;
    if (!ensuredPaymentsRef.current.has(ensureKey)) {
      ensuredPaymentsRef.current.add(ensureKey);
      ensureCurrentMonthPayment(familyId, false).catch((error) => console.error('Failed to ensure current payment:', error));
    }

    if (!pushRequestedRef.current.has(user.uid)) {
      pushRequestedRef.current.add(user.uid);
      requestPushToken(user.uid).catch((error) => console.error('Failed to register push subscription:', error));
    }

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [backendReady, user?.uid, user?.familyId, user?.role]);

  useEffect(() => {
    if (!backendReady || !user) return;
    return subscribeToAllPosts(postLimit, setPosts);
  }, [backendReady, user?.uid, postLimit]);

  const handleLogin = async () => {
    try { await loginWithGoogle(); } catch(e) { console.error(e); }
  };

  const handleLogout = async () => {
    await logout();
  };

  const toggleMockRole = () => {
    if (isRealBackend) return;
    const newRole = user?.role === 'admin' ? 'resident' : 'admin';
    setMockRole(newRole);
    // trigger immediate reload for mock fast switch
    window.location.reload();
  };

  return (
    <AppContext.Provider value={{
      user,
      isAdmin,
      loading,
      myPayments,
      allPayments,
      allExpenses,
      allUsers,
      publicProfiles,
      appConfig,
      myPets,
      allPets,
      events,
      myNotifications,
      posts,
      loadMorePosts,
      postLimit,
      login: handleLogin,
      logout: handleLogout,
      isRealBackend,
      toggleMockRole,
      viewProfileId,
      setViewProfileId,
      viewPetId,
      setViewPetId,
      fullscreenImage,
      setFullscreenImage
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
