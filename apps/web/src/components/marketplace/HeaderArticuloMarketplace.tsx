/**
 * HeaderArticuloMarketplace.tsx
 * ===============================
 * Header de un artículo de MarketPlace: avatar del vendedor (click →
 * expande en grande), nombre (click → perfil del vendedor) y tiempo
 * relativo. Mismo patrón visual que el header de `CardArticuloFeed.tsx`,
 * extraído aparte para poder fijarlo en el header del modal de comentarios
 * en escritorio (`ModalComentariosMarketplace.tsx`).
 *
 * Ubicación: apps/web/src/components/marketplace/HeaderArticuloMarketplace.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ModalImagenes } from '../ui/ModalImagenes';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { ArticuloMarketplaceDetalle } from '../../types/marketplace';

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

interface HeaderArticuloMarketplaceProps {
    articulo: ArticuloMarketplaceDetalle;
}

export function HeaderArticuloMarketplace({ articulo }: HeaderArticuloMarketplaceProps) {
    const navigate = useNavigate();
    const [avatarAbierto, setAvatarAbierto] = useState(false);

    const nombreVendedor = `${articulo.vendedor.nombre} ${articulo.vendedor.apellidos}`.trim();
    const iniciales = obtenerIniciales(articulo.vendedor.nombre, articulo.vendedor.apellidos);
    const tiempo = formatearTiempoRelativo(articulo.createdAt);

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                data-testid="avatar-vendedor-articulo"
                onClick={() => articulo.vendedor.avatarUrl && setAvatarAbierto(true)}
                aria-label="Ver avatar en grande"
                className={`shrink-0 ${articulo.vendedor.avatarUrl ? 'lg:cursor-pointer' : ''}`}
            >
                {articulo.vendedor.avatarUrl ? (
                    <img
                        src={articulo.vendedor.avatarUrl}
                        alt={nombreVendedor}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200"
                    />
                ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-base font-bold text-white ring-2 ring-slate-200">
                        {iniciales}
                    </div>
                )}
            </button>
            <button
                type="button"
                data-testid="header-vendedor-articulo"
                onClick={() => navigate(`/marketplace/usuario/${articulo.vendedor.id}`)}
                className="min-w-0 flex-1 text-left lg:cursor-pointer"
            >
                <div className="flex items-center gap-1.5 leading-tight">
                    <span className="truncate text-[17px] font-extrabold text-slate-900 lg:hover:underline">
                        {nombreVendedor}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-teal-600 animate-bounceX" strokeWidth={2.5} />
                </div>
                <div className="mt-1 text-sm text-slate-600 font-semibold">
                    {tiempo}
                </div>
            </button>

            {avatarAbierto && articulo.vendedor.avatarUrl && (
                <ModalImagenes
                    images={[articulo.vendedor.avatarUrl]}
                    initialIndex={0}
                    isOpen={avatarAbierto}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}
        </div>
    );
}

export default HeaderArticuloMarketplace;
