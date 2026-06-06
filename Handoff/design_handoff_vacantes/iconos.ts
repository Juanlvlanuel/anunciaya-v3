/**
 * iconos.ts — Placeholder del sistema de iconos centralizado del proyecto.
 *
 * En AnunciaYA real, este archivo vive en
 * `apps/web/src/config/iconos.ts` y exporta los iconKey de Iconify.
 *
 * Para el handoff, dejamos aquí los nombres EXACTOS que se deben usar.
 * El developer reemplaza este import por el real al portar.
 *
 * @example
 *   import { Icon } from '@iconify/react';
 *   import { ICONOS } from '../../config/iconos';
 *   // → <Icon icon={ICONOS.vistas} className="w-4 h-4" />
 */

export const ICONOS = {
  // Métricas
  vistas:      'lucide:eye',
  chat:        'lucide:message-circle',
  guardar:     'lucide:bookmark',

  // Vacantes específico
  vacante:     'lucide:briefcase',
  sucursal:    'lucide:map-pin',
  horario:     'lucide:clock',
  calendario:  'lucide:calendar',
  candidatos:  'lucide:users',

  // Acciones
  editar:      'lucide:pencil',
  pausar:      'lucide:pause-circle',
  reactivar:   'lucide:play-circle',
  cerrar:      'lucide:x-circle',
  eliminar:    'lucide:trash-2',
  nuevo:       'lucide:plus',
  buscar:      'lucide:search',

  // UI
  cheque:      'lucide:check',
  cerrar_x:    'lucide:x',
  alerta:      'lucide:alert-circle',
  chevron_r:   'lucide:chevron-right',
  chevron_l:   'lucide:chevron-left',
} as const;

export type IconoKey = keyof typeof ICONOS;
