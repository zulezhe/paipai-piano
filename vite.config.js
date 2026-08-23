/*
 * @Author: oliver
 * @Date: 2025-09-10 23:41:09
 * @LastEditors: oliver
 * @LastEditTime: 2026-01-19 22:30:38
 * @Description:
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const SAMPLES_DIR = path.resolve(__dirname, 'src-tauri/resources/samples');

/**
 * 把钢琴采样以 /samples/* 静态路径暴露给浏览器（落地页）：
 * - dev: 中间件直接读 src-tauri/resources/samples
 * - build: 复制到 dist/samples
 * Tauri 桌面端不受影响（运行时走 convertFileSrc 解析 resources 目录）
 */
function serveSamples() {
  return {
    name: 'serve-samples',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/samples/')) return next();
        // 解码 URL，防目录穿越：只允许 .mp3 文件名
        const rel = decodeURIComponent(req.url.replace(/^\/samples\//, '').replace(/[?#].*$/, ''));
        if (!/^[\w/.-]+\.mp3$/.test(rel)) { res.statusCode = 400; return res.end(); }
        const file = path.join(SAMPLES_DIR, rel);
        if (!file.startsWith(SAMPLES_DIR) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist/samples');
      fs.cpSync(SAMPLES_DIR, out, { recursive: true });
      console.log(`[serve-samples] copied to ${out}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), serveSamples()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // 多页：index.html（Tauri 桌面应用）+ landing.html（在线钢琴落地页）
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
        landing: path.resolve(__dirname, 'src/landing.html'),
      },
    },
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
