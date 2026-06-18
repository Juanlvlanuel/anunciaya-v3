/**
 * iconosPanel.tsx
 * ================
 * Mapeo de los íconos del handoff (SVG inline) a la librería del codebase
 * (lucide-react). Una sola fuente para los íconos de sección del Panel.
 *
 * Ubicación: apps/admin/src/config/iconosPanel.tsx
 */

import {
  LayoutGrid,
  BarChart3,
  Store,
  Users,
  CreditCard,
  CircleDollarSign,
  Megaphone,
  MapPin,
  SlidersHorizontal,
  ShieldCheck,
  Server,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

/** Ícono por id de sección (y por los iconos usados en pendientes). */
export const ICONOS_SECCION: Record<string, LucideIcon> = {
  resumen: LayoutGrid,
  metricas: BarChart3,
  negocios: Store,
  usuarios: Users,
  suscripciones: CreditCard,
  recibos: Receipt,
  comisiones: CircleDollarSign,
  publicidad: Megaphone,
  ciudades: MapPin,
  configuracion: SlidersHorizontal,
  equipo: ShieldCheck,
  sistema: Server,
  seguridad: ShieldCheck,
};

/** Devuelve el componente de ícono para una clave; LayoutGrid como fallback. */
export function iconoDeSeccion(clave: string): LucideIcon {
  return ICONOS_SECCION[clave] ?? LayoutGrid;
}
