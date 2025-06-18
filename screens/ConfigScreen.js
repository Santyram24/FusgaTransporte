import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const ConfigScreen = () => {
  const [datos, setDatos] = useState({});
  const [tipoUsuario, setTipoUsuario] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      const docRef = doc(db, 'usuarios', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDatos(docSnap.data());
        setTipoUsuario(docSnap.data().tipoUsuario);
      }
    };
    cargarDatos();
  }, []);

  const actualizar = async () => {
    try {
      const ref = doc(db, 'usuarios', auth.currentUser.uid);
      await updateDoc(ref, datos);
      Alert.alert('Éxito', 'Datos actualizados correctamente');
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al actualizar');
    }
  };

  const handleChange = (campo, valor) => {
    setDatos({ ...datos, [campo]: valor });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración de cuenta</Text>
      <TextInput style={styles.input} placeholder="Nombre" value={datos.nombre} onChangeText={(t) => handleChange('nombre', t)} />
      <TextInput style={styles.input} placeholder="Apellido paterno" value={datos.apellidoPaterno} onChangeText={(t) => handleChange('apellidoPaterno', t)} />
      <TextInput style={styles.input} placeholder="Apellido materno" value={datos.apellidoMaterno} onChangeText={(t) => handleChange('apellidoMaterno', t)} />
      <TextInput style={styles.input} placeholder="Número de teléfono" value={datos.telefono} onChangeText={(t) => handleChange('telefono', t)} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Número de documento" value={datos.documento} onChangeText={(t) => handleChange('documento', t)} />

      {tipoUsuario === 'conductor' && (
        <>
          <TextInput style={styles.input} placeholder="Nombre del vehículo" value={datos.nombreVehiculo} onChangeText={(t) => handleChange('nombreVehiculo', t)} />
          <TextInput style={styles.input} placeholder="Placa del vehículo" value={datos.placaVehiculo} onChangeText={(t) => handleChange('placaVehiculo', t)} />
        </>
      )}
      <Button title="Guardar cambios" onPress={actualizar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 5 },
});

export default ConfigScreen;
