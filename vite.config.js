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
          // Firestore（ブラウザ保存つき）が大きいので、認証とは別のファイルにする（500kB の警告を出さない）
          firestore: ['firebase/firestore'],
          firebase: ['firebase/app', 'firebase/auth'],
          react: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
