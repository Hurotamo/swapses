/**
 * Custom Metro transformer for Swapses mobile app
 * Handles asset transformations and optimizations
 */

const { transform } = require('@babel/core');
const { getDefaultConfig } = require('@react-native/metro-config');

module.exports = {
  /**
   * Transform JavaScript/TypeScript files
   * @param {Object} options - Transformation options
   * @returns {Object} - Transformed code and source map
   */
  transform: async (options) => {
    const { filename, src, plugins, ...rest } = options;
    
    // Use default Babel configuration
    const result = await transform(src, {
      filename,
      plugins: plugins || [],
      presets: ['module:metro-react-native-babel-preset'],
      sourceMaps: true,
      ...rest,
    });
    
    return {
      code: result.code,
      map: result.map,
    };
  },
  
  /**
   * Transform assets (images, fonts, etc.)
   * @param {Object} options - Asset transformation options
   * @returns {Object} - Asset metadata
   */
  transformAsset: async (options) => {
    const { filename, src, ...rest } = options;
    
    // Handle different asset types
    const assetType = getAssetType(filename);
    
    switch (assetType) {
      case 'image':
        return transformImageAsset(filename, src);
      case 'font':
        return transformFontAsset(filename, src);
      case 'svg':
        return transformSVGAsset(filename, src);
      default:
        return {
          type: 'asset',
          name: filename,
          data: src,
        };
    }
  },
  
  /**
   * Get asset type based on filename
   * @param {string} filename - Asset filename
   * @returns {string} - Asset type
   */
  getAssetType: (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const fontExts = ['ttf', 'otf', 'woff', 'woff2'];
    const svgExts = ['svg'];
    
    if (imageExts.includes(ext)) return 'image';
    if (fontExts.includes(ext)) return 'font';
    if (svgExts.includes(ext)) return 'svg';
    
    return 'unknown';
  },
  
  /**
   * Transform image assets
   * @param {string} filename - Image filename
   * @param {Buffer} src - Image data
   * @returns {Object} - Image metadata
   */
  transformImageAsset: (filename, src) => {
    return {
      type: 'image',
      name: filename,
      data: src,
      dimensions: getImageDimensions(src),
    };
  },
  
  /**
   * Transform font assets
   * @param {string} filename - Font filename
   * @param {Buffer} src - Font data
   * @returns {Object} - Font metadata
   */
  transformFontAsset: (filename, src) => {
    return {
      type: 'font',
      name: filename,
      data: src,
      family: getFontFamily(filename),
    };
  },
  
  /**
   * Transform SVG assets
   * @param {string} filename - SVG filename
   * @param {Buffer} src - SVG data
   * @returns {Object} - SVG metadata
   */
  transformSVGAsset: (filename, src) => {
    return {
      type: 'svg',
      name: filename,
      data: src,
      viewBox: getSVGViewBox(src),
    };
  },
};

/**
 * Get image dimensions (placeholder implementation)
 * @param {Buffer} src - Image data
 * @returns {Object} - Image dimensions
 */
function getImageDimensions(src) {
  // In a real implementation, you'd parse the image to get dimensions
  return { width: 100, height: 100 };
}

/**
 * Get font family from filename
 * @param {string} filename - Font filename
 * @returns {string} - Font family name
 */
function getFontFamily(filename) {
  return filename.split('.')[0].replace(/[-_]/g, ' ');
}

/**
 * Get SVG viewBox (placeholder implementation)
 * @param {Buffer} src - SVG data
 * @returns {string} - SVG viewBox
 */
function getSVGViewBox(src) {
  // In a real implementation, you'd parse the SVG to get viewBox
  return '0 0 100 100';
} 