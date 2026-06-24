/**
 * SeccionTerritorios.tsx
 * ======================
 * Sección "Territorios" del Panel (grupo Red de ventas). Fase 1 · VER: muestra el mapa con
 * las zonas (particiones) y una lista lateral con su vendedor y ciudad. El alcance lo aplica
 * el backend según el rol — el vendedor solo recibe SU pedazo asignado.
 *
 * El dibujo / asignación de zonas (Fase 2) se agrega después.
 *
 * Ubicación: apps/admin/src/components/territorios/SeccionTerritorios.tsx
 */

import { useZonas } from '../../hooks/queries/useTerritoriosAdmin';
import { MapaTerritorios } from './MapaTerritorios';
import type { RolPanel } from '../../data/menuPanel';

interface SeccionTerritoriosProps {
    rol: RolPanel;
}

export function SeccionTerritorios({ rol }: SeccionTerritoriosProps) {
    const esVendedor = rol === 'vendedor';
    const { data: zonas = [], isLoading, isError } = useZonas();

    return (
        <div className="flex h-full flex-col gap-3" data-testid="seccion-territorios">
            {/* Encabezado */}
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-[18px] font-semibold text-texto">{esVendedor ? 'Mi territorio' : 'Territorios'}</h1>
                    <p className="text-[13px] text-texto-3">
                        {esVendedor
                            ? 'El pedazo del mapa que tienes asignado.'
                            : 'Zonas del mapa de la ciudad asignadas a los vendedores.'}
                    </p>
                </div>
                <span className="shrink-0 rounded-full border border-borde bg-superficie-2 px-2.5 py-1 text-[12px] text-texto-2">
                    {zonas.length} {zonas.length === 1 ? 'zona' : 'zonas'}
                </span>
            </div>

            {/* Cuerpo: mapa + lista de zonas */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                <div className="min-h-[360px] flex-1">
                    {isError ? (
                        <div className="grid h-full place-items-center rounded-[12px] border border-borde text-[13px] text-peligro">
                            No se pudieron cargar las zonas.
                        </div>
                    ) : (
                        <MapaTerritorios zonas={zonas} />
                    )}
                </div>

                <aside className="flex w-full shrink-0 flex-col gap-1.5 overflow-y-auto lg:w-72">
                    {isLoading ? (
                        <div className="rounded-[10px] border border-borde px-3 py-6 text-center text-[13px] text-texto-3">Cargando…</div>
                    ) : zonas.length === 0 ? (
                        <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                            {esVendedor ? 'Aún no tienes una zona asignada.' : 'Aún no hay zonas. Se dibujan en el mapa (próximamente).'}
                        </div>
                    ) : (
                        zonas.map((z) => (
                            <div
                                key={z.id}
                                data-testid={`zona-${z.id}`}
                                className="flex items-center gap-2.5 rounded-[10px] border border-borde bg-superficie px-3 py-2"
                            >
                                <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: z.color ?? '#2563eb' }} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-[13.5px] font-medium text-texto">{z.nombre}</span>
                                    <span className="truncate text-[12px] text-texto-3">
                                        {z.vendedorNombre ?? 'Sin asignar'} · {z.ciudadNombre ?? '—'}
                                    </span>
                                </span>
                            </div>
                        ))
                    )}
                </aside>
            </div>
        </div>
    );
}

export default SeccionTerritorios;
