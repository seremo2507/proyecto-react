import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as ExpoRouter from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Login from '../../app/(auth)/login';
import RegisterScreen from '../../app/(auth)/register';
import HomeScreen from '../../app/(drawer)/home';

// Mock de useRouter para que los redirects funcionen
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRouter = {
  replace: mockReplace,
  push: mockPush,
  back: jest.fn(),
  canGoBack: jest.fn(),
  navigate: jest.fn(),
  dismiss: jest.fn(),
  setParams: jest.fn(),
  prefetch: jest.fn(),
  pathname: '',
  params: {},
  query: {},
  dismissTo: jest.fn(),
  dismissAll: jest.fn(),
  canDismiss: jest.fn(),
  reload: jest.fn(),
};
jest.spyOn(ExpoRouter, 'useRouter').mockReturnValue(mockRouter);

// Mock de router para HomeScreen
jest.mock('expo-router', () => ({
  router: mockRouter,
  useRouter: () => mockRouter,
}));

// Mock de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

// Mock de fetch global
global.fetch = jest.fn();

describe('Pruebas de Aceptación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock de fetch para login exitoso
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'fake-token', user: { nombre: 'Test User', rol: 'admin' } }),
    });
    // Mock de AsyncStorage para simular usuario existente
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'usuario') return Promise.resolve(JSON.stringify({ nombre: 'Test User', rol: 'admin' }));
      if (key === 'token') return Promise.resolve('fake-token');
      return Promise.resolve(null);
    });
  });

  it('Usuario puede iniciar sesión exitosamente', async () => {
    const { getByPlaceholderText, getByText } = render(<Login />);

    // Simular entrada de credenciales
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'password123');

    // Simular almacenamiento de token y usuario
    await act(async () => {
      await AsyncStorage.setItem('token', 'fake-token');
      await AsyncStorage.setItem('usuario', JSON.stringify({ nombre: 'Test User', rol: 'admin' }));
    });

    // Presionar botón de login
    await act(async () => {
      fireEvent.press(getByText('Entrar'));
    });

    // Esperar a que el redirect ocurra con timeout aumentado
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/home');
    }, { timeout: 6000 });
  });

  it('Usuario puede registrarse exitosamente', async () => {
    const { getByPlaceholderText, getByText, queryByPlaceholderText } = render(<RegisterScreen />);

    // Simular llenado del formulario
    fireEvent.changeText(getByPlaceholderText('Tu nombre'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Tu apellido'), 'Test Lastname');
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'password123');
    // Si existe el campo de confirmar contraseña, llenarlo
    if (queryByPlaceholderText('Confirmar contraseña')) {
      fireEvent.changeText(getByPlaceholderText('Confirmar contraseña'), 'password123');
    }

    // Simular aceptación de términos
    const termsCheckbox = getByText(/Acepto los/);
    fireEvent.press(termsCheckbox);

    // Presionar botón de registro
    await act(async () => {
      fireEvent.press(getByText('Registrarse'));
    });

    // Verificar redirección a login
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    }, { timeout: 4000 });
  });

  it('Usuario puede navegar por el menú principal', async () => {
    // Mock de AsyncStorage para simular usuario cliente
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'usuario') return Promise.resolve(JSON.stringify({ nombre: 'Test User', rol: 'cliente' }));
      if (key === 'token') return Promise.resolve('fake-token');
      return Promise.resolve(null);
    });

    // Mock de fetch para que no haya loading
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    // Mock de useFocusEffect para ejecutar la función solo una vez
    let called = false;
    jest.spyOn(require('@react-navigation/native'), 'useFocusEffect').mockImplementation((cb: any) => {
      if (!called) {
        called = true;
        cb();
      }
    });

    const { getByText } = render(<HomeScreen />);

    // Verificar que se muestra el título correcto
    await waitFor(() => {
      expect(getByText(/^(Nuevo envío|Envíos)$/)).toBeTruthy();
    }, { timeout: 3000 });

    // Esperar a que aparezca el botón de crear envío
    await waitFor(() => {
      expect(getByText('Crear Envío')).toBeTruthy();
    }, { timeout: 3000 });

    // Presionar botón de crear envío
    await act(async () => {
      fireEvent.press(getByText('Crear Envío'));
    });

    // Verificar redirección
    expect(mockPush).toHaveBeenCalledWith('/crear-envio/CrearEnvio');

    // Restaurar el mock de useFocusEffect
    jest.restoreAllMocks();
  });
}); 