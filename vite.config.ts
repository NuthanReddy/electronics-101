import { defineConfig } from 'vite';

export default defineConfig({
  base: '/electronics-101/',
  build: { chunkSizeWarningLimit: 650 },
});
