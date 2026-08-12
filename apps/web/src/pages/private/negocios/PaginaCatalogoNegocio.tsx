/**
 * ============================================================================
 * PÁGINA: Catálogo público de un negocio (full-screen) + Armar pedido
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/negocios/PaginaCatalogoNegocio.tsx
 *
 * PROPÓSITO:
 * Reemplaza a `ModalCatalogo.tsx` como punto de entrada principal para
 * explorar el catálogo completo de un negocio — página de pantalla completa
 * en vez de modal, con capacidad de armar un pedido (varios artículos +
 * cantidades) y enviarlo por ChatYA o WhatsApp. El negocio recibe un mensaje
 * ya organizado en su chat de siempre — sin checkout, sin pago, sin tabla de
 * pedidos (se decidió explícitamente NO reintroducir el sistema de
 * carrito/pedidos que se eliminó el 2026-06-15 por no ser el modelo de
 * AnunciaYA — ver docs/migraciones/2026-06-15-drop-pedidos.sql). Esto es un
 * compositor de mensaje, no un sistema de e-commerce.
 *
 * RUTAS (mismo patrón dual que PaginaPerfilNegocio):
 *   /p/negocio/:sucursalId/catalogo   (pública, LayoutPublico)
 *   /negocios/:sucursalId/catalogo    (privada, dentro de MainLayout)
 *
 * Detalle completo: docs/arquitectura/Catalogo_Publico_Pedido.md
 */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Search,
  ImageIcon,
  X,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;

import { LayoutPublico } from '../../../components/layout/LayoutPublico';
import { ModalBottom } from '../../../components/ui/ModalBottom';
import { Spinner } from '../../../components/ui/Spinner';
import { ModalAuthRequerido } from '../../../components/compartir/ModalAuthRequerido';
import { DropdownCompartir } from '../../../components/compartir';
import { ModalDetalleItem } from '../../../components/negocios/ModalDetalleItem';
import { useNegocioPerfil, useNegocioCatalogo } from '../../../hooks/queries/useNegocios';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useIniciarChatNegocio } from '../../../hooks/useIniciarChatNegocio';
import { useAbrirWhatsApp } from '../../../hooks/useAbrirWhatsApp';
import { formatearPedidoWhatsApp } from '../../../utils/formatearPedidoWhatsApp';
import { notificar } from '../../../utils/notificaciones';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useBreakpoint } from '../../../hooks/useBreakpoint';

// =============================================================================
// TIPOS
// =============================================================================

interface ItemCatalogo {
  id: string;
  tipo: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  precioBase: string;
  precioDesde?: boolean | null;
  imagenPrincipal?: string | null;
  disponible?: boolean | null;
  destacado?: boolean | null;
}

interface ItemPedido {
  articuloId: string;
  nombre: string;
  precio: number;
  imagenPrincipal: string | null;
  cantidad: number;
}

// =============================================================================
// SUBCOMPONENTE: Card de catálogo con control de cantidad
// =============================================================================

function CardCatalogoPedido({
  item,
  cantidadEnPedido,
  onAgregar,
  onCambiarCantidad,
  onVerDetalle,
}: {
  item: ItemCatalogo;
  cantidadEnPedido: number;
  onAgregar: () => void;
  onCambiarCantidad: (delta: number) => void;
  onVerDetalle: () => void;
}) {
  const esServicio = item.tipo === 'servicio';
  const esDestacado = item.destacado === true;
  const noDisponible = item.disponible === false;

  return (
    <div
      className={`relative bg-white rounded-xl shadow-md overflow-hidden border-2 flex flex-col ${
        esDestacado ? 'border-amber-300' : 'border-slate-300'
      } ${noDisponible ? 'opacity-60' : ''}`}
    >
      {esDestacado && (
        <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white px-1.5 py-0.5 rounded-lg flex items-center gap-1">
          <Star className="w-2.5 h-2.5 fill-current" />
          <span className="text-xs font-bold">Top</span>
        </div>
      )}

      <div className="absolute top-2 right-2 z-10">
        <DropdownCompartir
          url={`${window.location.origin}/p/articulo/${item.id}`}
          texto={`¡Mira ${esServicio ? 'este servicio' : 'este producto'} en AnunciaYA!\n\n${item.nombre}`}
          titulo={item.nombre}
          variante="glass"
        />
      </div>

      {/* Imagen — tocar abre el detalle completo (ModalDetalleItem) */}
      <div
        onClick={onVerDetalle}
        className={`aspect-4/3 shrink-0 overflow-hidden cursor-pointer ${esDestacado ? 'bg-amber-50' : 'bg-slate-200'}`}
      >
        {item.imagenPrincipal ? (
          <img src={item.imagenPrincipal} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {esServicio ? (
              <Wrench className="w-10 h-10 text-slate-300" />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-300" />
            )}
          </div>
        )}
      </div>

      {/* Info — alto reservado para nombre/descripción para que todas las cards
          (con o sin descripción, producto o servicio) midan lo mismo y el botón
          quede siempre a la misma altura. */}
      <div className="p-3 flex flex-col flex-1">
        <h4 onClick={onVerDetalle} className="font-semibold text-slate-800 text-sm line-clamp-2 min-h-[2.25rem] lg:min-h-[2.5rem] cursor-pointer">{item.nombre}</h4>
        <p className="text-slate-500 text-xs font-medium line-clamp-1 min-h-[1rem] mt-0.5">{item.descripcion || ' '}</p>
        <p className="text-emerald-600 font-bold text-base mt-0.5">
          {item.precioDesde && <span className="text-slate-500 font-medium text-xs">Desde </span>}
          ${parseFloat(item.precioBase).toFixed(2)}
        </p>

        {/* Control de cantidad / agregar — siempre pegado al fondo de la card */}
        <div className="mt-auto pt-1">
          {noDisponible ? (
            <p className="text-xs font-semibold text-red-500">No disponible</p>
          ) : cantidadEnPedido === 0 ? (
            <button
              type="button"
              onClick={onAgregar}
              data-testid={`btn-agregar-pedido-${item.id}`}
              className="w-full h-9 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          ) : (
            <div className="w-full h-9 rounded-lg bg-slate-100 border-2 border-slate-300 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => onCambiarCantidad(-1)}
                data-testid={`btn-restar-pedido-${item.id}`}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800 text-sm">{cantidadEnPedido}</span>
              <button
                type="button"
                onClick={() => onCambiarCantidad(1)}
                data-testid={`btn-sumar-pedido-${item.id}`}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: Contenido del panel de pedido (reusado sidebar/drawer)
// =============================================================================

function PanelPedidoContenido({
  pedido,
  nota,
  setNota,
  onCambiarCantidad,
  onQuitar,
  onEnviarChatYA,
  onEnviarWhatsApp,
  enviandoChatYA,
  puedeWhatsApp,
}: {
  pedido: ItemPedido[];
  nota: string;
  setNota: (v: string) => void;
  onCambiarCantidad: (articuloId: string, delta: number) => void;
  onQuitar: (articuloId: string) => void;
  onEnviarChatYA: () => void;
  onEnviarWhatsApp: (e: MouseEvent<HTMLElement>) => void;
  enviandoChatYA: boolean;
  puedeWhatsApp: boolean;
}) {
  const total = pedido.reduce((s, i) => s + i.precio * i.cantidad, 0);

  if (pedido.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-center px-4">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Tu pedido está vacío</p>
          <p className="text-base text-slate-600 mt-1">Agrega artículos del catálogo para armar tu pedido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Cuerpo — scroll propio, independiente del footer */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pt-3 pb-3">
        {pedido.map((item) => (
          <div key={item.articuloId} className="flex flex-col gap-1.5 pb-3 border-b-2 border-slate-200 last:border-0 last:pb-0" data-testid={`linea-pedido-${item.articuloId}`}>
            {/* Fila 1: imagen + nombre completo (sin truncar) + quitar */}
            <div className="flex items-start gap-2.5">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                {item.imagenPrincipal ? (
                  <img src={item.imagenPrincipal} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 leading-snug break-words">{item.nombre}</p>
                <p className="text-sm text-slate-600 font-medium">${item.precio.toFixed(2)} c/u</p>
              </div>
              <button
                type="button"
                onClick={() => onQuitar(item.articuloId)}
                className="p-1.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-100 shrink-0"
                data-testid={`btn-quitar-pedido-${item.articuloId}`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Fila 2: stepper + subtotal, alineados bajo el nombre */}
            <div className="flex items-center justify-end gap-3 pl-[52px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCambiarCantidad(item.articuloId, -1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-5 text-center text-sm font-bold text-slate-800">{item.cantidad}</span>
                <button
                  type="button"
                  onClick={() => onCambiarCantidad(item.articuloId, 1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-base font-bold text-slate-800 text-right shrink-0 whitespace-nowrap">
                ${(item.precio * item.cantidad).toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota para el negocio (opcional)"
          maxLength={300}
          rows={6}
          data-testid="textarea-nota-pedido"
          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-base font-medium text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-slate-500 resize-none"
        />
      </div>

      {/* Footer — SIEMPRE pegado al fondo real del contenedor (no scrollea,
          no depende de sticky/cuánto contenido haya arriba: es un bloque
          `shrink-0` fuera del área con scroll). Card blanca con acento
          verde, integrada al resto del panel. */}
      <div className="shrink-0 -mx-4 mt-3 px-4 pt-3 pb-4 border-t-2 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-600">Total</span>
          <span className="text-2xl font-extrabold text-slate-900">${total.toFixed(2)}</span>
        </div>

        {/* Envío — ChatYA + WhatsApp, misma fila */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onEnviarChatYA}
            disabled={enviandoChatYA}
            data-testid="btn-enviar-pedido-chatya"
            className="flex-1 h-12 rounded-xl border-2 border-slate-200 bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            {enviandoChatYA ? <Spinner tamanio="sm" /> : <img src="/ChatYA.webp" alt="ChatYA" className="h-7 w-auto" />}
          </button>
          {puedeWhatsApp && (
            <button
              type="button"
              onClick={onEnviarWhatsApp}
              data-testid="btn-enviar-pedido-whatsapp"
              className="flex-1 h-12 rounded-xl border-2 border-emerald-200 bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center cursor-pointer"
            >
              <img src="/whatsapp2.webp" alt="WhatsApp" className="h-11 w-auto" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaCatalogoNegocio() {
  const { sucursalId } = useParams<{ sucursalId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const esRutaPublica = location.pathname.startsWith('/p/negocio');
  const cuerpoRef = useScrollAppShell();
  const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });
  const { esMobile } = useBreakpoint();

  const usuario = useAuthStore((s) => s.usuario);
  const iniciarChatNegocio = useIniciarChatNegocio();
  const { abrir: abrirWhatsApp, menu: menuWhatsApp } = useAbrirWhatsApp();

  const { data: negocio, isLoading: cargandoNegocio } = useNegocioPerfil(sucursalId);
  const { data: catalogoRaw = [], isLoading: cargandoCatalogo } = useNegocioCatalogo(negocio?.negocioId, sucursalId);
  const catalogo = catalogoRaw as unknown as ItemCatalogo[];

  // ── Filtros ────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'producto' | 'servicio' | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [dropdownCatAbierto, setDropdownCatAbierto] = useState(false);
  const dropdownCatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownCatAbierto) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (!dropdownCatRef.current?.contains(e.target as Node)) setDropdownCatAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownCatAbierto]);

  // ── Pedido (cart) ──────────────────────────────────────────────────────
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [nota, setNota] = useState('');
  const [drawerPedidoAbierto, setDrawerPedidoAbierto] = useState(false);
  const [enviandoChatYA, setEnviandoChatYA] = useState(false);
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);

  const totalItemsPedido = pedido.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecioPedido = pedido.reduce((s, i) => s + i.precio * i.cantidad, 0);

  // ── Cálculos de catálogo ───────────────────────────────────────────────
  const { totalProductos, totalServicios, tieneAmbos } = useMemo(() => {
    const productos = catalogo.filter((i) => i.tipo === 'producto').length;
    const servicios = catalogo.filter((i) => i.tipo === 'servicio').length;
    return { totalProductos: productos, totalServicios: servicios, tieneAmbos: productos > 0 && servicios > 0 };
  }, [catalogo]);

  const itemsFiltrados = useMemo(() => {
    let items = catalogo;
    if (tipoSeleccionado) items = items.filter((i) => i.tipo === tipoSeleccionado);
    if (categoriaSeleccionada) items = items.filter((i) => i.categoria === categoriaSeleccionada);
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.nombre.toLowerCase().includes(termino) ||
          i.descripcion?.toLowerCase().includes(termino) ||
          i.categoria?.toLowerCase().includes(termino)
      );
    }
    return [...items].sort((a, b) => (a.destacado && !b.destacado ? -1 : !a.destacado && b.destacado ? 1 : 0));
  }, [catalogo, tipoSeleccionado, categoriaSeleccionada, busqueda]);

  const categorias = useMemo(() => {
    const cats = new Set<string>();
    catalogo.forEach((i) => {
      if (i.categoria && (!tipoSeleccionado || i.tipo === tipoSeleccionado)) cats.add(i.categoria);
    });
    return Array.from(cats).sort();
  }, [catalogo, tipoSeleccionado]);

  // ── Handlers de pedido ─────────────────────────────────────────────────
  function agregarAlPedido(item: ItemCatalogo) {
    setPedido((prev) => {
      const existente = prev.find((i) => i.articuloId === item.id);
      if (existente) {
        return prev.map((i) => (i.articuloId === item.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          articuloId: item.id,
          nombre: item.nombre,
          precio: parseFloat(item.precioBase),
          imagenPrincipal: item.imagenPrincipal ?? null,
          cantidad: 1,
        },
      ];
    });
  }

  function cambiarCantidad(articuloId: string, delta: number) {
    setPedido((prev) => {
      return prev
        .map((i) => (i.articuloId === articuloId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0);
    });
  }

  function quitarDelPedido(articuloId: string) {
    setPedido((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  function cantidadDe(articuloId: string): number {
    return pedido.find((i) => i.articuloId === articuloId)?.cantidad ?? 0;
  }

  // ── Envío ──────────────────────────────────────────────────────────────
  async function handleEnviarChatYA() {
    if (!negocio?.usuarioId) return;
    if (!usuario) {
      setModalAuthAbierto(true);
      return;
    }
    if (pedido.length === 0) return;

    setEnviandoChatYA(true);
    try {
      const avatarSucursal = negocio.fotoPerfil ?? negocio.logoUrl ?? null;
      await iniciarChatNegocio({
        usuarioId: negocio.usuarioId,
        sucursalId: sucursalId ?? null,
        negocioNombre: negocio.negocioNombre,
        avatarUrl: avatarSucursal,
        sucursalNombre: negocio.sucursalNombre,
      });

      const contenidoPedido = JSON.stringify({
        negocioNombre: negocio.negocioNombre,
        sucursalId: sucursalId ?? null,
        items: pedido.map((i) => ({
          articuloId: i.articuloId,
          nombre: i.nombre,
          precio: i.precio,
          cantidad: i.cantidad,
          subtotal: i.precio * i.cantidad,
        })),
        total: totalPrecioPedido,
        nota: nota.trim() || null,
      });

      await useChatYAStore.getState().enviarMensaje({ tipo: 'pedido', contenido: contenidoPedido });

      notificar.exito('Pedido enviado por ChatYA');
      setPedido([]);
      setNota('');
      setDrawerPedidoAbierto(false);
    } catch {
      notificar.error('No se pudo enviar el pedido, intenta de nuevo');
    } finally {
      setEnviandoChatYA(false);
    }
  }

  function handleEnviarWhatsApp(e: MouseEvent<HTMLElement>) {
    if (!negocio?.whatsapp || pedido.length === 0) return;
    const texto = formatearPedidoWhatsApp({
      negocioNombre: negocio.negocioNombre,
      items: pedido,
      total: totalPrecioPedido,
      nota,
    });
    abrirWhatsApp(e, negocio.whatsapp, negocio.whatsappAlterno, texto);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (cargandoNegocio || cargandoCatalogo) {
    const cargando = (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner tamanio="lg" />
      </div>
    );
    return esRutaPublica ? <LayoutPublico>{cargando}</LayoutPublico> : cargando;
  }

  const panelProps = {
    pedido,
    nota,
    setNota,
    onCambiarCantidad: cambiarCantidad,
    onQuitar: quitarDelPedido,
    onEnviarChatYA: handleEnviarChatYA,
    onEnviarWhatsApp: handleEnviarWhatsApp,
    enviandoChatYA,
    puedeWhatsApp: !!negocio?.whatsapp,
  };

  const contenido = (
    <div className="max-w-7xl mx-auto p-3 lg:p-4 2xl:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div
        className="relative rounded-xl px-4 py-3 flex items-center gap-3 mb-3"
        style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
      >
        <button
          type="button"
          onClick={() => navigate(esRutaPublica ? `/p/negocio/${sucursalId}` : `/negocios/${sucursalId}`)}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
          data-testid="btn-volver-negocio"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {negocio?.logoUrl && (
          <img src={negocio.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-white font-bold text-lg truncate">{negocio?.negocioNombre ?? 'Catálogo'}</h1>
          <p className="text-white/60 text-xs font-medium">Catálogo · {catalogo.length} artículos</p>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar productos o servicios..."
            data-testid="input-buscar-catalogo-negocio"
            className="w-full h-11 pl-10 pr-9 bg-white rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-500 border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 outline-none"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
        {tieneAmbos && (
          <>
            <button
              onClick={() => { setTipoSeleccionado(tipoSeleccionado === 'producto' ? null : 'producto'); setCategoriaSeleccionada(null); }}
              className={`h-11 px-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border-2 cursor-pointer shrink-0 ${
                tipoSeleccionado === 'producto'
                  ? 'bg-slate-800 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden lg:inline">Productos</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                tipoSeleccionado === 'producto' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                {totalProductos}
              </span>
            </button>
            <button
              onClick={() => { setTipoSeleccionado(tipoSeleccionado === 'servicio' ? null : 'servicio'); setCategoriaSeleccionada(null); }}
              className={`h-11 px-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border-2 cursor-pointer shrink-0 ${
                tipoSeleccionado === 'servicio'
                  ? 'bg-slate-800 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden lg:inline">Servicios</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                tipoSeleccionado === 'servicio' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                {totalServicios}
              </span>
            </button>
          </>
        )}
        {categorias.length > 0 && (
          <div ref={dropdownCatRef} className="relative shrink-0">
            <button
              onClick={() => setDropdownCatAbierto((v) => !v)}
              className={`h-11 flex items-center gap-1.5 px-3 rounded-lg text-sm font-semibold border-2 cursor-pointer ${
                categoriaSeleccionada ? 'bg-slate-300 border-slate-400 text-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              <span className="hidden lg:inline truncate max-w-[120px]">{categoriaSeleccionada || 'Categoría'}</span>
              <ChevronDown className={`w-4 h-4 ${dropdownCatAbierto ? 'rotate-180' : ''}`} />
            </button>
            {dropdownCatAbierto && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl border-2 border-slate-300 shadow-lg py-1 z-30 overflow-hidden">
                <button
                  onClick={() => { setCategoriaSeleccionada(null); setDropdownCatAbierto(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${!categoriaSeleccionada ? 'bg-slate-700' : 'bg-slate-300'}`}>
                    {!categoriaSeleccionada && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  Todas
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategoriaSeleccionada(cat); setDropdownCatAbierto(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${categoriaSeleccionada === cat ? 'bg-slate-700' : 'bg-slate-300'}`}>
                      {categoriaSeleccionada === cat && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid + panel */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-5 lg:items-start">
        {itemsFiltrados.length > 0 ? (
          <div className="grid grid-cols-2 2xl:grid-cols-3 gap-3">
            {itemsFiltrados.map((item) => (
              <CardCatalogoPedido
                key={item.id}
                item={item}
                cantidadEnPedido={cantidadDe(item.id)}
                onAgregar={() => agregarAlPedido(item)}
                onCambiarCantidad={(delta) => cambiarCantidad(item.id, delta)}
                onVerDetalle={() => setItemSeleccionado(item)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-medium">No se encontraron resultados</p>
          </div>
        )}

        {/* Sidebar de pedido — solo desktop. Tamaño fijo (no crece con el
            número de artículos): scroll interno único si el contenido
            excede el alto disponible. */}
        <div className="hidden lg:flex lg:flex-col sticky top-4 h-[530px] 2xl:h-[800px] rounded-xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
          <div className="shrink-0 flex items-center gap-2.5 px-4 pt-4 pb-3 border-b-2 border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tu pedido</h3>
            {totalItemsPedido > 0 && (
              <span className="ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                {totalItemsPedido}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col px-4">
            <PanelPedidoContenido {...panelProps} />
          </div>
        </div>
      </div>

      {/* FAB del pedido — solo móvil, centrado horizontal. Baja/sube según el
          BottomNav se oculte/muestre al hacer scroll (mismo patrón que el FAB
          Mapa/Lista de PaginaNegocios.tsx), para no quedar tapado debajo. */}
      {pedido.length > 0 && (
        <button
          type="button"
          onClick={() => setDrawerPedidoAbierto(true)}
          data-testid="btn-ver-pedido-movil"
          style={{
            bottom: bottomNavVisible ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="lg:hidden fixed left-1/2 -translate-x-1/2 z-30 h-12 px-5 rounded-full bg-black text-white shadow-lg flex items-center gap-2.5 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="font-bold text-sm">
            {totalItemsPedido} artículo{totalItemsPedido === 1 ? '' : 's'}
          </span>
          <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {totalItemsPedido}
          </span>
        </button>
      )}

      <ModalBottom
        abierto={drawerPedidoAbierto}
        onCerrar={() => setDrawerPedidoAbierto(false)}
        mostrarHeader={false}
        headerOscuro
        alturaMaxima="xl"
        sinScrollInterno
      >
        {/* Header propio — mismo estilo que los modales de Business Studio
            (ej. ModalArticulo.tsx): bloque oscuro con círculos decorativos,
            ícono en círculo y título + subtítulo. */}
        <div
          className="relative overflow-hidden px-4 pt-7 pb-3 shrink-0 rounded-t-3xl"
          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', boxShadow: '0 4px 16px rgba(15,23,42,0.35)' }}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <h3 className="flex-1 min-w-0 flex items-baseline gap-1.5 text-lg font-bold text-white truncate">
              Tu pedido
              <span className="text-sm text-white/70 font-semibold">
                · {totalItemsPedido} artículo{totalItemsPedido === 1 ? '' : 's'}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-4">
          <PanelPedidoContenido {...panelProps} />
        </div>
      </ModalBottom>

      <ModalAuthRequerido
        abierto={modalAuthAbierto}
        onCerrar={() => setModalAuthAbierto(false)}
        accion="chat"
        urlRetorno={location.pathname}
      />

      <ModalDetalleItem
        item={itemSeleccionado}
        onClose={() => setItemSeleccionado(null)}
        whatsapp={negocio?.whatsapp}
        whatsappAlterno={negocio?.whatsappAlterno}
        negocioUsuarioId={negocio?.usuarioId}
        sucursalId={sucursalId}
        negocioNombre={negocio?.negocioNombre}
        logoUrl={negocio?.logoUrl}
        sucursalFotoPerfil={negocio?.fotoPerfil}
        onRequiereAuth={() => setModalAuthAbierto(true)}
      />

      {menuWhatsApp}
    </div>
  );

  if (esRutaPublica) {
    return <LayoutPublico sinPaddingMovil>{contenido}</LayoutPublico>;
  }

  // Ruta privada: MainLayout trata cualquier /negocios/* como "app-shell
  // propio" en móvil (mismo prefijo que PaginaPerfilNegocio) — el shell
  // fijo (`fixed inset-0 flex flex-col`) espera que la página traiga su
  // PROPIO contenedor con scroll. Sin este wrapper, el contenido se
  // desborda del shell sin ninguna forma de hacer scroll.
  //
  // SOLO en móvil: en desktop MainLayout ya scrollea su propio `<main>`
  // (position:fixed + overflow-y-auto) — agregar OTRO `overflow-y-auto`
  // aquí encima rompe el `sticky` del sidebar de pedido, porque CSS toma
  // el ancestro con overflow más cercano como referencia del sticky, y
  // este wrapper nunca scrollea de verdad en desktop (no tiene alto
  // acotado ahí, `flex-1` no aplica sin un padre flex) — el sticky queda
  // "anclado" a un contenedor inerte en vez de seguir el scroll real.
  if (esMobile) {
    return (
      <div ref={cuerpoRef} className="flex-1 min-h-0 overflow-y-auto">
        {contenido}
      </div>
    );
  }

  return contenido;
}

export default PaginaCatalogoNegocio;
