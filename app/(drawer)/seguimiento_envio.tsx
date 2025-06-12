import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import tw from 'twrnc';
import { formatearFecha, formatearHora } from '../utils/dateUtils';

const { width } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyA2Qu981XT7unRjMZmA88OqwyMKQlGJsA8';

type Transportista = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  ci?: string;
};

type Vehiculo = {
  placa?: string;
  tipo?: string;
};

type TipoTransporte = {
  nombre?: string;
  descripcion?: string;
};

type RecogidaEntrega = {
  fecha_recogida?: string;
  hora_recogida?: string;
  hora_entrega?: string;
  instrucciones_recogida?: string;
  instrucciones_entrega?: string;
};

type Carga = {
  tipo: string;
  variedad: string;
  peso: number;
};

type Particion = {
  estado: string;
  transportista?: Transportista;
  vehiculo?: Vehiculo;
  tipoTransporte?: TipoTransporte;
  recogidaEntrega?: RecogidaEntrega;
  cargas?: Carga[];
};

type Envio = {
  id: number;
  nombre_origen?: string;
  nombre_destino?: string;
  coordenadas_origen?: [number, number];
  coordenadas_destino?: [number, number];
  rutaGeoJSON?: any;
  particiones: Particion[];
};

export default function SeguimientoEnvio() {
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rutaCoordinates, setRutaCoordinates] = useState<{ [key: number]: any[] }>({});
  const [cargandoRutas, setCargandoRutas] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    cargarDatosEnvio();
  }, []);

  // Función para obtener ruta de Google Maps
  const obtenerRuta = async (origen: [number, number], destino: [number, number], particionIndex: number) => {
    try {
      setCargandoRutas(prev => ({ ...prev, [particionIndex]: true }));
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen[0]},${origen[1]}&destination=${destino[0]},${destino[1]}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const decodedPoints = decodePolyline(points);
        
        setRutaCoordinates(prev => ({
          ...prev,
          [particionIndex]: decodedPoints
        }));
      }
    } catch (error) {
      console.error('Error obteniendo ruta:', error);
    } finally {
      setCargandoRutas(prev => ({ ...prev, [particionIndex]: false }));
    }
  };

  // Función para decodificar polyline de Google Maps
  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  const cargarDatosEnvio = async () => {
    try {
      const idEnvio = await AsyncStorage.getItem('envioEnSeguimiento');
      const token = await AsyncStorage.getItem('token');

      if (!idEnvio || !token) {
        Alert.alert('Error', 'No se encontró el envío o el token');
        router.back();
        return;
      }

      const res = await fetch(`https://api-4g7v.onrender.com/api/envios/${idEnvio}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener envío');
      }

      setEnvio(data);

      // Obtener rutas para cada partición si hay coordenadas
      if (data.coordenadas_origen && data.coordenadas_destino) {
        data.particiones.forEach((particion: Particion, index: number) => {
          obtenerRuta(data.coordenadas_origen, data.coordenadas_destino, index);
        });
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      Alert.alert('Error', 'Ocurrió un error al cargar el seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const resumenCargas = (particion: Particion) => {
    return (particion.cargas || [])
      .map(c => `${c.tipo} - ${c.variedad} (${c.peso} kg)`)
      .join(' | ');
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-100 justify-center items-center`}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0140CD" />
        <Text style={tw`text-gray-600 mt-4`}>Cargando seguimiento...</Text>
      </View>
    );
  }

  if (error || !envio) {
    return (
      <View style={tw`flex-1 bg-gray-100 justify-center items-center p-4`}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={tw`text-red-600 text-lg font-semibold mt-4 mb-2`}>Error al cargar</Text>
        <Text style={tw`text-gray-600 text-center mb-6`}>{error}</Text>
        <TouchableOpacity
          style={tw`bg-blue-600 px-6 py-3 rounded-lg`}
          onPress={() => router.push('/')}
        >
          <Text style={tw`text-white font-medium`}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center pt-14 px-4 pb-4 bg-white`}>
        <TouchableOpacity onPress={() => router.push('/envio')}>
          <Ionicons name="arrow-back" size={28} color="#0140CD" />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <Text style={tw`text-xl font-bold text-[#0140CD]`}>
            Seguimiento del envío
          </Text>
        </View>
        <View style={tw`w-7`} />
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
        {envio.particiones.map((particion, index) => (
          <View key={index} style={tw`bg-white rounded-2xl p-6 mb-6 shadow-sm`}>
            {/* Título de la partición */}
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3`}>
                <Text style={tw`text-blue-600 font-bold`}>{index + 1}</Text>
              </View>
              <Text style={tw`text-xl font-semibold text-gray-900`}>
                Partición {index + 1}
              </Text>
              <View style={tw`ml-auto`}>
                <View style={tw`bg-blue-100 px-3 py-1 rounded-full`}>
                  <Text style={tw`text-blue-800 text-sm font-medium`}>
                    {particion.estado}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mapa */}
            <View style={tw`mb-6`}>
              <View style={[tw`rounded-xl overflow-hidden`, { height: 200 }]}>
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: envio.coordenadas_origen?.[0] || -17.7833,
                    longitude: envio.coordenadas_origen?.[1] || -63.1821,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }}
                  mapType="standard"
                >
                  {/* Marcador de origen */}
                  {envio.coordenadas_origen && (
                    <Marker
                      coordinate={{
                        latitude: envio.coordenadas_origen[0],
                        longitude: envio.coordenadas_origen[1],
                      }}
                      title="Origen"
                      description={envio.nombre_origen || 'Punto de origen'}
                      pinColor="green"
                    />
                  )}
                  
                  {/* Marcador de destino */}
                  {envio.coordenadas_destino && (
                    <Marker
                      coordinate={{
                        latitude: envio.coordenadas_destino[0],
                        longitude: envio.coordenadas_destino[1],
                      }}
                      title="Destino"
                      description={envio.nombre_destino || 'Punto de destino'}
                      pinColor="red"
                    />
                  )}

                  {/* Ruta real de Google Maps */}
                  {rutaCoordinates[index] && rutaCoordinates[index].length > 0 ? (
                    <Polyline
                      coordinates={rutaCoordinates[index]}
                      strokeColor="#0077b6"
                      strokeWidth={4}
                    />
                  ) : (
                    /* Línea recta como fallback */
                    envio.coordenadas_origen && envio.coordenadas_destino && (
                      <Polyline
                        coordinates={[
                          {
                            latitude: envio.coordenadas_origen[0],
                            longitude: envio.coordenadas_origen[1],
                          },
                          {
                            latitude: envio.coordenadas_destino[0],
                            longitude: envio.coordenadas_destino[1],
                          }
                        ]}
                        strokeColor="#0077b6"
                        strokeWidth={3}
                      />
                    )
                  )}
                </MapView>
                
                {/* Indicador de carga de ruta */}
                {cargandoRutas[index] && (
                  <View style={tw`absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md`}>
                    <ActivityIndicator size="small" color="#0077b6" />
                  </View>
                )}
              </View>
            </View>

            {/* Información del Transportista */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="person-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Transportista
                </Text>
              </View>
              <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Nombre: </Text>
                  {particion.transportista?.nombre || '—'} {particion.transportista?.apellido || ''}
                </Text>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Teléfono: </Text>
                  {particion.transportista?.telefono ?? '—'}
                </Text>
                <Text style={tw`text-gray-700`}>
                  <Text style={tw`font-medium`}>CI: </Text>
                  {particion.transportista?.ci ?? '—'}
                </Text>
              </View>
            </View>

            {/* Información del Vehículo */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="car-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Vehículo
                </Text>
              </View>
              <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Placa: </Text>
                  {particion.vehiculo?.placa || '—'}
                </Text>
                <Text style={tw`text-gray-700`}>
                  <Text style={tw`font-medium`}>Tipo: </Text>
                  {particion.vehiculo?.tipo || '—'}
                </Text>
              </View>
            </View>

            {/* Información del Transporte */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="cube-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Transporte
                </Text>
              </View>
              <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Tipo de transporte: </Text>
                  {particion.tipoTransporte?.nombre || '—'}
                </Text>
                <Text style={tw`text-gray-700`}>
                  <Text style={tw`font-medium`}>Descripción: </Text>
                  {particion.tipoTransporte?.descripcion || '—'}
                </Text>
              </View>
            </View>

            {/* Cronograma de Entrega */}
            <View style={tw`mb-0`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="time-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Cronograma
                </Text>
              </View>

              {/* Recogida */}
              <View style={tw`mb-4`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <View style={tw`w-3 h-3 bg-green-500 rounded-full mr-3`} />
                  <Text style={tw`text-sm font-medium text-gray-600`}>
                    Recogida: {formatearFecha(particion.recogidaEntrega?.fecha_recogida)} - {formatearHora(particion.recogidaEntrega?.hora_recogida)}
                  </Text>
                </View>
                <View style={tw`bg-green-50 p-4 rounded-xl ml-6`}>
                  <Text style={tw`font-semibold text-gray-900 mb-1`}>
                    Origen: {envio.nombre_origen || '—'}
                  </Text>
                  <Text style={tw`text-gray-700 mb-2`}>
                    Recogida de: {resumenCargas(particion)}
                  </Text>
                  <Text style={tw`text-gray-600 text-sm`}>
                    {particion.recogidaEntrega?.instrucciones_recogida || 'Sin instrucciones'}
                  </Text>
                </View>
              </View>

              {/* Línea conectora */}
              <View style={tw`ml-1.5 w-0.5 h-6 bg-gray-300 mb-4`} />

              {/* Entrega */}
              <View>
                <View style={tw`flex-row items-center mb-2`}>
                  <View style={tw`w-3 h-3 bg-gray-500 rounded-full mr-3`} />
                  <Text style={tw`text-sm font-medium text-gray-600`}>
                    Entrega: {formatearFecha(particion.recogidaEntrega?.fecha_recogida)} - {formatearHora(particion.recogidaEntrega?.hora_entrega)}
                  </Text>
                </View>
                <View style={tw`bg-gray-50 p-4 rounded-xl ml-6`}>
                  <Text style={tw`font-semibold text-gray-900 mb-1`}>
                    Destino: {envio.nombre_destino || '—'}
                  </Text>
                  <Text style={tw`text-gray-700 mb-2`}>
                    Entrega de: {resumenCargas(particion)}
                  </Text>
                  <Text style={tw`text-gray-600 text-sm`}>
                    {particion.recogidaEntrega?.instrucciones_entrega || 'Sin instrucciones'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Espacio adicional al final */}
        <View style={tw`h-6`} />
      </ScrollView>
    </View>
  );
}