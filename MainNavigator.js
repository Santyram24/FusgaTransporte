// MainNavigator.js
import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/firebase';

// Screens
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import ClientDashboard from './screens/ClientDashboard';
import DriverDashboard from './screens/DriverDashboard';
import ChatScreen from './screens/ChatScreen';
import ConfigScreen from './screens/ConfigScreen';
import SplashScreen from './screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const [usuario, setUsuario] = useState(null);
  const [tipoUsuario, setTipoUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTipoUsuario(docSnap.data().tipoUsuario);
          setUsuario(user);
        }
      } else {
        setUsuario(null);
        setTipoUsuario(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <Stack.Navigator initialRouteName={usuario ? (tipoUsuario === 'cliente' ? 'ClientDashboard' : 'DriverDashboard') : 'SignIn'}>
      {!usuario ? (
        // Rutas para usuarios no autenticados
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : (
        // Rutas para usuarios autenticados
        <>
          {tipoUsuario === 'cliente' ? (
            <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
          ) : (
            <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
          )}
          {/* Aseguramos que ChatScreen siempre esté disponible para usuarios autenticados */}
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
          <Stack.Screen name="ConfigScreen" component={ConfigScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}