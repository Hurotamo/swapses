/**
 * Custom Metro resolver for Swapses mobile app
 * Handles module resolution and platform-specific files
 */

const path = require('path');

module.exports = {
  /**
   * Resolve module requests
   * @param {string} context - Resolution context
   * @param {string} moduleName - Module to resolve
   * @param {string} platform - Target platform
   * @returns {string|null} - Resolved module path or null
   */
  resolveRequest: (context, moduleName, platform) => {
    // Handle platform-specific files
    if (platform) {
      const platformFile = `${moduleName}.${platform}`;
      const platformPath = path.resolve(context, platformFile);
      
      try {
        require.resolve(platformPath);
        return platformPath;
      } catch (e) {
        // Platform-specific file doesn't exist, continue
      }
    }
    
    // Handle native modules
    if (moduleName.startsWith('react-native-')) {
      return null; // Let Metro handle native modules
    }
    
    // Handle local modules with extensions
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    for (const ext of extensions) {
      const filePath = path.resolve(context, `${moduleName}${ext}`);
      try {
        require.resolve(filePath);
        return filePath;
      } catch (e) {
        // File doesn't exist, continue
      }
    }
    
    // Handle index files
    const indexExtensions = ['/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
    for (const ext of indexExtensions) {
      const indexPath = path.resolve(context, moduleName + ext);
      try {
        require.resolve(indexPath);
        return indexPath;
      } catch (e) {
        // Index file doesn't exist, continue
      }
    }
    
    // Let Metro handle the rest
    return null;
  },
  
  /**
   * Get platform extensions
   * @param {string} platform - Target platform
   * @returns {Array<string>} - Platform-specific extensions
   */
  getPlatformExtensions: (platform) => {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    
    if (platform) {
      return [
        ...extensions.map(ext => `.${platform}${ext}`),
        ...extensions,
      ];
    }
    
    return extensions;
  },
  
  /**
   * Check if module should be ignored
   * @param {string} moduleName - Module name
   * @returns {boolean} - Whether to ignore the module
   */
  shouldIgnoreModule: (moduleName) => {
    // Ignore certain modules during bundling
    const ignoredModules = [
      'react-native-vector-icons',
      'react-native-linear-gradient',
    ];
    
    return ignoredModules.includes(moduleName);
  },
}; 