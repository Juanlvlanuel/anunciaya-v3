/**
 * PanelModeracionSala.tsx
 * =========================
 * Panel de moderación del organizador dentro de la sala — silenciar/expulsar
 * (efímero, solo esta Dinámica) o bloquear (permanente, reusa
 * `chat_bloqueados` — aplica a todas las Dinámicas futuras del organizador y
 * a ChatYA directo). Solo se monta si `esOrganizador` (ver `SalaDinamica.tsx`).
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/PanelModeracionSala.tsx
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, UserX, VolumeX, Volume2, Ban, Undo2 } from 'lucide-react';
import Tooltip from '../../ui/Tooltip';
import type { AccionModeracionSala } from '../../../types/dinamicas';

interface ParticipanteModerable {
    usuarioId: string;
    nombre: string;
    apellidos: string;
}

interface PanelModeracionSalaProps {
    participantes: ParticipanteModerable[];
    silenciados: Set<string>;
    expulsados: Set<string>;
    /** usuarioIds conectados ahora mismo al room de la sala — pinta el
     *  punto verde/gris junto al nombre. */
    conectados: Set<string>;
    /** El organizador viendo su propia fila (raro, pero puede pasar si se
     *  registró a sí mismo como participante manual) — bloquea sus 3
     *  acciones: no puede silenciarse/expulsarse/bloquearse a sí mismo
     *  (el backend ya lo rechaza; acá se refleja en la UI). */
    miUsuarioId?: string;
    onModerar: (usuarioId: string, accion: AccionModeracionSala) => void;
}

export function PanelModeracionSala({ participantes, silenciados, expulsados, conectados, miUsuarioId, onModerar }: PanelModeracionSalaProps) {
    const [abierto, setAbierto] = useState(false);

    if (participantes.length === 0) return null;

    return (
        <div className="rounded-xl border-2 border-slate-300 bg-white">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="flex w-full items-center justify-between p-3 lg:cursor-pointer"
            >
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <ShieldAlert className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                    Moderación ({participantes.length})
                </span>
                {abierto ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {abierto && (
                <div className="max-h-56 space-y-1 overflow-y-auto border-t border-slate-200 p-2">
                    {participantes.map((p) => {
                        const silenciado = silenciados.has(p.usuarioId);
                        const expulsado = expulsados.has(p.usuarioId);
                        const conectado = conectados.has(p.usuarioId);
                        const esUnoMismo = !!miUsuarioId && p.usuarioId === miUsuarioId;
                        return (
                            <div key={p.usuarioId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
                                <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-slate-700">
                                    <span
                                        aria-hidden
                                        title={conectado ? 'Conectado' : 'Desconectado'}
                                        className={`h-2 w-2 shrink-0 rounded-full ${conectado ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    />
                                    {p.nombre} {p.apellidos}
                                </span>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Tooltip text={esUnoMismo ? 'No puedes moderarte a ti mismo' : silenciado ? 'Quitar silencio' : 'Silenciar'} position="top">
                                        <button
                                            type="button"
                                            disabled={esUnoMismo}
                                            onClick={() => onModerar(p.usuarioId, silenciado ? 'quitar-silencio' : 'silenciar')}
                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                esUnoMismo
                                                    ? 'cursor-not-allowed text-slate-300'
                                                    : `lg:cursor-pointer lg:hover:bg-slate-100 ${silenciado ? 'text-amber-600' : 'text-slate-500'}`
                                            }`}
                                        >
                                            {silenciado ? <Volume2 className="h-4 w-4" strokeWidth={2.5} /> : <VolumeX className="h-4 w-4" strokeWidth={2.5} />}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text={esUnoMismo ? 'No puedes expulsarte a ti mismo' : expulsado ? 'Permitir volver a unirse' : 'Expulsar'} position="top">
                                        <button
                                            type="button"
                                            disabled={esUnoMismo}
                                            onClick={() => onModerar(p.usuarioId, expulsado ? 'quitar-expulsion' : 'expulsar')}
                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                esUnoMismo
                                                    ? 'cursor-not-allowed text-slate-300'
                                                    : `lg:cursor-pointer lg:hover:bg-red-100 ${expulsado ? 'text-red-600' : 'text-slate-500'}`
                                            }`}
                                        >
                                            {expulsado ? <Undo2 className="h-4 w-4" strokeWidth={2.5} /> : <UserX className="h-4 w-4" strokeWidth={2.5} />}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text={esUnoMismo ? 'No puedes bloquearte a ti mismo' : 'Bloquear permanentemente'} position="top">
                                        <button
                                            type="button"
                                            disabled={esUnoMismo}
                                            onClick={() => onModerar(p.usuarioId, 'bloquear')}
                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                esUnoMismo
                                                    ? 'cursor-not-allowed text-slate-300'
                                                    : 'text-slate-500 lg:cursor-pointer lg:hover:bg-red-100 lg:hover:text-red-600'
                                            }`}
                                        >
                                            <Ban className="h-4 w-4" strokeWidth={2.5} />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
