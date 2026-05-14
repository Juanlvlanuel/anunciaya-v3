/**
 * ModalCambiarSucursalScanYA.tsx
 * ================================
 * Selector de sucursal para dueños con 2+ sucursales activas.
 *
 * Comportamiento:
 * - Móvil (< 1024px): bottom-sheet con backdrop oscuro
 * - Desktop (>= 1024px): panel flotante centrado debajo del header
 * - Click fuera o ESC cierra
 * - Lista filtra solo `activa = true`, ordena Matriz primero
 * - Click en sucursal:
 *   * Si es la actual → cierra modal (no hace nada)
 *   * Si turno actual está vacío → cambia directo
 *   * Si turno actual tiene datos → confirmación inline ("Cerrarás el turno actual")
 * - Tras el cambio: abre turno nuevo en la sucursal elegida + toast
 *
 * Ubicación: apps/web/src/components/scanya/ModalCambiarSucursalScanYA.tsx
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Store, Check, X, Loader2 } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrapper local: ícono migrado a Iconify manteniendo el nombre familiar.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
import { useScanYAStore } from '../../stores/useScanYAStore';
import scanyaService from '../../services/scanyaService';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface SucursalLista {
  id: string;
  nombre: string;
  esPrincipal: boolean;
  activa: boolean;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Callback opcional invocado tras un cambio exitoso (para que el dashboard recargue datos) */
  onCambioExitoso?: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function ModalCambiarSucursalScanYA({ abierto, onCerrar, onCambioExitoso }: Props) {
  const usuario = useScanYAStore((s) => s.usuario);
  const turnoActivo = useScanYAStore((s) => s.turnoActivo);
  const cambiarSucursal = useScanYAStore((s) => s.cambiarSucursal);
  const setTurnoActivo = useScanYAStore((s) => s.setTurnoActivo);

  const [sucursales, setSucursales] = useState<SucursalLista[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [confirmacionId, setConfirmacionId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Turno vacío = no hay actividad registrada → bypass de confirmación
  // ---------------------------------------------------------------------------
  const turnoVacio = useMemo(() => {
    if (!turnoActivo) return true;
    return (
      (turnoActivo.transacciones ?? 0) === 0 &&
      (turnoActivo.puntosOtorgados ?? 0) === 0 &&
      (turnoActivo.ventasTotales ?? 0) === 0
    );
  }, [turnoActivo]);

  // ---------------------------------------------------------------------------
  // Cargar sucursales al montar (una sola vez)
  // El modal vive montado en el header — cuando el dueño hace click ya están listas.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      try {
        const respuesta = await scanyaService.obtenerSucursalesLista();
        if (cancelado) return;

        if (respuesta.success && respuesta.data) {
          // Filtrar solo activas (no tiene sentido operar en una apagada)
          const activas = respuesta.data.filter((s) => s.activa);
          setSucursales(activas);
        } else {
          notificar.error(respuesta.message || 'No se pudieron cargar las sucursales');
        }
      } catch {
        if (!cancelado) notificar.error('Error al cargar sucursales');
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Cerrar con ESC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !procesandoId) onCerrar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, procesandoId, onCerrar]);

  // ---------------------------------------------------------------------------
  // Resetear confirmación al cerrar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!abierto) {
      setConfirmacionId(null);
      setProcesandoId(null);
    }
  }, [abierto]);

  // ---------------------------------------------------------------------------
  // Ejecutar cambio + abrir turno nuevo
  // ---------------------------------------------------------------------------
  const ejecutarCambio = useCallback(
    async (sucursalId: string) => {
      setProcesandoId(sucursalId);
      setConfirmacionId(null);

      const resultado = await cambiarSucursal(sucursalId);

      if (!resultado.exito) {
        notificar.error(resultado.mensaje || 'No se pudo cambiar de sucursal');
        setProcesandoId(null);
        return;
      }

      // Abrir turno nuevo en la nueva sucursal.
      // El store mantiene el turno viejo visible hasta este punto para evitar
      // el flash de "sin turno". Cuando llega el nuevo, se reemplaza en un solo
      // render. Si falla la apertura, sí limpiamos para reflejar la realidad.
      try {
        const respTurno = await scanyaService.abrirTurno();
        if (respTurno.success && respTurno.data) {
          setTurnoActivo(respTurno.data);
        } else {
          setTurnoActivo(null);
        }
      } catch {
        setTurnoActivo(null);
      }

      const nombreMostrado = resultado.esPrincipal ? 'Matriz' : resultado.sucursalNombre;
      notificar.exito(`Ahora estás en ${nombreMostrado}`);
      setProcesandoId(null);
      onCerrar();
      onCambioExitoso?.();
    },
    [cambiarSucursal, setTurnoActivo, onCerrar, onCambioExitoso]
  );

  // ---------------------------------------------------------------------------
  // Handler: click en sucursal
  // ---------------------------------------------------------------------------
  const handleSeleccionar = useCallback(
    (sucursal: SucursalLista) => {
      if (procesandoId) return;
      // Misma sucursal: solo cerrar
      if (sucursal.id === usuario?.sucursalId) {
        onCerrar();
        return;
      }
      // Turno vacío: cambiar directo, sin confirmación
      if (turnoVacio) {
        ejecutarCambio(sucursal.id);
        return;
      }
      // Turno con datos: confirmación inline
      setConfirmacionId(sucursal.id);
    },
    [procesandoId, usuario?.sucursalId, turnoVacio, ejecutarCambio, onCerrar]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!abierto) return null;

  const sucursalesParaListar = sucursales.filter((s) => s.activa);

  // Renderizamos vía portal en `document.body` para escapar del stacking context
  // del header (que es `sticky z-50` y atraparía cualquier z-index hijo). Así el
  // modal se pinta por encima de cualquier overlay de la página, incluido ChatYA.
  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar selector"
        onClick={() => !procesandoId && onCerrar()}
        className="fixed inset-0 z-[60] bg-black/60 lg:bg-black/30 cursor-default"
        data-testid="modal-cambiar-sucursal-backdrop"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cambiar-sucursal-titulo"
        className="
          fixed z-[61] overflow-hidden
          max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-3xl max-lg:max-h-[75vh]
          lg:top-20 lg:left-1/2 lg:-translate-x-1/2 lg:w-[360px] lg:rounded-2xl 2xl:top-24 2xl:w-[400px]
          border-4 flex flex-col
        "
        style={{
          background: '#001136',
          borderColor: '#002D8F',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
        data-testid="modal-cambiar-sucursal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#002D8F] shrink-0">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-[#3B82F6]" strokeWidth={2} />
            <h2
              id="cambiar-sucursal-titulo"
              className="text-white font-semibold text-base"
            >
              Cambiar de sucursal
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !procesandoId && onCerrar()}
            disabled={!!procesandoId}
            className="p-1.5 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cerrar"
            data-testid="modal-cambiar-sucursal-cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto py-2">
          {cargando && (
            <div className="flex items-center justify-center py-8 text-[#A0A0A0] text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando sucursales...
            </div>
          )}

          {!cargando && sucursalesParaListar.length === 0 && (
            <p className="text-center text-[#A0A0A0] text-sm py-8 px-4">
              No hay sucursales activas disponibles.
            </p>
          )}

          {!cargando && sucursalesParaListar.length > 0 && (
            <ul className="px-2">
              {sucursalesParaListar.map((sucursal) => {
                const esActual = sucursal.id === usuario?.sucursalId;
                const enConfirmacion = confirmacionId === sucursal.id;
                const procesandoEsta = procesandoId === sucursal.id;
                const otraEnProceso = !!procesandoId && !procesandoEsta;

                return (
                  <li key={sucursal.id} className="my-1">
                    {/* Botón principal de la fila */}
                    <button
                      type="button"
                      onClick={() => handleSeleccionar(sucursal)}
                      disabled={otraEnProceso || procesandoEsta}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl
                        transition-colors text-left cursor-pointer
                        ${esActual ? 'bg-[#0B1F50]' : 'hover:bg-white/5'}
                        ${otraEnProceso ? 'opacity-50 cursor-not-allowed' : ''}
                        ${procesandoEsta ? 'cursor-wait' : ''}
                      `}
                      data-testid={`sucursal-opcion-${sucursal.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {sucursal.esPrincipal ? (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 shrink-0" />
                        )}
                        <span className="text-white font-medium truncate">
                          {sucursal.esPrincipal ? 'Matriz' : sucursal.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {procesandoEsta && (
                          <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" />
                        )}
                        {esActual && !procesandoEsta && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                            <Check className="w-4 h-4" />
                            Activa
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Confirmación inline (turno con datos) */}
                    {enConfirmacion && (
                      <div
                        className="mx-1 mt-1 mb-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                        data-testid={`confirmacion-${sucursal.id}`}
                      >
                        <p className="text-amber-200 text-sm mb-3 leading-snug">
                          Cerrarás el turno actual y abrirás uno nuevo en{' '}
                          <strong className="font-semibold">{sucursal.nombre}</strong>. ¿Continuar?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => ejecutarCambio(sucursal.id)}
                            className="flex-1 py-2 px-3 rounded-lg text-white text-sm font-semibold cursor-pointer transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #1e293b, #334155)',
                            }}
                            data-testid={`confirmar-${sucursal.id}`}
                          >
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmacionId(null)}
                            className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                            data-testid={`cancelar-${sucursal.id}`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
