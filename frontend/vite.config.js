import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The backend's CORS configuration (backend/app/config.py ->
    // CORS_ORIGINS) allows "http://localhost:5173". Bind to localhost so the
    // browser origin matches and the preflight request succeeds.
    port: 5173,
    host: 'localhost',
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
