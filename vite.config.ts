import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      react(),
      nodePolyfills({
        // Enable polyfills for Buffer and other Node.js globals
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Enable polyfills for specific Node.js modules
        protocolImports: true,
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split Phaser into its own chunk (largest dependency)
            phaser: ['phaser'],
            // Split React and other vendor libs
            vendor: ['react', 'react-dom', 'peerjs'],
          }
        }
      }
    }
  };
});
