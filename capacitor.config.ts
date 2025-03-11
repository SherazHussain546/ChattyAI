
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chat.avatar.app',
  appName: 'Chat Avatar App',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
