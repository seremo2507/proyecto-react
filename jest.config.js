module.exports = {
    preset: 'react-native',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    transform: {
      '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest']
    },
    transformIgnorePatterns: [
      'node_modules/(?!(react-native|@react-native|react-native-reanimated|expo)/)'
    ],
    testPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/android/',
      '<rootDir>/ios/'
    ],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
      '^hooks/(.*)$': '<rootDir>/hooks/$1',
      '^components/(.*)$': '<rootDir>/components/$1'
    },
    testMatch: [
      '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)'
    ],
    moduleDirectories: ['node_modules', 'src', 'hooks', 'components']
  };