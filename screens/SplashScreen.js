import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1e90ff" />
      <Text style={styles.text}>Cargando aplicación...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#555'
  }
});
