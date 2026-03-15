import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCJG8f3QvTot45rVCw3qflz-lDoMY9eAR8',
  authDomain: 'nutriplan-papu.firebaseapp.com',
  projectId: 'nutriplan-papu',
  storageBucket: 'nutriplan-papu.firebasestorage.app',
  messagingSenderId: '934220079737',
  appId: '1:934220079737:web:7ae4215f15beaf7038eaa8',
  measurementId: 'G-3XC1EEMYH3',
};

// En Expo/React Native usamos app, auth y firestore. Analytics no se usa aqui.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
