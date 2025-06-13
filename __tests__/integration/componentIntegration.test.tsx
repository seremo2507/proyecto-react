import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { Collapsible } from '../../components/Collapsible';
import { ExternalLink } from '../../components/ExternalLink';
import { Text } from 'react-native';

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));
jest.mock('expo-router', () => ({
  Link: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

describe('Component Integration Tests', () => {
  // Prueba 1: Integración ThemedView con ThemedText
  test('ThemedView should render ThemedText correctly', () => {
    const { getByText } = render(
      <ThemedView>
        <ThemedText>Test Text</ThemedText>
      </ThemedView>
    );
    
    expect(getByText('Test Text')).toBeTruthy();
  });

  // Prueba 2: Integración del componente Collapsible
  test('Collapsible should render title', () => {
    const { getByText } = render(
      <Collapsible title="Test Collapsible">
        <ThemedText>Collapsible Content</ThemedText>
      </Collapsible>
    );
    expect(getByText('Test Collapsible')).toBeTruthy();
  });

  // Prueba 3: Integración del componente ExternalLink
  test('ExternalLink should render with correct text', () => {
    const { getByText } = render(
      <ExternalLink href="https://example.com">
        Test Link
      </ExternalLink>
    );
    expect(getByText('Test Link')).toBeTruthy();
  });
}); 