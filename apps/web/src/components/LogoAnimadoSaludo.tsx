/**
 * LogoAnimadoSaludo.tsx — logo de AnunciaYA "latiendo" (loader de bienvenida)
 * ==========================================================================
 * Muestra el logo 3D (`logo-anunciaya-3d.webp`) con un efecto de "latido":
 * parpadea difuminándose (opacidad + blur) con un leve zoom out/in, en loop.
 * Se usa como loading en `RutaPrivada` (pantalla "Verificando sesión…").
 *
 * La animación vive en `index.css` (`.logo-latido`).
 *
 * Ubicación: apps/web/src/components/LogoAnimadoSaludo.tsx
 */

// Proporción alto/ancho del logo (del arte original 3868 x 4446.8 — la burbuja
// con su colita es más alta que ancha).
const RELACION = 4446.8 / 3868;

export function LogoAnimadoSaludo({ size = 160 }: { size?: number }) {
    return (
        <img
            src="/logo-anunciaya-3d.webp"
            alt="AnunciaYA"
            className="logo-latido object-contain"
            style={{ width: size, height: size * RELACION }}
            aria-hidden="true"
        />
    );
}

export default LogoAnimadoSaludo;
