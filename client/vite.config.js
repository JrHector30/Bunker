import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500, // Eleva el límite a 1.5MB para silenciar la advertencia
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa las librerías pesadas de node_modules en sus propios archivos automáticos
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor'; // El resto de dependencias comunes
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});