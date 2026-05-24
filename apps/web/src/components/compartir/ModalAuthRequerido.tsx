/**
 * ============================================================================
 * MODAL: ModalAuthRequerido
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/compartir/ModalAuthRequerido.tsx
 *
 * PROPÓSITO:
 * Modal que se muestra cuando un usuario sin login intenta realizar acciones
 * que requieren autenticación (like, save, chat, etc.). Centraliza el gancho
 * de conversión "registrate/inicia sesión" en todas las páginas públicas.
 *
 * VARIANTES:
 *  - `accion`: 'like' | 'save' | 'chat' | 'general' — patrón histórico.
 *  - `contexto.tipo`: 'vacante' | 'solicitud' | 'servicio' | 'oferta' |
 *    'articulo' — cuando se pasa, el modal usa copy específico del tipo de
 *    publicación (sobreescribe a `accion`). El `contexto.titulo` opcional
 *    se incrusta en la descripción ("Postúlate a {titulo}").
 *
 * CREADO: Enero 2026 - Sistema de Auth Opcional
 * ACTUALIZADO: Mayo 2026 — rediseño visual + copy dinámico por tipo de
 * publicación (vacante / solicitud / servicio / oferta / artículo).
 */

import { useNavigate } from 'react-router-dom';
import {
    Lock,
    LogIn,
    UserPlus,
    Briefcase,
    Wrench,
    Search,
    Tag,
    ShoppingBag,
    Check,
    Sparkles,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { Modal } from '../ui/Modal';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const ThumbsUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.like} {...p} />;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;

// =============================================================================
// TIPOS
// =============================================================================

export type TipoPublicacionAuth =
    | 'vacante'
    | 'solicitud'
    | 'servicio'
    | 'oferta'
    | 'articulo';

interface ContextoAuth {
    /** Tipo de publicación que motivó el modal. Determina copy + color del
     *  hero. */
    tipo: TipoPublicacionAuth;
    /** Título de la publicación (opcional). Si se pasa, aparece en la
     *  descripción ("...sobre 'X'"). */
    titulo?: string;
}

interface ModalAuthRequeridoProps {
    /** Controla si el modal está abierto */
    abierto: boolean;

    /** Función para cerrar el modal */
    onCerrar: () => void;

    /** Tipo de acción que requiere auth — usado solo cuando NO se pasa
     *  `contexto`. Cuando hay contexto, el copy se deriva del tipo de
     *  publicación. */
    accion?: 'like' | 'save' | 'chat' | 'general';

    /** Contexto específico de publicación. Si se pasa, sobreescribe el
     *  copy de `accion` por uno orientado al tipo (Postúlate, Ofrece tu
     *  servicio, Contrata, etc.). */
    contexto?: ContextoAuth;

    /** URL a la que redirigir después del login (opcional) */
    urlRetorno?: string;
}

// =============================================================================
// CONFIGURACIÓN POR ACCIÓN (variante histórica)
// =============================================================================

const CONFIG_ACCION = {
    like: {
        Icono: ThumbsUp,
        titulo: '¿Te gusta este negocio?',
        descripcion: 'Inicia sesión para dar tu me gusta.',
        gradient: 'from-blue-500 to-blue-700',
        accent: 'blue',
    },
    save: {
        Icono: Bookmark,
        titulo: 'Guarda tus favoritos',
        descripcion: 'Inicia sesión para guardar y acceder cuando quieras.',
        gradient: 'from-amber-500 to-amber-600',
        accent: 'amber',
    },
    chat: {
        Icono: MessageCircle,
        titulo: '¡Chatea con el negocio!',
        descripcion: 'Inicia sesión para enviar mensajes directos.',
        gradient: 'from-blue-500 to-blue-700',
        accent: 'blue',
    },
    general: {
        Icono: Lock,
        titulo: 'Inicia sesión',
        descripcion: 'Esta acción requiere iniciar sesión.',
        gradient: 'from-slate-500 to-slate-700',
        accent: 'slate',
    },
} as const;

// =============================================================================
// CONFIGURACIÓN POR TIPO DE PUBLICACIÓN (variante moderna)
// =============================================================================

const CONFIG_TIPO: Record<
    TipoPublicacionAuth,
    {
        Icono: React.ComponentType<{ className?: string; strokeWidth?: number }>;
        titulo: string;
        descripcionBase: (titulo?: string) => string;
        gradient: string;
        accent: 'sky' | 'amber' | 'emerald' | 'rose' | 'teal';
    }
> = {
    vacante: {
        Icono: Briefcase,
        titulo: '¡Postúlate a esta vacante!',
        descripcionBase: (titulo) =>
            titulo
                ? `Inicia sesión para enviar tu mensaje al negocio sobre "${titulo}".`
                : 'Inicia sesión para enviar tu mensaje al negocio.',
        gradient: 'from-sky-500 to-sky-700',
        accent: 'sky',
    },
    solicitud: {
        Icono: Search,
        titulo: '¡Ofrece tu servicio!',
        descripcionBase: (titulo) =>
            titulo
                ? `Inicia sesión para responder a "${titulo}".`
                : 'Inicia sesión para responder a esta solicitud.',
        gradient: 'from-amber-500 to-amber-600',
        accent: 'amber',
    },
    servicio: {
        Icono: Wrench,
        titulo: '¡Contrata este servicio!',
        descripcionBase: (titulo) =>
            titulo
                ? `Inicia sesión para contactar al oferente de "${titulo}".`
                : 'Inicia sesión para contactar al oferente.',
        gradient: 'from-sky-500 to-sky-700',
        accent: 'sky',
    },
    oferta: {
        Icono: Tag,
        titulo: '¡Aprovecha esta oferta!',
        descripcionBase: (titulo) =>
            titulo
                ? `Inicia sesión para guardar "${titulo}" y canjearla cuando quieras.`
                : 'Inicia sesión para guardar y canjear ofertas.',
        gradient: 'from-rose-500 to-rose-700',
        accent: 'rose',
    },
    articulo: {
        Icono: ShoppingBag,
        titulo: '¡Habla con el vendedor!',
        descripcionBase: (titulo) =>
            titulo
                ? `Inicia sesión para contactar al vendedor de "${titulo}".`
                : 'Inicia sesión para contactar al vendedor.',
        gradient: 'from-teal-500 to-teal-700',
        accent: 'teal',
    },
};

// Mapping de accent → clases Tailwind (texto + borde + hover bg).
// Centralizado aquí para que el botón secundario y la barra inferior
// hagan match con el accent del hero del modal.
const ACCENT_CLASSES: Record<
    'blue' | 'amber' | 'slate' | 'sky' | 'emerald' | 'rose' | 'teal',
    { text: string; border: string; hoverBg: string; bar: string }
> = {
    blue: {
        text: 'text-blue-600',
        border: 'border-blue-500',
        hoverBg: 'hover:bg-blue-50',
        bar: 'bg-blue-500',
    },
    amber: {
        text: 'text-amber-600',
        border: 'border-amber-500',
        hoverBg: 'hover:bg-amber-50',
        bar: 'bg-amber-500',
    },
    slate: {
        text: 'text-slate-700',
        border: 'border-slate-400',
        hoverBg: 'hover:bg-slate-100',
        bar: 'bg-slate-500',
    },
    sky: {
        text: 'text-sky-600',
        border: 'border-sky-500',
        hoverBg: 'hover:bg-sky-50',
        bar: 'bg-sky-500',
    },
    emerald: {
        text: 'text-emerald-600',
        border: 'border-emerald-500',
        hoverBg: 'hover:bg-emerald-50',
        bar: 'bg-emerald-500',
    },
    rose: {
        text: 'text-rose-600',
        border: 'border-rose-500',
        hoverBg: 'hover:bg-rose-50',
        bar: 'bg-rose-500',
    },
    teal: {
        text: 'text-teal-600',
        border: 'border-teal-500',
        hoverBg: 'hover:bg-teal-50',
        bar: 'bg-teal-500',
    },
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalAuthRequerido({
    abierto,
    onCerrar,
    accion = 'general',
    contexto,
    urlRetorno,
}: ModalAuthRequeridoProps) {
    const navigate = useNavigate();

    // El `contexto` (tipo de publicación) tiene prioridad sobre `accion`:
    // si la página pública lo pasa, mostramos copy específico de Postúlate /
    // Ofrece / Contrata / Aprovecha / Compra. Si no, caemos al copy genérico
    // de la acción (like / save / chat / general) — compat hacia atrás.
    const { Icono, titulo, descripcion, gradient, accent } = contexto
        ? {
              Icono: CONFIG_TIPO[contexto.tipo].Icono,
              titulo: CONFIG_TIPO[contexto.tipo].titulo,
              descripcion: CONFIG_TIPO[contexto.tipo].descripcionBase(contexto.titulo),
              gradient: CONFIG_TIPO[contexto.tipo].gradient,
              accent: CONFIG_TIPO[contexto.tipo].accent,
          }
        : {
              Icono: CONFIG_ACCION[accion].Icono,
              titulo: CONFIG_ACCION[accion].titulo,
              descripcion: CONFIG_ACCION[accion].descripcion,
              gradient: CONFIG_ACCION[accion].gradient,
              accent: CONFIG_ACCION[accion].accent as 'blue' | 'amber' | 'slate',
          };

    const accentCls = ACCENT_CLASSES[accent];

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    const handleLogin = () => {
        if (urlRetorno) {
            sessionStorage.setItem('ay_ruta_pendiente', urlRetorno);
        }
        navigate('/login');
    };

    const handleRegistro = () => {
        if (urlRetorno) {
            sessionStorage.setItem('ay_ruta_pendiente', urlRetorno);
        }
        navigate('/registro');
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
        >
            {/* ─── Hero: barra de acento + icono grande con gradient ──── */}
            <div className="relative">
                {/* Barra superior del color del accent — refuerza identidad
                    del tipo de publicación (sky, amber, rose, teal). */}
                <div className={`h-1 w-full ${accentCls.bar}`} />

                <div className="px-6 pt-6 pb-2">
                    {/* Icono hero — círculo 64px con gradient del tipo +
                        sombra suave + Sparkles decorativo arriba-derecha
                        para reforzar "es algo bueno, regístrate". */}
                    <div className="relative mx-auto mb-4 w-16">
                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${gradient}`}
                        >
                            <Icono className="h-8 w-8 text-white" strokeWidth={2.5} />
                        </div>
                        <Sparkles
                            className={`absolute -right-1 -top-1 h-4 w-4 ${accentCls.text}`}
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    </div>

                    {/* Título + descripción centrados. Tono uniforme con el
                        resto del sistema (slate-900 + slate-600). */}
                    <h3 className="text-center text-xl font-extrabold leading-tight text-slate-900">
                        {titulo}
                    </h3>
                    <p className="mx-auto mt-2 max-w-xs text-center text-sm font-medium leading-relaxed text-slate-600">
                        {descripcion}
                    </p>
                </div>

                {/* ─── Beneficios de registrarse ──────────────────────── */}
                {/* Lista corta de 3 ventajas — refuerza el "vale la pena".
                    Tono neutral (no exclusivo del tipo) para mantener la
                    promesa universal de la plataforma. */}
                <div className="mx-6 my-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <ul className="space-y-1.5">
                        {[
                            'Es gratis y toma menos de 1 minuto',
                            'Habla con negocios y personas de tu ciudad',
                            'Guarda tus favoritos y recibe ofertas',
                        ].map((texto) => (
                            <li
                                key={texto}
                                className="flex items-start gap-2 text-xs font-medium leading-snug text-slate-700"
                            >
                                <Check
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                                    strokeWidth={3}
                                />
                                <span>{texto}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ─── CTAs ───────────────────────────────────────────── */}
                <div className="space-y-2 px-6">
                    {/* Iniciar Sesión — botón sólido con gradient del accent */}
                    <button
                        onClick={handleLogin}
                        data-testid="modal-auth-iniciar-sesion"
                        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br px-4 py-3 text-base font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:opacity-80 ${gradient}`}
                    >
                        <LogIn className="h-5 w-5" strokeWidth={2.5} />
                        Iniciar Sesión
                    </button>

                    {/* Crear Cuenta — outline del accent */}
                    <button
                        onClick={handleRegistro}
                        data-testid="modal-auth-crear-cuenta"
                        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 bg-white px-4 py-3 text-base font-bold transition-colors ${accentCls.border} ${accentCls.text} ${accentCls.hoverBg}`}
                    >
                        <UserPlus className="h-5 w-5" strokeWidth={2.5} />
                        Crear Cuenta Gratis
                    </button>
                </div>

                {/* ─── Footer: continuar explorando ───────────────────── */}
                <button
                    onClick={onCerrar}
                    data-testid="modal-auth-continuar"
                    className="mt-3 w-full cursor-pointer pb-5 pt-2 text-center text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                >
                    Continuar explorando →
                </button>
            </div>
        </Modal>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default ModalAuthRequerido;
