/**
 * useListoParaAnimar.ts
 * ======================
 * `false` durante el primer pintado, `true` un frame después. Úsalo para
 * apagar una `transition` CSS solo en el montaje inicial (cuando un valor
 * medido por JS — ej. el alto real de un overlay — pasa de su default a su
 * valor real): sin esto, ese primer salto de valor se anima igual que
 * cualquier cambio posterior, y se ve como si el contenido "se reacomodara"
 * al entrar a la página.
 *
 * USO:
 *   const listoParaAnimar = useListoParaAnimar();
 *   <div style={{ height, transition: listoParaAnimar ? 'height 300ms ...' : 'none' }} />
 *
 * UBICACIÓN: apps/web/src/hooks/useListoParaAnimar.ts
 */

import { useEffect, useState } from 'react';

export function useListoParaAnimar(): boolean {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return listo;
}

export default useListoParaAnimar;
