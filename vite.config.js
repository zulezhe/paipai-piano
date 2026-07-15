/*
 * @Author: oliver
 * @Date: 2025-09-10 23:41:09
 * @LastEditors: oliver
 * @LastEditTime: 2026-01-19 22:30:38
 * @Description: 
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5100,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});