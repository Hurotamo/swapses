#!/usr/bin/env node

/**
 * Metro utility scripts for Swapses mobile app
 * Provides commands for cache management, bundle analysis, and development
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const cacheConfig = require('./cache');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Clear Metro cache
 */
function clearCache() {
  try {
    cacheConfig.clearCache();
    success('Metro cache cleared successfully');
  } catch (err) {
    error(`Failed to clear cache: ${err.message}`);
  }
}

/**
 * Get cache size
 */
function getCacheSize() {
  try {
    const size = cacheConfig.getCacheSize();
    const formattedSize = cacheConfig.formatBytes(size);
    info(`Metro cache size: ${formattedSize}`);
    return size;
  } catch (err) {
    error(`Failed to get cache size: ${err.message}`);
    return 0;
  }
}

/**
 * Start Metro bundler
 */
function startMetro(options = {}) {
  const { port = 8081, resetCache = false } = options;
  
  try {
    const command = `npx react-native start --port ${port}${resetCache ? ' --reset-cache' : ''}`;
    info(`Starting Metro bundler on port ${port}...`);
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    error(`Failed to start Metro: ${err.message}`);
  }
}

/**
 * Bundle for production
 */
function bundleForProduction(platform = 'android') {
  try {
    const outputPath = platform === 'android' 
      ? 'android/app/src/main/assets/index.android.bundle'
      : 'ios/main.jsbundle';
    
    const command = `npx react-native bundle --platform ${platform} --dev false --entry-file index.js --bundle-output ${outputPath} --assets-dest ${platform === 'android' ? 'android/app/src/main/res' : 'ios'}`;
    
    info(`Bundling for ${platform} production...`);
    execSync(command, { stdio: 'inherit' });
    success(`Bundle created successfully for ${platform}`);
  } catch (err) {
    error(`Failed to create bundle: ${err.message}`);
  }
}

/**
 * Analyze bundle size
 */
function analyzeBundle(platform = 'android') {
  try {
    const bundlePath = platform === 'android' 
      ? 'android/app/src/main/assets/index.android.bundle'
      : 'ios/main.jsbundle';
    
    if (!fs.existsSync(bundlePath)) {
      warning(`Bundle file not found at ${bundlePath}. Run bundleForProduction first.`);
      return;
    }
    
    const stats = fs.statSync(bundlePath);
    const size = cacheConfig.formatBytes(stats.size);
    
    info(`Bundle analysis for ${platform}:`);
    info(`  Size: ${size}`);
    info(`  Path: ${bundlePath}`);
    info(`  Created: ${stats.mtime.toLocaleString()}`);
    
  } catch (err) {
    error(`Failed to analyze bundle: ${err.message}`);
  }
}

/**
 * Check Metro configuration
 */
function checkConfig() {
  try {
    const configPath = path.join(__dirname, '../metro.config.js');
    
    if (!fs.existsSync(configPath)) {
      error('Metro config file not found');
      return false;
    }
    
    // Try to require the config to check for syntax errors
    require(configPath);
    success('Metro configuration is valid');
    return true;
  } catch (err) {
    error(`Metro configuration error: ${err.message}`);
    return false;
  }
}

/**
 * Show help
 */
function showHelp() {
  log('🚀 Metro Utility Scripts for Swapses', 'bright');
  log('');
  log('Available commands:', 'cyan');
  log('  clear-cache     Clear Metro cache');
  log('  cache-size      Show cache size');
  log('  start           Start Metro bundler');
  log('  start-reset     Start Metro with cache reset');
  log('  bundle-android  Create production bundle for Android');
  log('  bundle-ios      Create production bundle for iOS');
  log('  analyze-android Analyze Android bundle size');
  log('  analyze-ios     Analyze iOS bundle size');
  log('  check-config    Validate Metro configuration');
  log('  help            Show this help message');
  log('');
  log('Examples:', 'cyan');
  log('  node metro-scripts.js start');
  log('  node metro-scripts.js bundle-android');
  log('  node metro-scripts.js clear-cache');
}

// Main function
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'clear-cache':
      clearCache();
      break;
      
    case 'cache-size':
      getCacheSize();
      break;
      
    case 'start':
      startMetro();
      break;
      
    case 'start-reset':
      startMetro({ resetCache: true });
      break;
      
    case 'bundle-android':
      bundleForProduction('android');
      break;
      
    case 'bundle-ios':
      bundleForProduction('ios');
      break;
      
    case 'analyze-android':
      analyzeBundle('android');
      break;
      
    case 'analyze-ios':
      analyzeBundle('ios');
      break;
      
    case 'check-config':
      checkConfig();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      if (command) {
        error(`Unknown command: ${command}`);
      }
      showHelp();
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  clearCache,
  getCacheSize,
  startMetro,
  bundleForProduction,
  analyzeBundle,
  checkConfig,
  showHelp,
}; 