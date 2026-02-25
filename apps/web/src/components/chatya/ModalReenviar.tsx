/**
 * ModalReenviar.tsx
 * ==================
 * Modal para seleccionar a quién reenviar un mensaje.
 * Soporta selección múltiple con chips y envío simultáneo.
 *
 * UBICACIÓN: apps/web/src/components/chatya/ModalReenviar.tsx
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Forward, Store, Loader2, Check } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import * as chatyaService from '../../services/chatyaService';
import type { Mensaje, Conversacion, PersonaBusqueda, NegocioBusqueda, ModoChatYA } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalReenviarProps {
  mensaje: Mensaje;
  onCerrar: () => void;
}

/** Destinatario seleccionado (puede ser conversación, persona o negocio) */
interface Destinatario {
  key: string; // ID único para el Set de seleccionados
  label: string;
  iniciales: string;
  avatarUrl?: string | null;
  esNegocio: boolean;
  // Datos para el envío
  destinatarioId: string;
  destinatarioModo?: ModoChatYA;
  destinatarioSucursalId?: string | null;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalReenviar({ mensaje, onCerrar }: ModalReenviarProps) {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const conversaciones    = useChatYAStore((s) => s.conversaciones);
  const misNotasId        = useChatYAStore((s) => s.misNotasId);
  const reenviarMensaje   = useChatYAStore((s) => s.reenviarMensaje);
  const usuario           = useAuthStore((s) => s.usuario);
  const miId              = usuario?.id || '';
  const latitud           = useGpsStore((s) => s.latitud);
  const longitud          = useGpsStore((s) => s.longitud);
  const ciudad            = useGpsStore((s) => s.ciudad);

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [busqueda, setBusqueda]                     = useState('');
  const [personasResultados, setPersonasResultados] = useState<PersonaBusqueda[]>([]);
  const [negociosResultados, setNegociosResultados] = useState<NegocioBusqueda[]>([]);
  const [buscandoBackend, setBuscandoBackend]       = useState(false);
  const [enviando, setEnviando]                     = useState(false);
  const [seleccionados, setSeleccionados]           = useState<Map<string, Destinatario>>(new Map());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const estaBuscando = busqueda.trim().length >= 2;

  // ---------------------------------------------------------------------------
  // Conversaciones recientes
  // ---------------------------------------------------------------------------
  const conversacionesRecientes = useMemo(() =>
    conversaciones.filter((c) => c.id !== misNotasId).slice(0, 15),
  [conversaciones, misNotasId]);

  const conversacionesFiltradas = useMemo(() => {
    if (!estaBuscando) return conversacionesRecientes;
    const t = busqueda.toLowerCase();
    return conversacionesRecientes.filter((c) => {
      const nombre   = c.otroParticipante?.nombre?.toLowerCase() || '';
      const apellido = c.otroParticipante?.apellidos?.toLowerCase() || '';
      const negocio  = c.otroParticipante?.negocioNombre?.toLowerCase() || '';
      return nombre.includes(t) || apellido.includes(t) || negocio.includes(t);
    });
  }, [conversacionesRecientes, busqueda, estaBuscando]);

  // ---------------------------------------------------------------------------
  // Búsqueda backend con debounce
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!estaBuscando) {
      setPersonasResultados([]); setNegociosResultados([]); setBuscandoBackend(false);
      return;
    }
    setBuscandoBackend(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const ciudadNombre = ciudad?.nombre || '';
        const [resP, resN] = await Promise.all([
          chatyaService.buscarPersonas(busqueda.trim()),
          ciudadNombre
            ? chatyaService.buscarNegocios(busqueda.trim(), ciudadNombre, latitud, longitud)
            : Promise.resolve({ success: true, data: [] as NegocioBusqueda[] }),
        ]);
        setPersonasResultados(resP.data || []);
        setNegociosResultados(resN.data || []);
      } catch {
        setPersonasResultados([]); setNegociosResultados([]);
      } finally {
        setBuscandoBackend(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busqueda, estaBuscando, ciudad, latitud, longitud]);

  // Focus automático
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------
  const previewMensaje = mensaje.tipo === 'texto'
    ? (mensaje.contenido?.slice(0, 80) ?? '') + ((mensaje.contenido?.length ?? 0) > 80 ? '…' : '')
    : mensaje.tipo === 'imagen'    ? '📷 Imagen'
    : mensaje.tipo === 'audio'     ? '🎤 Audio'
    : mensaje.tipo === 'documento' ? '📎 Documento'
    : mensaje.tipo === 'ubicacion' ? '📍 Ubicación'
    : mensaje.contenido?.slice(0, 80) || '';

  // ---------------------------------------------------------------------------
  // Helpers de selección
  // ---------------------------------------------------------------------------
  const toggleSeleccion = (dest: Destinatario) => {
    setSeleccionados((prev) => {
      const next = new Map(prev);
      if (next.has(dest.key)) next.delete(dest.key);
      else next.set(dest.key, dest);
      return next;
    });
  };

  const estaSeleccionado = (key: string) => seleccionados.has(key);

  // ---------------------------------------------------------------------------
  // Construir destinatario desde conversación
  // ---------------------------------------------------------------------------
  const destDeConversacion = (conv: Conversacion): Destinatario => {
    const otro     = conv.otroParticipante!;
    const esP1     = conv.participante1Id === miId;
    const esNeg    = !!otro.negocioNombre;
    const label    = esNeg ? otro.negocioNombre! : `${otro.nombre} ${otro.apellidos || ''}`.trim();
    const iniciales = label.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    return {
      key:                  `conv-${conv.id}`,
      label,
      iniciales,
      avatarUrl:            otro.negocioLogo || otro.avatarUrl,
      esNegocio:            esNeg,
      destinatarioId:       esP1 ? conv.participante2Id : conv.participante1Id,
      destinatarioModo:     esP1 ? conv.participante2Modo : conv.participante1Modo,
      destinatarioSucursalId: esP1 ? conv.participante2SucursalId : conv.participante1SucursalId,
    };
  };

  const destDePersona = (p: PersonaBusqueda): Destinatario => {
    const label = `${p.nombre} ${p.apellidos || ''}`.trim();
    return {
      key:           `persona-${p.id}`,
      label,
      iniciales:     label.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase(),
      avatarUrl:     p.avatarUrl,
      esNegocio:     false,
      destinatarioId: p.id,
    };
  };

  const destDeNegocio = (n: NegocioBusqueda): Destinatario => {
    const iniciales = n.negocioNombre.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    return {
      key:                   `negocio-${n.sucursalId}`,
      label:                 n.negocioNombre,
      iniciales,
      avatarUrl:             n.fotoPerfil,
      esNegocio:             true,
      destinatarioId:        n.usuarioId,
      destinatarioModo:      'comercial',
      destinatarioSucursalId: n.sucursalId,
    };
  };

  // ---------------------------------------------------------------------------
  // Enviar a todos los seleccionados
  // ---------------------------------------------------------------------------
  const handleEnviar = async () => {
    if (enviando || seleccionados.size === 0) return;
    setEnviando(true);
    const dests = Array.from(seleccionados.values());
    await Promise.all(dests.map((d) =>
      reenviarMensaje(mensaje.id, {
        destinatarioId:        d.destinatarioId,
        destinatarioModo:      d.destinatarioModo,
        destinatarioSucursalId: d.destinatarioSucursalId,
      })
    ));
    setEnviando(false);
    onCerrar();
  };

  // ---------------------------------------------------------------------------
  // Deduplicar personas de búsqueda
  // ---------------------------------------------------------------------------
  const idsConversaciones = useMemo(() =>
    new Set(conversacionesFiltradas.map((c) => c.otroParticipante?.id).filter(Boolean)),
  [conversacionesFiltradas]);

  const personasSinDuplicar = useMemo(() =>
    personasResultados.filter((p) => !idsConversaciones.has(p.id) && p.id !== miId),
  [personasResultados, idsConversaciones, miId]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderAvatar = (dest: Pick<Destinatario, 'avatarUrl' | 'iniciales' | 'esNegocio' | 'label'>) => (
    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
      {dest.avatarUrl ? (
        <img src={dest.avatarUrl} alt={dest.label} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white text-sm font-bold
          ${dest.esNegocio ? 'bg-linear-to-br from-amber-400 to-amber-600' : 'bg-linear-to-br from-blue-500 to-blue-700'}`}>
          {dest.iniciales}
        </div>
      )}
    </div>
  );

  const renderCheckbox = (key: string) => (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
      ${estaSeleccionado(key) ? 'bg-blue-500 border-blue-500' : 'border-slate-400'}`}>
      {estaSeleccionado(key) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </div>
  );

  const renderItem = (dest: Destinatario, sub?: string) => (
    <button
      key={dest.key}
      onClick={() => toggleSeleccion(dest)}
      disabled={enviando}
      className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors disabled:opacity-50
        ${estaSeleccionado(dest.key) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
    >
      {renderAvatar(dest)}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          {dest.esNegocio && <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          <p className="text-sm font-semibold text-slate-800 truncate">{dest.label}</p>
        </div>
        {sub && <p className="text-xs text-slate-500 truncate mt-0.5">{sub}</p>}
      </div>
      {renderCheckbox(dest.key)}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Reenviar mensaje"
      iconoTitulo={<Forward className="w-5 h-5 text-blue-500" />}
      ancho="sm"
      sinScrollInterno
      alturaMaxima="lg"
      zIndice="z-90"
    >
      <div className="flex flex-col max-h-[65vh] lg:max-h-[55vh]">

        {/* ── Preview del mensaje ── */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0 flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-500 rounded-full shrink-0" />
          <p className="text-xs text-slate-600 font-medium truncate">{previewMensaje}</p>
        </div>

        {/* ── Chips de seleccionados ── */}
        {seleccionados.size > 0 && (
          <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5 shrink-0 border-b border-slate-200">
            {Array.from(seleccionados.values()).map((d) => (
              <span
                key={d.key}
                className="inline-flex items-center gap-1.5 bg-blue-100 border border-blue-300 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full"
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0
                  ${d.esNegocio ? 'bg-amber-500' : 'bg-blue-500'}`}>
                  {d.iniciales.charAt(0)}
                </div>
                <span className="max-w-80px truncate">{d.label}</span>
                <button
                  onClick={() => toggleSeleccion(d)}
                  className="text-blue-400 hover:text-blue-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Buscador ── */}
        <div className="px-4 py-2.5 border-b border-slate-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar persona o negocio..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 placeholder:text-slate-400 text-slate-800"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* ── Lista scrolleable ── */}
        <div className="flex-1 overflow-y-auto relative">

          {enviando && (
            <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          )}

          {buscandoBackend && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          )}

          {/* Conversaciones recientes / filtradas */}
          {conversacionesFiltradas.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {estaBuscando ? 'Chats' : 'Recientes'}
              </p>
              {conversacionesFiltradas.map((conv) => {
                if (!conv.otroParticipante) return null;
                const dest = destDeConversacion(conv);
                const sub = conv.otroParticipante.negocioNombre && conv.otroParticipante.sucursalNombre
                  ? conv.otroParticipante.sucursalNombre
                  : undefined;
                return renderItem(dest, sub);
              })}
            </div>
          )}

          {/* Personas de búsqueda */}
          {estaBuscando && personasSinDuplicar.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Personas</p>
              {personasSinDuplicar.map((p) => {
                const dest = destDePersona(p);
                const sub  = p.alias ? `@${p.alias}` : undefined;
                return renderItem(dest, sub);
              })}
            </div>
          )}

          {/* Negocios de búsqueda */}
          {estaBuscando && negociosResultados.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Negocios</p>
              {negociosResultados.map((n) => {
                const dest = destDeNegocio(n);
                const meta = [
                  n.categoria,
                  n.calificacionPromedio > 0 ? `★ ${n.calificacionPromedio.toFixed(1)}` : null,
                  n.distanciaKm != null
                    ? n.distanciaKm < 1
                      ? `${Math.round(n.distanciaKm * 1000)}m`
                      : `${n.distanciaKm.toFixed(1)}km`
                    : null,
                ].filter(Boolean).join(' · ');
                return renderItem(dest, meta || undefined);
              })}
            </div>
          )}

          {/* Estado vacío — buscó pero sin resultados */}
          {estaBuscando && !buscandoBackend
            && conversacionesFiltradas.length === 0
            && personasSinDuplicar.length === 0
            && negociosResultados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Search className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-slate-500">No se encontraron resultados</p>
            </div>
          )}

          {/* Estado vacío — sin conversaciones */}
          {!estaBuscando && conversacionesRecientes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Forward className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-slate-500">Busca a quién reenviar</p>
            </div>
          )}
        </div>

        {/* ── Footer con botón de envío ── */}
        <div className={`px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 transition-opacity
          ${seleccionados.size === 0 ? 'opacity-50' : ''}`}>
          <span className="text-sm text-slate-500">
            {seleccionados.size === 0
              ? 'Selecciona destinatarios'
              : <><span className="font-bold text-blue-500">{seleccionados.size}</span> seleccionado{seleccionados.size !== 1 ? 's' : ''}</>
            }
          </span>
          <button
            onClick={handleEnviar}
            disabled={seleccionados.size === 0 || enviando}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold px-4 py-2 rounded-xl cursor-pointer disabled:cursor-not-allowed transition-colors shadow-sm disabled:shadow-none"
          >
            <Forward className="w-4 h-4" />
            Reenviar{seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}
          </button>
        </div>

      </div>
    </ModalAdaptativo>
  );
}

export default ModalReenviar;