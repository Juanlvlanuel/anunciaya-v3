/**
 * TabExclusiva.tsx
 * ================
 * Tab de ajustes para ofertas privadas: motivo, límite, flujo, preview.
 * Layout plano — sin contenedores anidados.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/TabExclusiva.tsx
 */

import { Ticket } from 'lucide-react';
import type { FormularioState } from './TabOferta';

interface TabExclusivaProps {
    formulario: FormularioState;
    setFormulario: React.Dispatch<React.SetStateAction<FormularioState>>;
    guardando: boolean;
    soloLectura?: boolean;
}

export function TabExclusiva({ formulario, setFormulario, guardando, soloLectura }: TabExclusivaProps) {
    return (
        <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

            {/* Motivo */}
            <div>
                <label htmlFor="input-motivo-exclusiva" className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-1.5">Motivo</label>
                <input
                    id="input-motivo-exclusiva"
                    name="motivoAsignacion"
                    data-testid="input-motivo-exclusiva"
                    type="text"
                    value={formulario.motivoAsignacion}
                    onChange={(e) => setFormulario(prev => ({ ...prev, motivoAsignacion: e.target.value }))}
                    placeholder="Ej: Cliente fiel, Cumpleaños, Primera compra"
                    maxLength={200}
                    disabled={guardando || soloLectura}
                    readOnly={soloLectura}
                    className={`w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 ${soloLectura ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                />
            </div>

            {/* Límite por persona */}
            <div>
                <label htmlFor="input-limite-por-usuario" className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-1.5">Límite por persona</label>
                <input
                    id="input-limite-por-usuario"
                    name="limiteUsosPorUsuario"
                    data-testid="input-limite-por-usuario"
                    type="number"
                    value={formulario.limiteUsosPorUsuario}
                    onChange={(e) => setFormulario(prev => ({ ...prev, limiteUsosPorUsuario: e.target.value }))}
                    placeholder="Ej: 1 uso por cliente (vacío = ilimitado)"
                    min={1}
                    disabled={guardando || soloLectura}
                    readOnly={soloLectura}
                    className={`w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 ${soloLectura ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                />
            </div>

            {/* Preview notificación */}
            <div className="p-3 lg:p-2 2xl:p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-600 mb-2 lg:mb-1.5 2xl:mb-2">Preview notificación</p>
                <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                    <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                        <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">¡Cupón exclusivo para ti!</p>
                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate">
                            {formulario.titulo.trim() || 'Título de la oferta...'}
                        </p>
                        {formulario.motivoAsignacion && (
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mt-0.5">{formulario.motivoAsignacion}</p>
                        )}
                        {formulario.descripcion.trim() && (
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mt-0.5 truncate">{formulario.descripcion}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Cómo funciona */}
            <div className="p-3 lg:p-2 2xl:p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-1.5">¿Cómo funciona?</p>
                <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium space-y-1">
                    {[
                        'Selecciona clientes en la pestaña "Enviar a"',
                        'Cada cliente recibe un código único en su notificación',
                        'El cliente presenta su código en tu negocio',
                        'Tu empleado lo ingresa en ScanYA para validarlo',
                    ].map((texto, i) => (
                        <div key={i} className="flex gap-1.5">
                            <span className="shrink-0 font-bold text-slate-700">{i + 1}.</span>
                            <span>{texto}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
