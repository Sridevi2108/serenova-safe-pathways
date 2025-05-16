import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'leaflet': 'leaflet/dist/leaflet.js',  // Ensures Vite knows where to find Leaflet
    },
  },
  css: {
    preprocessorOptions: {
      css: {
        // Optionally configure some CSS preprocessing if needed
      },
    },
  },
});
