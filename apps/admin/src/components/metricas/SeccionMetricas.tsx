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

import { useState } from 'react';
import type { RolPanel } from '../../data/menuPanel';
import type { PeriodoSel } from '../../services/metricasService';
import { SelectorPeriodo } from './SelectorPeriodo';
import { VistaCrecimiento } from './VistaCrecimiento';
import { VistaAdopcion } from './VistaAdopcion';
import { VistaUsuarios } from './VistaUsuarios';

type TabId = 'crecimiento' | 'adopcion' | 'usuarios';

const TABS: { id: TabId; etiqueta: string }[] = [
  { id: 'crecimiento', etiqueta: 'Crecimiento' },
  { id: 'adopcion', etiqueta: 'Uso de la app' },
  { id: 'usuarios', etiqueta: 'Usuarios' },
];

export function SeccionMetricas({ rol }: { rol: RolPanel }) {
  const [tab, setTab] = useState<TabId>('crecimiento');
  const [periodo, setPeriodo] = useState<PeriodoSel>({ tipo: 'preset', meses: 12 });

  // El vendedor no entra al módulo Usuarios (coherente con la matriz de permisos).
  const tabs = rol === 'vendedor' ? TABS.filter((t) => t.id !== 'usuarios') : TABS;
  const subtitulo = rol === 'gerente' ? 'Tu región' : rol === 'vendedor' ? 'Tu cartera' : 'Toda la plataforma';

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 2xl:p-7">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 lg:gap-6">
        {/* Encabezado + selector de periodo */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[18px] font-semibold tracking-[-0.2px] text-texto">Métricas</h2>
            <p className="text-[12.5px] text-texto-3">{subtitulo}</p>
          </div>
          <SelectorPeriodo valor={periodo} onCambiar={setPeriodo} />
        </div>

        {/* Pestañas */}
        <div className="flex gap-5 border-b border-borde">
          {tabs.map((t) => {
            const activo = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`metricas-tab-${t.id}`}
                data-active={activo}
                onClick={() => setTab(t.id)}
                className={`relative px-0.5 pb-2.5 pt-1 text-[13.5px] font-semibold transition ${activo ? 'text-texto' : 'text-texto-3 hover:text-texto-2'}`}
              >
                {t.etiqueta}
                {activo && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-marca" />}
              </button>
            );
          })}
        </div>

        {/* Pestaña activa (lazy: solo la activa monta su hook) */}
        {tab === 'crecimiento' && <VistaCrecimiento periodo={periodo} rol={rol} />}
        {tab === 'adopcion' && <VistaAdopcion periodo={periodo} />}
        {tab === 'usuarios' && rol !== 'vendedor' && <VistaUsuarios periodo={periodo} />}
      </div>
    </div>
  );
}

export default SeccionMetricas;
