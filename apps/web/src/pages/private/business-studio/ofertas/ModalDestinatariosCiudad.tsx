/**
 * ============================================================================
 * MODAL: Seleccionar destinatarios de la ciudad
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/ModalDestinatariosCiudad.tsx
 *
 * PROPÓSITO:
 * Modal contenedor (header de la oferta/cupón + footer con el botón de acción)
 * alrededor del selector reutilizable `SelectorDestinatariosCiudad`. Lo usan:
 *   - Compartir una oferta pública por ChatYA.
 *   - Enviar (asignar) un cupón existente a más usuarios.
 *
 * La acción concreta la define el padre vía `onConfirmar(usuariosIds)`, que
 * debe encargarse de su propia notificación de éxito y lanzar en caso de error.
 */

import { useState, useEffect, useRef } from 'react';
import { Percent } from 'lucide-react';

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const DollarSign = (p: IconoWrapperProps) => <Icon icon={ICONOS.dinero} {...p} />;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
const Truck = (p: IconoWrapperProps) => <Icon icon={ICONOS.envio} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const ChatIcon = (p: IconoWrapperProps) => <Icon icon={ICONOS.compartir} {...p} />;

import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { Boton } from '../../../../components/ui/Boton';
import { notificar } from '../../../../utils/notificaciones';
import { useClientesAsignados } from '../../../../hooks/queries/useOfertas';
import { SelectorDestinatariosCiudad } from './SelectorDestinatariosCiudad';
import type { Oferta, TipoOferta } from '../../../../types/ofertas';

// =============================================================================
// HELPERS (header de la oferta/cupón)
// =============================================================================

function getIconoTipo(tipo: TipoOferta) {
    switch (tipo) {
        case 'porcentaje': return Percent;
        case 'monto_fijo': return DollarSign;
        case '2x1':
        case '3x2': return Gift;
        case 'envio_gratis': return Truck;
        case 'otro': return Sparkles;
        default: return Percent;
    }
}

function formatearValor(tipo: TipoOferta, valor: string | null): string {
    if (!valor) return String(tipo).toUpperCase();
    switch (tipo) {
        case 'porcentaje': return `${valor}% OFF`;
        case 'monto_fijo': return `$${Number(valor).toFixed(2)} OFF`;
        case '2x1': return '2×1';
        case '3x2': return '3×2';
        case 'envio_gratis': return 'ENVÍO GRATIS';
        case 'otro': return valor;
        default: return String(tipo).toUpperCase();
    }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

/** Datos mínimos para el header (una oferta/cupón completa o uno recién creado). */
export type OfertaHeader = Pick<Oferta, 'id' | 'titulo' | 'tipo' | 'valor' | 'imagen'>;

interface ModalDestinatariosCiudadProps {
    oferta: OfertaHeader;
    /** Subtítulo del header, ej. "Compartir por ChatYA" o "Enviar cupón". */
    accionLabel: string;
    /** Texto base del botón de confirmar, ej. "Enviar por ChatYA" / "Enviar cupón". */
    botonLabel: string;
    /** Acción al confirmar. Debe notificar su propio éxito y lanzar en error. */
    onConfirmar: (usuariosIds: string[]) => Promise<void>;
    /** Si se pasa, es un REENVÍO: preselecciona a los destinatarios activos del cupón. */
    ofertaIdReenvio?: string;
    onCerrar: () => void;
}

export function ModalDestinatariosCiudad({ oferta, accionLabel, botonLabel, onConfirmar, ofertaIdReenvio, onCerrar }: ModalDestinatariosCiudadProps) {
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [enviando, setEnviando] = useState(false);

    // Reenvío: preseleccionar (una sola vez) a TODOS los que ya recibieron el cupón
    // (activos + usados), no a los revocados. El comerciante puede desmarcarlos.
    const asignadosQuery = useClientesAsignados(ofertaIdReenvio ?? null);
    const preseleccionAplicada = useRef(false);
    useEffect(() => {
        if (preseleccionAplicada.current || !ofertaIdReenvio) return;
        const asignados = asignadosQuery.data as Array<{ id: string; estado: string }> | undefined;
        if (!asignados) return; // aún cargando
        const previos = asignados.filter((a) => a.estado !== 'revocado').map((a) => a.id);
        if (previos.length > 0) setSeleccionados(new Set(previos));
        preseleccionAplicada.current = true;
    }, [ofertaIdReenvio, asignadosQuery.data]);

    const IconoTipo = getIconoTipo(oferta.tipo);
    const valorFormateado = formatearValor(oferta.tipo, oferta.valor);

    const handleToggle = (ids: string[], activar: boolean) => {
        setSeleccionados((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => { if (activar) next.add(id); else next.delete(id); });
            return next;
        });
    };

    const handleEnviar = async () => {
        if (seleccionados.size === 0) {
            notificar.advertencia('Selecciona al menos un usuario');
            return;
        }
        if (seleccionados.size > 500) {
            notificar.advertencia('Puedes enviar a un máximo de 500 usuarios por vez');
            return;
        }
        try {
            setEnviando(true);
            await onConfirmar(Array.from(seleccionados));
            onCerrar();
        } catch {
            // Error ya notificado por la acción del padre
        } finally {
            setEnviando(false);
        }
    };

    return (
        <ModalAdaptativo
            abierto={true}
            onCerrar={onCerrar}
            ancho="md"
            headerOscuro
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno={true}
            className="lg:max-w-sm 2xl:max-w-md max-lg:[background:linear-gradient(180deg,#1e3a5f_2.5rem,rgb(248,250,252)_2.5rem)]"
        >
            <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">

                {/* ── Header dark con la oferta/cupón ── */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #1e3a5f, #1e40af)',
                        boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
                    }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        {oferta.imagen ? (
                            <img
                                src={oferta.imagen}
                                alt={oferta.titulo}
                                className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-xl object-cover shrink-0 ring-2 ring-white/30"
                            />
                        ) : (
                            <div className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                                <IconoTipo className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/80" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0 -space-y-0.5">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                                {oferta.titulo}
                            </h3>
                            <p className="text-base lg:text-sm 2xl:text-base text-white/80 font-semibold">
                                {accionLabel} · {valorFormateado}
                            </p>
                        </div>
                        <div className="shrink-0 w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <ChatIcon className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
                        </div>
                    </div>
                </div>

                {/* ── Cuerpo: selector reutilizable (toma flex-1 → su lista scrollea) ── */}
                <SelectorDestinatariosCiudad seleccionados={seleccionados} onToggle={handleToggle} />

                {/* ── Footer ── */}
                <div className="border-t border-slate-200 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 bg-white lg:rounded-b-xl 2xl:rounded-b-2xl shrink-0">
                    <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                        <Boton
                            variante="secundario"
                            onClick={onCerrar}
                            className="flex-1 cursor-pointer"
                            disabled={enviando}
                        >
                            Cancelar
                        </Boton>
                        <Boton
                            variante="primario"
                            onClick={handleEnviar}
                            className="flex-1 cursor-pointer"
                            cargando={enviando}
                            disabled={seleccionados.size === 0}
                            data-testid="btn-confirmar-destinatarios"
                        >
                            {botonLabel}{seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}
                        </Boton>
                    </div>
                </div>

            </div>
        </ModalAdaptativo>
    );
}

export default ModalDestinatariosCiudad;
