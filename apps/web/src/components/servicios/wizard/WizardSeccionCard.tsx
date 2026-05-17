/**
 * WizardSeccionCard.tsx
 * ======================
 * Contenedor de sección dentro del wizard. Cada bloque del paso (categoría,
 * título, descripción, fotos, etc.) vive en su propio card blanco para
 * separarlos visualmente sobre el gradiente azul del MainLayout.
 *
 * Estilo: `bg-white rounded-2xl border-[1.5px] border-slate-300 p-4 lg:p-6`
 * con sombra suave. Patrón consistente con `SeccionCard` del detalle de
 * publicación (`PaginaServicio.tsx`).
 *
 * Ubicación: apps/web/src/components/servicios/wizard/WizardSeccionCard.tsx
 */

import type { ReactNode } from 'react';

interface WizardSeccionCardProps {
    children: ReactNode;
    className?: string;
}

export function WizardSeccionCard({
    children,
    className = '',
}: WizardSeccionCardProps) {
    return (
        <div
            className={
                'bg-white rounded-2xl border-[1.5px] border-slate-300 p-4 lg:p-6 ' +
                className
            }
            style={{
                boxShadow:
                    '0 24px 40px -24px rgba(15,23,42,0.18), 0 2px 4px rgba(15,23,42,0.04)',
            }}
        >
            {children}
        </div>
    );
}

export default WizardSeccionCard;
