/**
 * ModalAdaptativo.tsx (Panel)
 * ===========================
 * Componente base de modal del Panel. Réplica del patrón de apps/web
 * (Modal + ModalBottom + useBackNativo) traducida a los tokens del Panel —
 * NO se importa nada de apps/web (apps separadas).
 *
 *   - Escritorio (lg:+, ≥1024px) → modal CENTRADO (fade + scale).
 *   - Móvil (<1024px)            → BOTTOM-SHEET (sube desde abajo, drag para cerrar).
 *
 * Cierra con: botón X, clic fuera, tecla Escape y el botón ATRÁS nativo del
 * celular (vía useBackNativo). Pensado para que TODAS las secciones del Panel lo
 * reusen.
 *
 * El consumidor lo monta condicionalmente (`{abierto && <ModalAdaptativo …/>}`)
 * o lo deja montado pasando `abierto`. Para fichas con header y footer fijos,
 * usar `mostrarHeader={false}` + `sinScrollInterno` y maquetar header/body/footer
 * dentro de `children`.
 *
 * Ubicación: apps/admin/src/components/ui/ModalAdaptativo.tsx
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useBackNativo } from '../../hooks/useBackNativo';

interface ModalAdaptativoProps {
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  titulo?: ReactNode;
  iconoTitulo?: ReactNode;
  /** Acciones (íconos) en el lado derecho del header, antes del botón de cerrar. */
  accionesHeader?: ReactNode;
  mostrarHeader?: boolean;
  mostrarBotonCerrar?: boolean;
  cerrarAlClickFuera?: boolean;
  cerrarConEscape?: boolean;
  /** Si true, el área de contenido NO scrollea sola: el children maneja su propio
   *  layout (header/body/footer fijos). Default false (scroll interno). */
  sinScrollInterno?: boolean;
  /** Ancho máximo en escritorio. */
  ancho?: 'sm' | 'md' | 'lg' | 'xl';
  /** Altura máxima del bottom-sheet en móvil. */
  alturaMaxima?: 'sm' | 'md' | 'lg' | 'xl';
  /** Discriminador para useBackNativo (anidar modales sin choques). */
  discriminador?: string;
  /** z-index del wrapper. Default 'z-50'. */
  zIndice?: string;
  /** Fuerza el modal centrado aunque sea móvil (útil para diálogos sobre la ficha,
   *  que en móvil es bottom-sheet — evita sheet-sobre-sheet). */
  centrado?: boolean;
}

const ANCHOS: Record<NonNullable<ModalAdaptativoProps['ancho']>, string> = {
  sm: 'max-w-[360px]',
  md: 'max-w-[460px]',
  lg: 'max-w-[560px]',
  xl: 'max-w-[680px]',
};

const ALTURAS: Record<NonNullable<ModalAdaptativoProps['alturaMaxima']>, string> = {
  sm: 'max-h-[65vh]',
  md: 'max-h-[75vh]',
  lg: 'max-h-[85vh]',
  xl: 'max-h-[92vh]',
};

/** Distancia mínima de arrastre para cerrar el bottom-sheet (px). */
const UMBRAL_CIERRE = 100;

/** Duración de la animación de salida del bottom-sheet (ms). Coincide con la
 *  `transition-transform duration-300` del sheet: al cerrar, desliza hacia abajo
 *  y solo después desmonta (mismo patrón que apps/web ModalBottom). */
const DURACION_SALIDA_SHEET = 300;
/** Salida del modal centrado: más corta (fade+scale), igual que apps/web Modal. */
const DURACION_SALIDA_MODAL = 200;

/** Animaciones de entrada y salida (calcadas del handoff: telón fade, modal
 *  fade+scale, sheet sube/baja). Se inyectan junto al portal. El sheet NO usa
 *  keyframe para salir: su transform inline + `transition-transform` lo desliza,
 *  así respeta la posición del arrastre en curso. */
const ANIM_KEYFRAMES = `
@keyframes aparecer-telon { from { opacity: 0; } to { opacity: 1; } }
@keyframes ocultar-telon { from { opacity: 1; } to { opacity: 0; } }
@keyframes aparecer-modal { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes ocultar-modal { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(8px) scale(0.98); } }
@keyframes subir-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
`;

export function ModalAdaptativo({
  abierto,
  onCerrar,
  children,
  titulo,
  iconoTitulo,
  accionesHeader,
  mostrarHeader = true,
  mostrarBotonCerrar = true,
  cerrarAlClickFuera = true,
  cerrarConEscape = true,
  sinScrollInterno = false,
  ancho = 'md',
  alturaMaxima = 'lg',
  discriminador = '_modal_panel',
  zIndice = 'z-50',
  centrado = false,
}: ModalAdaptativoProps) {
  const esEscritorio = useEsEscritorio();

  // --- Cierre con animación de salida (paridad con apps/web) ---
  // `cerrando` mantiene el modal montado mientras corre la animación: el sheet
  // baja (translateY 100%) y el telón se desvanece antes de llamar `onCerrar`.
  const [cerrando, setCerrando] = useState(false);
  const cerrandoRef = useRef(false);
  const duracionSalida = esEscritorio || centrado ? DURACION_SALIDA_MODAL : DURACION_SALIDA_SHEET;
  const solicitarCierre = useCallback(() => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    setCerrando(true);
    window.setTimeout(() => {
      cerrandoRef.current = false;
      setCerrando(false);
      onCerrar();
    }, duracionSalida);
  }, [onCerrar, duracionSalida]);

  // Botón atrás nativo (Android / swipe iOS / flecha del navegador). Pasa por la
  // salida animada; `abierto && !cerrando` evita que el back se reprocese durante
  // la animación.
  useBackNativo({ abierto: abierto && !cerrando, onCerrar: solicitarCierre, discriminador });

  // --- Arrastre para cerrar (solo bottom-sheet móvil) ---
  const [arrastreY, setArrastreY] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicioYRef = useRef(0);
  const arrastreRef = useRef(0); // posición actual sin depender del closure
  // La animación de entrada solo debe correr una vez (no al soltar el arrastre).
  const animadoRef = useRef(false);
  useEffect(() => {
    animadoRef.current = true;
  }, []);

  const iniciarArrastre = (clientY: number) => {
    setArrastrando(true);
    inicioYRef.current = clientY;
  };

  // Escape + listeners de arrastre.
  useEffect(() => {
    if (!abierto) return;

    const onTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cerrarConEscape) solicitarCierre();
    };
    window.addEventListener('keydown', onTecla);

    const onMover = (clientY: number) => {
      if (!arrastrando) return;
      const delta = clientY - inicioYRef.current;
      if (delta > 0) {
        arrastreRef.current = delta;
        setArrastreY(delta);
      }
    };
    const onSoltar = () => {
      if (!arrastrando) return;
      setArrastrando(false);
      const y = arrastreRef.current;
      // Si superó el umbral, NO reseteamos `arrastreY`: el render de cierre usa
      // translateY(100%) y la transición lo desliza desde la posición actual.
      if (y > UMBRAL_CIERRE) {
        solicitarCierre();
      } else {
        arrastreRef.current = 0;
        setArrastreY(0);
      }
    };
    const onMouseMove = (e: MouseEvent) => onMover(e.clientY);
    const onTouchMove = (e: TouchEvent) => onMover(e.touches[0].clientY);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onSoltar);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onSoltar);

    return () => {
      window.removeEventListener('keydown', onTecla);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onSoltar);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onSoltar);
    };
  }, [abierto, arrastrando, cerrarConEscape, solicitarCierre]);

  const onClickTelon = useCallback(() => {
    if (cerrarAlClickFuera) solicitarCierre();
  }, [cerrarAlClickFuera, solicitarCierre]);

  if (!abierto) return null;

  const Header = mostrarHeader && (titulo || mostrarBotonCerrar) ? (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-borde px-5 py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {iconoTitulo}
        {titulo && <h2 className="truncate text-[16px] font-bold text-texto">{titulo}</h2>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {accionesHeader}
        {mostrarBotonCerrar && (
          <button
            type="button"
            data-testid="modal-cerrar"
            onClick={solicitarCierre}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  ) : null;

  const claseContenido = sinScrollInterno
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
    : 'min-h-0 flex-1 overflow-y-auto';

  // ── Escritorio (o forzado centrado): modal centrado ─────────────────────────
  if (esEscritorio || centrado) {
    return createPortal(
      <div className={`fixed inset-0 ${zIndice} flex items-center justify-center p-4 lg:p-6`} role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClickTelon}
          className="absolute inset-0 bg-black/45"
          style={{ animation: cerrando ? 'ocultar-telon 0.2s ease forwards' : 'aparecer-telon 0.18s ease' }}
        />
        <div
          className={`relative flex max-h-[90vh] w-full ${ANCHOS[ancho]} flex-col overflow-hidden rounded-[16px] border border-borde bg-superficie shadow-tarjeta-panel`}
          style={{
            animation: cerrando
              ? 'ocultar-modal 0.2s cubic-bezier(0.4,0,1,1) forwards'
              : 'aparecer-modal 0.2s cubic-bezier(0.2,0.7,0.3,1)',
          }}
        >
          {Header}
          <div className={claseContenido}>{children}</div>
        </div>
        <style>{ANIM_KEYFRAMES}</style>
      </div>,
      document.body,
    );
  }

  // ── Móvil: bottom-sheet con arrastre ────────────────────────────────────────
  const animarEntrada = !animadoRef.current && arrastreY === 0 && !arrastrando && !cerrando;
  return createPortal(
    <div className={`fixed inset-0 ${zIndice} flex items-end justify-center`} role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClickTelon}
        className="absolute inset-0 bg-black/45"
        style={{ animation: cerrando ? 'ocultar-telon 0.3s ease forwards' : 'aparecer-telon 0.18s ease' }}
      />
      <div
        className={`relative flex w-full ${ALTURAS[alturaMaxima]} flex-col overflow-hidden rounded-t-[22px] border border-borde bg-superficie shadow-tarjeta-panel ${
          arrastrando ? '' : 'transition-transform duration-300'
        }`}
        style={{
          // Al cerrar, baja a 100% (la transición lo desliza); si no, sigue el arrastre.
          transform: cerrando ? 'translateY(100%)' : `translateY(${arrastreY}px)`,
          animation: animarEntrada ? 'subir-sheet 0.32s cubic-bezier(0.25,0.8,0.3,1)' : undefined,
        }}
      >
        {/* Grip de arrastre */}
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing"
          onMouseDown={(e) => iniciarArrastre(e.clientY)}
          onTouchStart={(e) => iniciarArrastre(e.touches[0].clientY)}
        >
          <span className="h-1 w-10 rounded-full bg-borde-fuerte" />
        </div>
        {Header}
        <div className={claseContenido}>{children}</div>
      </div>
      <style>{ANIM_KEYFRAMES}</style>
    </div>,
    document.body,
  );
}

export default ModalAdaptativo;
