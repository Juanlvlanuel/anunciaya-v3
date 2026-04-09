/**
 * components/ui/SelectorIdioma.tsx
 * =================================
 * Selector para cambiar el idioma de la aplicación.
 *
 * Uso:
 *   <SelectorIdioma />
 *   <SelectorIdioma variante="toggle" />
 *   <SelectorIdioma variante="botones" />
 *   <SelectorIdioma variante="dropdown" />
 *   <SelectorIdioma size="sm" />
 *
 * Ubicación: apps/web/src/components/ui/SelectorIdioma.tsx
 */

import { useTranslation } from 'react-i18next';

type Variante = 'toggle' | 'botones' | 'dropdown';
type Size = 'sm' | 'md';

interface SelectorIdiomaProps {
    variante?: Variante;
    size?: Size;
    className?: string;
}

const IDIOMAS = {
    es: { bandera: '🇲🇽', nombre: 'Español', codigo: 'ES' },
    en: { bandera: '🇺🇸', nombre: 'English', codigo: 'EN' },
};

export function SelectorIdioma({ 
    variante = 'toggle', 
    size = 'md',
    className = '' 
}: SelectorIdiomaProps) {
    const { i18n } = useTranslation();

    const idiomaActual = i18n.language?.split('-')[0] || 'es';
    const idioma = IDIOMAS[idiomaActual as keyof typeof IDIOMAS] || IDIOMAS.es;

    const cambiarIdioma = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const toggleIdioma = () => {
        const nuevoIdioma = idiomaActual === 'es' ? 'en' : 'es';
        i18n.changeLanguage(nuevoIdioma);
    };

    // Tamaños
    const sizes = {
        sm: {
            padding: 'px-2 py-1',
            text: 'text-xs',
            flag: 'text-sm',
            gap: 'gap-1',
        },
        md: {
            padding: 'px-3 py-1.5',
            text: 'text-sm',
            flag: 'text-base',
            gap: 'gap-1.5',
        },
    };

    const s = sizes[size];

    // ========== VARIANTE: TOGGLE (Default) ==========
    if (variante === 'toggle') {
        return (
            <button
                onClick={toggleIdioma}
                className={`
                    flex items-center ${s.gap} ${s.padding}
                    bg-gray-100 hover:bg-gray-200 
                    border border-gray-300 rounded-lg 
                    font-medium ${s.text} text-gray-700 
                    transition-all duration-150
                    lg:cursor-pointer
                    ${className}
                `}
                title={idiomaActual === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
                <span className={s.flag}>{idioma.bandera}</span>
                <span className="font-semibold">{idioma.codigo}</span>
            </button>
        );
    }

    // ========== VARIANTE: BOTONES ==========
    if (variante === 'botones') {
        return (
            <div className={`flex items-center ${s.gap} ${s.text} ${className}`}>
                <button
                    onClick={() => cambiarIdioma('es')}
                    className={`
                        flex items-center gap-1 ${s.padding} rounded-lg transition-all duration-150 lg:cursor-pointer
                        ${idiomaActual === 'es'
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                    `}
                >
                    <span className={s.flag}>🇲🇽</span>
                    <span>ES</span>
                </button>
                <span className="text-gray-300">|</span>
                <button
                    onClick={() => cambiarIdioma('en')}
                    className={`
                        flex items-center gap-1 ${s.padding} rounded-lg transition-all duration-150 lg:cursor-pointer
                        ${idiomaActual === 'en'
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                    `}
                >
                    <span className={s.flag}>🇺🇸</span>
                    <span>EN</span>
                </button>
            </div>
        );
    }

    // ========== VARIANTE: DROPDOWN ==========
    if (variante === 'dropdown') {
        return (
            <select
                value={idiomaActual}
                onChange={(e) => cambiarIdioma(e.target.value)}
                className={`
                    bg-white border border-gray-300 rounded-lg 
                    ${s.padding} ${s.text} 
                    cursor-pointer hover:border-gray-400
                    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500
                    ${className}
                `}
            >
                <option value="es">🇲🇽 Español</option>
                <option value="en">🇺🇸 English</option>
            </select>
        );
    }

    return null;
}