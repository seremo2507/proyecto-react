// Importar la configuración base de React Native
require('react-native/jest/setup');

// Mock para react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;
  const Image = require('react-native').Image;
  const ScrollView = require('react-native').ScrollView;

  return {
    View,
    Text,
    Image,
    ScrollView,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[0]),
    runOnJS: jest.fn((fn) => fn),
    createAnimatedComponent: (component) => component,
    Animated: {
      View,
      Text,
      Image,
      ScrollView,
    },
  };
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