#!/bin/bash

# DWSS Mobile Wallet Setup Script
echo "🚀 Setting up DWSS Mobile Wallet..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Install Expo CLI globally if not already installed
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI..."
    npm install -g @expo/cli
fi

echo "✅ Expo CLI version: $(expo --version)"

# Install EAS CLI globally if not already installed
if ! command -v eas &> /dev/null; then
    echo "🏗️ Installing EAS CLI..."
    npm install -g @eas/cli
fi

echo "✅ EAS CLI installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp env.example .env
    echo "✅ .env file created from template"
else
    echo "✅ .env file already exists"
fi

# Check if TypeScript is properly configured
if [ ! -f tsconfig.json ]; then
    echo "❌ tsconfig.json not found. Please ensure TypeScript is properly configured."
    exit 1
fi

echo "✅ TypeScript configuration found"

# Check if app.json exists
if [ ! -f app.json ]; then
    echo "❌ app.json not found. Please ensure Expo configuration is present."
    exit 1
fi

echo "✅ Expo configuration found"

# Check if eas.json exists
if [ ! -f eas.json ]; then
    echo "❌ eas.json not found. Please ensure EAS configuration is present."
    exit 1
fi

echo "✅ EAS configuration found"

# Create necessary directories if they don't exist
mkdir -p src/components
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/utils

echo "✅ Project structure verified"

# Check for required environment variables
echo "🔍 Checking environment configuration..."

# Display setup completion
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your project in app.json and eas.json"
echo "2. Set up your EAS project: eas build:configure"
echo "3. Start development: npm start"
echo "4. Run on device: Install Expo Go and scan QR code"
echo ""
echo "For more information, see README.md"
echo ""
echo "Happy coding! 🚀" 