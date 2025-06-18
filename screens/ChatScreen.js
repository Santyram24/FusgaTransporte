import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  TextInput, // Necesario para el input de dirección y tiempo de llegada
  KeyboardAvoidingView, // Para manejar el teclado
  Platform, // Para KeyboardAvoidingView
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import * as Location from 'expo-location';
import { useRoute } from '@react-navigation/native';

// ¡IMPORTANTE! Tu clave de la API de Google Maps Static
const Maps_STATIC_API_KEY = 'AIzaSyB5FKd7qrbCbQWxK_mBHrlOehufb8A_jvY'; // <-- ¡Tu clave aquí!

const ChatScreen = () => {
  const route = useRoute();
  const { chatId, receptorId, receptorNombre, tipoUsuario } = route.params || {};

  const [mensajes, setMensajes] = useState([]);
  const [casoActual, setCasoActual] = useState(1); // Nuevo estado para controlar el caso del chat
  const [cargandoChat, setCargandoChat] = useState(true);
  const [mostrarCampoDireccion, setMostrarCampoDireccion] = useState(false); // Para mostrar/ocultar el input de dirección
  const [direccionCliente, setDireccionCliente] = useState(''); // Estado para la dirección del cliente
  const [mostrarCampoTiempoLlegada, setMostrarCampoTiempoLlegada] = useState(false); // Para mostrar/ocultar el input de tiempo de llegada
  const [tiempoLlegada, setTiempoLlegada] = useState(''); // Estado para el tiempo de llegada
  const [mensajeLibreConductor, setMensajeLibreConductor] = useState(''); // Para el chat libre del conductor

  const flatListRef = useRef(null);

  // Definición de los mensajes predefinidos por caso y tipo de usuario
  const getMensajesPorCaso = (caso, userType) => {
    switch (caso) {
      case 1:
        return userType === 'cliente'
          ? ['¿Está disponible el servicio?']
          : [
              'Sí, estoy disponible, ¿confirma usted el servicio?',
              'No, por el momento no estoy disponible, sin embargo puedes comunicarte con otro vehículo',
            ];
      case 2:
        return userType === 'cliente'
          ? ['Sí, confirmo mi servicio', 'No, cancelo el servicio mil disculpas']
          : ['Por favor envie su ubicación.'];
      case 3:
        return userType === 'cliente'
          ? [
              'Reconozco el vehículo, iré para allá.',
              'Espere un momento, estaré ahí pronto.',
              'No lo encuentro, ¿podría indicarme dónde se encuentra?',
            ]
          : ['He llegado a su ubicación.', 'Claro, puedo esperar 5 minutos.'];
      default:
        return [];
    }
  };

  useEffect(() => {
    if (!chatId || !receptorId || !tipoUsuario) {
      setCargandoChat(false);
      return;
    }

    const chatDocRef = doc(db, 'chats', chatId);

    const unsubscribeChat = onSnapshot(chatDocRef, async (chatSnap) => {
      if (!chatSnap.exists()) {
        // Inicializar chat si no existe
        await setDoc(chatDocRef, {
          participantes: [auth.currentUser.uid, receptorId],
          creadoEn: new Date(),
          ultimoMensaje: '',
          casoActual: 1, // Inicia en el caso 1
        });
        setCasoActual(1);
      } else {
        // Cargar casoActual desde Firestore
        setCasoActual(chatSnap.data().casoActual || 1);
      }

      // Suscribirse a los mensajes del chat
      const q = query(collection(db, 'chats', chatId, 'mensajes'), orderBy('timestamp', 'asc'));
      const unsubscribeMensajes = onSnapshot(
        q,
        (snapshot) => {
          const datos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setMensajes(datos);
          setCargandoChat(false);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        (error) => {
          console.error('Error al cargar mensajes: ', error);
          Alert.alert('Error', 'No se pudieron cargar los mensajes del chat.');
          setCargandoChat(false);
        }
      );

      // Limpiar la suscripción de mensajes cuando cambie el caso del chat
      return () => unsubscribeMensajes();
    }, (error) => {
      console.error('Error al cargar documento del chat: ', error);
      Alert.alert('Error', 'No se pudo cargar la información del chat.');
      setCargandoChat(false);
    });

    return () => unsubscribeChat();
  }, [chatId, receptorId, tipoUsuario]);

  // Función para reiniciar el chat
  const reiniciarChat = async () => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        casoActual: 1,
        // Limpiar otros estados relacionados con el caso si es necesario
      });
      // Añadir mensaje de fin de conversación
      await addDoc(collection(db, 'chats', chatId, 'mensajes'), {
        texto: 'La conversación ha terminado. El chat se ha reiniciado.',
        emisor: 'sistema', // Identificador para mensajes del sistema
        timestamp: new Date(),
      });
      setMostrarCampoDireccion(false);
      setDireccionCliente('');
      setMostrarCampoTiempoLlegada(false);
      setTiempoLlegada('');
      setMensajeLibreConductor('');
      Alert.alert('Chat Reiniciado', 'La conversación ha vuelto al inicio.');
    } catch (error) {
      console.error('Error al reiniciar chat: ', error);
      Alert.alert('Error', 'No se pudo reiniciar el chat.');
    }
  };

  const enviarMensaje = async (texto, isSystemMessage = false) => {
    if (!texto.trim() && !isSystemMessage) return;

    try {
      await addDoc(collection(db, 'chats', chatId, 'mensajes'), {
        texto: texto.trim(),
        emisor: isSystemMessage ? 'sistema' : auth.currentUser.uid,
        receptor: isSystemMessage ? '' : receptorId,
        timestamp: new Date(),
      });

      // Lógica para el avance de casos o reinicio
      if (!isSystemMessage) {
        if (casoActual === 1) {
          if (tipoUsuario === 'conductor') {
            if (texto === 'Sí, estoy disponible, ¿confirma usted el servicio?') {
              await updateDoc(doc(db, 'chats', chatId), { casoActual: 2 });
              setCasoActual(2);
            } else if (texto === 'No, por el momento no estoy disponible, sin embargo puedes comunicarte con otro vehículo') {
              await reiniciarChat();
            }
          }
        } else if (casoActual === 2) {
          if (tipoUsuario === 'cliente') {
            if (texto === 'Sí, confirmo mi servicio') {
              setMostrarCampoDireccion(true); // Muestra el campo para la dirección
            } else if (texto === 'No, cancelo el servicio mil disculpas') {
              await addDoc(collection(db, 'chats', chatId, 'mensajes'), {
                texto: 'El cliente ha cancelado el servicio.',
                emisor: 'sistema',
                timestamp: new Date(),
              });
              await reiniciarChat();
            }
          } else if (tipoUsuario === 'conductor') {
            if (texto === 'Por favor envie su ubicación.') {
              setMostrarCampoTiempoLlegada(true); // Muestra el campo para el tiempo de llegada
            }
          }
        }
        // El Caso 3 no tiene avance automático, el conductor lo finaliza manualmente
      }
    } catch (error) {
      console.error('Error al enviar mensaje: ', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    }
  };

  const enviarUbicacionYDireccion = async () => {
    if (tipoUsuario !== 'cliente') {
      Alert.alert('Permiso denegado', 'Solo el cliente puede enviar su ubicación y dirección.');
      return;
    }
    if (!direccionCliente.trim()) {
      Alert.alert('Campo vacío', 'Por favor, introduce tu dirección.');
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'No se concedió permiso para acceder a la ubicación.');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    // Enviar dirección como mensaje normal
    await enviarMensaje(`Mi dirección es: ${direccionCliente.trim()}`);
    // Enviar ubicación como mensaje especial
    await enviarMensaje(`UBICACION::${latitude},${longitude}`);

    // Fin del caso 2 para el cliente
    await updateDoc(doc(db, 'chats', chatId), { casoActual: 3 }); // Avanza al caso 3
    setCasoActual(3);
    setMostrarCampoDireccion(false); // Ocultar el campo después de enviar
    setDireccionCliente('');
  };

  const enviarTiempoLlegada = async () => {
    if (tipoUsuario !== 'conductor') {
      Alert.alert('Permiso denegado', 'Solo el conductor puede enviar el tiempo de llegada.');
      return;
    }
    if (!tiempoLlegada.trim() || isNaN(parseInt(tiempoLlegada))) {
      Alert.alert('Campo inválido', 'Por favor, introduce un tiempo de llegada válido en minutos.');
      return;
    }

    await enviarMensaje(`Estaré en su ubicación en aproximadamente ${tiempoLlegada.trim()} minutos.`);
    await updateDoc(doc(db, 'chats', chatId), { casoActual: 3 }); // Avanza al caso 3
    setCasoActual(3);
    setMostrarCampoTiempoLlegada(false); // Ocultar el campo
    setTiempoLlegada('');
  };

  const renderItem = ({ item }) => {
    // Si es un mensaje del sistema, renderizarlo diferente
    if (item.emisor === 'sistema') {
      return (
        <View style={styles.mensajeSistema}>
          <Text style={styles.mensajeSistemaTexto}>{item.texto}</Text>
        </View>
      );
    }

    const esUbicacion = item.texto?.startsWith('UBICACION::');
    const [lat, lng] = esUbicacion ? item.texto.replace('UBICACION::', '').split(',') : [];

    const staticMapUrl = esUbicacion
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=300x200&markers=color:red%7Clabel:U%7C${lat},${lng}&key=${Maps_STATIC_API_KEY}`
      : null;

    const isCurrentUser = item.emisor === auth.currentUser.uid;

    return (
      <View
        style={[
          styles.mensaje,
          isCurrentUser ? styles.mensajeDerecha : styles.mensajeIzquierda,
        ]}
      >
        {esUbicacion ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ marginBottom: 5, color: isCurrentUser ? 'white' : 'black' }}>Ubicación enviada:</Text>
            {staticMapUrl && (
              <Image
                source={{ uri: staticMapUrl }}
                style={styles.mapaMiniatura}
                onError={(e) => console.log('Error al cargar mapa estático:', e.nativeEvent.error)}
              />
            )}
            <Text style={{ fontSize: 10, marginTop: 5, color: isCurrentUser ? 'white' : 'black' }}>Lat: {lat}, Lng: {lng}</Text>
          </View>
        ) : (
          <Text style={{ color: isCurrentUser ? 'white' : 'black' }}>{item.texto}</Text>
        )}
      </View>
    );
  };

  if (!chatId || !receptorId || !tipoUsuario) {
    return (
      <View style={styles.contenedor}>
        <Text style={{ padding: 20, textAlign: 'center' }}>
          Error: Faltan datos de navegación. Asegúrate de iniciar un chat desde el panel de control.
        </Text>
      </View>
    );
  }

  if (cargandoChat) {
    return (
      <View style={styles.contenedorCarga}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Cargando chat...</Text>
      </View>
    );
  }

  const mensajesActuales = getMensajesPorCaso(casoActual, tipoUsuario);

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20} // Ajusta este valor si el teclado oculta inputs
    >
      <Text style={styles.chatHeader}>Chat con: {receptorNombre}</Text>
      <FlatList
        ref={flatListRef}
        data={mensajes}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()} // Fallback para key si no hay id
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      <View style={styles.botones}>
        {mensajesActuales.map((m, index) => (
          <TouchableOpacity
            key={index}
            style={styles.boton}
            onPress={() => enviarMensaje(m)}
          >
            <Text style={styles.botonTexto}>{m}</Text>
          </TouchableOpacity>
        ))}

        {/* Campo para dirección del cliente (Caso 2) */}
        {mostrarCampoDireccion && tipoUsuario === 'cliente' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu dirección"
              value={direccionCliente}
              onChangeText={setDireccionCliente}
            />
            <TouchableOpacity style={styles.botonEnviarDireccion} onPress={enviarUbicacionYDireccion}>
              <Text style={styles.botonTexto}>Enviar Dirección y Ubicación</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Campo para tiempo de llegada del conductor (Caso 2) */}
        {mostrarCampoTiempoLlegada && tipoUsuario === 'conductor' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Tiempo de llegada (minutos)"
              value={tiempoLlegada}
              onChangeText={setTiempoLlegada}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.botonEnviarTiempo} onPress={enviarTiempoLlegada}>
              <Text style={styles.botonTexto}>Confirmar Llegada</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat libre y botón de finalizar para el conductor (Caso 3) */}
        {casoActual === 3 && tipoUsuario === 'conductor' && (
          <>
            <TextInput
              style={styles.inputChatLibre}
              placeholder="Enviar mensaje libre..."
              value={mensajeLibreConductor}
              onChangeText={setMensajeLibreConductor}
              onSubmitEditing={() => {
                if (mensajeLibreConductor.trim()) {
                  enviarMensaje(mensajeLibreConductor);
                  setMensajeLibreConductor('');
                }
              }}
            />
            <TouchableOpacity style={styles.botonEnviarLibre} onPress={() => {
                if (mensajeLibreConductor.trim()) {
                  enviarMensaje(mensajeLibreConductor);
                  setMensajeLibreConductor('');
                }
              }}>
              <Text style={styles.botonTexto}>Enviar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonFinalizarChat} onPress={reiniciarChat}>
              <Text style={styles.botonTexto}>Finalizar Servicio y Reiniciar Chat</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f0f0' },
  contenedorCarga: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: '#e0e0e0',
  },
  mensaje: { padding: 10, margin: 5, borderRadius: 10, maxWidth: '70%' },
  mensajeIzquierda: { alignSelf: 'flex-start', backgroundColor: '#e0e0e0' },
  mensajeDerecha: { alignSelf: 'flex-end', backgroundColor: '#007bff' },
  mensajeSistema: {
    alignSelf: 'center',
    backgroundColor: '#d1ecf1', // Color para mensajes del sistema (azul claro)
    padding: 8,
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: '90%',
  },
  mensajeSistemaTexto: {
    color: '#0c5460', // Color de texto para mensajes del sistema
    textAlign: 'center',
    fontStyle: 'italic',
  },
  botones: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10, // Espacio entre los botones
  },
  boton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    flexGrow: 1, // Permite que los botones crezcan para ocupar espacio
    minWidth: '45%', // Ancho mínimo para que quepan dos por fila
    maxWidth: '48%', // Ancho máximo para dejar espacio para gap
    justifyContent: 'center', // Centra el texto verticalmente
    alignItems: 'center', // Centra el texto horizontalmente
  },
  botonTexto: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  botonDeshabilitado: { backgroundColor: '#cccccc' },
  mapaMiniatura: {
    width: 200,
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  inputChatLibre: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  botonEnviarDireccion: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    alignItems: 'center',
  },
  botonEnviarTiempo: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    alignItems: 'center',
  },
  botonEnviarLibre: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    alignItems: 'center',
    marginBottom: 5, // Espacio antes del botón de finalizar
  },
  botonFinalizarChat: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    alignItems: 'center',
    marginTop: 5, // Espacio después del botón de enviar libre
  },
});

export default ChatScreen;