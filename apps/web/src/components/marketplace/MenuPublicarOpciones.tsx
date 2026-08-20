/**
 * MenuPublicarOpciones.tsx
 * =========================
 * Panel del menú "Publicar 1 artículo / Subir varios" — solo MarketPlace
 * modo='vendo' (2026-08-18). Reusado en los 3 lugares donde vive el botón
 * "Publicar" de Mis Publicaciones (header Laptop, header PC, FAB móvil) y en
 * el FAB de `PaginaMarketplace.tsx` (feed). Cada call site controla su
 * propio estado abierto/cerrado + outside-click — este componente solo
 * pinta el panel.
 *
 * Ubicación: apps/web/src/components/marketplace/MenuPublicarOpciones.tsx
 */

import { Plus, Zap } from 'lucide-react';

export function MenuPublicarOpciones({
    abrirHacia,
    onPublicarUno,
    onSubirVarios,
}: {
    abrirHacia: 'abajo' | 'arriba';
    onPublicarUno: () => void;
    onSubirVarios: () => void;
}) {
    return (
        <div
            data-testid="menu-publicar-marketplace"
            className={[
                'absolute right-0 z-30 w-56 overflow-hidden rounded-xl border-2 border-slate-300 bg-white py-1 shadow-lg',
                abrirHacia === 'arriba' ? 'bottom-full mb-2' : 'top-full mt-2',
            ].join(' ')}
        >
            <button
                type="button"
                data-testid="menu-publicar-uno"
                onClick={onPublicarUno}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
                <Plus className="h-4 w-4 shrink-0 text-teal-600" strokeWidth={2.5} />
                Publicar 1 artículo
            </button>
            <button
                type="button"
                data-testid="menu-publicar-varios"
                onClick={onSubirVarios}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
                <Zap className="h-4 w-4 shrink-0 text-teal-600" strokeWidth={2.5} />
                Subir varios
            </button>
        </div>
    );
}

export default MenuPublicarOpciones;
