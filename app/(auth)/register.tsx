import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';

export default function RegisterScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailRegex = /^[\w.-]+@[\w-]+\.[a-z]{2,}$/i;
  const isCorreoValid = emailRegex.test(correo);
  const isPasswordValid = contrasena.length >= 6;
  const isFormValid =
    nombre.trim() !== '' &&
    apellido.trim() !== '' &&
    isCorreoValid &&
    isPasswordValid &&
    acceptTerms;

  const handleRegister = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const res = await fetch('https://api-4g7v.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), apellido: apellido.trim(), correo: correo.trim(), contrasena }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en registro');
      setTimeout(() => router.replace('/login'), 1000);
    } catch (e: any) { // Añadido tipado explícito como 'any'
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-[#0045cc]`} contentContainerStyle={tw`flex-1 justify-center items-center py-10`}>
      <View style={tw`bg-white rounded-lg p-6 w-11/12 max-w-md`}>
        {/* Title */}
        <View style={tw`items-center mb-4`}>
          <Text style={tw`text-3xl text-[#0045cc] font-bold`}>OrgTrack</Text>
          <Text style={tw`text-gray-600 mt-1`}>Crea tu cuenta</Text>
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-700 mb-1`}>Nombre</Text>
          <TextInput
            placeholder="Tu nombre"
            value={nombre}
            onChangeText={setNombre}
            style={tw`border border-gray-300 rounded-lg p-3 text-base`}
            editable={!loading}
          />
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-700 mb-1`}>Apellido</Text>
          <TextInput
            placeholder="Tu apellido"
            value={apellido}
            onChangeText={setApellido}
            style={tw`border border-gray-300 rounded-lg p-3 text-base`}
            editable={!loading}
          />
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-700 mb-1`}>Correo electrónico</Text>
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            value={correo}
            onChangeText={setCorreo}
            style={tw`border border-gray-300 rounded-lg p-3 text-base`}
            editable={!loading}
          />
        </View>

        <View style={tw`mb-5`}>
          <Text style={tw`text-gray-700 mb-1`}>Contraseña</Text>
          <TextInput
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={contrasena}
            onChangeText={setContrasena}
            style={tw`border border-gray-300 rounded-lg p-3 text-base`}
            editable={!loading}
          />
        </View>

        {/* Checkbox for terms */}
        <Pressable 
          onPress={() => setAcceptTerms(!acceptTerms)} 
          style={tw`flex-row items-center mb-5`}
        >
          <View style={tw`w-5 h-5 border border-gray-400 rounded mr-2 ${acceptTerms ? 'bg-[#0045cc]' : 'bg-white'}`}>
            {acceptTerms && <Feather name="check" size={16} color="white" />}
          </View>
          <Text style={tw`text-gray-700`}>
            Acepto los <Text style={tw`text-[#0045cc]`}>Términos y Condiciones</Text>
          </Text>
        </Pressable>

        {/* Register button */}
        <Pressable
          onPress={handleRegister}
          disabled={loading || !isFormValid}
          style={tw`bg-[#0045cc] py-3 rounded-lg items-center mb-4 ${!isFormValid ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-base font-semibold`}>Registrarse</Text>
          )}
        </Pressable>

        {/* Login link */}
        <View style={tw`items-center`}>
          <Text style={tw`text-gray-600`}>
            ¿Ya tienes una cuenta? <Text onPress={() => router.replace('/(auth)/login')} style={tw`text-[#0045cc]`}>Inicia sesión</Text>
          </Text>
        </View>

        {/* Error message */}
        {!!error && (
          <View style={tw`mt-4 bg-red-100 p-2 rounded`}>
            <Text style={tw`text-red-600`}>{error}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
