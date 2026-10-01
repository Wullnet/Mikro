import type { CapacitorConfig } from '@capacitor/cli';

// Paketimi i lojës web si app për App Store dhe Google Play.
const config: CapacitorConfig = {
  appId: 'com.wullnet.trafficrush',
  appName: 'Traffic Rush',
  webDir: 'dist',
  backgroundColor: '#101318',
  ios: { contentInset: 'never', scrollEnabled: false },
  android: { backgroundColor: '#101318' },
};

export default config;
