// Importar la configuración base de React Native
require('react-native/jest/setup');

import 'react-native-gesture-handler/jestSetup';

// Mock para react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock para AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock para expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

// Mock para el hook useThemeColor
jest.mock('./hooks/useThemeColor', () => ({
  useThemeColor: jest.fn(() => '#000000'),
}));

// Mock para @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  DrawerActions: {
    openDrawer: jest.fn(),
    closeDrawer: jest.fn(),
  },
}));

// Mock para twrnc
jest.mock('twrnc', () => {
  return {
    __esModule: true,
    default: () => '', // Mock como función
  };
});

// Mock para expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3000',
      },
    },
  },
}));

// Silenciar warnings comunes
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillMount') ||
        args[0].includes('componentWillReceiveProps') ||
        args[0].includes('VirtualizedLists should never be nested'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});