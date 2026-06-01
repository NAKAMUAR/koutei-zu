import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages のサブパス。リポジトリ名と合わせる
// 例: リポジトリ名が "koutei-zu" なら base: '/koutei-zu/'
export default defineConfig({
  plugins: [react()],
  base: '/koutei-zu/',
});
