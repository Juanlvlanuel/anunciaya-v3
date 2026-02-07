/**
 * ============================================================================
 * HOOK: useLockScroll (v2.0 - CON DETECCIÓN DE RUTAS PÚBLICAS)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useLockScroll.ts
 * 
 * PROPÓSITO:
 * Bloquear el scroll del body cuando hay modales/overlays abiertos.
 * 
 * CAMBIOS v2.0:
 * - ✅ Detecta automáticamente si estás en ruta pública
 * - ✅ NO bloquea el body en rutas públicas (ej: /negocios/:id compartidos)
 * - ✅ Solo bloquea en rutas privadas cuando isLocked=true
 * - ✅ Previene conflictos con LayoutPublico
 * 
 * RUTAS PÚBLICAS (NO se bloquea el scroll):
 * - /negocios/:id (perfil público de negocio)
 * - /productos/:id (producto compartido)
 * - /ofertas/:id (oferta compartida)
 * - / (landing)
 * - /login, /registro, /recuperar-password (auth sin sesión)
 * 
 * RUTAS PRIVADAS (SÍ se bloquea cuando isLocked=true):
 * - /negocios (directorio autenticado)
 * - /marketplace, /ofertas, /dinamicas, /empleos (secciones privadas)
 * - /business-studio (dashboard comercial)
 * - /perfil (perfil usuario)
 * 
 * USO:
 * ```tsx
 * // En cualquier componente
 * useLockScroll(modalAbierto);
 * 
 * // El hook detectará automáticamente si debe bloquear o no
 * ```
 */

import { useEffect, useRef } from 'react';

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Detecta si la ruta actual es pública (no requiere autenticación)
 */
function esRutaPublica(): boolean {
  const path = window.location.pathname;
  
  // Rutas públicas específicas
  const rutasPublicas = [
    '/', // Landing
    '/login',
    '/registro',
    '/recuperar-password',
    '/restablecer-password',
  ];
  
  // Verificar rutas exactas
  if (rutasPublicas.includes(path)) {
    return true;
  }
  
  // Verificar rutas con parámetros (compartir)
  // Patrón: /negocios/:id (UUID o shortId)
  if (/^\/negocios\/[a-zA-Z0-9-]+$/.test(path)) {
    return true;
  }
  
  // Patrón: /productos/:id
  if (/^\/productos\/[a-zA-Z0-9-]+$/.test(path)) {
    return true;
  }
  
  // Patrón: /ofertas/:id
  if (/^\/ofertas\/[a-zA-Z0-9-]+$/.test(path)) {
    return true;
  }
  
  return false;
}

// =============================================================================
// HOOK
// =============================================================================

export function useLockScroll(isLocked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    // NO hacer nada si no está bloqueado
    if (!isLocked) return;
    
    // NO bloquear en rutas públicas
    if (esRutaPublica()) {
      console.log('[useLockScroll] Ruta pública detectada - No bloquear scroll');
      return;
    }

    // BLOQUEAR scroll en rutas privadas
    console.log('[useLockScroll] Bloqueando scroll del body');
    scrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollYRef.current);
    };
  }, [isLocked]);
}