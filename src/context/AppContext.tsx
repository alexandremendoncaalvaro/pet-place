import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
  
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [viewPetId, setViewPetId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, title?: string} | null>(null);

  useEffect(() => {
    let unsubPosts: () => void;
    initBackend().then(() => {
      unsubPosts = subscribeToAllPosts(postLimit, setPosts);
    });
    return () => {
      if (unsubPosts) unsubPosts();
    };
  }, [postLimit]);

  const loadMorePosts = () => setPostLimit(prev => prev + 10);

  useEffect(() => {
    let unsubAuth: () => void;
    let unsubMyPayments: () => void;
    let unsubAllPayments: () => void;
    let unsubAllExpenses: () => void;
    let unsubAllUsers: () => void;
    let unsubPublicProfiles: () => void;
    let unsubAllPets: () => void;
    let unsubConfig: () => void;
    let unsubEvents: () => void;
    let unsubNotifs: () => void;

    initBackend().then(() => {
      unsubConfig = subscribeToConfig(setAppConfig);
      unsubEvents = subscribeToAllEvents(setEvents);
      unsubAuth = subscribeToAuth((u) => {
        setUser(u);
        setLoading(false);
        if (u) {
          const fid = u.familyId || u.uid;
          requestPushToken(u.uid);
          ensureCurrentMonthPayment(fid); // This might use hardcoded 30 internally, we can fix later
          unsubMyPayments = subscribeToMyPayments(fid, setMyPayments);
          unsubNotifs = subscribeToMyNotifications(u.uid, u.role, setMyNotifications);
          unsubAllExpenses = subscribeToAllExpenses(setAllExpenses);
          unsubPublicProfiles = subscribeToAllPublicProfiles(setPublicProfiles);
          unsubAllPets = subscribeToAllPets(setAllPets);
          unsubAllPayments = subscribeToAllPayments(setAllPayments);
          if (u.role === 'admin') {
            unsubAllUsers = subscribeToAllUsers(setAllUsers);
          }
        } else {
          setMyPayments([]);
          setAllPayments([]);
          setAllExpenses([]);
          setAllUsers([]);
          setPublicProfiles([]);
          setAllPets([]);
          setMyNotifications([]);
        }
      });
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubMyPayments) unsubMyPayments();
      if (unsubAllPayments) unsubAllPayments();
      if (unsubAllExpenses) unsubAllExpenses();
      if (unsubAllUsers) unsubAllUsers();
      if (unsubPublicProfiles) unsubPublicProfiles();
      if (unsubAllPets) unsubAllPets();
      if (unsubConfig) unsubConfig();
      if (unsubEvents) unsubEvents();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

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
