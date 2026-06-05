/** @type {import('tailwindcss').Config} */
// Tailwind v4: los tokens del Panel (colores sobrios, tipografía IBM Plex,
// sombras) se declaran con @theme en src/index.css, no aquí. Este archivo solo
// acota el escaneo de clases.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
};
