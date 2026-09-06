import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omnistream.app',
  appName: 'OmniStream',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'OmniStream'
  }
};

export default config;
