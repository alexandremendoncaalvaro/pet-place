import { Role, UserProfile, Payment, Expense, PaymentStatus, AppConfig, Pet, AppEvent, Notification } from '../lib/types';
import { format } from 'date-fns';

let db: any = null;
let auth: any = null;
let storage: any = null;
export let isRealBackend = false;

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';

export async function initFirebase() {
  try {
    const configModule = await import('../../firebase-applet-config.json');
    const firebaseConfig = configModule.default;
    if (firebaseConfig && firebaseConfig.projectId) {
      const fbModule = await import('../lib/firebase');
      db = fbModule.db;
      auth = fbModule.auth;
      storage = fbModule.storage;
      isRealBackend = true;
    }
  } catch (error) {
    console.warn('Firebase config missing, using mock backend.');
    isRealBackend = false;
  }
}

// In-Memory mock state
const MOCK_USERS: UserProfile[] = [
  { uid: 'mock-admin', name: 'João (Admin)', phone: '11999999999', dogName: 'Rex', role: 'admin', email: 'admin@pet.com', createdAt: new Date().toISOString() },
  { uid: 'mock-resident', name: 'Maria', phone: '11988888888', dogName: 'Thor e Fofa', role: 'resident', email: 'maria@pet.com', createdAt: new Date().toISOString() },
  { uid: 'mock-res-2', name: 'Carlos', phone: '11977777777', dogName: 'Thor', role: 'resident', email: 'carlos@pet.com', createdAt: new Date().toISOString() }
];

let MOCK_PETS: Pet[] = [
  { id: 'p1', ownerId: 'mock-resident', name: 'Thor', breed: 'Golden Retriever', photoUrl: '', createdAt: new Date().toISOString() },
  { id: 'p2', ownerId: 'mock-resident', name: 'Fofa', breed: 'Poodle', photoUrl: '', createdAt: new Date().toISOString() }
];

let MOCK_EVENTS: AppEvent[] = [
  { id: 'ev1', title: 'Reunião de Condomínio', description: 'Vamos discutir as despesas e regras dos pets.', date: '2026-05-10', time: '19:00', type: 'event', createdBy: 'mock-admin', createdAt: new Date().toISOString() },
  { id: 'ev2', title: 'Manutenção do Portão', description: 'O portão ficará em manutenção das 14h às 16h.', date: '2026-05-03', time: '', type: 'announcement', createdBy: 'mock-admin', createdAt: new Date().toISOString() }
];

let MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'mock-resident', title: 'Mensalidade Aprovada', message: 'Seu pagamento de Maio foi aprovado!', isRead: false, createdAt: new Date().toISOString() },
  { id: 'n2', userId: 'all', title: 'Boletim Semanal', message: 'Confira as novidades do mês no painel.', isRead: true, createdAt: new Date().toISOString() }
];

let currentUserUid = 'mock-resident';
let currentMockRole = 'resident';

export function setMockRole(role: 'admin' | 'resident') {
  currentMockRole = role;
  currentUserUid = role === 'admin' ? 'mock-admin' : 'mock-resident';
}

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', userId: 'mock-resident', month: '2026-04', amount: 30, proofUrl: 'https://placehold.co/400x600?text=Comprovante', status: 'approved', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p2', userId: 'mock-resident', month: '2026-05', amount: 30, proofUrl: '', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p3', userId: 'mock-res-2', month: '2026-05', amount: 30, proofUrl: 'https://placehold.co/400x600?text=Comprovante', status: 'analyzing', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', date: '2026-04-10', title: 'Sacos de lixo', category: 'Limpeza', amount: 15, receiptUrl: 'https://placehold.co/400x600?text=Recibo', createdBy: 'mock-admin', createdAt: new Date().toISOString() }
];

let MOCK_CONFIG: AppConfig = {
  pixKey: '11999999999',
  monthlyAmount: 30,
  dueDateDay: 10,
  paymentInstructions: 'Transferir o valor para a chave PIX acima.',
  updatedAt: new Date().toISOString()
};

export async function loginWithGoogle(): Promise<UserProfile | null> {
  if (!isRealBackend) {
    return MOCK_USERS.find(u => u.uid === currentUserUid) || null;
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  
  // Check if profile exists
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  } else {
    // Determine if bootstrapped admin
    const role = user.email === 'peritto@gmail.com' ? 'admin' : 'resident';
    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'Novo Morador',
      phone: '',
      dogName: '',
      role: role,
      email: user.email || '',
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  }
}

export async function logout() {
  if (!isRealBackend) return;
  await fbSignOut(auth);
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  if (!isRealBackend) {
    const user = MOCK_USERS.find(u => u.uid === currentUserUid) || null;
    callback(user);
    return () => {};
  }
  
  let profileUnsub: () => void;
  
  const authUnsub = onAuthStateChanged(auth, (user) => {
    if (profileUnsub) {
      profileUnsub();
    }
    
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      profileUnsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as UserProfile);
        } else {
          callback(null);
        }
      }, handleFirestoreError);
    } else {
      callback(null);
    }
  });

  return () => {
    authUnsub();
    if (profileUnsub) profileUnsub();
  };
}

// Ensure the month exists for user
export async function ensureCurrentMonthPayment(userId: string) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  let defaultAmount = 30;
  
  if (!isRealBackend) {
    defaultAmount = MOCK_CONFIG.monthlyAmount;
    const exists = MOCK_PAYMENTS.find(p => p.userId === userId && p.month === currentMonth);
    if (!exists) {
      MOCK_PAYMENTS.push({
        id: 'p' + Math.random(),
        userId,
        month: currentMonth,
        amount: defaultAmount,
        proofUrl: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return;
  }
  
  try {
    const confSnap = await getDoc(doc(db, 'settings', 'config'));
    if (confSnap.exists() && confSnap.data().monthlyAmount) {
      defaultAmount = confSnap.data().monthlyAmount;
    }
  } catch(e) {}
  
  const paymentsQuery = query(collection(db, 'payments'), where('userId', '==', userId), where('month', '==', currentMonth));
  const snap = await getDocs(paymentsQuery);
  if (snap.empty) {
    const newDoc = doc(collection(db, 'payments'));
    const payment = {
      userId,
      month: currentMonth,
      amount: defaultAmount,
      proofUrl: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(newDoc, payment);
  }
}

export function subscribeToMyPayments(userId: string, callback: (payments: Payment[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_PAYMENTS.filter(p => p.userId === userId));
    return () => {};
  }
  const q = query(collection(db, 'payments'), where('userId', '==', userId), orderBy('month', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Payment)));
  }, handleFirestoreError);
}

export function subscribeToAllPayments(callback: (payments: Payment[]) => void) {
  if (!isRealBackend) {
    callback([...MOCK_PAYMENTS]);
    return () => {};
  }
  const q = query(collection(db, 'payments'), orderBy('month', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Payment)));
  }, handleFirestoreError);
}

export function subscribeToAllExpenses(callback: (expenses: Expense[]) => void) {
  if (!isRealBackend) {
    callback([...MOCK_EXPENSES].sort((a,b) => b.date.localeCompare(a.date)));
    return () => {};
  }
  const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Expense)));
  }, handleFirestoreError);
}

export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  if (!isRealBackend) {
    callback([...MOCK_USERS]);
    return () => {};
  }
  const q = collection(db, 'users');
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data() as UserProfile));
  }, handleFirestoreError);
}

export async function uploadProofAndSubmit(paymentId: string, file: File) {
  if (!isRealBackend) {
    const p = MOCK_PAYMENTS.find(p => p.id === paymentId);
    if (p) {
      p.status = 'analyzing';
      p.proofUrl = URL.createObjectURL(file);
      p.updatedAt = new Date().toISOString();
    }
    return;
  }
  try {
    const storageRef = ref(storage, `proofs/${paymentId}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const docRef = doc(db, 'payments', paymentId);
    await updateDoc(docRef, {
      status: 'analyzing',
      proofUrl: url,
      updatedAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function approvePayment(paymentId: string) {
  if (!isRealBackend) {
    const p = MOCK_PAYMENTS.find(p => p.id === paymentId);
    if (p) { p.status = 'approved'; p.updatedAt = new Date().toISOString(); }
    return;
  }
  try {
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'approved',
      updatedAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function rejectPayment(paymentId: string) {
  if (!isRealBackend) {
    const p = MOCK_PAYMENTS.find(p => p.id === paymentId);
    if (p) { p.status = 'rejected'; p.updatedAt = new Date().toISOString(); }
    return;
  }
  try {
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function addExpense(expense: Omit<Expense, 'id' | 'receiptUrl'>, file: File) {
  if (!isRealBackend) {
    MOCK_EXPENSES.push({
      ...expense,
      id: 'e' + Math.random(),
      receiptUrl: URL.createObjectURL(file)
    });
    return;
  }
  try {
    const newDoc = doc(collection(db, 'expenses'));
    const storageRef = ref(storage, `receipts/${newDoc.id}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    await setDoc(newDoc, {
      ...expense,
      receiptUrl: url
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function updateProfile(userId: string, data: Partial<UserProfile>, photoFile?: File) {
  if (!isRealBackend) {
    const u = MOCK_USERS.find(x => x.uid === userId);
    if (u) {
      if(data.name !== undefined) u.name = data.name;
      if(data.phone !== undefined) u.phone = data.phone;
      if(data.dogName !== undefined) u.dogName = data.dogName;
      if(data.role !== undefined) u.role = data.role as Role;
      if(data.photoUrl !== undefined || photoFile) {
        u.photoUrl = photoFile ? URL.createObjectURL(photoFile) : (data.photoUrl || u.photoUrl);
      }
    }
    return;
  }
  try {
    const safeData: any = {};
    if(data.name !== undefined) safeData.name = data.name;
    if(data.phone !== undefined) safeData.phone = data.phone;
    if(data.dogName !== undefined) safeData.dogName = data.dogName;
    if(data.role !== undefined) safeData.role = data.role;
    
    if (photoFile) {
      const storageRef = ref(storage, `users/${userId}_${Date.now()}`);
      await uploadBytes(storageRef, photoFile);
      safeData.photoUrl = await getDownloadURL(storageRef);
    } else if (data.photoUrl !== undefined) {
      safeData.photoUrl = data.photoUrl;
    }
    
    await updateDoc(doc(db, 'users', userId), safeData);
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToConfig(callback: (config: AppConfig) => void) {
  if (!isRealBackend) {
    callback(MOCK_CONFIG);
    return () => {};
  }
  const q = doc(db, 'settings', 'config');
  return onSnapshot(q, snap => {
    if (snap.exists()) {
      callback(snap.data() as AppConfig);
    } else {
      // Default fallback
      callback({ 
        pixKey: 'NÃO DEFINIDA', 
        monthlyAmount: 30,
        dueDateDay: 10,
        paymentInstructions: 'Nenhuma instrução definida.',
        updatedAt: new Date().toISOString()
      });
    }
  }, handleFirestoreError);
}

export async function updateConfig(data: { pixKey?: string; monthlyAmount?: number; dueDateDay?: number; paymentInstructions?: string }) {
  if (!isRealBackend) {
    if (data.pixKey !== undefined) MOCK_CONFIG.pixKey = data.pixKey;
    if (data.monthlyAmount !== undefined) MOCK_CONFIG.monthlyAmount = data.monthlyAmount;
    if (data.dueDateDay !== undefined) MOCK_CONFIG.dueDateDay = data.dueDateDay;
    if (data.paymentInstructions !== undefined) MOCK_CONFIG.paymentInstructions = data.paymentInstructions;
    MOCK_CONFIG.updatedAt = new Date().toISOString();
    return;
  }
  try {
    const q = doc(db, 'settings', 'config');
    const snap = await getDoc(q);
    if (!snap.exists()) {
      await setDoc(q, {
        pixKey: data.pixKey || '',
        monthlyAmount: data.monthlyAmount || 30,
        dueDateDay: data.dueDateDay || 10,
        paymentInstructions: data.paymentInstructions || '',
        updatedAt: new Date().toISOString()
      });
    } else {
      const safeData: any = { updatedAt: new Date().toISOString() };
      if (data.pixKey !== undefined) safeData.pixKey = data.pixKey;
      if (data.monthlyAmount !== undefined) safeData.monthlyAmount = data.monthlyAmount;
      if (data.dueDateDay !== undefined) safeData.dueDateDay = data.dueDateDay;
      if (data.paymentInstructions !== undefined) safeData.paymentInstructions = data.paymentInstructions;
      await updateDoc(q, safeData);
    }
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToMyPets(userId: string, callback: (pets: Pet[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_PETS.filter(p => p.ownerId === userId));
    return () => {};
  }
  const q = query(collection(db, 'pets'), where('ownerId', '==', userId));
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pet));
    callback(data);
  }, handleFirestoreError);
}

export async function addPet(data: Omit<Pet, 'id' | 'createdAt'>, photoFile?: File) {
  if (!isRealBackend) {
    const id = Date.now().toString();
    const photoUrl = photoFile ? URL.createObjectURL(photoFile) : '';
    MOCK_PETS.push({ ...data, id, photoUrl, createdAt: new Date().toISOString() });
    return;
  }
  try {
    let photoUrl = data.photoUrl || '';
    if (photoFile) {
      const storageRef = ref(storage, `pets/${Date.now()}_${photoFile.name}`);
      await uploadBytes(storageRef, photoFile);
      photoUrl = await getDownloadURL(storageRef);
    }
    const newDoc = doc(collection(db, 'pets'));
    await setDoc(newDoc, {
      ...data,
      photoUrl,
      createdAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function deletePet(petId: string) {
  if (!isRealBackend) {
    MOCK_PETS = MOCK_PETS.filter(p => p.id !== petId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'pets', petId));
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToAllEvents(callback: (events: AppEvent[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_EVENTS);
    return () => {};
  }
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent)));
  }, handleFirestoreError);
}

export async function addEvent(data: Omit<AppEvent, 'id' | 'createdAt'>) {
  if (!isRealBackend) {
    MOCK_EVENTS.push({ ...data, id: Date.now().toString(), createdAt: new Date().toISOString() });
    return;
  }
  try {
    const d = doc(collection(db, 'events'));
    await setDoc(d, {
      ...data,
      createdAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function deleteEvent(eventId: string) {
  if (!isRealBackend) {
    MOCK_EVENTS = MOCK_EVENTS.filter(e => e.id !== eventId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToMyNotifications(userId: string, callback: (n: Notification[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_NOTIFICATIONS.filter(n => n.userId === userId || n.userId === 'all'));
    return () => {};
  }
  const q1 = query(collection(db, 'notifications'), where('userId', 'in', [userId, 'all']));
  return onSnapshot(q1, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(docs);
  }, handleFirestoreError);
}

export async function markNotificationAsRead(notificationId: string) {
  if (!isRealBackend) {
    const n = MOCK_NOTIFICATIONS.find(n => n.id === notificationId);
    if (n) n.isRead = true;
    return;
  }
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch(e) { handleFirestoreError(e); }
}

export async function addNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) {
  if (!isRealBackend) {
    MOCK_NOTIFICATIONS.push({ ...data, isRead: false, id: Date.now().toString(), createdAt: new Date().toISOString() });
    return;
  }
  try {
    const d = doc(collection(db, 'notifications'));
    await setDoc(d, {
      ...data,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

function handleFirestoreError(error: unknown) {
  console.error("Firestore error:", error);
  // Ideally parse exactly into FirestoreErrorInfo
  throw error;
}
