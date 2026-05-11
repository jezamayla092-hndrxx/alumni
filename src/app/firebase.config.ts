import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyDaa2E345qMOaNNZ2b1g_wXYti5fPq2Bsg',
  authDomain: 'atms-89ea1.firebaseapp.com',
  projectId: 'atms-89ea1',
  storageBucket: 'atms-89ea1.appspot.com',
  messagingSenderId: '578767855110',
  appId: '1:578767855110:web:01a13039f9cbba27b1ed87',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);