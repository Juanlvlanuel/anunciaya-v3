/**
 * BotonSalaEnVivo.tsx
 * =====================
 * Punto de entrada ÚNICO a la sala en vivo (Fase 4.1) — pill sticky que se
 * queda pegada justo debajo del header al hacer scroll (mismo contenedor de
 * scroll que ya usa el header: `cuerpoRef`/`useScrollAppShell` en móvil,
 * `mainRef` de `MainLayout` en desktop — por eso el offset `lg:top-16`
 * calca la altura real del header en `lg:`).
 *
 * Chip discreto (no un botón ancho) tipo indicador "EN VIVO" de YouTube/
 * Twitch — negro + rojo + blanco/gris en vez de la identidad ámbar del
 * resto del módulo. El punto rojo vive siempre (marca el chip como "esto es
 * la sala"), pero solo PULSA cuando el sorteo está corriendo de verdad
 * (`estado === 'en_sorteo'`) — ahí es cuando de verdad importa la urgencia.
 *
 * El texto cambia según el estado real de la Dinámica:
 *   - `en_sorteo` → "En vivo ahora" + punto rojo pulsante.
 *   - con `salaProgramadaPara` futura → cuenta regresiva compacta (solo desktop, `lg:`).
 *   - `cerrada` → "Ver resultado" (ícono trofeo en vez del punto).
 *   - resto → invitación genérica a unirse.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/BotonSalaEnVivo.tsx
 */

import { useEffect, useState } from 'react';
import { ChevronRight, Radio, Trophy } from 'lucide-react';
import type { EstadoDinamica } from '../../../types/dinamicas';

interface BotonSalaEnVivoProps {
    estado: EstadoDinamica;
    salaProgramadaPara: string | null;
    onClick: () => void;
    /**
     * En desktop, si el header vive en el MISMO contenedor de scroll que este
     * botón (ej. `PaginaDinamica.tsx`, donde ambos son sticky sobre el mismo
     * `mainRef` de `MainLayout`), hace falta compensar con `lg:top-16` para
     * no pegarse debajo del header — si no, se pega en `top:0` y queda
     * tapado por él. Si el header vive FUERA del contenedor de scroll (ej.
     * `HeaderPublico` en `PaginaDinamicaPublica.tsx`, sibling de `<main>`
     * con su propio `overflow-y-auto`), `top-0` ya es correcto en todas las
     * resoluciones — default `false`.
     */
    compensarHeaderDesktop?: boolean;
}

function formatearCuentaCorta(objetivo: string): string {
    const total = Math.max(0, new Date(objetivo).getTime() - Date.now());
    const dias = Math.floor(total / (24 * 60 * 60 * 1000));
    const horas = Math.floor((total / (60 * 60 * 1000)) % 24);
    const minutos = Math.floor((total / (60 * 1000)) % 60);
    if (total === 0) return 'Ya es hora';
    if (dias > 0) return `${dias}d ${horas}h`;
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
}

export function BotonSalaEnVivo({ estado, salaProgramadaPara, onClick, compensarHeaderDesktop = false }: BotonSalaEnVivoProps) {
    const [cuenta, setCuenta] = useState<string | null>(null);

    useEffect(() => {
        if (!salaProgramadaPara || (estado !== 'activa' && estado !== 'pospuesta')) {
            setCuenta(null);
            return;
        }
        setCuenta(formatearCuentaCorta(salaProgramadaPara));
        const intervalo = setInterval(() => setCuenta(formatearCuentaCorta(salaProgramadaPara)), 30_000);
        return () => clearInterval(intervalo);
    }, [salaProgramadaPara, estado]);

    const enVivo = estado === 'en_sorteo';
    const cerrada = estado === 'cerrada';

    const titulo = enVivo ? 'En vivo ahora' : cerrada ? 'Ver resultado' : 'Sala en vivo';

    const subtitulo = enVivo
        ? 'Se está sorteando'
        : cerrada
            ? null
            : cuenta
                ? `Empieza en ${cuenta}`
                : 'Únete y platica';

    return (
        <button
            type="button"
            data-testid="btn-abrir-sala"
            onClick={onClick}
            className={`sticky top-0 z-20 mx-auto mt-0 mb-3 flex w-fit max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900 py-1.5 pl-2 pr-3 shadow-md lg:cursor-pointer lg:py-1 lg:pl-2.5 lg:pr-3.5 lg:hover:bg-neutral-800 ${compensarHeaderDesktop ? 'lg:top-16' : 'lg:top-0'}`}
        >
            <span aria-hidden className="relative flex h-7 w-7 shrink-0 items-center justify-center lg:h-8 lg:w-8">
                {enVivo && (
                    <span
                        className="absolute inset-0 rounded-full border-2 border-red-500"
                        style={{ animation: 'cardHeartRingPulse 1.8s ease-in-out infinite' }}
                    />
                )}
                {cerrada ? (
                    <Trophy className="relative h-5 w-5 text-amber-400" strokeWidth={2.5} />
                ) : (
                    <Radio
                        className="relative h-5 w-5 text-red-500"
                        strokeWidth={2.5}
                        style={{ animation: 'salaRadioBlink 1.4s ease-in-out infinite' }}
                    />
                )}
            </span>

            <span className="min-w-0 truncate">
                <span className="text-sm font-extrabold text-white">{titulo}</span>
                {subtitulo && <span className="ml-1 text-xs font-medium text-neutral-400">· {subtitulo}</span>}
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2.5} />
        </button>
    );
}
