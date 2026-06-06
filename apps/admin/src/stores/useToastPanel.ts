/**
 * useToastPanel.ts
 * =================
 * Sistema de avisos (toast) base del Panel Admin — genérico y reutilizable por
 * cualquier sección (Negocios, Usuarios, Suscripciones, …). Mismo ESTILO que el
 * `notificar.*` de apps/web (pill glass arriba, con barra de progreso), pero
 * propio del Panel y con sus tokens (no se importa nada de apps/web).
 *
 * El store solo guarda la lista; la cuenta regresiva, la barra de progreso y la
 * pausa al pasar el mouse las maneja cada toast en <Toaster />.
 *
 * Uso imperativo (fuera o dentro de React):
 *   import { toast } from '../stores/useToastPanel';
 *   toast.exito('Negocio suspendido');
 *   toast.error('No se pudo suspender');
 *
 * Ubicación: apps/admin/src/stores/useToastPanel.ts
 */

import { create } from 'zustand';

export type TipoToast = 'exito' | 'error' | 'advertencia' | 'info';

export interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensaje: string;
  titulo?: string;
}

interface EstadoToast {
  toasts: ToastItem[];
  mostrar: (tipo: TipoToast, mensaje: string, titulo?: string) => void;
  descartar: (id: number) => void;
}

let contador = 0;

export const useToastPanel = create<EstadoToast>((set) => ({
  toasts: [],
  mostrar: (tipo, mensaje, titulo) => {
    contador += 1;
    set((s) => ({ toasts: [...s.toasts, { id: contador, tipo, mensaje, titulo }] }));
  },
  descartar: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** API imperativa, como `notificar.*` de apps/web. */
export const toast = {
  exito: (mensaje: string, titulo?: string) => useToastPanel.getState().mostrar('exito', mensaje, titulo),
  error: (mensaje: string, titulo?: string) => useToastPanel.getState().mostrar('error', mensaje, titulo),
  advertencia: (mensaje: string, titulo?: string) => useToastPanel.getState().mostrar('advertencia', mensaje, titulo),
  info: (mensaje: string, titulo?: string) => useToastPanel.getState().mostrar('info', mensaje, titulo),
};
