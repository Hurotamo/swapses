/// <reference types="react" />
/// <reference types="react-native" />

declare module 'react' {
  export = React;
  export as namespace React;
}

declare module 'react-native' {
  export * from 'react-native';
} 