import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: la aplicación funciona igual en la raíz de un dominio
  // (Netlify, Vercel, Cloudflare Pages) que dentro de una subcarpeta
  // (GitHub Pages: usuario.github.io/evaluacion-cga/), sin tocar nada.
  base: "./",
  build: {
    // Los .woff2 y las fotos van como archivos aparte, no incrustados en el CSS.
    assetsInlineLimit: 2048,
  },
});
