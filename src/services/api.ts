import { Role, UserProfile, Payment, Expense, PaymentStatus, AppConfig, Pet, AppEvent, AppNotification, AppPost } from '../lib/types';
import JSZip from 'jszip';
import imageCompression from 'browser-image-compression';
import { format } from 'date-fns';

let db: any = null;
let auth: any = null;
let storage: any = null;
let app: any = null;
export let isRealBackend = false;

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { getMessaging, getToken } from 'firebase/messaging';

export async function initFirebase() {
  try {
    const configModule = await import('../../firebase-applet-config.json');
    const firebaseConfig = configModule.default;
    if (firebaseConfig && firebaseConfig.projectId) {
      const fbModule = await import('../lib/firebase');
      db = fbModule.db;
      auth = fbModule.auth;
      storage = fbModule.storage;
      app = fbModule.app;
      isRealBackend = true;
    }
  } catch (error) {
    console.warn('Firebase config missing, using mock backend.');
    isRealBackend = false;
  }
}

// In-Memory mock state
const MOCK_USERS: UserProfile[] = [
  { uid: 'mock-admin', name: 'João (Admin)', phone: '11999999999', dogName: 'Rex', role: 'admin', email: 'admin@pet.com', userStatus: 'active', createdAt: new Date().toISOString() },
  { uid: 'mock-resident', name: 'Maria', phone: '11988888888', dogName: 'Thor e Fofa', role: 'resident', email: 'maria@pet.com', userStatus: 'active', createdAt: new Date().toISOString() },
  { uid: 'mock-res-2', name: 'Carlos', phone: '11977777777', dogName: 'Thor', role: 'resident', email: 'carlos@pet.com', userStatus: 'active', createdAt: new Date().toISOString() },
  { uid: 'mock-pending', name: 'Ana (Pendente)', phone: '11966666666', dogName: 'Bolinha', role: 'resident', email: 'ana@pet.com', userStatus: 'pending', createdAt: new Date().toISOString() }
];

let MOCK_PETS: Pet[] = [
  { id: 'p1', ownerId: 'mock-resident', name: 'Thor', breed: 'Golden Retriever', photoUrl: '', createdAt: new Date().toISOString() },
  { id: 'p2', ownerId: 'mock-resident', name: 'Fofa', breed: 'Poodle', photoUrl: '', createdAt: new Date().toISOString() }
];

let MOCK_EVENTS: AppEvent[] = [
  { id: 'ev1', title: 'Reunião de Condomínio', description: 'Vamos discutir as despesas e regras dos pets.', date: '2026-05-10', time: '19:00', type: 'event', createdBy: 'mock-admin', createdAt: new Date().toISOString() },
  { id: 'ev2', title: 'Manutenção do Portão', description: 'O portão ficará em manutenção das 14h às 16h.', date: '2026-05-03', time: '', type: 'announcement', createdBy: 'mock-admin', createdAt: new Date().toISOString() }
];

let MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', userId: 'mock-resident', title: 'Mensalidade Aprovada', message: 'Seu pagamento de Maio foi aprovado!', isRead: false, createdAt: new Date().toISOString() },
  { id: 'n2', userId: 'all', title: 'Boletim Semanal', message: 'Confira as novidades do mês no painel.', isRead: true, createdAt: new Date().toISOString() }
];

let MOCK_POSTS: AppPost[] = [
  { id: 'post1', authorId: 'mock-resident', content: 'Olha que dia lindo no Pet Place!', likedBy: [], createdAt: new Date().toISOString() },
  { id: 'post2', authorId: 'mock-admin', content: 'Fofa brincando com a bolinha nova.', likedBy: ['mock-resident'], createdAt: new Date(Date.now() - 86400000).toISOString() }
];

let MOCK_POST_COMMENTS: any[] = [
  { id: 'comment1', postId: 'post1', authorId: 'mock-resident', content: 'Que lugar bacana!', createdAt: new Date().toISOString() }
];

let currentUserUid = 'mock-resident';
let currentMockRole = 'resident';

export function setMockRole(role: 'admin' | 'resident') {
  currentMockRole = role;
  currentUserUid = role === 'admin' ? 'mock-admin' : 'mock-resident';
}

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', familyId: 'mock-resident', month: '2026-04', amount: 30, proofUrl: 'https://placehold.co/400x600?text=Comprovante', status: 'approved', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p2', familyId: 'mock-resident', month: '2026-05', amount: 30, proofUrl: '', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p3', familyId: 'mock-res-2', month: '2026-05', amount: 30, proofUrl: 'https://placehold.co/400x600?text=Comprovante', status: 'analyzing', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
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
  const publicRef = doc(db, 'public_profiles', user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as UserProfile;
    // ensure public profile
    const pubSnap = await getDoc(publicRef);
    if (!pubSnap.exists()) {
      await setDoc(publicRef, {
        uid: data.uid,
        name: data.name,
        photoUrl: data.photoUrl,
        dogName: data.dogName,
        role: data.role,
        createdAt: data.createdAt
      });
    }
    return data;
  } else {
    // Determine if bootstrapped admin
    const isAdminUser = user.email === 'peritto@gmail.com';
    const role = isAdminUser ? 'admin' : 'resident';
    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'Nova Pessoa',
      phone: '',
      dogName: '',
      photoUrl: user.photoURL || '',
      role: role,
      email: user.email || '',
      userStatus: isAdminUser ? 'active' : 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, newProfile);
    await setDoc(publicRef, {
      uid: newProfile.uid,
      name: newProfile.name,
      photoUrl: newProfile.photoUrl,
      dogName: newProfile.dogName,
      role: newProfile.role,
      createdAt: newProfile.createdAt
    });
    
    // Notify admins
    if (!isAdminUser) {
      await addNotification({
        userId: 'admins',
        title: 'Novo Cadastro',
        message: `${newProfile.name} se cadastrou no app e aguarda aprovação de acesso.`
      }).catch(e => console.warn('Could not notify admins', e));
    }
    return newProfile;
  }
}

export async function logout() {
  if (!isRealBackend) return;
  await fbSignOut(auth);
}

export async function requestPushToken(userId: string) {
  if (!isRealBackend || !app) return;
  try {
    const vapidKey = (import.meta as any).env.VITE_FCM_VAPID_KEY;
    if (!vapidKey) return;
    const messaging = getMessaging(app);
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        await updateDoc(doc(db, 'users', userId), { fcmToken: token });
      }
    }
  } catch(e) {
    console.log('Error requesting FCM token:', e);
  }
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
let ensuringLock = new Set<string>();

export async function ensureCurrentMonthPayment(familyId: string) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const lockKey = `${familyId}_${currentMonth}`;
  
  if (ensuringLock.has(lockKey)) return;
  ensuringLock.add(lockKey);
  
  if (!isRealBackend) {
    const exists = MOCK_PAYMENTS.find(p => p.familyId === familyId && p.month === currentMonth && (!p.type || p.type === 'mensalidade'));
    if (!exists) {
      MOCK_PAYMENTS.push({
        id: 'p' + Math.random(),
        familyId,
        month: currentMonth,
        amount: MOCK_CONFIG.monthlyAmount,
        proofUrl: '',
        status: 'pending',
        type: 'mensalidade',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      window.dispatchEvent(new Event('mockDataChanged'));
    }
    ensuringLock.delete(lockKey);
    return;
  }
  
  let defaultAmount: number;
  try {
    const confSnap = await getDoc(doc(db, 'settings', 'config'));
    if (confSnap.exists() && confSnap.data().monthlyAmount !== undefined) {
      defaultAmount = confSnap.data().monthlyAmount;
    } else {
      // Configuration not established yet; do not generate pending payment!
      ensuringLock.delete(lockKey);
      return; 
    }
  } catch(e) {
    ensuringLock.delete(lockKey);
    return;
  }
  
  try {
    const paymentsQuery = query(collection(db, 'payments'), where('familyId', '==', familyId), where('month', '==', currentMonth));
    const snap = await getDocs(paymentsQuery);
    
    let docs = snap.docs.map(d => ({ id: d.id, data: d.data() as Payment }));
    // Filter to only consider 'mensalidade' or old untyped charges as monthly charge
    docs = docs.filter(p => !p.data.type || p.data.type === 'mensalidade');
    
    if (docs.length === 0) {
      const newDoc = doc(collection(db, 'payments'));
      const payment: Partial<Payment> & {id?: string} = {
        familyId,
        month: currentMonth,
        amount: defaultAmount,
        proofUrl: '',
        status: 'pending',
        type: 'mensalidade',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(newDoc, payment);
    } else if (docs.length > 1) {
      // Cleanup duplicates created by race condition
      docs.sort((a, b) => {
        const statuses = { approved: 4, analyzing: 3, pending: 2, rejected: 1 };
        return (statuses[b.data.status as keyof typeof statuses] || 0) - (statuses[a.data.status as keyof typeof statuses] || 0);
      });
      // Keep the most advanced status payment, delete the others if they are just pending
      for (let i = 1; i < docs.length; i++) {
        if (docs[i].data.status === 'pending') {
          await deleteDoc(doc(db, 'payments', docs[i].id)).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.warn("Could not ensure current month payment", e);
  } finally {
    ensuringLock.delete(lockKey);
  }
}

export function subscribeToMyPayments(familyId: string, callback: (payments: Payment[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_PAYMENTS.filter(p => p.familyId === familyId));
    return () => {};
  }
  const q = query(collection(db, 'payments'), where('familyId', '==', familyId), orderBy('month', 'desc'));
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

export function subscribeToAllPets(callback: (pets: Pet[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_PETS);
    return () => {};
  }
  const q = collection(db, 'pets');
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Pet)));
  }, (error) => handleFirestoreError(error));
}
export function subscribeToAllPublicProfiles(callback: (profiles: UserProfile[]) => void) {
  if (!isRealBackend) {
    callback(MOCK_USERS);
    return () => {};
  }
  const q = query(collection(db, 'public_profiles'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => d.data() as UserProfile));
  }, (error) => handleFirestoreError(error));
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

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    });
  } catch (error) {
    console.error('Compression error', error);
    return file;
  }
}

export async function submitDonation(amount: number, file: File, familyId: string) {
  if (!isRealBackend) {
    MOCK_PAYMENTS.push({
      id: `mock_donation_${Date.now()}`,
      familyId,
      month: format(new Date(), 'yyyy-MM'),
      amount,
      proofUrl: URL.createObjectURL(file),
      status: 'analyzing',
      type: 'doacao',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return;
  }
  try {
    const paymentId = `donation_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const compressedFile = await compressImage(file);
    const storageRef = ref(storage, `proofs/${paymentId}`);
    await uploadBytes(storageRef, compressedFile);
    const url = await getDownloadURL(storageRef);

    const docRef = doc(db, 'payments', paymentId);
    await setDoc(docRef, {
      familyId,
      month: format(new Date(), 'yyyy-MM'),
      amount,
      proofUrl: url,
      status: 'analyzing',
      type: 'doacao',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    await addNotification({
      userId: 'admins',
      title: 'Nova Doação',
      message: `Uma doação de R$ ${amount.toFixed(2)} enviou comprovante e aguarda análise.`
    }).catch(e => console.warn('Notification error', e));
  } catch(e) { handleFirestoreError(e); }
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
    let url = '';
    try {
      const compressedFile = await compressImage(file);
      const storageRef = ref(storage, `proofs/${paymentId}_${Date.now()}`);
      await uploadBytes(storageRef, compressedFile);
      url = await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Storage upload error:", err);
      throw new Error("Erro ao enviar comprovante. O Firebase Storage não está configurado.");
    }
    const docRef = doc(db, 'payments', paymentId);
    await updateDoc(docRef, {
      status: 'analyzing',
      proofUrl: url,
      updatedAt: new Date().toISOString()
    });
    
    await addNotification({
      userId: 'admins',
      title: 'Comprovante Recebido',
      message: `Um novo comprovante foi anexado a uma cobrança e aguarda avaliação.`
    }).catch(e => console.warn('Notification error', e));
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

export async function deletePayment(paymentId: string) {
  if (!isRealBackend) {
    const idx = MOCK_PAYMENTS.findIndex(p => p.id === paymentId);
    if (idx !== -1) MOCK_PAYMENTS.splice(idx, 1);
    window.dispatchEvent(new Event('mockDataChanged'));
    return;
  }
  try {
    await deleteDoc(doc(db, 'payments', paymentId));
  } catch(e) { handleFirestoreError(e); }
}

export async function createCharges(charges: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'proofUrl'>[]) {
  if (!isRealBackend) {
    charges.forEach(c => {
      MOCK_PAYMENTS.push({
        ...c,
        id: `mock_charge_${Date.now()}_${Math.random()}`,
        proofUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    return;
  }
  try {
    for (const charge of charges) {
      const docRef = doc(collection(db, 'payments'));
      await setDoc(docRef, {
        ...charge,
        proofUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
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
    let url = '';
    try {
      const storageRef = ref(storage, `receipts/${newDoc.id}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      url = await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Storage upload error:", err);
      throw new Error("Erro ao enviar recibo. O Firebase Storage não está configurado.");
    }
    
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
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data() : {};
    
    const safeData: any = {};
    if(data.name !== undefined) safeData.name = data.name;
    if(data.phone !== undefined) safeData.phone = data.phone;
    if(data.dogName !== undefined) safeData.dogName = data.dogName;
    if(data.role !== undefined) safeData.role = data.role;
    if(data.familyId !== undefined) safeData.familyId = data.familyId;
    if(data.userStatus !== undefined) safeData.userStatus = data.userStatus;
    
    // Fallbacks for missing fields in older documents to satisfy strict Firestore schema rules
    if (existing.dogName === undefined && safeData.dogName === undefined) safeData.dogName = '';
    if (existing.phone === undefined && safeData.phone === undefined) safeData.phone = '';
    if (existing.role === undefined && safeData.role === undefined) safeData.role = 'resident';

    if (photoFile) {
      try {
        const storageRef = ref(storage, `users/${userId}_${Date.now()}`);
        await uploadBytes(storageRef, photoFile);
        safeData.photoUrl = await getDownloadURL(storageRef);
      } catch (err: any) {
        console.error("Storage upload error:", err);
        throw new Error("O Firebase Storage não está configurado ou você não tem permissão. Verifique as regras do Storage no console do Firebase.");
      }
    } else if (data.photoUrl !== undefined) {
      safeData.photoUrl = data.photoUrl;
    } else if (existing.photoUrl === undefined) {
      safeData.photoUrl = '';
    }
    
    // Clean up or migrate orphaned payments if familyId changed
    if (safeData.familyId !== undefined && safeData.familyId !== userId && existing.familyId !== safeData.familyId) {
      const oldFamilyId = existing.familyId || userId;
      const orphanedQuery = query(collection(db, 'payments'), where('familyId', '==', oldFamilyId));
      const orphanedSnap = await getDocs(orphanedQuery);
      for (const d of orphanedSnap.docs) {
        if (d.data().status === 'pending' && (!d.data().type || d.data().type === 'mensalidade')) {
          // Delete duplicate pending
          await deleteDoc(d.ref).catch(()=>{});
        } else {
          // Migrate history (approved, analyzing, rateio, doacao) to the new familyId
          await updateDoc(d.ref, { familyId: safeData.familyId }).catch(()=>{});
        }
      }
    }
    
    await updateDoc(userRef, safeData);
    
    // Also update public_profiles
    const publicRef = doc(db, 'public_profiles', userId);
    const pubSnap = await getDoc(publicRef);
    const publicData: any = {};
    if(safeData.name !== undefined) publicData.name = safeData.name;
    if(safeData.dogName !== undefined) publicData.dogName = safeData.dogName;
    if(safeData.role !== undefined) publicData.role = safeData.role;
    if(safeData.photoUrl !== undefined) publicData.photoUrl = safeData.photoUrl;
    if(safeData.familyId !== undefined) publicData.familyId = safeData.familyId;

    if (pubSnap.exists()) {
      if (Object.keys(publicData).length > 0) {
        await updateDoc(publicRef, publicData);
      }
    } else {
      // Create if it doesn't exist
      const newDocData: any = {
        uid: userId,
        name: safeData.name ?? existing.name ?? '',
        photoUrl: safeData.photoUrl ?? existing.photoUrl ?? '',
        dogName: safeData.dogName ?? existing.dogName ?? '',
        role: safeData.role ?? existing.role ?? 'resident',
        createdAt: existing.createdAt ?? new Date().toISOString()
      };
      if (safeData.familyId || existing.familyId) {
        newDocData.familyId = safeData.familyId || existing.familyId;
      }
      await setDoc(publicRef, newDocData);
    }
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToConfig(callback: (config: AppConfig | null) => void) {
  if (!isRealBackend) {
    callback(MOCK_CONFIG);
    return () => {};
  }
  const q = doc(db, 'settings', 'config');
  return onSnapshot(q, snap => {
    if (snap.exists()) {
      callback(snap.data() as AppConfig);
    } else {
      // Default fallback completely removed. It must be created by admin
      callback(null);
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
    const existing = snap.exists() ? snap.data() : {};
    
    await setDoc(q, {
      pixKey: data.pixKey ?? existing.pixKey ?? '',
      monthlyAmount: data.monthlyAmount ?? existing.monthlyAmount ?? 30,
      dueDateDay: data.dueDateDay ?? existing.dueDateDay ?? 10,
      paymentInstructions: data.paymentInstructions ?? existing.paymentInstructions ?? '',
      updatedAt: new Date().toISOString()
    });
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
      try {
        const storageRef = ref(storage, `pets/${Date.now()}_${photoFile.name}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Storage upload error:", err);
        throw new Error("Erro ao enviar foto do Pet. Verifique o Firebase Storage.");
      }
    }
    const newDoc = doc(collection(db, 'pets'));
    await setDoc(newDoc, {
      ...data,
      photoUrl,
      createdAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function updatePet(petId: string, data: Partial<Omit<Pet, 'id' | 'createdAt'>>, photoFile?: File) {
  if (!isRealBackend) {
    const petIndex = MOCK_PETS.findIndex(p => p.id === petId);
    if (petIndex >= 0) {
      if (photoFile) {
        data.photoUrl = URL.createObjectURL(photoFile);
      }
      MOCK_PETS[petIndex] = { ...MOCK_PETS[petIndex], ...data };
    }
    return;
  }
  try {
    const petRef = doc(db, 'pets', petId);
    let updateData: any = { ...data };
    
    if (photoFile) {
      try {
        const storageRef = ref(storage, `pets/${Date.now()}_${photoFile.name}`);
        await uploadBytes(storageRef, photoFile);
        updateData.photoUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Storage upload error:", err);
        throw new Error("Erro ao enviar foto do Pet. Verifique o Firebase Storage.");
      }
    }
    
    await updateDoc(petRef, updateData);
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
    const newId = Date.now().toString();
    MOCK_EVENTS.push({ ...data, id: newId, createdAt: new Date().toISOString() });
    return newId;
  }
  try {
    const d = doc(collection(db, 'events'));
    await setDoc(d, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return d.id;
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

export async function markEventAsRead(eventId: string, userId: string) {
  if (!isRealBackend) {
    const ev = MOCK_EVENTS.find(e => e.id === eventId);
    if (ev) {
      if (!ev.readBy) ev.readBy = [];
      if (!ev.readBy.includes(userId)) ev.readBy.push(userId);
    }
    return;
  }
  try {
    // We would ideally use arrayUnion here.
    const evRef = doc(db, 'events', eventId);
    const snap = await getDoc(evRef);
    if (snap.exists()) {
      const data = snap.data();
      const readBy = data.readBy || [];
      if (!readBy.includes(userId)) {
        await updateDoc(evRef, { readBy: [...readBy, userId] });
      }
    }
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToMyNotifications(userId: string, role: string, callback: (n: AppNotification[]) => void) {
  if (!isRealBackend) {
    const targets = [userId, 'all'];
    if (role === 'admin') targets.push('admins');
    callback(MOCK_NOTIFICATIONS.filter(n => targets.includes(n.userId)));
    return () => {};
  }
  const targets = [userId, 'all'];
  if (role === 'admin') targets.push('admins');
  const q1 = query(collection(db, 'notifications'), where('userId', 'in', targets));
  return onSnapshot(q1, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
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

export async function addNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
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

export function subscribeToAllPosts(limitAmount: number, callback: (posts: AppPost[]) => void) {
  if (!isRealBackend) {
    callback([...MOCK_POSTS].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limitAmount));
    return () => {};
  }
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitAmount));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppPost)));
  }, handleFirestoreError);
}

export async function addPost(data: Omit<AppPost, 'id' | 'createdAt' | 'likedBy'>, mediaFile?: File) {
  if (!isRealBackend) {
    const newId = Date.now().toString();
    const mediaUrl = mediaFile ? URL.createObjectURL(mediaFile) : undefined;
    MOCK_POSTS.push({ ...data, id: newId, mediaUrl, likedBy: [], createdAt: new Date().toISOString() });
    return newId;
  }
  try {
    const d = doc(collection(db, 'posts'));
    let url = data.mediaUrl;
    if (mediaFile) {
      const fileToUpload = data.mediaType === 'image' ? await compressImage(mediaFile) : mediaFile;
      const storageRef = ref(storage, `posts/${Date.now()}_${mediaFile.name}`);
      await uploadBytes(storageRef, fileToUpload);
      url = await getDownloadURL(storageRef);
    }
    await setDoc(d, {
      ...data,
      ...(url && { mediaUrl: url }),
      likedBy: [],
      createdAt: new Date().toISOString()
    });
    return d.id;
  } catch(e) { handleFirestoreError(e); }
}

export async function deletePost(postId: string) {
  if (!isRealBackend) {
    MOCK_POSTS = MOCK_POSTS.filter(e => e.id !== postId);
    return;
  }
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    const postData = postSnap.data() as AppPost;

    if (postData.mediaUrl && postData.mediaUrl.includes('firebasestorage')) {
      const storageRef = ref(storage, postData.mediaUrl);
      await deleteObject(storageRef).catch(() => console.error('Failed to delete media'));
    }

    const commentsQ = query(collection(db, 'postComments'), where('postId', '==', postId));
    const commentsSnap = await getDocs(commentsQ);
    for (const commentDoc of commentsSnap.docs) {
      await deleteDoc(commentDoc.ref).catch(() => {});
    }
    await deleteDoc(postRef);
  } catch(e) { handleFirestoreError(e); }
}

export async function updatePost(postId: string, content: string, tags: string[]) {
  if (!isRealBackend) {
    const p = MOCK_POSTS.find(x => x.id === postId);
    if (p) {
      p.content = content;
      p.tags = tags;
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'posts', postId), { content, tags });
  } catch(e) { handleFirestoreError(e); }
}

export function subscribeToComments(postId: string, callback: (comments: any[]) => void) {
  if (!isRealBackend) {
    const fn = () => {
      callback([...MOCK_POST_COMMENTS].filter(c => c.postId === postId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    };
    fn();
    // Simulate real-time by polling or interval for mock, or just let it update on explicit events
    const interval = setInterval(fn, 2000);
    return () => clearInterval(interval);
  }
  const q = query(collection(db, 'postComments'), where('postId', '==', postId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, handleFirestoreError);
}

export async function addComment(postId: string, authorId: string, content: string) {
  if (!isRealBackend) {
    MOCK_POST_COMMENTS.push({ id: Date.now().toString(), postId, authorId, content, createdAt: new Date().toISOString() });
    return;
  }
  try {
    const d = doc(collection(db, 'postComments'));
    await setDoc(d, {
      postId,
      authorId,
      content,
      createdAt: new Date().toISOString()
    });
  } catch(e) { handleFirestoreError(e); }
}

export async function deleteComment(commentId: string) {
  if (!isRealBackend) {
    MOCK_POST_COMMENTS = MOCK_POST_COMMENTS.filter(c => c.id !== commentId);
    return;
  }
  try {
    await deleteDoc(doc(db, 'postComments', commentId));
  } catch(e) { handleFirestoreError(e); }
}

export async function togglePostLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (!isRealBackend) {
    const p = MOCK_POSTS.find(x => x.id === postId);
    if (p) {
      if (currentlyLiked) p.likedBy = p.likedBy.filter(x => x !== userId);
      else if (!p.likedBy.includes(userId)) p.likedBy.push(userId);
    }
    return;
  }
  try {
    const refDoc = doc(db, 'posts', postId);
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      const p = snap.data() as AppPost;
      const likedBy = p.likedBy || [];
      const newLikedBy = currentlyLiked ? likedBy.filter(x => x !== userId) : [...new Set([...likedBy, userId])];
      await updateDoc(refDoc, { likedBy: newLikedBy });
    }
  } catch(e) { handleFirestoreError(e); }
}

export async function exportFullBackup(): Promise<Blob | null> {
  if (!isRealBackend) {
    alert("Apenas dados locais. Use o banco real para backup com mídias.");
    return null;
  }
  const collectionsToExport = ['users', 'public_profiles', 'pets', 'payments', 'expenses', 'events', 'notifications', 'posts', 'postComments', 'settings'];
  const backupData: Record<string, any[]> = {};
  const urlsToDownload = new Set<string>();
  
  try {
    for (const colName of collectionsToExport) {
      const snap = await getDocs(collection(db, colName));
      const colData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      backupData[colName] = colData;
      
      // Collect media URLs
      colData.forEach(item => {
        if (item.photoUrl && typeof item.photoUrl === 'string' && item.photoUrl.includes('firebasestorage')) urlsToDownload.add(item.photoUrl);
        if (item.proofUrl && typeof item.proofUrl === 'string' && item.proofUrl.includes('firebasestorage')) urlsToDownload.add(item.proofUrl);
        if (item.receiptUrl && typeof item.receiptUrl === 'string' && item.receiptUrl.includes('firebasestorage')) urlsToDownload.add(item.receiptUrl);
        if (item.mediaUrl && typeof item.mediaUrl === 'string' && item.mediaUrl.includes('firebasestorage')) urlsToDownload.add(item.mediaUrl);
      });
    }

    const zip = new JSZip();
    zip.file('backup.json', JSON.stringify(backupData, null, 2));

    const mediaFolder = zip.folder('media');
    if (mediaFolder) {
      for (const url of Array.from(urlsToDownload)) {
        try {
          const storageRef = ref(storage, url);
          // Wait to not overload
          const blob = await getBlob(storageRef);
          mediaFolder.file(storageRef.fullPath, blob);
        } catch(e) {
          console.warn("Failed to download media for backup:", url, e);
        }
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  } catch (e) {
    handleFirestoreError(e);
    return null;
  }
}

export async function restoreZippedBackup(zipFile: File): Promise<void> {
  if (!isRealBackend) {
    alert("Você está usando o modo Mock. Não é possível restaurar o ZIP.");
    return;
  }
  try {
    const zip = new JSZip();
    const unzipped = await zip.loadAsync(zipFile);
    
    // 1. Restore JSON
    const jsonFile = unzipped.file('backup.json');
    if (jsonFile) {
      const jsonContent = await jsonFile.async('string');
      const backupData = JSON.parse(jsonContent);
      
      for (const [colName, docs] of Object.entries(backupData)) {
        if (Array.isArray(docs)) {
          for (const docData of docs) {
            const { id, ...data } = docData;
            await setDoc(doc(db, colName, id), data);
          }
        }
      }
    }

    // 2. Restore Media
    const mediaFolder = unzipped.folder('media');
    if (mediaFolder) {
      // iterate over files in the media folder
      mediaFolder.forEach(async (relativePath, file) => {
        if (!file.dir) {
          try {
            const fileBlob = await file.async('blob');
            const storageRef = ref(storage, relativePath);
            await uploadBytes(storageRef, fileBlob);
          } catch(e) {
             console.warn("Failed to restore file", relativePath);
          }
        }
      });
    }
    
    alert('Restauração do banco e mídias concluída!');
  } catch(e) {
    handleFirestoreError(e);
    throw e;
  }
}

function handleFirestoreError(error: unknown) {
  console.error("Firestore error:", error);
  // Ideally parse exactly into FirestoreErrorInfo
  throw error;
}

export async function deleteUserAndData(userId: string) {
  if (!isRealBackend) {
    const index = MOCK_USERS.findIndex(u => u.uid === userId);
    if (index > -1) MOCK_USERS.splice(index, 1);
    return;
  }
  try {
    // 1. Delete all pets of the user
    const petsQ = query(collection(db, 'pets'), where('ownerId', '==', userId));
    const petsSnap = await getDocs(petsQ);
    for (const petDoc of petsSnap.docs) {
      await deleteDoc(petDoc.ref).catch(() => {});
    }

    // 2. Delete all posts of the user
    const postsQ = query(collection(db, 'posts'), where('authorId', '==', userId));
    const postsSnap = await getDocs(postsQ);
    for (const postDoc of postsSnap.docs) {
      await deleteDoc(postDoc.ref).catch(() => {});
    }
    
    // 3. Delete payments tied to familyId
    const paymentsQ = query(collection(db, 'payments'), where('familyId', '==', userId));
    const paymentsSnap = await getDocs(paymentsQ);
    for (const payDoc of paymentsSnap.docs) {
      await deleteDoc(payDoc.ref).catch(() => {});
    }

    // 4. Delete from public_profiles
    await deleteDoc(doc(db, 'public_profiles', userId)).catch(() => {});

    // 5. Delete user profile
    await deleteDoc(doc(db, 'users', userId)).catch(() => {});
  } catch (e) { handleFirestoreError(e); }
}
