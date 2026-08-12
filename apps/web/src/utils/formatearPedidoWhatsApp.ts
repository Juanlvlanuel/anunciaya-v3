/**
 * formatearPedidoWhatsApp.ts
 * ===========================
 * Arma el texto de un pedido armado en el Catálogo público de un negocio,
 * usando el formato nativo de WhatsApp (negritas `*texto*`, separadores con
 * emojis) para que se vea como un ticket aunque viaje como texto plano —
 * WhatsApp solo permite pre-cargar texto en el link `wa.me`, nunca una
 * imagen ni una tarjeta rica.
 *
 * Ubicación: apps/web/src/utils/formatearPedidoWhatsApp.ts
 */

export interface ItemPedidoWhatsApp {
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface PedidoWhatsAppInput {
  negocioNombre: string;
  items: ItemPedidoWhatsApp[];
  total: number;
  nota?: string;
}

const SEPARADOR = '━━━━━━━━━━━━━━━━━━';

/** Formatea un monto como "$123.00", sin símbolo de moneda adicional. */
function formatearMonto(monto: number): string {
  return `$${monto.toFixed(2)}`;
}

/**
 * Arma una línea "2x Tacos de asada       $96.00" — nombre truncado si es
 * muy largo para no romper la alineación visual en pantallas chicas de
 * WhatsApp (que no respeta tabs/monospace en texto normal).
 */
function lineaItem(item: ItemPedidoWhatsApp): string {
  const nombre = item.nombre.length > 28 ? `${item.nombre.slice(0, 27)}…` : item.nombre;
  const subtotal = formatearMonto(item.precio * item.cantidad);
  return `${item.cantidad}x ${nombre}  ${subtotal}`;
}

/**
 * Arma el texto completo del pedido, listo para `encodeURIComponent` en un
 * link `wa.me/...?text=`.
 */
export function formatearPedidoWhatsApp({ negocioNombre, items, total, nota }: PedidoWhatsAppInput): string {
  const lineas = [
    `🧾 *Pedido — ${negocioNombre}*`,
    SEPARADOR,
    ...items.map(lineaItem),
    SEPARADOR,
    `*Total: ${formatearMonto(total)}*`,
  ];

  if (nota?.trim()) {
    lineas.push('', `📝 Nota: ${nota.trim()}`);
  }

  lineas.push('', '_Enviado desde AnunciaYA_');

  return lineas.join('\n');
}

export default formatearPedidoWhatsApp;
