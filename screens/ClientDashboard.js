// ClientDashboard.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, db } from '../firebase/firebase';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'; // Importar doc y getDoc

const ClientDashboard = () => {
  const navigation = useNavigation();
  const [conductores, setConductores] = useState([]);
  const [currentTipoUsuario, setCurrentTipoUsuario] = useState(''); // Estado para el tipo de usuario actual

  useEffect(() => {
    const fetchUserDataAndDrivers = async () => {
      // Obtener el tipo de usuario del cliente actual
      if (auth.currentUser) {
        const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentTipoUsuario(userDocSnap.data().tipoUsuario);
        }
      }

      // Escuchar en tiempo real a los conductores
      const q = query(collection(db, 'usuarios'), where('tipoUsuario', '==', 'conductor'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConductores(lista);
      });

      return () => unsubscribe();
    };

    fetchUserDataAndDrivers();
  }, []);

  const generarChatId = (usuario1Id, usuario2Id) => {
    // Genera un ChatId consistente ordenando alfabéticamente los IDs
    const ids = [usuario1Id, usuario2Id].sort();
    return `${ids[0]}_${ids[1]}`;
  };

  const abrirChat = (conductorId, conductorNombre) => {
    const chatId = generarChatId(auth.currentUser.uid, conductorId);
    navigation.navigate('ChatScreen', {
      chatId: chatId,
      receptorId: conductorId,
      receptorNombre: conductorNombre,
      tipoUsuario: currentTipoUsuario // Pasar el tipo de usuario actual
    });
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    navigation.navigate('SignIn');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido, Cliente</Text>
      <Button title="Configuración de cuenta" onPress={() => navigation.navigate('ConfigScreen')} />
      <Button title="Cerrar sesión" color="red" onPress={cerrarSesion} />

      <Text style={styles.subtitle}>Conductores disponibles:</Text>
      <FlatList
        data={conductores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => abrirChat(item.id, `${item.nombre} ${item.apellidoPaterno}`)}
          >
            <Text style={styles.name}>
              {item.nombre} {item.apellidoPaterno} ({item.estado || 'desconocido'})
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, marginVertical: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  name: { fontSize: 16 },
});

export default ClientDashboard;