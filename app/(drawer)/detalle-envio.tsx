/* detalle-envio.tsx */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  BackHandler,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';
import tw from 'twrnc';
import SignatureCanvas from 'react-native-signature-canvas';
import { FontAwesome5 } from '@expo/vector-icons';

/* 
 * NOTA: Código eliminado para compatibilidad con la Nueva Arquitectura
 * 
 * En versiones anteriores de React Native se usaba:
 * if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
 *   UIManager.setLayoutAnimationEnabledExperimental(true);
 * }
 * 
 * En la Nueva Arquitectura, las animaciones de layout están habilitadas por defecto
 * y este código genera advertencias, por lo que ha sido eliminado.
 */

export default function DetalleEnvioView() {
  // --- TODOS LOS HOOKS AL INICIO ---
  const { id_asignacion } = useLocalSearchParams<{ id_asignacion: string }>();
  const router = useRouter();
  const { height } = Dimensions.get('window');

  /* ---------- estados ---------- */
  const [envio, setEnvio]   = useState<any>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [ruta,   setRuta]   = useState([]);
  const [isMapVisible, setIsMapVisible] = useState(true);

  const [conditions, setConditions] = useState<Record<string, boolean | null>>({});
  const [observaciones, setObservaciones] = useState('');
  const [incidents, setIncidents] = useState<Record<string, boolean | null>>({});
  const [descripcionIncidente, setDescripcionIncidente] = useState('');

  /* flags UI */
  const [modalVisible,   setModalVisible]   = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [showIncidents,  setShowIncidents]  = useState(false);
  const [showChecklistAlert, setShowChecklistAlert] = useState(false);
  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);
  const [isProcessingFirma, setIsProcessingFirma] = useState(false);
  const [showFirmaTransportistaAlert, setShowFirmaTransportistaAlert] = useState(false);

  /* QR / firma */
  const [showQRModal,    setShowQRModal]    = useState(false);
  const [showFirmaModal, setShowFirmaModal]  = useState(false);
  const [qrLoading,      setQrLoading]      = useState(false);
  const [qrImg,          setQrImg]          = useState<string|null>(null);
  const [firmaCliente,   setFirmaCliente]   = useState(false); // QR
  const [firmaTransportista, setFirmaTransportista] = useState(false); // Firma digital
  const [stopPolling,    setStopPolling]    = useState<(() => void)|null>(null);
  const [showSignNeeded, setShowSignNeeded] = useState(false);
  const [showFirmaBackendModal, setShowFirmaBackendModal] = useState(false);
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null);
  const signatureRef = useRef<any>(null);

  /* otros modals */
  const [showCondListModal, setShowCondListModal] = useState(false);
  const [showFinishModal,   setShowFinishModal]   = useState(false);
  const [showIncidentStartModal, setShowIncidentStartModal] = useState(false);
  const [showConditionsAlert, setShowConditionsAlert] = useState(false);
  const [showIncidentsModal, setShowIncidentsModal] = useState(false);
  const [showChecklistCompleteModal, setShowChecklistCompleteModal] = useState(false);
  const [showQRNeededModal, setShowQRNeededModal] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [showConditionsCompleteModal, setShowConditionsCompleteModal] = useState(false);

  /* toasts */
  const [infoMsg,  setInfoMsg]  = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  /* ---------- auto‑dismiss toasts ---------- */
  useEffect(()=>{ if(infoMsg){ const t=setTimeout(()=>setInfoMsg(''),2000); return()=>clearTimeout(t);} },[infoMsg]);
  useEffect(()=>{ if(errorMsg){ const t=setTimeout(()=>setErrorMsg(''),2000); return()=>clearTimeout(t);} },[errorMsg]);

  /* ---------- botón Android atrás ---------- */
  useFocusEffect(
    useCallback(() => {
      console.log('[DetalleEnvioView] useFocusEffect: suscribiendo BackHandler');
      const onBack = () => { 
        router.replace('/home'); 
        return true; 
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => {
        console.log('[DetalleEnvioView] useFocusEffect: limpiando BackHandler');
        subscription.remove();
      };
    }, [router])
  );

  /* helper fetch logger */
  const logFetch = async (label:string,res:Response)=>{
    let body={}; try{ body=await res.clone().json(); }catch{}
    console.log(`📡 [${label}]`,res.status,body);
  };

  /* ---------- obtener detalles ---------- */
  const fetchDetail = useCallback(async()=>{
    try{
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        'https://api-4g7v.onrender.com/api/envios/mis-envios-transportista',
        {headers:{Authorization:`Bearer ${token}`}}
      );
      const data  = await res.json();
      const found = data.find((e:any)=>e.id_asignacion?.toString()===id_asignacion);
      if(!found) throw new Error('No se encontró el envío');
      setEnvio(found);
      
      // Actualizar el estado de la firma del transportista
      if (found.firma_transportista) {
        setFirmaTransportista(true);
        setHasFirmaTransportista(true);
        setIsConfirmButtonDisabled(true);
      }

      // Verificar si el cliente ya firmó
      if (found.firma_cliente) {
        setFirmaCliente(true);
      }

      if(found.coordenadas_origen && found.coordenadas_destino){
        setRegion({
          latitude: found.coordenadas_origen[0],
          longitude: found.coordenadas_origen[1],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        });
      }
      if(found.rutaGeoJSON?.coordinates){
        setRuta(found.rutaGeoJSON.coordinates.map((c:any)=>({latitude:c[1],longitude:c[0]})));
      }

      const init = (keys:string[]) => Object.fromEntries(keys.map(k=>[k,null]));
      setConditions(init([
        'temperatura_controlada','embalaje_adecuado','carga_segura','vehiculo_limpio',
        'documentos_presentes','ruta_conocida','combustible_completo','gps_operativo',
        'comunicacion_funcional','estado_general_aceptable'
      ]));
      setIncidents(init([
        'retraso','problema_mecanico','accidente','perdida_carga','condiciones_climaticas_adversas',
        'ruta_alternativa_usada','contacto_cliente_dificultoso','parada_imprevista',
        'problemas_documentacion','otros_incidentes'
      ]));
    }catch(err:any){ Alert.alert('Error',err.message); }
  },[id_asignacion]);

  useEffect(()=>{ fetchDetail(); },[fetchDetail]);

  /* ---------- helpers ---------- */
  const setAnswer = (setter:any,key:string,val:boolean)=>
    setter((p:any)=>({...p,[key]:val}));
  const allAnswered = (obj:Record<string,boolean|null>) =>
    Object.values(obj).every(v=>v!==null);

  /* ---------- QR ---------- */
    const handleShowQR = async () => {
    setQrLoading(true);
    setShowQRModal(true);
    setQrImg(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `https://api-4g7v.onrender.com/api/qr/${id_asignacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json  = await res.json();
      await logFetch('qr', res);

      if (!res.ok) throw new Error(json?.mensaje || 'Error QR');

      setQrImg(json.imagenQR);   // ← mostramos código
      setFirmaCliente(true);     // ← ✅ habilita "Finalizar envío"
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo obtener el QR');
      setShowQRModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  // Nuevo: para saber si el usuario presionó Confirmar
  const [pendingSave, setPendingSave] = useState(false);

  const handleFirma = async (signature: string) => {
    if (signature && signature.length > 0) {
      setFirmaBase64(signature);
      if (pendingSave) {
        setPendingSave(false);
        await handleGuardarFirma(signature);
      }
    } else {
      setShowFirmaModal(false);
      setShowFirmaRequeridaModal(true);
      setIsProcessingFirma(false);
      setPendingSave(false);
    }
  };

  const handleFirmaError = (error: any) => {
    setShowFirmaModal(false);
    setShowFirmaRequeridaModal(true);
    setIsProcessingFirma(false);
    setPendingSave(false);
  };

  const handleGuardarFirma = async (firmaToSave?: string) => {
    const firma = firmaToSave || firmaBase64;
    
    if (!firma || firma.length === 0) {
      setShowFirmaModal(false);
      setShowFirmaRequeridaModal(true);
      setIsProcessingFirma(false);
      setPendingSave(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `https://api-4g7v.onrender.com/api/envios/firma-transportista/${id_asignacion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imagenFirma: firma
          })
        }
      );

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400 && (data.error || '').toLowerCase().includes('ya existe')) {
          setIsConfirmButtonDisabled(true);
          setShowYaFirmadoModal(true);
          setShowFirmaModal(false);
        } else {
          throw new Error(data.mensaje || 'Error al guardar la firma');
        }
      } else {
        setFirmaTransportista(true);
        setHasFirmaTransportista(true);
        setShowFirmaModal(false);
        setShowFirmaRegistradaModal(true);
        // No llamamos a fetchDetail() para no reiniciar el checklist
      }
    } catch (err: any) {
      setShowFirmaModal(false);
      setErrorMsg(err.message || 'Error al guardar la firma');
    } finally {
      setIsProcessingFirma(false);
      setPendingSave(false);
    }
  };

  const handleClearFirma = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
      setFirmaBase64(null);
      setIsConfirmButtonDisabled(false);
    }
  };

  // ------------- polling firma -------------
const startPollingFirma = () => {
  let attempts = 0;
  console.log('[DetalleEnvioView] Iniciando polling de firma');
  const intervalo = setInterval(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `https://api-4g7v.onrender.com/api/envios/validar-firma/${id_asignacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const { firmaRealizada } = await res.json();
        if (firmaRealizada) {
          clearInterval(intervalo);
          setFirmaCliente(true);     // ✅ habilita «Finalizar»
          setShowQRModal(false);
          setInfoMsg('Firma verificada ✔');
          console.log('[DetalleEnvioView] Polling de firma: firma realizada, limpiando intervalo');
        }
      }
      // por si acaso cortamos a los ~3 min
      if (++attempts > 60) {
        clearInterval(intervalo);
        console.log('[DetalleEnvioView] Polling de firma: demasiados intentos, limpiando intervalo');
      }
    } catch (e) {
      console.log('[DetalleEnvioView] Polling de firma: error', e);
    }
  }, 3000);

  // limpiar si el componente se desmonta
  return () => {
    console.log('[DetalleEnvioView] Limpiando polling de firma');
    clearInterval(intervalo);
  };
};


  /** inicia polling y devuelve la función de limpieza */
  // 2️⃣  añade pollFirma cuando tengas el QR listo
    const pollFirma = () => {
      const intervalo = setInterval(async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const res   = await fetch(
            `https://api-4g7v.onrender.com/api/envios/validar-firma/${id_asignacion}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.ok) {
            const { firmaRealizada } = await res.json();
            if (firmaRealizada) {
              clearInterval(intervalo);
              setFirmaCliente(true);
              setShowQRModal(false);
              setInfoMsg('Firma verificada ✔');
            }
          }
        } catch {/* ignora errores momentáneos */}
      }, 3000);

      // limpia al cerrar el modal
      return () => clearInterval(intervalo);
    };


  /** botón que combina todo */
  const openQRModal = async () => {
    setQrLoading(true);
    setShowQRModal(true);
    setQrImg(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `https://api-4g7v.onrender.com/api/qr/${id_asignacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      await logFetch('qr', res);

      if (!res.ok) throw new Error(json?.mensaje || 'Error QR');

      setQrImg(json.imagenQR);
      setFirmaCliente(true);
      
      // Iniciar polling después de mostrar el QR
      const stop = pollFirma();
      setStopPolling(() => stop);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo obtener el QR');
      setShowQRModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  /* ---------- acciones backend ---------- */
  const handleConfirmTrip = async()=>{
    if(!allAnswered(conditions)){ setErrorMsg('Responde Sí o No a todas las preguntas'); return; }
    try{
      const token = await AsyncStorage.getItem('token');
      const clean = Object.fromEntries(Object.entries(conditions).map(([k,v])=>[k,!!v]));

      const resChk = await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-condiciones`,
        {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
         body:JSON.stringify({...clean,observaciones})});
      await logFetch('checklist-cond',resChk);
      if(!resChk.ok) throw new Error('Error checklist condiciones');

      const resStart = await fetch(
        `https://api-4g7v.onrender.com/api/envios/iniciar/${id_asignacion}`,
        {method:'PUT',headers:{Authorization:`Bearer ${token}`}}
      );
      await logFetch('iniciar',resStart);
      if(!resStart.ok) throw new Error('Error iniciar envío');

      setShowCondListModal(true);
      setShowConditions(false);
      fetchDetail();
    }catch(err:any){ setErrorMsg(err.message); }
  };

  const handleFinalizarViaje = async () => {
    // 1. Primero verificar checklist de incidentes
    if (!allAnswered(incidents)) {
      setShowIncidentStartModal(true);
      return;
    }

    // 2. Luego verificar firma del cliente (prioridad alta)
    if (!firmaCliente) {
      setShowQRNeededModal(true);
      return;
    }

    // 3. Finalmente verificar firma del transportista
    if (!firmaTransportista) {
      setShowFirmaTransportistaAlert(true);
      return;
    }

    // Si todo está en orden, proceder con la finalización
    handleFinalize();
  };

  // Modificar el botón de firma para que esté deshabilitado si ya hay firma
  const handleShowFirmaModal = () => {
    // Solo permitir firma del transportista si el cliente ya firmó
    if (!firmaCliente) {
      setShowQRNeededModal(true);
      return;
    }

    if (hasFirmaTransportista) {
      setShowYaFirmadoModal(true);
    } else {
      setShowFirmaModal(true);
    }
  };

  // Modificar el botón de finalizar para que respete el orden de prioridad
  const handleFinalize = async () => {
    /* ─── validaciones previas ─── */
    if (!firmaCliente) {
      setShowQRNeededModal(true);
      return;
    }
    if (!allAnswered(incidents)) {
      setErrorMsg('Responde Sí o No a todas las preguntas');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      let checklistRegistrado = false;

      /* 1️⃣  Checklist de incidentes (solo si no está registrado aún) */
      const cleanInc = Object.fromEntries(
        Object.entries(incidents).map(([k, v]) => [k, !!v])
      );

      const resInc = await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-incidentes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...cleanInc,
            descripcion_incidente: descripcionIncidente,
          }),
        }
      );
      await logFetch('checklist-inc', resInc);
      
      // Si obtenemos error, verificamos si es porque ya está registrado
      if (!resInc.ok) {
        const incBody = await resInc.json().catch(() => ({}));
        
        // Si ya está registrado, continuamos sin problema
        if (resInc.status === 400 && (incBody.error || '').includes('ya fue registrado')) {
          console.log('Checklist ya registrado, continuando con finalización');
          checklistRegistrado = true;
        } else {
          // Si es otro tipo de error, lo lanzamos
          throw new Error(incBody.error || 'Error checklist incidentes');
        }
      }

      /* 2️⃣  Finalizar envío */
      const resFin = await fetch(
        `https://api-4g7v.onrender.com/api/envios/finalizar/${id_asignacion}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const bodyFin = await resFin.json().catch(() => ({}));   // por si no es JSON
      await logFetch('finalizar', resFin);

      /*  ── firma faltante detectada por el backend ── */
      if (!resFin.ok) {
        if (
          resFin.status === 400 &&
          (bodyFin.error || '').toLowerCase().includes('firma del cliente')
        ) {
          setShowQRNeededModal(true);   // abre el modal visual de firma requerida
          return;                      // salimos sin seguir
        }
        throw new Error(bodyFin.error || 'Error al finalizar');
      }

      /* 3️⃣  éxito */
      setShowFinishModal(true);    // modal "¡Envío finalizado!"
      fetchDetail();               // refresca datos en pantalla
      setModalVisible(false);
      setShowIncidents(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo finalizar');
    }
  };

  // --- BOTTOM SHEET FLUIDO CON ALTURA ANIMADA ---
  const windowHeight = Dimensions.get('window').height;
  const SHEET_MIN = Platform.OS === 'android' ?125 : 125; // Card oculto más grande en ambas plataformas
  const SHEET_MAX = Math.round(windowHeight * 0.85); // Reducido de 0.95 a 0.85 para dejar espacio arriba
  const [sheetOpen, setSheetOpen] = useState(false);
  const animatedHeight = useRef(new Animated.Value(SHEET_MIN)).current;

  // Referencia para la altura inicial al comenzar el gesto
  const startHeight = useRef(SHEET_MIN);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        animatedHeight.stopAnimation((value) => {
          startHeight.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        // Sumar el desplazamiento al valor inicial
        let newHeight = startHeight.current - gestureState.dy;
        if (newHeight < SHEET_MIN) newHeight = SHEET_MIN;
        if (newHeight > SHEET_MAX) newHeight = SHEET_MAX;
        animatedHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        animatedHeight.stopAnimation((currentHeight) => {
          const velocity = gestureState.vy;
          const dragThreshold = (SHEET_MAX - SHEET_MIN) * 0.33;

          const shouldClose = (gestureState.dy > dragThreshold) || (velocity > 1.2);
          const shouldOpen = (gestureState.dy < -dragThreshold) || (velocity < -1.2);

          let toValue;
          let open;
          if (shouldClose) {
            toValue = SHEET_MIN;
            open = false;
          } else if (shouldOpen) {
            toValue = SHEET_MAX;
            open = true;
          } else {
            toValue = sheetOpen ? SHEET_MAX : SHEET_MIN;
            open = sheetOpen;
          }

          Animated.spring(animatedHeight, {
            toValue,
            useNativeDriver: false,
            friction: 12,
            tension: 50,
            velocity: velocity * 0.3,
            restDisplacementThreshold: 0.001,
            restSpeedThreshold: 0.001,
          }).start(() => {
            setSheetOpen(open);
          });
        });
      },
    })
  ).current;
  // --- FIN BOTTOM SHEET FLUIDO ---

  // Animar opacidad del contenido según la altura del card
  const contentOpacity = animatedHeight.interpolate({
    inputRange: [SHEET_MIN, SHEET_MAX],
    outputRange: [0.2, 1],
    extrapolate: 'clamp',
  });

  /* ---------- Nuevo estado para alertas de checklist incompleto ---------- */
  const [showChecklistIncompleteAlert, setShowChecklistIncompleteAlert] = useState(false);
  const [showConditionsIncompleteAlert, setShowConditionsIncompleteAlert] = useState(false);

  /* flags adicionales */
  const [showFirmaTransportistaNeeded, setShowFirmaTransportistaNeeded] = useState(false);

  // Estados para alertas dinámicas de firma
  const [showFirmaRegistradaModal, setShowFirmaRegistradaModal] = useState(false);
  const [showYaFirmadoModal, setShowYaFirmadoModal] = useState(false);
  const [showDebeFirmarModal, setShowDebeFirmarModal] = useState(false);
  const [showFirmaRequeridaModal, setShowFirmaRequeridaModal] = useState(false);

  // ... existing code ...
  const [hasFirmaTransportista, setHasFirmaTransportista] = useState(false);

  // Función para verificar si existe firma del transportista
  const verificarFirmaTransportista = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `https://api-4g7v.onrender.com/api/envios/firma-transportista/${id_asignacion}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          } 
        }
      );
      
      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const tieneFirma = data && data.imagenFirma && data.imagenFirma.length > 0;
      
      // Actualizar el estado local
      setFirmaTransportista(tieneFirma);
      setHasFirmaTransportista(tieneFirma);
      setIsConfirmButtonDisabled(tieneFirma);
      
      return tieneFirma;
    } catch (err) {
      console.error('Error al verificar firma:', err);
      return false;
    }
  };

  // Verificar la firma al cargar el detalle
  useEffect(() => {
    if (id_asignacion) {
      verificarFirmaTransportista();
    }
  }, [id_asignacion]);

  // --- FIN HOOKS ---

  useEffect(() => {
    console.log('[DetalleEnvioView] MONTADO');
    return () => {
      console.log('[DetalleEnvioView] DESMONTADO');
    };
  }, []);

  if(!region||!envio){
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <Text style={tw`text-gray-700`}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      {/* Botón flotante de volver */}
      <View style={[
        tw`absolute top-12 left-4 z-20`,
        { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 }
      ]}>
        <TouchableOpacity
          onPress={() => router.replace('/home')}
          style={tw`bg-white rounded-full p-2.5 items-center justify-center`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0140CD" />
        </TouchableOpacity>
      </View>

      {/* mapa */}
      <MapView
        style={tw`flex-1`}
        initialRegion={region}
      >
        <Marker coordinate={{ latitude: envio.coordenadas_origen[0], longitude: envio.coordenadas_origen[1] }} />
        <Marker coordinate={{ latitude: envio.coordenadas_destino[0], longitude: envio.coordenadas_destino[1] }} pinColor="red" />
        {ruta.length > 0 && <Polyline coordinates={ruta} strokeColor="#0140CD" strokeWidth={4} />}
      </MapView>

      {/* Card tipo bottom sheet FLUIDO */}
      <Animated.View
        style={[
          tw`absolute left-0 right-0 bottom-0 px-0`,
          {
            zIndex: 10,
            alignItems: 'center',
            height: animatedHeight,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={[
          tw`bg-white w-full rounded-t-3xl pb-6 px-6 flex-1`,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.10,
            shadowRadius: 6,
            elevation: 6,
            alignItems: 'center',
            flex: 1,
          },
        ]}>
          {/* Sección deslizable completa */}
          <View {...panResponder.panHandlers} style={tw`w-full`}>
            {/* Handler */}
            <View style={tw`w-full items-center py-2`}>
              <View style={tw`w-12 h-1.5 rounded-full bg-gray-300`} />
            </View>

            {/* Resumen siempre visible */}
            <View style={tw`w-full`}>
              <View style={tw`px-4 py-2`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <Ionicons name="cube-outline" size={20} color="#0140CD" style={tw`mr-1`} />
                  <Text style={tw`text-[#0140CD] font-bold text-lg`}>
                    Envío #{envio.id_envio}
                  </Text>
                </View>
                <Text style={tw`text-gray-500 text-base`}>{envio.estado || envio.estado_envio}</Text>
              </View>
            </View>

          </View>

          {/* Línea separadora */}
          <Animated.View style={[
            tw`h-[1px] bg-gray-300 w-full`,
            { 
              opacity: animatedHeight.interpolate({
                inputRange: [SHEET_MIN, SHEET_MIN + 20],
                outputRange: [0, 1],
                extrapolate: 'clamp'
              })
            }
          ]}/>

          {/* Contenido siempre visible con opacidad animada */}
          <Animated.ScrollView
            style={[tw`w-full`, { opacity: contentOpacity }]}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={tw`px-4 mt-6`}>
              {/* datos básicos */}
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={tw`text-black text-lg font-bold`}>
                  Asignación Nº {envio.id_asignacion}
                </Text>
                {(envio.estado?.toLowerCase() === 'en curso' || envio.estado?.toLowerCase() === 'parcialmente entregado') && (
                  <View style={tw`flex-row items-center`}>
                    <TouchableOpacity 
                      onPress={handleShowFirmaModal} 
                      style={tw`pr-2`}
                      disabled={hasFirmaTransportista}>
                      <Ionicons 
                        name="create-outline" 
                        size={24} 
                        color={hasFirmaTransportista ? "#999" : "#0140CD"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openQRModal} style={tw`pl-2`}>
                      <Ionicons name="qr-code-outline" size={24} color="#0140CD" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={tw`text-black text-base mb-6`}><Text style={tw`text-green-600`}>{envio.estado || envio.estado_envio}</Text></Text>
            
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="car-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Transporte: {envio.tipo_transporte}
              </Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="leaf-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Variedad: {envio.cargas?.[0]?.variedad}
              </Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="scale-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Peso: {envio.cargas?.[0]?.peso ?? '—'} kg
              </Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="calculator-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}
              </Text>
              {/* ubicación origen y destino */}
              <View style={tw`mb-2.5`}>
                <Text style={tw`text-black text-base flex-row items-center`}>
                  <Ionicons name="location-outline" size={18} color="#0140CD" style={tw`mr-1`} />
                  <Text style={tw`font-bold`}>Origen: </Text>
                  {envio.nombre_origen}
                </Text>
                <Text style={tw`text-black text-base flex-row items-center mt-1`}>
                  <Ionicons name="location-outline" size={18} color="#0140CD" style={tw`mr-1`} />
                  <Text style={tw`font-bold`}>Destino: </Text>
                  {envio.nombre_destino}
                </Text>
              </View>

              {/* --- CHECKLIST CONDICIONES --- */}
              {(envio.estado?.toLowerCase() === 'pendiente') && !showConditions && (
                <View style={tw`mt-6 mb-10`}>
                  <TouchableOpacity
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mb-3`}
                    onPress={() => setShowConditionsModal(true)}>
                    <Text style={tw`text-white font-semibold text-base`}>Registro de condiciones de Transporte</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center`}
                    onPress={() => {
                      if (allAnswered(conditions)) {
                        handleConfirmTrip();
                      } else {
                        setShowConditionsAlert(true);
                      }
                    }}>
                    <Text style={tw`text-white font-semibold text-base`}>Iniciar viaje</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showConditions && (
                <>
                  <View style={tw`mt-5 mb-3`}>
                    <Text style={tw`text-[#0140CD] text-lg font-semibold`}>Registro de condiciones</Text>
                  </View>
                  <TextInput
                    style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                    placeholder="Observaciones" 
                    placeholderTextColor="#666"
                    multiline 
                    value={observaciones} 
                    onChangeText={setObservaciones}
                  />
                  {Object.entries(conditions).map(([k,v])=>(
                    <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                      <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                      <View style={tw`flex-row gap-2`}>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setConditions,k,true)}>
                          <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                        </Pressable>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setConditions,k,false)}>
                          <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-6 mb-10`} 
                    onPress={handleConfirmTrip}>
                    <Text style={tw`text-white font-semibold text-base`}>Confirmar viaje</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* --- CHECKLIST INCIDENTES --- */}
              {(envio.estado?.toLowerCase() === 'en curso' || envio.estado?.toLowerCase() === 'parcialmente entregado') &&
                !showIncidents && !showConditions && (
                <View style={tw`mt-6 mb-10`}>
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mb-3`} 
                    onPress={() => {
                      setShowIncidentsModal(true);
                    }}>
                    <Text style={tw`text-white font-semibold text-base`}>Registro de incidentes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center`} 
                    onPress={handleFinalizarViaje}>
                    <Text style={tw`text-white font-semibold text-base`}>Finalizar Viaje</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showIncidents && (
                <>
                  <View style={tw`mt-5 mb-3`}>
                    <Text style={tw`text-[#0140CD] text-lg font-semibold`}>Registro de incidentes</Text>
                  </View>
                  <View style={tw`bg-white rounded-2xl p-6 w-full max-h-[60%] flex-1`}>
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                      <Text style={tw`text-[#0140CD] text-xl font-bold`}>Regis de incidentes</Text>
                      <TouchableOpacity onPress={() => setShowIncidentsModal(false)}>
                        <Ionicons name="close" size={24} color="#0140CD" />
                      </TouchableOpacity>
                    </View>
                    <View style={tw`flex-1`}>
                      <ScrollView style={tw``} contentContainerStyle={tw`pb-2`}>
                        <TextInput
                          style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                          placeholder="Descripción del incidente"
                          placeholderTextColor="#666"
                          multiline
                          value={descripcionIncidente}
                          onChangeText={setDescripcionIncidente}
                        />
                        {Object.entries(incidents).map(([k,v])=>(
                          <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                            <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                            <View style={tw`flex-row gap-2`}>
                              <Pressable
                                style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                                onPress={()=>setAnswer(setIncidents,k,true)}>
                                <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                              </Pressable>
                              <Pressable
                                style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                                onPress={()=>setAnswer(setIncidents,k,false)}>
                                <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </>
              )}

              {/* COMPLETADO */}
              {envio.estado_envio.toLowerCase()==='completado' && (
                <View style={tw`items-center py-8`}>
                  <Ionicons name="checkmark-circle" size={64} color="#28a745"/>
                  <Text style={tw`text-black text-lg font-semibold mt-4`}>¡Entrega completada con éxito!</Text>
                </View>
              )}
            </View>
          </Animated.ScrollView>
        </View>
      </Animated.View>

      {/* toasts */}
      <AnimatePresence>
        {infoMsg!=='' && (
          <MotiView key="info" from={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={[
              tw`absolute left-6 right-6 flex-row items-center p-3 rounded-xl bg-blue-50`,
              {top:height*0.45-40, shadowColor:'#000', shadowOpacity:0.2, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:4}
            ]}
          >
            <Feather name="info" size={20} color="#0140CD"/>
            <Text style={tw`ml-2 text-sm font-medium text-[#0140CD]`}>{infoMsg}</Text>
          </MotiView>
        )}
        {errorMsg!=='' && (
          <MotiView key="err" from={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={[
              tw`absolute left-6 right-6 flex-row items-center p-3 rounded-xl bg-red-50`,
              {top:height*0.45-40, shadowColor:'#000', shadowOpacity:0.2, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:4}
            ]}
          >
            <Feather name="x-circle" size={20} color="#dc3545"/>
            <Text style={tw`ml-2 text-sm font-medium text-red-600`}>{errorMsg}</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ---------- Modal principal ---------- */}
      <Modal 
        animationType="slide" 
        transparent={true}
        visible={modalVisible} 
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={tw`flex-1 justify-end bg-transparent`}>
          <View style={tw`bg-white rounded-t-3xl h-[70%]`}>
            {/* header */}
            <View style={tw`flex-row justify-between items-center p-4 border-b border-[#0140CD] bg-white`}>
              <Text style={tw`text-[#0140CD] text-lg font-bold`}>Detalles del Envío</Text>
              <TouchableOpacity onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={26} color="#0140CD"/>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
              {/* datos básicos */}
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={tw`text-black text-lg font-bold`}>
                  Asignación Nº {envio.id_asignacion}
                </Text>
                {(envio.estado?.toLowerCase() === 'en curso' || envio.estado?.toLowerCase() === 'parcialmente entregado') && (
                  <View style={tw`flex-row items-center`}>
                    <TouchableOpacity 
                      onPress={handleShowFirmaModal} 
                      style={tw`pr-2`}
                      disabled={hasFirmaTransportista}>
                      <Ionicons 
                        name="create-outline" 
                        size={24} 
                        color={hasFirmaTransportista ? "#999" : "#0140CD"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openQRModal} style={tw`pl-2`}>
                      <Ionicons name="qr-code-outline" size={24} color="#0140CD" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={tw`text-black text-base mb-6`}><Text style={tw`text-green-600`}>{envio.estado || envio.estado_envio}</Text></Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="car-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Transporte: {envio.tipo_transporte}
              </Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="leaf-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Variedad: {envio.cargas?.[0]?.variedad}
              </Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="scale-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Peso: {envio.cargas?.[0]?.peso ?? '—'} kg
              </Text>
              <Text style={tw`text-black text-base mb-2.5 flex-row items-center`}>
                <Ionicons name="calculator-outline" size={18} color="#0140CD" style={tw`mr-1`}/> Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}
              </Text>
              {/* ubicación origen y destino */}
              <View style={tw`mb-2.5`}>
                <Text style={tw`text-black text-base flex-row items-center`}>
                  <Ionicons name="location-outline" size={18} color="#0140CD" style={tw`mr-1`} />
                  <Text style={tw`font-bold`}>Origen: </Text>
                  {envio.nombre_origen}
                </Text>
                <Text style={tw`text-black text-base flex-row items-center mt-1`}>
                  <Ionicons name="location-outline" size={18} color="#0140CD" style={tw`mr-1`} />
                  <Text style={tw`font-bold`}>Destino: </Text>
                  {envio.nombre_destino}
                </Text>
              </View>

              {/* --- CHECKLIST CONDICIONES --- */}
              {(envio.estado?.toLowerCase() === 'pendiente') && !showConditions && (
                <View style={tw`mt-6 mb-10`}>
                  <TouchableOpacity
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mb-3`}
                    onPress={() => setShowConditionsModal(true)}>
                    <Text style={tw`text-white font-semibold text-base`}>Registro de condiciones de Transporte</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center`}
                    onPress={() => {
                      if (allAnswered(conditions)) {
                        handleConfirmTrip();
                      } else {
                        setShowConditionsAlert(true);
                      }
                    }}>
                    <Text style={tw`text-white font-semibold text-base`}>Iniciar viaje</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showConditions && (
                <>
                  <View style={tw`mt-5 mb-3`}>
                    <Text style={tw`text-[#0140CD] text-lg font-semibold`}>Registro de condiciones de Transporte</Text>
                  </View>
                  <TextInput
                    style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                    placeholder="Observaciones" 
                    placeholderTextColor="#666"
                    multiline 
                    value={observaciones} 
                    onChangeText={setObservaciones}
                  />
                  {Object.entries(conditions).map(([k,v])=>(
                    <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                      <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                      <View style={tw`flex-row gap-2`}>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setConditions,k,true)}>
                          <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                        </Pressable>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setConditions,k,false)}>
                          <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-6 mb-10`} 
                    onPress={handleConfirmTrip}>
                    <Text style={tw`text-white font-semibold text-base`}>Confirmar viaje</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* --- CHECKLIST INCIDENTES --- */}
              {(envio.estado?.toLowerCase() === 'en curso' || envio.estado?.toLowerCase() === 'parcialmente entregado') &&
                !showIncidents && !showConditions && (
                <View style={tw`mt-6 mb-10`}>
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mb-3`} 
                    onPress={() => {
                      setShowIncidentsModal(true);
                    }}>
                    <Text style={tw`text-white font-semibold text-base`}>Registro de incidentes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center`} 
                    onPress={handleFinalizarViaje}>
                    <Text style={tw`text-white font-semibold text-base`}>Finalizar Viaje</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showIncidents && (
                <>
                  <View style={tw`mt-5 mb-3`}>
                    <Text style={tw`text-[#0140CD] text-lg font-semibold`}>Registro de incidentes</Text>
                  </View>
                  <View style={tw`bg-white rounded-2xl p-6 w-full max-h-[60%] flex-1`}>
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                      <Text style={tw`text-[#0140CD] text-xl font-bold`}>Registro de incidentes</Text>
                      <TouchableOpacity onPress={() => setShowIncidentsModal(false)}>
                        <Ionicons name="close" size={24} color="#0140CD" />
                      </TouchableOpacity>
                    </View>
                    <View style={tw`flex-1`}>
                      <ScrollView style={tw``} contentContainerStyle={tw`pb-2`}>
                        <TextInput
                          style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                          placeholder="Descripción del incidente"
                          placeholderTextColor="#666"
                          multiline
                          value={descripcionIncidente}
                          onChangeText={setDescripcionIncidente}
                        />
                        {Object.entries(incidents).map(([k,v])=>(
                          <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                            <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                            <View style={tw`flex-row gap-2`}>
                              <Pressable
                                style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                                onPress={()=>setAnswer(setIncidents,k,true)}>
                                <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                              </Pressable>
                              <Pressable
                                style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                                onPress={()=>setAnswer(setIncidents,k,false)}>
                                <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </>
              )}

              {/* COMPLETADO */}
              {envio.estado_envio.toLowerCase()==='completado' && (
                <View style={tw`items-center py-8`}>
                  <Ionicons name="checkmark-circle" size={64} color="#28a745"/>
                  <Text style={tw`text-black text-lg font-semibold mt-4`}>¡Entrega completada con éxito!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------- Modal QR ---------- */}
      <Modal
        transparent
        visible={showQRModal}
        onRequestClose={()=>{
          stopPolling?.();               // detener polling
          setShowQRModal(false);
          // No reiniciamos firmaCliente aquí
        }}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Text style={tw`text-lg font-bold text-[#0140CD] mb-2`}>Escanea este QR</Text>

            {qrLoading && !qrImg && (
              <ActivityIndicator size="large" color="#0140CD" style={tw`my-8`}/>
            )}

            {!qrLoading && qrImg && (
              <Image source={{uri:qrImg}} style={tw`w-[220px] h-[220px] my-4`}/>
            )}

            {!qrLoading && !qrImg && (
              <Text style={tw`my-4 text-red-600`}>No se pudo cargar el código. Intenta de nuevo.</Text>
            )}

            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-2`}
              onPress={()=>{
                stopPolling?.();
                setShowQRModal(false);
                // No reiniciamos firmaCliente aquí
              }}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Checklist de Incidentes */}
      <Modal
        transparent
        visible={showIncidentsModal}
        animationType="slide"
        onRequestClose={() => setShowIncidentsModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full max-h-[60%] flex-1`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-[#0140CD] text-xl font-bold`}>Registro de incidentes</Text>
              <TouchableOpacity onPress={() => setShowIncidentsModal(false)}>
                <Ionicons name="close" size={24} color="#0140CD" />
              </TouchableOpacity>
            </View>
            <View style={tw`flex-1`}>
              <ScrollView style={tw``} contentContainerStyle={tw`pb-2`}>
                <TextInput
                  style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                  placeholder="Descripción del incidente"
                  placeholderTextColor="#666"
                  multiline
                  value={descripcionIncidente}
                  onChangeText={setDescripcionIncidente}
                />
                {Object.entries(incidents).map(([k,v])=>(
                  <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                    <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                    <View style={tw`flex-row gap-2`}>
                      <Pressable
                        style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                        onPress={()=>setAnswer(setIncidents,k,true)}>
                        <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                      </Pressable>
                      <Pressable
                        style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                        onPress={()=>setAnswer(setIncidents,k,false)}>
                        <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-4`}
              onPress={() => {
                if (!allAnswered(incidents)) {
                  setShowChecklistIncompleteAlert(true);
                  return;
                }
                setShowIncidentsModal(false);
                setShowChecklistCompleteModal(true);
              }}
            >
              <Text style={tw`text-white font-semibold text-base`}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal inicio de checklist de incidentes */}
      <Modal transparent visible={showIncidentStartModal} animationType="fade" onRequestClose={()=>setShowIncidentStartModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>Registro de incidentes</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Debes completar el registro de incidentes antes de finalizar este envío.
              Por favor, responde a todas las preguntas y describe cualquier incidencia ocurrida durante el trayecto.
            </Text>
            <View style={tw`flex-row justify-center`}>
              <TouchableOpacity 
                style={tw`bg-gray-500 py-3 px-6 rounded-xl mr-2`}
                onPress={()=>setShowIncidentStartModal(false)}>
                <Text style={tw`text-white font-semibold text-base`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
                onPress={()=>{
                  setShowIncidentStartModal(false);
                  setShowIncidentsModal(true);
                }}>
                <Text style={tw`text-white font-semibold text-base`}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* lista condiciones */}
      <Modal transparent visible={showCondListModal} animationType="fade" onRequestClose={()=>setShowCondListModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>Viaje iniciado con éxito</Text>
            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-3`}
              onPress={()=>setShowCondListModal(false)}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* firma faltante detectada por el backend */}
      <Modal
        transparent
        visible={showFirmaBackendModal}
        animationType="fade"
        onRequestClose={() => setShowFirmaBackendModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#dc3545"
              style={tw`mb-3`}
            />
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>Debes capturar la firma</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              El servidor rechazó la operación porque la firma del cliente aún no ha sido registrada.
              Pide al cliente que escanee el QR y firme para poder finalizar el envío.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-2`}
              onPress={() => setShowFirmaBackendModal(false)}
            >
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de alerta para condiciones */}
      <Modal transparent visible={showConditionsAlert} animationType="fade" onRequestClose={()=>setShowConditionsAlert(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>Registro de Condiciones</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Debes completar el registro de condiciones de transporte antes de iniciar el viaje.
              Por favor, responde a todas las preguntas.
            </Text>
            <View style={tw`flex-row justify-center`}>
              <TouchableOpacity 
                style={tw`bg-gray-500 py-3 px-6 rounded-xl mr-2`}
                onPress={()=>setShowConditionsAlert(false)}>
                <Text style={tw`text-white font-semibold text-base`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
                onPress={()=>{
                  setShowConditionsAlert(false);
                  setShowConditionsModal(true);
                }}>
                <Text style={tw`text-white font-semibold text-base`}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal firma cliente requerida */}
      <Modal transparent visible={showSignNeeded} animationType="fade" onRequestClose={()=>setShowSignNeeded(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="finger-print-outline" size={64} color="#dc3545" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-red-600 mb-2 text-center`}>Falta la firma del cliente</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Para finalizar este envío, es necesario obtener la firma del cliente.
              Por favor, utiliza la opción "Mostrar QR para firma" y solicita al cliente que escanee y firme.
            </Text>
            <View style={tw`flex-row justify-center`}>
              <TouchableOpacity 
                style={tw`bg-gray-500 py-3 px-6 rounded-xl mr-2`}
                onPress={()=>setShowSignNeeded(false)}>
                <Text style={tw`text-white font-semibold text-base`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
                onPress={() => {
                  setShowSignNeeded(false);
                  openQRModal();
                }}>
                <Text style={tw`text-white font-semibold text-base`}>Mostrar QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* envío finalizado */}
      <Modal transparent visible={showFinishModal} animationType="fade" onRequestClose={()=>setShowFinishModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>¡Envío Finalizado!</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>La entrega se registró con éxito.</Text>
            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-2`}
              onPress={()=>setShowFinishModal(false)}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Checklist Completado */}
      <Modal transparent visible={showChecklistCompleteModal} animationType="fade" onRequestClose={()=>setShowChecklistCompleteModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>Registro de incidentes Completado</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Has completado el registro de incidentes correctamente.
            </Text>
            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => {
                setShowChecklistCompleteModal(false);
                setTimeout(() => {
                  if (!firmaCliente) {
                    setShowQRNeededModal(true);
                  } else {
                    handleFinalize();
                  }
                }, 300);
              }}>
              <Text style={tw`text-white font-semibold text-base`}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal QR Necesario */}
      <Modal transparent visible={showQRNeededModal} animationType="fade" onRequestClose={()=>setShowQRNeededModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="qr-code-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>Firma del Cliente Requerida</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              El cliente debe escanear el QR para firmar el documento y así poder finalizar el viaje.
            </Text>
            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => {
                setShowQRNeededModal(false);
                openQRModal();
              }}>
              <Text style={tw`text-white font-semibold text-base`}>Mostrar QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Checklist de Condiciones */}
      <Modal
        transparent
        visible={showConditionsModal}
        animationType="slide"
        onRequestClose={() => setShowConditionsModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full max-h-[60%] flex-1`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-[#0140CD] text-xl font-bold`}>Registro de condiciones</Text>
              <TouchableOpacity onPress={() => setShowConditionsModal(false)}>
                <Ionicons name="close" size={24} color="#0140CD" />
              </TouchableOpacity>
            </View>
            <View style={tw`flex-1`}>
              <ScrollView style={tw``} contentContainerStyle={tw`pb-2`}>
                <TextInput
                  style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                  placeholder="Observaciones"
                  placeholderTextColor="#666"
                  multiline
                  value={observaciones}
                  onChangeText={setObservaciones}
                />
                {Object.entries(conditions).map(([k,v])=>(
                  <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                    <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                    <View style={tw`flex-row gap-2`}>
                      <Pressable
                        style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                        onPress={()=>setAnswer(setConditions,k,true)}>
                        <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                      </Pressable>
                      <Pressable
                        style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                        onPress={()=>setAnswer(setConditions,k,false)}>
                        <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-4`}
              onPress={() => {
                if (!allAnswered(conditions)) {
                  setShowConditionsIncompleteAlert(true);
                  return;
                }
                setShowConditionsModal(false);
                setShowConditionsCompleteModal(true);
              }}
            >
              <Text style={tw`text-white font-semibold text-base`}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Checklist Condiciones Completado */}
      <Modal transparent visible={showConditionsCompleteModal} animationType="fade" onRequestClose={()=>setShowConditionsCompleteModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>Registro de Condiciones de Transporte Completado</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Has completado el registro de condiciones correctamente.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => {
                setShowConditionsCompleteModal(false);
                // Aquí puedes agregar lógica extra si lo necesitas
              }}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal alerta checklist incompleto (incidentes) */}
      <Modal transparent visible={showChecklistIncompleteAlert} animationType="fade" onRequestClose={()=>setShowChecklistIncompleteAlert(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#dc3545" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-red-600 mb-2 text-center`}>Checklist Incompleto</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Debes completar todo el checklist de incidentes antes de confirmar.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={()=>setShowChecklistIncompleteAlert(false)}>
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal alerta checklist incompleto (condiciones) */}
      <Modal transparent visible={showConditionsIncompleteAlert} animationType="fade" onRequestClose={()=>setShowConditionsIncompleteAlert(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#dc3545" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-red-600 mb-2 text-center`}>Checklist Incompleto</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Debes completar todo el registro de condiciones de transporte antes de confirmar.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={()=>setShowConditionsIncompleteAlert(false)}>
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Firma Digital */}
      <Modal
        transparent
        visible={showFirmaModal}
        animationType="slide"
        onRequestClose={() => setShowFirmaModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full h-[80%]`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-[#0140CD] text-xl font-bold`}>Firma del Transportista</Text>
              <TouchableOpacity onPress={() => setShowFirmaModal(false)}>
                <Ionicons name="close" size={24} color="#0140CD" />
              </TouchableOpacity>
            </View>

            <View style={tw`flex-1 bg-white rounded-xl mb-4 mt-4 justify-center`}>
              <SignatureCanvas
                ref={signatureRef}
                onOK={handleFirma}
                onEmpty={() => handleFirmaError(new Error('Firma vacía'))}
                descriptionText="Firme aquí"
                clearText="Limpiar"
                confirmText="Guardar"
                webStyle={`
                  .m-signature-pad--footer {display: none; margin: 0px;}
                  .m-signature-pad {box-shadow: none; border: none;}
                  body {width: 100%; height: 100%}
                `}
                style={tw`flex-1`}
                autoClear={false}
                trimWhitespace={true}
                imageType="image/png"
                minWidth={2}
                maxWidth={3}
                penColor="#000000"
              />
            </View>

            <View style={tw`items-center mb-15 -mt-6 px-2`}> 
              <FontAwesome5 name="truck" size={36} color="#0140CD" style={tw`mb-2`} />
              <Text style={tw`text-[#0140CD] text-lg font-semibold text-center mb-1`}>Certificación de Entrega</Text>
              <Text style={tw`text-gray-800 text-base text-center font-medium`}>
                Por favor, firme para certificar que la entrega fue realizada correctamente y conforme a los términos del envío.
              </Text>
            </View>

            <View style={tw`flex-row justify-end gap-2`}>
              <TouchableOpacity
                style={[
                  tw`py-3 px-6 rounded-xl`,
                  isConfirmButtonDisabled ? tw`bg-gray-400` : tw`bg-gray-500`
                ]}
                onPress={handleClearFirma}
                disabled={isConfirmButtonDisabled}
              >
                <Text style={tw`text-white font-semibold text-base`}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`py-3 px-6 rounded-xl`,
                  (isConfirmButtonDisabled || isProcessingFirma) ? tw`bg-gray-400` : tw`bg-[#0140CD]`
                ]}
                onPress={() => {
                  if (!isConfirmButtonDisabled && !isProcessingFirma && signatureRef.current) {
                    setIsProcessingFirma(true);
                    setPendingSave(true);
                    signatureRef.current.readSignature();
                  }
                }}
                disabled={isConfirmButtonDisabled || isProcessingFirma}
              >
                <Text style={tw`text-white font-semibold text-base`}>
                  {isConfirmButtonDisabled ? 'Ya firmado' : isProcessingFirma ? 'Procesando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal visual de alerta para firma del transportista (estilo checklist/QR) */}
      <Modal
        transparent
        visible={showFirmaTransportistaNeeded}
        animationType="fade"
        onRequestClose={() => setShowFirmaTransportistaNeeded(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>
              Falta la firma del transportista
            </Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Necesitamos la firma del transportista para validar que se entregó el pedido.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => {
                setShowFirmaTransportistaNeeded(false);
                setShowFirmaModal(true);
              }}
            >
              <Text style={tw`text-white font-semibold text-base`}>Firmar ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal visual: Firma registrada con éxito */}
      <Modal
        transparent
        visible={showFirmaRegistradaModal}
        animationType="fade"
        onRequestClose={() => setShowFirmaRegistradaModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>¡Firma registrada!</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              La entrega ha sido certificada correctamente.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => setShowFirmaRegistradaModal(false)}
            >
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal visual: Ya firmó */}
      <Modal
        transparent
        visible={showYaFirmadoModal}
        animationType="fade"
        onRequestClose={() => setShowYaFirmadoModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>¡Ya has firmado este envío!</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              No es posible firmar nuevamente este envío ya que tu firma ha sido registrada previamente.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => setShowYaFirmadoModal(false)}
            >
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal visual: Debe firmar antes de confirmar */}
      <Modal
        transparent
        visible={showDebeFirmarModal}
        animationType="fade"
        onRequestClose={() => setShowDebeFirmarModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#dc3545" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-red-600 mb-2 text-center`}>Debes firmar antes de confirmar</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Para poder certificar la entrega, primero debes realizar tu firma digital.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => setShowDebeFirmarModal(false)}
            >
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal visual: Firma requerida */}
      <Modal
        transparent
        visible={showFirmaRequeridaModal}
        animationType="fade"
        onRequestClose={() => setShowFirmaRequeridaModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="alert-circle-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>Firma Requerida</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              No puedes confirmar el envío sin firmar. Por favor, intenta nuevamente.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
              onPress={() => {
                setShowFirmaRequeridaModal(false);
                setShowFirmaModal(true);
              }}
            >
              <Text style={tw`text-white font-semibold text-base`}>Intentar nuevamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal visual: Alerta dinámica de firma del transportista */}
      <Modal
        transparent
        visible={showFirmaTransportistaAlert}
        animationType="fade"
        onRequestClose={() => setShowFirmaTransportistaAlert(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="finger-print-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>Firma del Transportista</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Ahora que el cliente ha firmado, necesitamos tu firma para certificar la entrega y finalizar el proceso.
            </Text>
            <View style={tw`flex-row justify-center gap-3`}>
              <TouchableOpacity
                style={tw`bg-gray-500 py-3 px-6 rounded-xl`}
                onPress={() => setShowFirmaTransportistaAlert(false)}
              >
                <Text style={tw`text-white font-semibold text-base`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
                onPress={() => {
                  setShowFirmaTransportistaAlert(false);
                  setShowFirmaModal(true);
                }}
              >
                <Text style={tw`text-white font-semibold text-base`}>Firmar ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}