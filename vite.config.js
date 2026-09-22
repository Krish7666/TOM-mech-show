import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('/node_modules/')) {
            if (
              norm.includes('/three/') ||
              norm.includes('/@react-three/') ||
              norm.includes('three-stdlib') ||
              norm.includes('camera-controls') ||
              norm.includes('detect-gpu') ||
              norm.includes('troika') ||
              norm.includes('maath') ||
              norm.includes('suspend-react')
            ) {
              return 'vendor-three';
            }
            if (norm.includes('/@supabase/')) {
              return 'supabase';
            }
            if (
              norm.includes('/react/') ||
              norm.includes('/react-dom/') ||
              norm.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        },
      },
    },
  },
})
