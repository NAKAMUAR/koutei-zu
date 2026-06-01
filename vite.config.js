import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages のサブパス。リポジトリ名と合わせる
// 例: リポジトリ名が "koutei-zu" なら base: '/koutei-zu/'
export default defineConfig({
  plugins: [react()],
  base: '/koutei-zu/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          react: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
