import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/* ============================================================
   DEVTALKS 2026 — BUILD
   ------------------------------------------------------------
   `@/…` resolves to src/, the same alias tsconfig.json declares.
   Both are needed: TypeScript uses its copy to check imports,
   Vite uses this one to actually resolve them.

   assetsInlineLimit is 0 so nothing in public/ or src/ is turned
   into a base64 data URI behind our backs. The fonts are already
   embedded deliberately (see src/styles/fonts.css); everything
   else should stay a real file the browser can cache on its own.
   ============================================================ */

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // The lanyard's card model is a .glb, which Vite does not treat as an asset
  // on its own.
  assetsInclude: ['**/*.glb'],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
});
