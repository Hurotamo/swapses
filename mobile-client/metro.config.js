const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// Import custom Metro components
const customResolver = require('./metro/resolver');
const customTransformer = require('./metro/transformer');
const cacheConfig = require('./metro/cache');

/**
 * Metro configuration for Swapses mobile app
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Add custom resolver for native modules
    platforms: ['ios', 'android', 'native', 'web'],
    
    // Handle file extensions
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
    
    // Asset extensions
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ttf', 'otf', 'woff', 'woff2'],
    
    // Custom resolver
    resolveRequest: customResolver.resolveRequest,
    
    // Platform extensions
    getPlatformExtensions: customResolver.getPlatformExtensions,
    
    // Module ignore rules
    shouldIgnoreModule: customResolver.shouldIgnoreModule,
  },
  
  transformer: {
    // Enable Hermes for better performance
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    
    // Custom transformer
    transform: customTransformer.transform,
    transformAsset: customTransformer.transformAsset,
    
    // Handle SVG files
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  
  // Watch folders for changes
  watchFolders: [
    // Add any additional folders to watch
    // '../shared-components',
    // '../common-utils',
  ],
  
  // Cache configuration
  cacheStores: cacheConfig.cache.stores,
  
  // Cache directory
  cacheDirectory: cacheConfig.cache.directory,
  
  // Server configuration
  server: {
    port: 8081,
    enhanceMiddleware: (middleware, server) => {
      // Custom middleware for development
      return middleware;
    },
  },
  
  // Development configuration
  development: {
    // Enable hot reloading
    hot: true,
    
    // Enable source maps
    sourceMaps: true,
  },
  
  // Optimization settings
  optimization: cacheConfig.optimization,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config); 