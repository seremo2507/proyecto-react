import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, RUTA_KEY } from './constants';

// Decodifica polyline de Google Maps al array de coordenadas
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded || encoded.length === 0) return [];
  
  let index = 0, len = encoded.length, lat = 0, lng = 0;
  const coords: { latitude: number; longitude: number }[] = [];
  while (index < len) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1 ? ~(result >> 1) : result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1 ? ~(result >> 1) : result >> 1);
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

async function authHeaders() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No autenticado');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getUbicaciones() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/ubicaciones/`, { headers });
    if (!res.ok) throw new Error('Error cargando ubicaciones');
    return res.json();
  } catch (error) {
    throw new Error('Error de red al cargar ubicaciones');
  }
}

export async function getRuta(origen: string, destino: string) {
  try {
    // Usar Google Maps API directamente
    const GOOGLE_API_KEY = 'AIzaSyA2Qu981XT7unRjMZmA88OqwyMKQlGJsA8';
    
    // origen y destino vienen como "lng,lat" - convertir a "lat,lng" para Google
    const [origLng, origLat] = origen.split(',').map(Number);
    const [destLng, destLat] = destino.split(',').map(Number);
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origLat},${origLng}&destination=${destLat},${destLng}&key=${GOOGLE_API_KEY}`;
    
    console.log('Solicitando ruta de Google Maps:', url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('Error en respuesta de Google Maps:', res.status, res.statusText);
      throw new Error('Error obteniendo ruta de Google Maps');
    }
    
    const data = await res.json();
    console.log('Respuesta de Google Maps:', data);
    
    if (data.status !== 'OK') {
      console.error('Error en Google Maps API:', data.status, data.error_message);
      throw new Error(`Google Maps API error: ${data.status}`);
    }
    
    if (!data.routes || data.routes.length === 0) {
      console.warn('No se encontraron rutas');
      return { coordinates: [] };
    }
    
    // Decodificar la polyline
    const route = data.routes[0];
    const polylinePoints = route.overview_polyline?.points;
    
    if (!polylinePoints) {
      console.warn('No se encontró polyline en la respuesta');
      return { coordinates: [] };
    }
    
    // Decodificar y convertir a formato [lng, lat] para mantener compatibilidad
    const decodedCoords = decodePolyline(polylinePoints);
    const coordinates = decodedCoords.map(coord => [coord.longitude, coord.latitude] as [number, number]);
    
    console.log(`Ruta decodificada con ${coordinates.length} puntos`);
    
    return { 
      coordinates,
      distance: route.legs?.[0]?.distance?.value,
      duration: route.legs?.[0]?.duration?.value 
    };
    
  } catch (error) {
    console.error('Error al obtener la ruta:', error);
    throw new Error('Error de red al obtener la ruta');
  }
}

export async function crearEnvio(payload: any) {
  try {
    const headers = await authHeaders();

    // Crear/verificar ubicación
    const resUbicacion = await fetch(`${API_BASE}/ubicaciones/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload.loc),
    });

    if (!resUbicacion.ok) {
      const msg = await resUbicacion.text();
      throw new Error(`Error ubicacion: ${msg}`);
    }

    const { _id: idUb } = await resUbicacion.json();

    // Crear envío
    const resEnvio = await fetch(`${API_BASE}/envios/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_ubicacion_mongo: idUb,
        particiones: payload.particiones,
      }),
    });

    if (!resEnvio.ok) {
      const msg = await resEnvio.text();
      throw new Error(`Error envío: ${msg}`);
    }

    return resEnvio.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de red al crear el envío');
  }
}

export async function getTiposTransporte() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/tipos-transporte/`, { headers });
    if (!res.ok) throw new Error('Error cargando tipos de transporte');
    return res.json();
  } catch (error) {
    throw new Error('Error de red al cargar tipos de transporte');
  }
}

export default {
  getUbicaciones,
  getRuta,
  crearEnvio,
  getTiposTransporte
};
