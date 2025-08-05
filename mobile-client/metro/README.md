# Metro Bundler Configuration

This directory contains Metro bundler configuration and related files for the Swapses mobile app.

## What is Metro?

Metro is the JavaScript bundler used by React Native. It's responsible for:
- Bundling JavaScript code
- Transforming and optimizing assets
- Managing dependencies
- Hot reloading during development

## Configuration Files

### `metro.config.js`
Main Metro configuration file with:
- **Resolver**: Handles file extensions and platform-specific modules
- **Transformer**: Configures Babel and asset transformations
- **Cache**: Optimizes build performance
- **Server**: Development server settings
- **Development**: Hot reloading and source maps

## Key Features

### Asset Handling
- Supports PNG, JPG, JPEG, GIF, SVG, WebP
- SVG transformer for vector graphics
- Optimized asset loading

### Performance Optimizations
- Hermes JavaScript engine enabled
- Inline requires for faster startup
- 24-hour cache for faster rebuilds
- Hot reloading for development

### Platform Support
- iOS and Android platforms
- Web platform support
- Native module resolution

## Development Commands

```bash
# Start Metro bundler
npm start

# Start with specific port
npx react-native start --port 8081

# Clear Metro cache
npx react-native start --reset-cache

# Bundle for production
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
```

## Troubleshooting

### Common Issues

1. **Cache Issues**
   ```bash
   npx react-native start --reset-cache
   ```

2. **Port Conflicts**
   ```bash
   npx react-native start --port 8082
   ```

3. **Asset Loading**
   - Ensure assets are in the correct directories
   - Check file extensions in metro.config.js

### Performance Tips

- Use `--reset-cache` sparingly
- Keep Metro server running during development
- Use Hermes for better performance
- Monitor bundle size with `npx react-native bundle --dev false`

## Customization

To add custom configurations:

1. **Add new file extensions**:
   ```javascript
   sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx', 'your-extension'],
   ```

2. **Add new asset types**:
   ```javascript
   assetExts: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'your-asset'],
   ```

3. **Watch additional folders**:
   ```javascript
   watchFolders: [
     '../shared-components',
     '../common-utils',
   ],
   ``` 