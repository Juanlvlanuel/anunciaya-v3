/**
 * CronometroSala.tsx
 * ====================
 * Cuenta regresiva hasta `objetivo` (ISO) — usado dentro de `SalaDinamica`
 * para mostrar cuánto falta para que el organizador pueda iniciar el
 * sorteo. Al llegar la hora, avisa vía `onLlegoLaHora` (el organizador ve
 * habilitarse el botón "Iniciar sorteo"; el resto solo ve "Ya casi
 * empieza").
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/CronometroSala.tsx
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CronometroSalaProps {
    objetivo: string;
    onLlegoLaHora?: () => void;
}

function calcularRestante(objetivo: string): { total: number; dias: number; horas: number; minutos: number; segundos: number } {
    const total = Math.max(0, new Date(objetivo).getTime() - Date.now());
    const dias = Math.floor(total / (24 * 60 * 60 * 1000));
    const horas = Math.floor((total / (60 * 60 * 1000)) % 24);
    const minutos = Math.floor((total / (60 * 1000)) % 60);
    const segundos = Math.floor((total / 1000) % 60);
    return { total, dias, horas, minutos, segundos };
}

export function CronometroSala({ objetivo, onLlegoLaHora }: CronometroSalaProps) {
    const [restante, setRestante] = useState(() => calcularRestante(objetivo));

    useEffect(() => {
        const avisado = { current: false };
        const intervalo = setInterval(() => {
            const r = calcularRestante(objetivo);
            setRestante(r);
            if (r.total === 0 && !avisado.current) {
                avisado.current = true;
                onLlegoLaHora?.();
            }
        }, 1000);
        return () => clearInterval(intervalo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objetivo]);

    if (restante.total === 0) {
        return (
            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                <Clock className="h-4 w-4" strokeWidth={2.5} />
                Ya es hora del sorteo
            </div>
        );
    }

    const partes = [
        restante.dias > 0 ? `${restante.dias}d` : null,
        restante.dias > 0 || restante.horas > 0 ? `${restante.horas}h` : null,
        `${restante.minutos}m`,
        `${restante.segundos}s`,
    ].filter(Boolean);

    return (
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <Clock className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
            Empieza en {partes.join(' ')}
        </div>
    );
}
