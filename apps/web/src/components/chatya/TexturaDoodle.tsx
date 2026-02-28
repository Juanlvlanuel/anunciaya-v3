/**
 * TexturaDoodle.tsx
 * ==================
 * Patrón de fondo tipo doodle (estilo WhatsApp) con iconos temáticos
 * de AnunciaYA: tiendas, ofertas, puntos, chat, regalos, etc.
 *
 * Se renderiza como SVG absoluto con opacidad baja para no competir
 * con las burbujas de chat. Soporta modo oscuro (móvil) y claro (desktop).
 *
 * UBICACIÓN: apps/web/src/components/chatya/TexturaDoodle.tsx
 */

import { memo } from 'react';

// =============================================================================
// ICONOS SVG — paths temáticos de AnunciaYA
// Cada función recibe el tamaño (s) y retorna el path SVG
// =============================================================================

const ICONOS: Array<(s: number) => string> = [
  // Tienda
  (s) => `<path d="M${s*.2} ${s*.65}V${s*.4}L${s*.5} ${s*.2}L${s*.8} ${s*.4}V${s*.65}H${s*.2}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><line x1="${s*.5}" y1="${s*.65}" x2="${s*.5}" y2="${s*.45}" stroke="currentColor" stroke-width="1.2"/>`,
  // Estrella
  (s) => `<path d="M${s*.5} ${s*.15}L${s*.62} ${s*.38}L${s*.88} ${s*.38}L${s*.68} ${s*.55}L${s*.76} ${s*.8}L${s*.5} ${s*.65}L${s*.24} ${s*.8}L${s*.32} ${s*.55}L${s*.12} ${s*.38}L${s*.38} ${s*.38}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  // Tag/Oferta
  (s) => `<path d="M${s*.25} ${s*.2}H${s*.55}L${s*.8} ${s*.5}L${s*.55} ${s*.75}L${s*.25} ${s*.45}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="${s*.38}" cy="${s*.35}" r="${s*.05}" fill="currentColor"/>`,
  // Burbuja de chat
  (s) => `<path d="M${s*.2} ${s*.3}C${s*.2} ${s*.2} ${s*.8} ${s*.2} ${s*.8} ${s*.3}V${s*.55}C${s*.8} ${s*.65} ${s*.2} ${s*.65} ${s*.2} ${s*.55}V${s*.3}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M${s*.3} ${s*.65}L${s*.25} ${s*.8}L${s*.45} ${s*.65}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  // Corazón
  (s) => `<path d="M${s*.5} ${s*.8}L${s*.15} ${s*.45}C${s*.05} ${s*.3} ${s*.15} ${s*.15} ${s*.32} ${s*.2}C${s*.42} ${s*.23} ${s*.5} ${s*.35} ${s*.5} ${s*.35}C${s*.5} ${s*.35} ${s*.58} ${s*.23} ${s*.68} ${s*.2}C${s*.85} ${s*.15} ${s*.95} ${s*.3} ${s*.85} ${s*.45}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  // Moneda/Punto
  (s) => `<circle cx="${s*.5}" cy="${s*.5}" r="${s*.3}" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="${s*.5}" y="${s*.58}" text-anchor="middle" font-size="${s*.3}" font-weight="bold" fill="currentColor">$</text>`,
  // Carrito
  (s) => `<path d="M${s*.15} ${s*.25}H${s*.3}L${s*.4} ${s*.55}H${s*.7}L${s*.8} ${s*.25}H${s*.45}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${s*.43}" cy="${s*.68}" r="${s*.05}" fill="currentColor"/><circle cx="${s*.67}" cy="${s*.68}" r="${s*.05}" fill="currentColor"/>`,
  // Regalo
  (s) => `<rect x="${s*.2}" y="${s*.4}" width="${s*.6}" height="${s*.4}" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="${s*.5}" y1="${s*.4}" x2="${s*.5}" y2="${s*.8}" stroke="currentColor" stroke-width="1.2"/><line x1="${s*.2}" y1="${s*.55}" x2="${s*.8}" y2="${s*.55}" stroke="currentColor" stroke-width="1.2"/><path d="M${s*.5} ${s*.4}C${s*.5} ${s*.25} ${s*.35} ${s*.18} ${s*.3} ${s*.25}" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M${s*.5} ${s*.4}C${s*.5} ${s*.25} ${s*.65} ${s*.18} ${s*.7} ${s*.25}" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
  // Pin ubicación
  (s) => `<path d="M${s*.5} ${s*.8}C${s*.5} ${s*.8} ${s*.2} ${s*.5} ${s*.2} ${s*.35}C${s*.2} ${s*.15} ${s*.8} ${s*.15} ${s*.8} ${s*.35}C${s*.8} ${s*.5} ${s*.5} ${s*.8} ${s*.5} ${s*.8}Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="${s*.5}" cy="${s*.36}" r="${s*.08}" fill="currentColor"/>`,
  // Campana
  (s) => `<path d="M${s*.3} ${s*.55}V${s*.35}C${s*.3} ${s*.2} ${s*.7} ${s*.2} ${s*.7} ${s*.35}V${s*.55}L${s*.78} ${s*.65}H${s*.22}L${s*.3} ${s*.55}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="${s*.5}" y1="${s*.15}" x2="${s*.5}" y2="${s*.2}" stroke="currentColor" stroke-width="1.2"/><path d="M${s*.42} ${s*.65}C${s*.42} ${s*.75} ${s*.58} ${s*.75} ${s*.58} ${s*.65}" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
  // Megáfono
  (s) => `<path d="M${s*.25} ${s*.35}V${s*.6}H${s*.4}L${s*.75} ${s*.75}V${s*.2}L${s*.4} ${s*.35}H${s*.25}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="${s*.75}" y1="${s*.47}" x2="${s*.85}" y2="${s*.47}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
  // Porcentaje
  (s) => `<circle cx="${s*.32}" cy="${s*.32}" r="${s*.1}" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="${s*.68}" cy="${s*.68}" r="${s*.1}" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="${s*.72}" y1="${s*.28}" x2="${s*.28}" y2="${s*.72}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
  // Ticket/Cupón
  (s) => `<path d="M${s*.15} ${s*.3}H${s*.85}V${s*.45}C${s*.75} ${s*.45} ${s*.75} ${s*.55} ${s*.85} ${s*.55}V${s*.7}H${s*.15}V${s*.55}C${s*.25} ${s*.55} ${s*.25} ${s*.45} ${s*.15} ${s*.45}Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  // Pulgar arriba
  (s) => `<path d="M${s*.3} ${s*.45}V${s*.78}H${s*.2}V${s*.45}H${s*.3}Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M${s*.3} ${s*.48}H${s*.55}C${s*.65} ${s*.48} ${s*.7} ${s*.4} ${s*.65} ${s*.32}L${s*.55} ${s*.2}C${s*.52} ${s*.18} ${s*.45} ${s*.22} ${s*.45} ${s*.3}V${s*.38}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M${s*.3} ${s*.58}H${s*.68}M${s*.3} ${s*.68}H${s*.65}" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`,
];

// =============================================================================
// POSICIONES — Generador pseudo-random determinista (sin Math.random)
// =============================================================================

// ── Desktop — muy poblado, iconos legibles ──
const DESKTOP_COLS = 22;
const DESKTOP_ROWS = 36;
const DESKTOP_ICON = 14;

// ── Móvil — más grandes y más poblados ──
const MOBILE_COLS = 12;
const MOBILE_ROWS = 22;
const MOBILE_ICON = 26;

const VIEW_W = 400;
const VIEW_H = 600;

function generarPosiciones(cols: number, rows: number) {
  const posiciones: Array<{ x: number; y: number; rot: number; idx: number }> = [];
  const stepX = VIEW_W / cols;
  const stepY = VIEW_H / rows;
  let iconIdx = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : stepX * 0.5;
      const seed = (row * cols + col) * 9301 + 49297;
      const jX = ((seed % 97) / 97 - 0.5) * 8;
      const jY = (((seed * 7) % 97) / 97 - 0.5) * 8;
      const rot = (((seed * 13) % 360) - 180) * 0.15;

      posiciones.push({
        x: col * stepX + offsetX + stepX * 0.3 + jX,
        y: row * stepY + stepY * 0.3 + jY,
        rot,
        idx: iconIdx % ICONOS.length,
      });
      iconIdx++;
    }
  }
  return posiciones;
}

function generarSVG(cols: number, rows: number, iconSize: number, strokeWidth?: number) {
  let svg = generarPosiciones(cols, rows).map((p) =>
    `<g transform="translate(${p.x},${p.y}) rotate(${p.rot},${iconSize/2},${iconSize/2})">${ICONOS[p.idx](iconSize)}</g>`
  ).join('');
  // Reemplazar grosor de trazo si se especifica uno diferente
  if (strokeWidth) {
    svg = svg.replace(/stroke-width="[^"]+"/g, `stroke-width="${strokeWidth}"`);
  }
  return svg;
}

// Pre-generar ambos SVGs una sola vez
const SVG_MOBILE = generarSVG(MOBILE_COLS, MOBILE_ROWS, MOBILE_ICON);
const SVG_DESKTOP = generarSVG(DESKTOP_COLS, DESKTOP_ROWS, DESKTOP_ICON, 0.7);

// =============================================================================
// COMPONENTE
// =============================================================================

interface TexturaDoodleProps {
  /** Modo oscuro (móvil) o claro (desktop) */
  oscuro?: boolean;
}

export const TexturaDoodle = memo(function TexturaDoodle({ oscuro = true }: TexturaDoodleProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[-1]"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{
        opacity: oscuro ? 0.045 : 0.05,
        color: oscuro ? 'white' : '#0a1e50',
      }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: oscuro ? SVG_MOBILE : SVG_DESKTOP }}
    />
  );
});

export default TexturaDoodle;