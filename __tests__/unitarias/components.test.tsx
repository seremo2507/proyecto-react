import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Mock para react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    View: View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[0]),
    runOnJS: jest.fn((fn) => fn),
    createAnimatedComponent: (component: React.ComponentType<any>) => component,
    Animated: {
      View: View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      ScrollView: require('react-native').ScrollView,
    },
  };
});

// Mock para el hook useThemeColor
jest.mock('../../hooks/useThemeColor', () => ({
  useThemeColor: jest.fn(() => '#000000'),
}));

describe('ThemedText Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with default type', () => {
    render(<ThemedText>Test Text</ThemedText>);
    const textElement = screen.getByText('Test Text');
    expect(textElement).toBeTruthy();
  });

  test('renders with title type', () => {
    render(<ThemedText type="title">Title Text</ThemedText>);
    const textElement = screen.getByText('Title Text');
    expect(textElement).toBeTruthy();
  });

  test('renders with subtitle type', () => {
    render(<ThemedText type="subtitle">Subtitle Text</ThemedText>);
    const textElement = screen.getByText('Subtitle Text');
    expect(textElement).toBeTruthy();
  });

  test('applies custom style props', () => {
    const customStyle = { fontSize: 20 };
    render(<ThemedText style={customStyle}>Styled Text</ThemedText>);
    const textElement = screen.getByText('Styled Text');
    expect(textElement).toBeTruthy();
  });
});

describe('ThemedView Component', () => {
  test('renders with default background color', () => {
    render(<ThemedView testID="themed-view" />);
    const viewElement = screen.getByTestId('themed-view');
    expect(viewElement).toBeTruthy();
  });

  test('applies custom background color', () => {
    const lightColor = '#ffffff';
    const darkColor = '#000000';
    render(
      <ThemedView
        testID="themed-view"
        lightColor={lightColor}
        darkColor={darkColor}
      />
    );
    const viewElement = screen.getByTestId('themed-view');
    expect(viewElement).toBeTruthy();
  });

  test('applies custom style props', () => {
    const customStyle = { padding: 10 };
    render(
      <ThemedView
        testID="themed-view"
        style={customStyle}
      />
    );
    const viewElement = screen.getByTestId('themed-view');
    expect(viewElement).toBeTruthy();
  });
});