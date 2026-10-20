import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Configuration Firebase avec fallback résilient
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyFakeKeyStockPro2026Preview",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "stock-pro-tn.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stock-pro-tn",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "stock-pro-tn.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475612",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475612:web:abcd1234efgh"
};

let appInstance;
let firestoreDb: any = null;
let firebaseAuth: any = null;
let isConfigured = false;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firestoreDb = getFirestore(appInstance);
  firebaseAuth = getAuth(appInstance);
  // Vérifie si une vraie clé a été fournie
  if (import.meta.env.VITE_FIREBASE_API_KEY && !import.meta.env.VITE_FIREBASE_API_KEY.includes('FakeKey')) {
    isConfigured = true;
  }
} catch (e) {
  console.warn("Initialisation Firebase en mode déconnecté / local:", e);
}

export const app = appInstance;
export const db = firestoreDb;
export const auth = firebaseAuth;
export const isFirebaseLive = isConfigured;

export async function testConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Client Firebase hors-ligne. Le stockage local transactionnel prend le relais.");
    }
    return false;
  }
}
