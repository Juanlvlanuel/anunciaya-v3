/**
 * SeccionFeedDinamicas.tsx
 * ==========================
 * Feed de Dinámicas — se monta dentro de `PaginaMarketplace.tsx` cuando el
 * switch de contexto está en "Dinámicas" (montaje perezoso: la primera vez
 * que se activa, y de ahí en adelante se queda montado, alternando `hidden`
 * en vez de desmontarse — ver `PaginaMarketplace.tsx`). Calca los estados de
 * la sección Artículos (sin ciudad/loading/error/vacío + scroll infinito con
 * `IntersectionObserver`) con identidad ámbar. Dueño también del composer de
 * creación (`ComposerSectionDinamicas`), igual que `SeccionFeedArticulos` es
 * dueño de `ComposerSection`.
 *
 * Ubicación: apps/web/src/components/dinamicas/SeccionFeedDinamicas.tsx
 */

import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Loader2, Ticket } from 'lucide-react';
import { useFeedInfinitoDinamicas } from '../../hooks/queries/useDinamicas';
import { CardDinamica } from './CardDinamica';
import { ComposerSectionDinamicas } from './composer/ComposerSectionDinamicas';

interface SeccionFeedDinamicasProps {
    ciudad: string | null;
    esModoPersonal: boolean;
}

export function SeccionFeedDinamicas({ ciudad, esModoPersonal }: SeccionFeedDinamicasProps) {
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useFeedInfinitoDinamicas({ ciudad });

    const dinamicas = useMemo(() => data?.pages.flatMap((p) => p.dinamicas) ?? [], [data]);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '400px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return (
        <>
            {esModoPersonal && <ComposerSectionDinamicas />}

            {!ciudad ? (
                <div className="mx-3 mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:mx-0">
                    <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                        <div className="flex-1">
                            <strong className="font-semibold">Selecciona tu ciudad</strong>
                            <p className="mt-0.5">Necesitamos tu ciudad para mostrarte Dinámicas cerca de ti.</p>
                        </div>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400" strokeWidth={2.5} />
                </div>
            ) : isError ? (
                <div className="mx-3 mt-6 rounded-xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 lg:mx-0">
                    <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" strokeWidth={2} />
                        <p>No se pudieron cargar las Dinámicas. Intenta de nuevo en unos momentos.</p>
                    </div>
                </div>
            ) : dinamicas.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                    <div
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    >
                        <Ticket className="h-8 w-8 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="mb-1.5 text-lg font-bold text-white">Aún no hay Dinámicas en {ciudad}</h3>
                    <p className="max-w-sm text-sm text-slate-400">
                        Organiza una rifa o concurso entre vecinos — el pago y la entrega del premio se coordinan
                        siempre fuera de la app.
                    </p>
                </div>
            ) : (
                <div className="px-3 lg:px-0 pt-3 space-y-3">
                    {dinamicas.map((dinamica) => (
                        <CardDinamica key={dinamica.id} dinamica={dinamica} />
                    ))}

                    <div ref={sentinelRef} className="h-1" />

                    {isFetchingNextPage && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-amber-400" strokeWidth={2.5} />
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default SeccionFeedDinamicas;
