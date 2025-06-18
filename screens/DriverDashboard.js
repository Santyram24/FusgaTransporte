// DriverDashboard.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, db } from '../firebase/firebase';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

const DriverDashboard = () => {
  const navigation = useNavigation();
  const [estado, setEstado] = useState('disponible');
  const [clientes, setClientes] = useState([]);
  const [currentTipoUsuario, setCurrentTipoUsuario] = useState(''); // Estado para el tipo de usuario actual

  useEffect(() => {
    const fetchUserDataAndClients = async () => {
      // Obtener el tipo de usuario del conductor actual
      if (auth.currentUser) {
        const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setEstado(userDocSnap.data().estado);
          setCurrentTipoUsuario(userDocSnap.data().tipoUsuario);
        }
      }

      // Cargar chats (clientes)
      const q = query(collection(db, 'usuarios'), where('tipoUsuario', '==', 'cliente'));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(lista);
    };
    fetchUserDataAndClients();
  }, []);

  const cambiarEstado = async () => {
    const nuevoEstado = estado === 'disponible' ? 'ocupado' : 'disponible';
    await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), {
      estado: nuevoEstado
    });
    setEstado(nuevoEstado);
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    navigation.navigate('SignIn');
  };

  const generarChatId = (usuario1Id, usuario2Id) => {
    // Genera un ChatId consistente ordenando alfabéticamente los IDs
    const ids = [usuario1Id, usuario2Id].sort();
    return `${ids[0]}_${ids[1]}`;
  };

  const abrirChat = (clienteId, clienteNombre) => {
    const chatId = generarChatId(auth.currentUser.uid, clienteId);
    navigation.navigate('ChatScreen', {
      chatId: chatId,
      receptorId: clienteId,
      receptorNombre: clienteNombre,
      tipoUsuario: currentTipoUsuario // Pasar el tipo de usuario actual
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido, Conductor</Text>
      <Button title="Configuración de cuenta" onPress={() => navigation.navigate('ConfigScreen')} />
      <Button title="Cerrar sesión" color="red" onPress={cerrarSesion} />
      <Text style={styles.subtitle}>Estado actual: {estado.toUpperCase()}</Text>
      <Button title="Cambiar estado" onPress={cambiarEstado} />

      <Text style={styles.subtitle}>Clientes disponibles para chatear:</Text>
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => abrirChat(item.id, `${item.nombre} ${item.apellidoPaterno}`)}>
            <Text>{item.nombre} {item.apellidoPaterno}</Text>
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
});

export default DriverDashboard;