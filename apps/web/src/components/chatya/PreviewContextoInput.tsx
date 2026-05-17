/**
 * PreviewContextoInput.tsx
 * =========================
 * Mini-card "tipo attachment" que aparece arriba del `InputMensaje` cuando
 * el usuario inició un chat desde un recurso (oferta de negocio, artículo
 * de catálogo, artículo de MarketPlace) y aún NO ha enviado el primer
 * mensaje. Análogo al preview de imagen adjunta de WhatsApp/Telegram.
 *
 * Comportamiento:
 *  - Solo de UI: el contexto NO se persiste en BD hasta que el usuario
 *    envíe el mensaje. Si descarta el preview con la X o cambia de
 *    conversación, no queda nada en BD.
 *  - Al enviar el mensaje, el flujo de envío llama al backend con los
 *    `datosCreacion` del contexto y persiste la card sistema en BD junto
 *    con el mensaje del usuario, en ese orden (card primero).
 *
 * Render:
 *  - Foto izquierda 56×56 redondeada.
 *  - Eyebrow con el tipo (OFERTA · MARKETPLACE / PRODUCTO / SERVICIO /
 *    MARKETPLACE) en color del módulo.
 *  - Título del recurso truncado a 2 líneas.
 *  - Extra: badge para oferta, precio para artículos.
 *  - Botón X redondo a la derecha para descartar.
 *
 * Ubicación: apps/web/src/components/chatya/PreviewContextoInput.tsx
 */

import { X, ImageOff } from 'lucide-react';
import type { ContextoPendiente } from '../../stores/useChatYAStore';

interface PreviewContextoInputProps {
  contexto: ContextoPendiente;
  onDescartar: () => void;
}

const ETIQUETA_CONDICION_MP: Record<string, string> = {
  nuevo: 'Nuevo',
  seminuevo: 'Seminuevo',
  usado: 'Usado',
  para_reparar: 'Para reparar',
};

function formatearPrecio(valor: string | number): string {
  const num = typeof valor === 'string' ? Number(valor) : valor;
  if (!isFinite(num)) return String(valor);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function PreviewContextoInput({
  contexto,
  onDescartar,
}: PreviewContextoInputProps) {
  const { cardData } = contexto;

  // Color por módulo (eyebrow + acento del borde activo)
  const eyebrowColor =
    cardData.subtipo === 'oferta'
      ? 'text-amber-700'
      : cardData.subtipo === 'articulo_marketplace'
        ? 'text-teal-700'
        : cardData.subtipo === 'servicio_publicacion'
          ? 'text-sky-700'
          : 'text-blue-700';

  const eyebrowTexto =
    cardData.subtipo === 'oferta'
      ? 'Oferta'
      : cardData.subtipo === 'articulo_marketplace'
        ? 'MarketPlace'
        : cardData.subtipo === 'servicio_publicacion'
          ? 'Servicios'
          : cardData.tipoArticulo === 'servicio'
            ? 'Servicio'
            : 'Producto';

  return (
    <div
      data-testid="preview-contexto-input"
      className="flex items-stretch gap-2 border-t-2 border-slate-200 bg-white px-3 py-2"
    >
      {/* Foto cuadrada izquierda */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200">
        {cardData.imagen ? (
          <img
            src={cardData.imagen}
            alt={cardData.titulo}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-slate-500" strokeWidth={1.5} />
        )}
      </div>

      {/* Contenido — eyebrow + título + extra */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className={`truncate text-[11px] font-bold uppercase tracking-wide ${eyebrowColor}`}>
          {eyebrowTexto}
        </p>
        <p className="line-clamp-1 text-sm font-bold leading-tight text-slate-900">
          {cardData.titulo}
        </p>
        {cardData.subtipo === 'oferta' && cardData.badgeTexto && (
          <span className="mt-0.5 inline-flex w-fit items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-800">
            {cardData.badgeTexto}
          </span>
        )}
        {cardData.subtipo === 'articulo_negocio' && cardData.precio !== undefined && (
          <p className="mt-0.5 text-sm font-extrabold text-slate-900">
            {formatearPrecio(cardData.precio)}
          </p>
        )}
        {cardData.subtipo === 'articulo_marketplace' && (
          <div className="mt-0.5 flex items-center gap-2">
            {cardData.precio !== undefined && (
              <span className="text-sm font-extrabold text-slate-900">
                {formatearPrecio(cardData.precio)}
              </span>
            )}
            {cardData.condicion && (
              <span className="text-[11px] font-semibold text-slate-600">
                {ETIQUETA_CONDICION_MP[cardData.condicion] ?? cardData.condicion}
              </span>
            )}
          </div>
        )}
        {cardData.subtipo === 'servicio_publicacion' && (
          <div className="mt-0.5 flex items-center gap-2">
            {cardData.precio !== undefined && (
              <span className="text-sm font-extrabold text-slate-900">
                {typeof cardData.precio === 'string'
                    ? cardData.precio
                    : formatearPrecio(cardData.precio)}
              </span>
            )}
            {cardData.modalidad && (
              <span className="text-[11px] font-semibold text-slate-600 capitalize">
                {cardData.modalidad}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Botón X — descartar preview sin enviar */}
      <button
        type="button"
        data-testid="preview-contexto-descartar"
        onClick={onDescartar}
        aria-label="Descartar contexto"
        className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-slate-500 lg:cursor-pointer lg:hover:bg-slate-200 lg:hover:text-slate-900"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default PreviewContextoInput;
