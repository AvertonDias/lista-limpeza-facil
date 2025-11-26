import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.listafacil.app',
  appName: 'Lista Fácil',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
