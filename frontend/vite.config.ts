import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/app/public/", // Cambia a la ruta deseada (ej. 'build', '../public/dist', etc.)
    emptyOutDir: true, // Limpia el directorio si queda fuera de la raíz del proyecto
  },
});
