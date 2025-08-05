#!/bin/bash

# Mobile Development Setup Script for Swapses
# This script sets up the development environment for both Android and iOS

echo "🚀 Setting up Swapses Mobile Development Environment"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install React Native CLI globally
echo "📦 Installing React Native CLI..."
npm install -g @react-native-community/cli

# Install Expo CLI for easier development
echo "📦 Installing Expo CLI..."
npm install -g @expo/cli

# Install dependencies for the mobile client
echo "📦 Installing mobile client dependencies..."
cd mobile-client
npm install

# Check for Android development environment
echo "🔍 Checking Android development environment..."

if command -v adb &> /dev/null; then
    echo "✅ Android SDK is installed"
else
    echo "⚠️  Android SDK not found. Please install Android Studio and configure ANDROID_HOME"
fi

# Check for iOS development environment
echo "🔍 Checking iOS development environment..."

if command -v xcodebuild &> /dev/null; then
    echo "✅ Xcode is installed"
else
    echo "⚠️  Xcode not found. Please install Xcode from the App Store"
fi

# Create necessary directories if they don't exist
echo "📁 Creating mobile platform directories..."
mkdir -p android/app/src/main/java/com/swapses
mkdir -p android/app/src/main/res
mkdir -p ios/Swapses

# Set up Android permissions
echo "🔐 Setting up Android permissions..."
cat > android/app/src/main/AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.swapses">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <application
        android:name=".MainApplication"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/AppTheme">
        <activity
            android:name=".MainActivity"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
            android:exported="true"
            android:label="@string/app_name"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

echo "✅ Mobile development environment setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. For Android: Open android/ folder in Android Studio"
echo "2. For iOS: Open ios/Swapses.xcodeproj in Xcode"
echo "3. Run 'npm start' in mobile-client/ to start the Metro bundler"
echo "4. Run 'npx react-native run-android' for Android"
echo "5. Run 'npx react-native run-ios' for iOS"
echo ""
echo "🔧 Development commands:"
echo "- npm start: Start Metro bundler"
echo "- npm run android: Run on Android device/emulator"
echo "- npm run ios: Run on iOS device/simulator"
echo "- npm test: Run tests"
echo "- npm run lint: Run ESLint" 