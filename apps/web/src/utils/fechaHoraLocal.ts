/**
 * fechaHoraLocal.ts
 * ==================
 * Combinar/descomponer fecha + hora LOCAL en el ISO (UTC) que espera el
 * backend, y la lista de opciones de hora en incrementos de 30 min — mismo
 * mecanismo que ya usa `ComposerDinamicas.tsx` (DatePicker para la fecha +
 * CustomSelect para la hora; no hay un "selector de hora" con horas
 * predefinidas ya armado en el repo). Extraído aquí para compartirlo entre
 * `PaginaSalaDinamica.tsx`/`PaginaSalaDinamicaPublica.tsx` sin duplicar.
 *
 * Ubicación: apps/web/src/utils/fechaHoraLocal.ts
 */

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** Hoy en formato YYYY-MM-DD (local). */
export function hoyISO(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}-${pad2(hoy.getDate())}`;
}

/** Combina fecha (YYYY-MM-DD) + hora (HH:mm), ambas en hora LOCAL, a un ISO
 *  string en UTC (mismo formato que espera el backend). */
export function combinarFechaHora(fecha: string, hora: string): string {
    if (!fecha) return '';
    return new Date(`${fecha}T${hora || '18:00'}:00`).toISOString();
}

/** Descompone un ISO string (UTC) a sus partes de fecha/hora LOCALES para
 *  mostrarlas en el DatePicker + el CustomSelect de hora. */
export function descomponerFechaHora(iso: string): { fecha: string; hora: string } {
    if (!iso) return { fecha: '', hora: '18:00' };
    const d = new Date(iso);
    return {
        fecha: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
        hora: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    };
}

export const OPCIONES_HORA: { valor: string; etiqueta: string }[] = Array.from({ length: 48 }, (_, i) => {
    const horas24 = Math.floor(i / 2);
    const minutos = i % 2 === 0 ? '00' : '30';
    const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
    const sufijo = horas24 < 12 ? 'a.m.' : 'p.m.';
    return { valor: `${pad2(horas24)}:${minutos}`, etiqueta: `${horas12}:${minutos} ${sufijo}` };
});

/** `OPCIONES_HORA` completas si `fecha` es un día futuro elegido a propósito
 *  — pero si `fecha` es HOY, o si TODAVÍA no se eligió ninguna (hoy es la
 *  fecha mínima seleccionable de todas formas, vía `minDate`), recorta las
 *  horas que ya pasaron: el backend rechaza `salaProgramadaPara` que no sea
 *  estrictamente futura, y antes de este filtro el dropdown dejaba elegir
 *  una hora ya vencida (error "Datos inválidos" recién al dar "Programar").
 *  Usada por el composer (fecha límite de inscripción) — "Programar sala"
 *  ya no usa este dropdown de 30 en 30 min, ver `horaMinimaSiEsHoy`. */
export function opcionesHoraDisponibles(fecha: string): { valor: string; etiqueta: string }[] {
    if (fecha && fecha !== hoyISO()) return OPCIONES_HORA;
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    return OPCIONES_HORA.filter((h) => {
        const [hh, mm] = h.valor.split(':').map(Number);
        return hh * 60 + mm > minutosAhora;
    });
}

/** "Programar sala" (`PaginaSalaDinamica.tsx`/`PaginaSalaDinamicaPublica.tsx`)
 *  usa un `<input type="time">` libre — cualquier horario exacto, no solo
 *  cada 30 min. Si `fecha` es HOY y `hora` ya quedó en el pasado, la
 *  empuja unos minutos al futuro (misma protección que antes daba el
 *  filtrado de `opcionesHoraDisponibles`, sin restringir a una rejilla de
 *  horas fijas); si no, la deja tal cual. */
export function horaMinimaSiEsHoy(fecha: string, hora: string): string {
    if (fecha !== hoyISO()) return hora;
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const [hh, mm] = hora.split(':').map(Number);
    if (hh * 60 + mm > minutosAhora) return hora;
    const proximo = new Date(ahora.getTime() + 5 * 60000);
    return `${pad2(proximo.getHours())}:${pad2(proximo.getMinutes())}`;
}
