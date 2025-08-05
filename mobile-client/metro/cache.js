/**
 * Metro cache configuration for Swapses mobile app
 * Optimizes build performance and caching strategies
 */

const path = require('path');
const fs = require('fs');

module.exports = {
  /**
   * Cache configuration
   */
  cache: {
    // Cache directory
    directory: path.join(__dirname, '../.metro-cache'),
    
    // Cache options
    options: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 100 * 1024 * 1024, // 100MB
    },
    
    // Cache stores
    stores: [
      {
        name: 'metro',
        type: 'file',
        options: {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      },
      {
        name: 'babel',
        type: 'file',
        options: {
          maxAge: 12 * 60 * 60 * 1000, // 12 hours
        },
      },
    ],
  },
  
  /**
   * Clear cache
   * @param {string} cacheDir - Cache directory path
   */
  clearCache: (cacheDir) => {
    const cachePath = cacheDir || path.join(__dirname, '../.metro-cache');
    
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('✅ Metro cache cleared');
    } else {
      console.log('ℹ️  No cache directory found');
    }
  },
  
  /**
   * Get cache size
   * @param {string} cacheDir - Cache directory path
   * @returns {number} - Cache size in bytes
   */
  getCacheSize: (cacheDir) => {
    const cachePath = cacheDir || path.join(__dirname, '../.metro-cache');
    
    if (!fs.existsSync(cachePath)) {
      return 0;
    }
    
    return getDirectorySize(cachePath);
  },
  
  /**
   * Cache key generator
   * @param {string} filename - File path
   * @param {Object} options - Cache options
   * @returns {string} - Cache key
   */
  generateCacheKey: (filename, options = {}) => {
    const { platform, dev } = options;
    const fileHash = require('crypto')
      .createHash('md5')
      .update(filename)
      .digest('hex');
    
    return `${fileHash}-${platform || 'unknown'}-${dev ? 'dev' : 'prod'}`;
  },
  
  /**
   * Cache invalidation rules
   */
  invalidationRules: [
    // Invalidate cache when Metro config changes
    {
      pattern: 'metro.config.js',
      action: 'clear-all',
    },
    // Invalidate cache when Babel config changes
    {
      pattern: 'babel.config.js',
      action: 'clear-babel',
    },
    // Invalidate cache when package.json changes
    {
      pattern: 'package.json',
      action: 'clear-all',
    },
  ],
  
  /**
   * Cache optimization settings
   */
  optimization: {
    // Enable parallel processing
    parallel: true,
    
    // Number of workers
    workers: require('os').cpus().length,
    
    // Memory limit per worker
    memoryLimit: 512 * 1024 * 1024, // 512MB
    
    // Enable compression
    compression: true,
    
    // Compression level
    compressionLevel: 6,
  },
};

/**
 * Get directory size recursively
 * @param {string} dirPath - Directory path
 * @returns {number} - Directory size in bytes
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error.message);
  }
  
  return totalSize;
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export utility functions
module.exports.formatBytes = formatBytes;
module.exports.getDirectorySize = getDirectorySize; 