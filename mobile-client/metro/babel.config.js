module.exports = {
  presets: [
    'module:metro-react-native-babel-preset',
  ],
  plugins: [
    // React Native Reanimated (if using animations)
    'react-native-reanimated/plugin',
    
    // Optional: Add TypeScript support
    '@babel/plugin-transform-typescript',
    
    // Optional: Add decorator support
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    
    // Optional: Add class properties support
    '@babel/plugin-proposal-class-properties',
  ],
  env: {
    production: {
      plugins: [
        // Remove console.log in production
        'transform-remove-console',
      ],
    },
  },
}; 