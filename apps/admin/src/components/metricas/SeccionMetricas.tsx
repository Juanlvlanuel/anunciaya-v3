/**
 * metricas/SeccionMetricas.tsx
 * ============================
 * Módulo "Métricas" del Panel = la vista de análisis (tendencias + desgloses). Solo lectura.
 *   - Encabezado (alcance por rol) + selector de periodo (3/6/12/24 meses).
 *   - Pestañas: Crecimiento · Adopción · Usuarios (el vendedor no ve Usuarios → 2 pestañas).
 *   - Cada pestaña carga su propio endpoint (lazy: solo la activa dispara su query).
 *
 * El alcance por rol lo aplica el backend; aquí el `rol` solo decide qué pestañas/copys se muestran.
 * Diseño Tokens_Panel.md (B2B, neutro + 1 acento). Responsive base/lg:/2xl:.
 *
 * Ubicación: apps/admin/src/components/metricas/SeccionMetricas.tsx
 */

import { useState, useRef, useEffect } from 'react';
import type { RolPanel } from '../../data/menuPanel';
import type { PeriodoSel } from '../../services/metricasService';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { VistaCrecimiento } from './VistaCrecimiento';
import { VistaAdopcion } from './VistaAdopcion';
import { VistaUsuarios } from './VistaUsuarios';
import { TABS_METRICAS, type TabIdMetricas, type NavMetricas } from './piezas';

export function SeccionMetricas({ rol }: { rol: RolPanel }) {
  const [tab, setTab] = useState<TabIdMetricas>('crecimiento');
  const [periodo, setPeriodo] = useState<PeriodoSel>({ tipo: 'preset', meses: 12 });

  // Auto-ocultar la barra inferior (móvil) al hacer scroll: registra el contenedor scrolleable
  // (solo en móvil; en escritorio no aplica). Mismo patrón que Negocios.
  const esEscritorio = useEsEscritorio();
  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  // El vendedor no entra al módulo Usuarios (coherente con la matriz de permisos). La barra
  // superior (tabs + KPIs + selector) la renderiza cada vista junto a sus propios KPIs.
  const tabs = rol === 'vendedor' ? TABS_METRICAS.filter((t) => t.id !== 'usuarios') : TABS_METRICAS;
  const nav: NavMetricas = { tabs, tab, setTab, periodo, setPeriodo };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5 lg:p-6 2xl:p-7">
      <div className="flex w-full flex-col gap-5 lg:gap-6">
        {/* Pestaña activa (lazy: solo la activa monta su hook). Cada vista dibuja su barra superior. */}
        {tab === 'crecimiento' && <VistaCrecimiento nav={nav} rol={rol} />}
        {tab === 'adopcion' && <VistaAdopcion nav={nav} />}
        {tab === 'usuarios' && rol !== 'vendedor' && <VistaUsuarios nav={nav} />}
      </div>
    </div>
  );
}

export default SeccionMetricas;
