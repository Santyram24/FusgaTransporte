import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { useNavigation } from '@react-navigation/native';

const SignUpScreen = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('masculino');
  const [tipoUsuario, setTipoUsuario] = useState('cliente');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [placa, setPlaca] = useState('');

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        email,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        edad,
        sexo,
        tipoUsuario,
        documento,
        telefono,
        estado: 'disponible', // estado inicial para conductores
      };

      // Solo si es conductor, agregar datos del vehículo
      if (tipoUsuario === 'conductor') {
        userData.vehiculo = vehiculo;
        userData.placa = placa;
      }

      await setDoc(doc(db, 'usuarios', user.uid), userData);

      Alert.alert('Registro exitoso', 'Tu cuenta ha sido creada correctamente.', [
        { text: 'OK', onPress: () => navigation.navigate('SignIn') },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registro</Text>

      <TextInput style={styles.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput style={styles.input} placeholder="Apellido paterno" value={apellidoPaterno} onChangeText={setApellidoPaterno} />
      <TextInput style={styles.input} placeholder="Apellido materno" value={apellidoMaterno} onChangeText={setApellidoMaterno} />
      <TextInput style={styles.input} placeholder="Número de documento" value={documento} onChangeText={setDocumento} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Edad" value={edad} onChangeText={setEdad} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={styles.label}>Sexo</Text>
      <Picker selectedValue={sexo} onValueChange={(val) => setSexo(val)} style={styles.picker}>
        <Picker.Item label="Masculino" value="masculino" />
        <Picker.Item label="Femenino" value="femenino" />
        <Picker.Item label="Otro" value="otro" />
      </Picker>

      <Text style={styles.label}>Tipo de usuario</Text>
      <Picker selectedValue={tipoUsuario} onValueChange={(val) => setTipoUsuario(val)} style={styles.picker}>
        <Picker.Item label="Cliente" value="cliente" />
        <Picker.Item label="Conductor" value="conductor" />
      </Picker>

      {tipoUsuario === 'conductor' && (
        <>
          <TextInput style={styles.input} placeholder="Nombre del vehículo" value={vehiculo} onChangeText={setVehiculo} />
          <TextInput style={styles.input} placeholder="Placa del vehículo" value={placa} onChangeText={setPlaca} />
        </>
      )}

      <Button title="Registrarse" onPress={handleSignUp} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20, paddingBottom: 40,
  },
  title: {
    fontSize: 24, marginBottom: 20, alignSelf: 'center',
  },
  input: {
    borderWidth: 1, borderColor: '#ccc', marginBottom: 12, padding: 10, borderRadius: 5,
  },
  picker: {
    marginBottom: 12, backgroundColor: '#eee',
  },
  label: {
    marginTop: 10, marginBottom: 5, fontWeight: 'bold',
  },
});

export default SignUpScreen;
