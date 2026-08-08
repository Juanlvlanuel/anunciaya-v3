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
 * Columna "Cuadro de Honor" fija a la izquierda (escritorio) — MISMO patrón
 * que la columna "Recién publicado" de `SeccionFeedArticulos.tsx` (y las
 * cards de `PaginaNegocios.tsx`): fija por JS con `position:fixed` +
 * `top`/`left` medidos (`headerBottom` viene del header sticky de
 * `PaginaMarketplace.tsx`, `cardsLeft` se mide con un placeholder que
 * reserva el espacio en el flujo normal). NO usa `position: sticky` — con
 * `sticky` el elemento solo se despega dentro del alto de SU contenedor
 * padre, y en escritorio esta sección vive dentro de `cuerpoRef`
 * (`lg:overflow-visible`, el scroll real ocurre en el `<main>` compartido),
 * así que `fixed` es lo único que garantiza que la columna quede clavada en
 * viewport sin importar cuánto scrollee el `<main>`.
 *
 * Ubicación: apps/web/src/components/dinamicas/SeccionFeedDinamicas.tsx
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Ticket } from 'lucide-react';
import { useFeedInfinitoDinamicas, useSalonFamaDinamicas } from '../../hooks/queries/useDinamicas';
import { CardDinamica } from './CardDinamica';
import { ComposerSectionDinamicas } from './composer/ComposerSectionDinamicas';
import { CuadroHonorMovil, CuadroHonorLista } from './CuadroHonorDinamicas';

interface SeccionFeedDinamicasProps {
    ciudad: string | null;
    esModoPersonal: boolean;
    /** Borde inferior del header sticky (px) — ancla la columna fija del
     *  Cuadro de Honor. Mismo valor que ya usa `SeccionFeedArticulos`
     *  (mismo header compartido). */
    headerBottom: number;
    /** Si esta sección está visible ahora mismo (el padre la alterna con
     *  `hidden` en vez de desmontarla). Fuerza un re-medido de `cardsLeft`
     *  al volver a mostrarse — mientras estuvo oculta la otra sección pudo
     *  cambiar el ancho de scrollbar y correr el contenido centrado unos px
     *  (mismo criterio que `SeccionFeedArticulos`). */
    visible: boolean;
}

export function SeccionFeedDinamicas({ ciudad, esModoPersonal, headerBottom, visible }: SeccionFeedDinamicasProps) {
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useFeedInfinitoDinamicas({ ciudad });

    const dinamicas = useMemo(() => data?.pages.flatMap((p) => p.dinamicas) ?? [], [data]);

    const { data: salonFama } = useSalonFamaDinamicas(ciudad);
    const rifasHonor = useMemo(() => salonFama?.dinamicas ?? [], [salonFama]);
    const hayColumnaHonor = rifasHonor.length > 0;

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

    // Columna fija del Cuadro de Honor — mismo mecanismo de medición que
    // `SeccionFeedArticulos.tsx` (`cardsPlaceholderRef` reserva el ancho en
    // el flujo normal, `cardsLeft` mide su borde izquierdo para poder darle
    // `left` explícito al elemento `fixed`).
    const cardsPlaceholderRef = useRef<HTMLDivElement>(null);
    const [cardsLeft, setCardsLeft] = useState<number | null>(null);

    useLayoutEffect(() => {
        const el = cardsPlaceholderRef.current;
        if (!el) return;
        const medir = () => setCardsLeft(el.getBoundingClientRect().left);
        medir();
        const observer = new ResizeObserver(medir);
        observer.observe(el);
        window.addEventListener('resize', medir);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, [hayColumnaHonor, visible]);

    // Alinea el primer card del Cuadro de Honor con el primer card del feed
    // (en vez de con `headerBottom`, que queda más arriba porque el feed
    // trae su propio padding-top). Se mide en vivo contra el grid real —
    // más robusto que calcular el offset a mano (padding de `cuerpoRef` +
    // `pt-3` del grid), y no se descuadra si esos valores cambian después.
    const feedGridRef = useRef<HTMLDivElement>(null);
    const [feedTop, setFeedTop] = useState<number | null>(null);

    useLayoutEffect(() => {
        const el = feedGridRef.current;
        if (!el) return;
        const medir = () => setFeedTop(el.getBoundingClientRect().top);
        medir();
        const observer = new ResizeObserver(medir);
        observer.observe(el);
        window.addEventListener('resize', medir);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, [hayColumnaHonor, visible, dinamicas.length]);

    // El punto que hay que alinear con `feedTop` es el PRIMER CARD del
    // Cuadro de Honor, no el borde de arriba del bloque fijo — ahí arranca
    // el encabezado "Cuadro de Honor", más arriba que el card. Se mide la
    // distancia real encabezado→primer card (`cardsFixedRef` vs
    // `primerCardRef`) y se resta de `feedTop` al fijar el `top` del bloque.
    const cardsFixedRef = useRef<HTMLDivElement>(null);
    const primerCardRef = useRef<HTMLButtonElement>(null);
    const [offsetPrimerCard, setOffsetPrimerCard] = useState(0);

    useLayoutEffect(() => {
        const wrapperEl = cardsFixedRef.current;
        const cardEl = primerCardRef.current;
        if (!wrapperEl || !cardEl) return;
        const medir = () => setOffsetPrimerCard(cardEl.getBoundingClientRect().top - wrapperEl.getBoundingClientRect().top);
        medir();
        // Se observan AMBOS — `cardEl` para que un cambio en el propio card
        // (imagen que termina de cargar, texto que envuelve distinto)
        // dispare remedición; `wrapperEl` no cambia de tamaño (su `height`
        // es un `calc()` fijo), pero se deja por si acaso.
        const observer = new ResizeObserver(medir);
        observer.observe(wrapperEl);
        observer.observe(cardEl);
        window.addEventListener('resize', medir);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, [hayColumnaHonor]);

    const honorTop = feedTop !== null ? feedTop - offsetPrimerCard : headerBottom + 16;

    return (
        <>
            {/* Cuadro de Honor — móvil: carrusel arriba de todo. */}
            <div className="lg:hidden">
                <CuadroHonorMovil rifas={rifasHonor} />
            </div>

            <div className="lg:flex lg:items-start lg:gap-8 2xl:gap-10">
                {/* Cuadro de Honor — escritorio: columna fija a la izquierda.
                    Oculta en móvil (ahí va el carrusel de arriba). */}
                {hayColumnaHonor && (
                    <div
                        ref={cardsPlaceholderRef}
                        className="relative hidden w-72 shrink-0 lg:block"
                        style={{ height: `calc(100vh - ${honorTop}px - 16px)` }}
                    >
                        <div
                            ref={cardsFixedRef}
                            className="w-72 z-10 overflow-y-auto lg:fixed"
                            style={{
                                top: `${honorTop}px`,
                                left: cardsLeft !== null ? `${cardsLeft}px` : undefined,
                                height: `calc(100vh - ${honorTop}px - 16px)`,
                            }}
                        >
                            <CuadroHonorLista rifas={rifasHonor} primerCardRef={primerCardRef} />
                        </div>
                    </div>
                )}

                <div className={hayColumnaHonor ? 'min-w-0 flex-1' : 'w-full'}>
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
                            <h3 className="mb-1.5 text-lg font-bold text-slate-900">Aún no hay Dinámicas en {ciudad}</h3>
                            <p className="max-w-sm text-sm text-slate-600">
                                Organiza una rifa o concurso entre vecinos — el pago y la entrega del premio se coordinan
                                siempre fuera de la app.
                            </p>
                        </div>
                    ) : (
                        <div className="px-3 pt-3 lg:px-0">
                            {/* 1 columna hasta `lg:` (laptop) — con el Cuadro de
                                Honor ocupando la columna fija a la izquierda, el
                                espacio que le queda al feed en laptop ya no
                                alcanza para 2 cards sin apretarlas. Recién a
                                partir de `2xl:` (Full HD) hay ancho de sobra. */}
                            <div ref={feedGridRef} className="grid grid-cols-1 gap-3 2xl:grid-cols-2 2xl:gap-4">
                                {dinamicas.map((dinamica) => (
                                    <CardDinamica key={dinamica.id} dinamica={dinamica} />
                                ))}
                            </div>

                            <div ref={sentinelRef} className="h-1" />

                            {isFetchingNextPage && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-amber-400" strokeWidth={2.5} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default SeccionFeedDinamicas;
