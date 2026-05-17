/**
 * PaginaVacantes.tsx — Orquestador del módulo. Maneja:
 *  - vista lista vs detalle vs empty
 *  - apertura del slideover "Nueva vacante"
 *  - ruteo interno simple por estado (el padre maneja react-router-v6)
 *
 * Recibe TODOS los callbacks como props — no conecta a APIs.
 * El padre los enchufa a React Query / Zustand / Supabase.
 */

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { ICONOS } from './iconos';

import { StatCard } from './VacanteAtoms';
import { VacantesEmpty } from './VacantesEmpty';
import { VacantesLista } from './VacantesLista';
import { VacanteDetalle } from './VacanteDetalle';
import { NuevaVacanteSlideover } from './NuevaVacanteSlideover';
import { VacantesMobile } from './VacantesMobile';
import { calcularKpis } from './helpers';

import type {
  CrearVacanteInput,
  KpisVacantes,
  Sucursal,
  Vacante,
} from './types';

export interface PaginaVacantesProps {
  vacantes: Vacante[];
  sucursales: Sucursal[];
  /** Si no se pasa, se calculan a partir de `vacantes`. */
  kpis?: KpisVacantes;

  // mutaciones
  onCrearVacante: (input: CrearVacanteInput) => Promise<void>;
  onActualizarVacante: (id: string, input: Partial<CrearVacanteInput>) => Promise<void>;
  onPausarVacante: (id: string) => Promise<void>;
  onReactivarVacante: (id: string) => Promise<void>;
  onCerrarVacante: (id: string) => Promise<void>;
  onEliminarVacante: (id: string) => Promise<void>;

  // navegaciones externas (las cablea el padre con react-router)
  onVerEnFeedPublico: (id: string) => void;
  onIrAConversaciones: (vacanteId: string) => void;

  isLoading?: boolean;
}

type VistaInterna = { tipo: 'lista' } | { tipo: 'detalle'; id: string };

export function PaginaVacantes(props: PaginaVacantesProps) {
  const {
    vacantes, sucursales, kpis: kpisProp,
    onCrearVacante, onPausarVacante, onReactivarVacante,
    onCerrarVacante, onEliminarVacante,
    onVerEnFeedPublico, onIrAConversaciones,
    isLoading,
  } = props;

  const kpis = kpisProp ?? calcularKpis(vacantes);
  const [vista, setVista] = useState<VistaInterna>({ tipo: 'lista' });
  const [slideoverOpen, setSlideoverOpen] = useState(false);

  const isEmpty = vacantes.length === 0;

  /* ---------- handlers ---------- */
  const openNueva  = () => setSlideoverOpen(true);
  const closeNueva = () => setSlideoverOpen(false);
  const verDetalle = (id: string) => setVista({ tipo: 'detalle', id });
  const volverLista = () => setVista({ tipo: 'lista' });

  const handleEditar = (_id: string) => {
    // TODO: abrir slideover en modo edición — pasar vacante pre-cargada.
    setSlideoverOpen(true);
  };

  if (vista.tipo === 'detalle') {
    const v = vacantes.find((x) => x.id === vista.id);
    if (!v) { volverLista(); return null; }
    return (
      <PaginaWrapper>
        <VacanteDetalle
          vacante={v}
          onVolver={volverLista}
          onEditar={() => handleEditar(v.id)}
          onPausar={async () => {
            await onPausarVacante(v.id);
            // TODO: notificar.exito('Vacante pausada');
          }}
          onReactivar={async () => {
            await onReactivarVacante(v.id);
            // TODO: notificar.exito('Vacante reactivada');
          }}
          onCerrar={async () => {
            await onCerrarVacante(v.id);
            // TODO: notificar.exito('Vacante cerrada');
            volverLista();
          }}
          onIrAConversaciones={() => onIrAConversaciones(v.id)}
          onVerEnFeedPublico={() => onVerEnFeedPublico(v.id)}
        />
        <Slideover open={slideoverOpen} sucursales={sucursales} onClose={closeNueva} onPublicar={onCrearVacante} />
      </PaginaWrapper>
    );
  }

  return (
    <PaginaWrapper>
      <PageHeader kpis={kpis} isLoading={isLoading} />

      {/* Desktop */}
      <div className="hidden lg:block">
        {isEmpty ? (
          <VacantesEmpty onNuevaVacante={openNueva} />
        ) : (
          <VacantesLista
            vacantes={vacantes}
            onNueva={openNueva}
            onVer={verDetalle}
            onEditar={handleEditar}
            onPausar={async (id) => { await onPausarVacante(id); }}
            onReactivar={async (id) => { await onReactivarVacante(id); }}
            onEliminar={async (id) => { await onEliminarVacante(id); }}
          />
        )}
      </div>

      {/* Mobile */}
      <div className="block lg:hidden">
        {isEmpty ? (
          <VacantesEmpty onNuevaVacante={openNueva} />
        ) : (
          <VacantesMobile
            vacantes={vacantes}
            onAbrir={verDetalle}
            onNueva={openNueva}
          />
        )}
      </div>

      <Slideover open={slideoverOpen} sucursales={sucursales} onClose={closeNueva} onPublicar={onCrearVacante} />
    </PaginaWrapper>
  );
}

/* ============================================================
   Internos
   ============================================================ */
function PaginaWrapper({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1240px] mx-auto px-6 lg:px-8 py-7">{children}</div>;
}

function PageHeader({
  kpis, isLoading,
}: {
  kpis: KpisVacantes;
  isLoading?: boolean;
}) {
  return (
    <div className="hidden lg:grid grid-cols-[1fr_auto] gap-6 items-center mb-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white grid place-items-center">
          <Icon icon={ICONOS.vacante} className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Vacantes
          </h1>
          <p className="text-[15px] text-slate-500 mt-0.5">
            Publica y gestiona tus ofertas de empleo
          </p>
        </div>
      </div>

      <div className="flex gap-3" aria-busy={isLoading}>
        <StatCard tono="sky"     icon="vacante"    num={kpis.total}          label="Total" />
        <StatCard tono="emerald" icon="cheque"     num={kpis.activas}        label="Activas" />
        <StatCard tono="amber"   icon="horario"    num={kpis.porExpirar}     label="Por expirar" />
        <StatCard tono="violet"  icon="chat"       num={kpis.conversaciones} label="Conversaciones" />
      </div>
    </div>
  );
}

function Slideover({
  open, sucursales, onClose, onPublicar,
}: {
  open: boolean;
  sucursales: Sucursal[];
  onClose: () => void;
  onPublicar: (input: CrearVacanteInput) => Promise<void>;
}) {
  return (
    <NuevaVacanteSlideover
      open={open}
      sucursales={sucursales}
      onClose={onClose}
      onPublicar={onPublicar}
    />
  );
}
