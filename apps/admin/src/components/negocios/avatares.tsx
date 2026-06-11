/**
 * avatares.tsx
 * =============
 * Avatares de negocio y vendedor para la sección Negocios. El color se deriva del
 * HASH del nombre (decisión: sin categoría en el Panel), igual para negocio y
 * vendedor. Calcado del handoff con los tokens del Panel.
 *
 * Ubicación: apps/admin/src/components/negocios/avatares.tsx
 */

import { useState } from 'react';
import { UserPlus } from 'lucide-react';

const PALETA = ['#2563eb', '#0e7c66', '#b3541e', '#5b5bd6', '#b03a86', '#0e7490'];

/** Color estable a partir del nombre (mismo nombre → mismo color). */
export function colorDeNombre(nombre: string): string {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

/** Iniciales de las dos primeras palabras del nombre. */
export function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Avatar cuadrado del negocio: el LOGO real si existe (con fallback a iniciales si la carga
 *  falla), si no las iniciales sobre el color tenue. Borde sutil para dar definición al logo. */
export function AvatarNegocio({ nombre, logoUrl, tam = 38 }: { nombre: string; logoUrl?: string | null; tam?: number }) {
  const [error, setError] = useState(false);
  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt={nombre}
        onError={() => setError(true)}
        className="shrink-0 rounded-full border border-borde bg-superficie object-cover"
        style={{ width: tam, height: tam }}
      />
    );
  }
  // Sin logo: mismo estilo que el avatar de usuario (círculo sólido + iniciales blancas).
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.36), background: colorDeNombre(nombre) }}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Avatar circular del vendedor (fondo sólido del color, texto blanco). */
export function AvatarVendedor({ nombre, tam = 26 }: { nombre: string; tam?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.38), background: colorDeNombre(nombre) }}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Avatar "sin vendedor": círculo punteado con ícono de agregar. */
export function AvatarVacio({ tam = 26 }: { tam?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-borde-fuerte text-texto-4"
      style={{ width: tam, height: tam }}
    >
      <UserPlus size={Math.round(tam * 0.52)} />
    </span>
  );
}
