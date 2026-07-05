/**
 * ModalOfertaCoyo.tsx — Detalle de una OFERTA recomendada por Coyo, SOBRE el Home.
 * ============================================================================
 * Las tarjetas de resultado de Coyo (CardItemCoyo) llevan al DETALLE del item:
 *   - negocio     → navega a /negocios/:sucursalId  (página)
 *   - marketplace → navega a /marketplace/articulo/:id (página)
 *   - servicio    → navega a /servicios/:id          (página)
 *   - oferta      → NO tiene página de detalle propia; su detalle es un modal.
 *
 * Si la oferta navegara a `/ofertas?oferta=:id`, el back nativo cerraría el
 * modal pero dejaría al usuario VARADO en la lista de /ofertas (una pantalla
 * que nunca pidió) en lugar de volver al Home. Para que el back sea consistente
 * con los otros 3 destinos (ver detalle → back regresa a /inicio), la oferta se
 * abre como modal SOBRE el Home, sin navegar.
 *
 * Flujo: CardItemCoyo despacha `coyo:abrir-oferta` (detail = ofertaId) → este
 * componente hace fetch del detalle y monta `ModalOfertaDetalle`. Al cerrar
 * (X / backdrop / back nativo, que el Modal soporta vía useBackNativo) el
 * usuario queda en /inicio. Mismo patrón de eventos que ChatYA usa para abrir
 * detalles sobre el chat (ver Sistema_Navegacion_Back.md).
 *
 * Se monta una sola vez en PaginaInicio (cubre feed + pregunta destacada).
 *
 * Ubicación: apps/web/src/components/home/ModalOfertaCoyo.tsx
 */

import { useEffect, useRef, useState } from 'react';
import ModalOfertaDetalle from '@/components/negocios/ModalOfertaDetalle';
import { obtenerDetalleOferta } from '@/services/ofertasService';
import { notificar } from '@/utils/notificaciones';
import type { OfertaFeed } from '@/types/ofertas';

export function ModalOfertaCoyo() {
    const [oferta, setOferta] = useState<OfertaFeed | null>(null);
    const [cargando, setCargando] = useState(false);
    // Id de la oferta que se está cargando ahora mismo. Sirve para descartar
    // respuestas viejas (el usuario abrió otra tarjeta mientras la 1ª cargaba)
    // y para cancelar la carga si cierra el spinner antes de que llegue.
    const cargandoIdRef = useRef<string | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const ofertaId = (e as CustomEvent<string>).detail;
            if (!ofertaId) return;
            cargandoIdRef.current = ofertaId;
            setCargando(true);
            obtenerDetalleOferta(ofertaId)
                .then((r) => {
                    if (cargandoIdRef.current !== ofertaId) return; // descartado
                    if (r.success && r.data) {
                        setOferta(r.data);
                    } else {
                        notificar.error('No se pudo abrir la oferta');
                    }
                })
                .catch(() => {
                    if (cargandoIdRef.current !== ofertaId) return;
                    notificar.error('No se pudo abrir la oferta');
                })
                .finally(() => {
                    if (cargandoIdRef.current === ofertaId) setCargando(false);
                });
        };
        window.addEventListener('coyo:abrir-oferta', handler);
        return () => window.removeEventListener('coyo:abrir-oferta', handler);
    }, []);

    const cerrar = () => {
        cargandoIdRef.current = null;
        setCargando(false);
        setOferta(null);
    };

    return (
        <>
            {cargando && !oferta && (
                <div
                    className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
                    onClick={cerrar}
                    data-testid="coyo-oferta-cargando"
                >
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </div>
            )}
            {oferta && (
                <ModalOfertaDetalle
                    oferta={oferta}
                    whatsapp={oferta.whatsapp ?? undefined}
                    negocioNombre={oferta.negocioNombre}
                    negocioUsuarioId={oferta.negocioUsuarioId}
                    onClose={cerrar}
                />
            )}
        </>
    );
}

export default ModalOfertaCoyo;
