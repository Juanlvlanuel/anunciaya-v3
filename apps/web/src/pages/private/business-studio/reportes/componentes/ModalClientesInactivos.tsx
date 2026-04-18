/**
 * ModalClientesInactivos.tsx
 * ===========================
 * Modal que muestra la lista detallada de clientes en riesgo o inactivos.
 * Cada card es clickeable y navega al módulo Clientes filtrado por ese cliente.
 */

import { AlertTriangle, UserX, Phone, Mail, Clock, User, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModalAdaptativo } from '../../../../../components/ui/ModalAdaptativo';
import { Spinner } from '../../../../../components/ui/Spinner';
import { useClientesInactivos } from '../../../../../hooks/queries/useReportes';
import { obtenerIniciales } from '../../../../../utils/obtenerIniciales';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  tipo: 'riesgo' | 'inactivos';
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Nunca';
  const d = new Date(fecha);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export function ModalClientesInactivos({ abierto, onCerrar, tipo }: Props) {
  const { data, isPending } = useClientesInactivos(tipo, abierto);
  const navigate = useNavigate();

  const titulo = tipo === 'riesgo' ? 'Clientes en riesgo' : 'Clientes inactivos';
  const descripcion = tipo === 'riesgo'
    ? 'Llevan entre 15 y 30 días sin comprar'
    : 'Más de 30 días sin comprar';
  const Icono = tipo === 'riesgo' ? AlertTriangle : UserX;

  const handleAbrirCliente = (nombre: string, apellidos: string) => {
    const nombreCompleto = [nombre, apellidos].filter(Boolean).join(' ').trim();
    onCerrar();
    // Pasa la búsqueda como query param (sobrevive a React Strict Mode)
    navigate(`/business-studio/clientes?busqueda=${encodeURIComponent(nombreCompleto)}`);
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="lg"
      headerOscuro
      className="lg:max-w-lg 2xl:max-w-xl max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
    >
      <div data-testid="modal-clientes-inactivos">
        {/* Header con gradiente oscuro */}
        <div
          className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Icono className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{titulo}</h2>
              <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-white/70">{descripcion}</p>
            </div>
            {data && data.length > 0 && (
              <div className="shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl bg-white/15">
                <span className="text-xl font-extrabold text-white leading-none">{data.length}</span>
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-white/70 mt-0.5">{data.length === 1 ? 'cliente' : 'clientes'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-2.5 2xl:p-3">
          {isPending ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <User className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-slate-800">¡Todo en orden!</p>
              <p className="text-sm font-medium text-slate-600 mt-1">
                No tienes clientes {tipo === 'riesgo' ? 'en riesgo' : 'inactivos'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
              {data.map((c) => {
                const colorAcento = '#3b82f6';
                return (
                  <button
                    key={c.clienteId}
                    type="button"
                    onClick={() => handleAbrirCliente(c.nombre, c.apellidos)}
                    className="group w-full text-left bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md hover:border-slate-400 lg:cursor-pointer overflow-hidden"
                    data-testid={`cliente-inactivo-${c.clienteId}`}
                  >
                    <div className="flex items-center gap-3 p-3 lg:p-2.5 2xl:p-3">
                      {/* Avatar circular con ring coloreado */}
                      <div
                        className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ boxShadow: `0 0 0 2px white, 0 0 0 4px ${colorAcento}33` }}
                      >
                        <span className="text-base font-bold text-indigo-700">
                          {obtenerIniciales(`${c.nombre} ${c.apellidos}`)}
                        </span>
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        {/* Nombre + badge días en la misma línea */}
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 truncate flex-1">
                            {c.nombre} {c.apellidos}
                          </p>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-extrabold whitespace-nowrap border-2 ${
                            tipo === 'riesgo'
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            {c.diasSinComprar} días
                          </span>
                        </div>

                        {/* Última compra con icono */}
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          Última compra: <span className="font-semibold text-slate-700">{formatearFecha(c.ultimaActividad)}</span>
                        </p>

                        {/* Contacto con chips */}
                        {(c.telefono || c.correo) ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.telefono && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-700">
                                <Phone className="w-3.5 h-3.5 text-slate-600" />
                                {c.telefono}
                              </span>
                            )}
                            {c.correo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-700 min-w-0 max-w-full">
                                <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span className="truncate">{c.correo}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 italic">
                            Sin información de contacto
                          </span>
                        )}
                      </div>

                      {/* Chevron indicando click */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-slate-300">
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}
