/**
 * BotonDemoBS.tsx
 * ===============
 * Botón "Demo BS" del shell del Panel + overlay que embebe Business Studio (ver
 * docs/arquitectura/Demo_Business_Studio.md).
 *
 * Al abrir: pide al backend la copia del vendedor (crea-o-reutiliza) y recibe un handoff token; abre
 * un overlay a pantalla completa con un <iframe> a la app web (/business-studio/demo-entrada?handoff=…)
 * que canjea el token y entra a BS en modo comercial. La transición es FLUIDA: nunca sales del Panel,
 * BS aparece encima con una barrita "← Salir". "Reiniciar demo" regenera la copia fresca y recarga.
 *
 * Solo se muestra si hay un demo maestro sembrado.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MonitorPlay, ArrowLeft, RotateCcw } from 'lucide-react';
import { useEstadoDemo, useAbrirDemo, useReiniciarDemo } from '../../hooks/queries/useDemoBS';
import { toast } from '../../stores/useToastPanel';

const env = import.meta.env as Record<string, string | undefined>;
// URL de la app web (donde vive Business Studio) para embeber el demo en el iframe.
// EN PRODUCCIÓN debe estar `VITE_WEB_URL` en el Vercel del Panel (= https://anunciaya.mx);
// sin ella cae al fallback localhost y el handoff del demo apunta al dev local (401).
const WEB_URL = env.VITE_WEB_URL || 'http://localhost:3000';

function urlDemo(handoffToken: string): string {
    return `${WEB_URL}/business-studio/demo-entrada?handoff=${encodeURIComponent(handoffToken)}`;
}

function mensajeDeError(error: unknown, porDefecto: string): string {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    return e?.response?.data?.message || e?.message || porDefecto;
}

export function BotonDemoBS() {
    const { data: estado } = useEstadoDemo();
    const abrir = useAbrirDemo();
    const reiniciar = useReiniciarDemo();
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);

    // Sin demo maestro sembrado, no hay nada que mostrar.
    if (!estado?.hayMaestro) return null;

    async function handleAbrir() {
        try {
            const r = await abrir.mutateAsync();
            setIframeUrl(urlDemo(r.handoffToken));
        } catch (error) {
            toast.error(mensajeDeError(error, 'No se pudo abrir el demo de Business Studio'));
        }
    }

    async function handleReiniciar() {
        try {
            const r = await reiniciar.mutateAsync();
            setIframeUrl(urlDemo(r.handoffToken));
            toast.exito('Demo reiniciado: todo quedó como nuevo');
        } catch (error) {
            toast.error(mensajeDeError(error, 'No se pudo reiniciar el demo'));
        }
    }

    function salir() {
        setIframeUrl(null);
    }

    return (
        <>
            <button
                type="button"
                data-testid="abrir-demo-bs"
                onClick={handleAbrir}
                disabled={abrir.isPending}
                aria-label="Abrir demo de Business Studio"
                className="flex h-10 items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold text-white/80 transition hover:bg-white/12 hover:text-white disabled:opacity-60"
            >
                <MonitorPlay size={18} />
                <span className="hidden lg:inline">{abrir.isPending ? 'Abriendo…' : 'Demo BS'}</span>
            </button>

            {iframeUrl &&
                createPortal(
                    <div data-testid="demo-bs-overlay" className="fixed inset-0 z-[9999] flex flex-col bg-slate-900">
                        {/* Barrita del Panel sobre el iframe */}
                        <div className="flex h-12 shrink-0 items-center justify-between bg-barra px-4">
                            <button
                                type="button"
                                data-testid="demo-bs-salir"
                                onClick={salir}
                                className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-white/12 hover:text-white"
                            >
                                <ArrowLeft size={18} />
                                Salir
                            </button>
                            <span className="hidden text-[13px] font-semibold text-white/70 lg:block">
                                Demo · Business Studio
                            </span>
                            <button
                                type="button"
                                data-testid="demo-bs-reiniciar"
                                onClick={handleReiniciar}
                                disabled={reiniciar.isPending}
                                className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-white/12 hover:text-white disabled:opacity-60"
                            >
                                <RotateCcw size={16} />
                                {reiniciar.isPending ? 'Reiniciando…' : 'Reiniciar demo'}
                            </button>
                        </div>
                        {/* Business Studio embebido */}
                        <iframe
                            data-testid="demo-bs-iframe"
                            src={iframeUrl}
                            title="Demo de Business Studio"
                            className="h-full w-full flex-1 border-0 bg-white"
                        />
                    </div>,
                    document.body,
                )}
        </>
    );
}

export default BotonDemoBS;
