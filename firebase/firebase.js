// firebase/firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDDtgtsZx3FYYFkcMmolZTwhOiNXukh8Uk",

  authDomain: "fusga-transporte-82875.firebaseapp.com",

  projectId: "fusga-transporte-82875",

  storageBucket: "fusga-transporte-82875.firebasestorage.app",

  messagingSenderId: "908367615020",

  appId: "1:908367615020:web:a3ec8ea01173b4c1716d89"
};

// Inicializa la app
const app = initializeApp(firebaseConfig);

// Inicializa la autenticación con persistencia en React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// 🔥 Inicializa Firestore
const db = getFirestore(app);

// Exporta ambos para usarlos en cualquier parte del proyecto
export { auth, db };