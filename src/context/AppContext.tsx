import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, Payment, Expense, AppConfig, Pet, AppEvent, Notification as AppNotification } from '../lib/types';
import { 
  initFirebase, 
  subscribeToAuth, 
  loginWithGoogle, 
  logout, 
  ensureCurrentMonthPayment,
  subscribeToMyPayments,
  subscribeToAllPayments,
  subscribeToAllExpenses,
  subscribeToAllUsers,
  subscribeToConfig,
  subscribeToMyPets,
  subscribeToAllEvents,
  subscribeToMyNotifications,
  isRealBackend,
  setMockRole
} from '../services/api';

interface AppState {
  user: UserProfile | null;
  loading: boolean;
  myPayments: Payment[];
  allPayments: Payment[];
  allExpenses: Expense[];
  allUsers: UserProfile[];
  appConfig: AppConfig | null;
  myPets: Pet[];
  events: AppEvent[];
  myNotifications: AppNotification[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isRealBackend: boolean;
  toggleMockRole: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPayments, setMyPayments] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    let unsubAuth: () => void;
    let unsubMyPayments: () => void;
    let unsubAllPayments: () => void;
    let unsubAllExpenses: () => void;
    let unsubAllUsers: () => void;
    let unsubConfig: () => void;
    let unsubPets: () => void;
    let unsubEvents: () => void;
    let unsubNotifs: () => void;

    initFirebase().then(() => {
      unsubConfig = subscribeToConfig(setAppConfig);
      unsubEvents = subscribeToAllEvents(setEvents);
      unsubAuth = subscribeToAuth((u) => {
        setUser(u);
        setLoading(false);
        if (u) {
          ensureCurrentMonthPayment(u.uid); // This might use hardcoded 30 internally, we can fix later
          unsubMyPayments = subscribeToMyPayments(u.uid, setMyPayments);
          unsubPets = subscribeToMyPets(u.uid, setMyPets);
          unsubNotifs = subscribeToMyNotifications(u.uid, setMyNotifications);
          unsubAllExpenses = subscribeToAllExpenses(setAllExpenses);
          if (u.role === 'admin') {
            unsubAllPayments = subscribeToAllPayments(setAllPayments);
            unsubAllUsers = subscribeToAllUsers(setAllUsers);
          }
        } else {
          setMyPayments([]);
          setAllPayments([]);
          setAllExpenses([]);
          setAllUsers([]);
          setMyPets([]);
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
      if (unsubConfig) unsubConfig();
      if (unsubPets) unsubPets();
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
      appConfig,
      myPets,
      events,
      myNotifications,
      login: handleLogin,
      logout: handleLogout,
      isRealBackend,
      toggleMockRole
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
