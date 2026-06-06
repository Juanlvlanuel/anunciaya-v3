/**
 * Toaster.tsx
 * ============
 * Render de los avisos (toast) del Panel. Se monta UNA vez en App. Calca el estilo
 * del toast de apps/web (pill glass ARRIBA y centrado, círculo sólido del color
 * semántico + ícono blanco, botón cerrar circular y barra de progreso inferior que
 * se pausa al pasar el mouse), traducido a los tokens del Panel (claro/oscuro).
 *
 * Ubicación: apps/admin/src/components/ui/Toaster.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, TriangleAlert, Info, type LucideIcon } from 'lucide-react';
import { useToastPanel, type TipoToast, type ToastItem } from '../../stores/useToastPanel';

const DURACION = 3000;

const CONFIG: Record<TipoToast, { color: string; icono: LucideIcon }> = {
  exito: { color: '#2D9C5F', icono: Check },
  error: { color: '#dc2626', icono: X },
  advertencia: { color: '#d97706', icono: TriangleAlert },
  info: { color: '#2563eb', icono: Info },
};

function Toast({ item, onCerrar }: { item: ToastItem; onCerrar: (id: number) => void }) {
  const [estado, setEstado] = useState<'entrando' | 'visible' | 'saliendo'>('entrando');
  const [progreso, setProgreso] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicioRef = useRef(0);
  const restanteRef = useRef(DURACION);
  const { color, icono: Icono } = CONFIG[item.tipo];

  const cerrar = useCallback(() => {
    setEstado('saliendo');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => onCerrar(item.id), 200);
  }, [item.id, onCerrar]);

  const iniciarTimer = useCallback(() => {
    inicioRef.current = performance.now();
    timerRef.current = setInterval(() => {
      const transcurrido = performance.now() - inicioRef.current;
      const pct = Math.max(0, ((restanteRef.current - transcurrido) / DURACION) * 100);
      setProgreso(pct);
      if (pct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        cerrar();
      }
    }, 30);
  }, [cerrar]);

  const pausar = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      restanteRef.current -= performance.now() - inicioRef.current;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setEstado('visible'), 20);
    iniciarTimer();
    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [iniciarTimer]);

  const visible = estado === 'visible';

  return (
    <div
      onMouseEnter={pausar}
      onMouseLeave={iniciarTimer}
      className="mb-2"
      style={{
        transform: `translateY(${visible ? '0' : '-14px'}) scale(${visible ? 1 : 0.97})`,
        opacity: visible ? 1 : 0,
        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-full border border-borde shadow-pop-panel backdrop-blur-xl"
        style={{
          width: 'min(440px, calc(100vw - 32px))',
          background: 'color-mix(in srgb, var(--panel-surface) 88%, transparent)',
        }}
      >
        <div className="flex items-center gap-3 px-5 py-3">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"
            style={{ background: color }}
            aria-hidden="true"
          >
            <Icono size={15} strokeWidth={2.6} />
          </span>

          <div className="min-w-0 flex-1">
            {item.titulo && <p className="text-[14px] font-bold leading-tight text-texto">{item.titulo}</p>}
            <p
              className={`line-clamp-2 text-[14px] leading-snug ${
                item.titulo ? 'mt-0.5 font-medium text-texto-2' : 'font-semibold text-texto'
              }`}
            >
              {item.mensaje}
            </p>
          </div>

          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar aviso"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-superficie-2 text-texto-3 transition hover:text-texto"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: `${color}1a` }} aria-hidden="true">
          <div
            className="h-full"
            style={{ width: `${progreso}%`, background: color, opacity: 0.55, transition: 'width 0.05s linear' }}
          />
        </div>
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastPanel((s) => s.toasts);
  const descartar = useToastPanel((s) => s.descartar);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-3 z-[9999] flex -translate-x-1/2 flex-col items-center lg:top-4">
      <div className="pointer-events-auto flex flex-col items-center">
        {toasts.map((t) => (
          <div key={t.id} data-testid={`toast-${t.tipo}`}>
            <Toast item={t} onCerrar={descartar} />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

export default Toaster;
