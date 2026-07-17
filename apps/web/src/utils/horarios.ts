/**
 * ============================================================================
 * UTILIDADES DE HORARIOS
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/utils/horarios.ts
 *
 * PROPÓSITO:
 * Lógica compartida para horarios de negocios, incluyendo los que cruzan la
 * medianoche (bares, antros, taquerías nocturnas: abren 20:00 y cierran 03:00).
 *
 * REGLA CENTRAL:
 * Cuando `horaCierre < horaApertura` el turno termina el día siguiente. Todo se
 * calcula en "minutos desde la apertura" (rango desenrollado de 0 a 1439), lo
 * que hace que el cruce de medianoche deje de ser un caso especial.
 *
 * Debe mantenerse alineado con el SQL de `esta_abierto` en
 * apps/api/src/services/negocios.service.ts
 */

const MINUTOS_DIA = 1440;

/** "HH:mm" o "HH:mm:ss" → minutos desde medianoche. */
export function horaAMinutos(hora: string): number {
    const [hh, mm] = hora.substring(0, 5).split(':').map(Number);
    return hh * 60 + mm;
}

/** Recorta "HH:mm:ss" a "HH:mm". Tolera null. */
export function normalizarHora(hora: string | null | undefined, porDefecto = '09:00'): string {
    if (!hora) return porDefecto;
    return hora.substring(0, 5);
}

/** El turno termina el día siguiente (ej. 20:00 → 03:00). */
export function cruzaMedianoche(horaApertura: string, horaCierre: string): boolean {
    return horaAMinutos(horaCierre) < horaAMinutos(horaApertura);
}

/**
 * Duración del turno en minutos, desenrollando el cruce de medianoche.
 * 20:00 → 03:00 devuelve 420 (7 horas), no -1020.
 */
export function duracionTurno(horaApertura: string, horaCierre: string): number {
    return (horaAMinutos(horaCierre) - horaAMinutos(horaApertura) + MINUTOS_DIA) % MINUTOS_DIA;
}

/**
 * Posición de una hora dentro del turno, medida en minutos desde la apertura.
 * Con apertura 20:00, la 01:00 devuelve 300 (5 h después de abrir).
 */
export function minutosDesdeApertura(hora: string, horaApertura: string): number {
    return (horaAMinutos(hora) - horaAMinutos(horaApertura) + MINUTOS_DIA) % MINUTOS_DIA;
}

// =============================================================================
// VALIDACIÓN
// =============================================================================

export interface HorarioValidable {
    abierto: boolean;
    horaApertura?: string | null;
    horaCierre?: string | null;
    tieneHorarioComida?: boolean;
    comidaInicio?: string | null;
    comidaFin?: string | null;
}

/**
 * Valida un día. Devuelve el mensaje de error o null si es válido.
 *
 * Se permite que el cierre sea "menor" que la apertura: eso significa que el
 * negocio cierra de madrugada. Lo único inválido es que sean idénticas, porque
 * el turno resultante sería ambiguo (¿cero minutos o 24 horas?). Para 24 horas
 * está el botón 24/7.
 */
export function validarHorarioDia(horario: HorarioValidable): string | null {
    if (!horario.abierto) return null;

    if (!horario.horaApertura || !horario.horaCierre) {
        return 'Falta hora de apertura o cierre';
    }

    const apertura = normalizarHora(horario.horaApertura);
    const cierre = normalizarHora(horario.horaCierre);

    if (horaAMinutos(apertura) === horaAMinutos(cierre)) {
        return 'La apertura y el cierre no pueden ser la misma hora. Si abres todo el día, usa el botón 24/7';
    }

    if (horario.tieneHorarioComida && horario.comidaInicio && horario.comidaFin) {
        const comidaInicio = normalizarHora(horario.comidaInicio);
        const comidaFin = normalizarHora(horario.comidaFin);

        if (horaAMinutos(comidaInicio) === horaAMinutos(comidaFin)) {
            return 'La salida y el regreso de comida no pueden ser la misma hora';
        }

        // Se mide todo desde la apertura para que la comida de un turno nocturno
        // (salida 01:00 dentro de un 20:00–03:00) caiga dentro del rango.
        const duracion = duracionTurno(apertura, cierre);
        const inicioRel = minutosDesdeApertura(comidaInicio, apertura);
        const finRel = minutosDesdeApertura(comidaFin, apertura);

        if (inicioRel >= finRel) {
            return 'El regreso de comida debe ser posterior a la salida';
        }

        if (finRel > duracion) {
            return 'El horario de comida debe estar dentro del horario de operación';
        }
    }

    return null;
}

// =============================================================================
// PRESENTACIÓN
// =============================================================================

/** "20:00" → "8:00 PM" */
export function formatearHora12(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.substring(0, 5).split(':');
    const hh = parseInt(h);
    const periodo = hh >= 12 ? 'PM' : 'AM';
    const hora12 = hh % 12 || 12;
    return `${hora12}:${m} ${periodo}`;
}

/*
 * Nota: al cliente se le muestra el rango tal cual ("6:00 PM - 3:00 AM"), sin
 * marcar el cruce de medianoche — se sobreentiende y repetirlo en los 7 días
 * ensucia el modal. El aviso explícito vive solo en el editor (Onboarding y
 * Business Studio), donde el comerciante necesita confirmar lo que capturó.
 */

// =============================================================================
// ESTADO ACTUAL (¿abierto ahora?)
// =============================================================================

export interface Horario {
    diaSemana: number;
    abierto: boolean;
    horaApertura: string;
    horaCierre: string;
    tieneHorarioComida?: boolean;
    comidaInicio?: string | null;
    comidaFin?: string | null;
}

export type EstadoNegocio = 'abierto' | 'cerrado' | 'comida' | 'cerrado_hoy';

export interface InfoHorario {
    estado: EstadoNegocio;
    proximaApertura?: string;
    proximoCierre?: string;
}

function encontrarProximaApertura(horarios: Horario[], diaActual: number): Horario | undefined {
    for (let i = 1; i <= 7; i++) {
        const diaBuscar = (diaActual + i) % 7;
        const horario = horarios.find(h => h.diaSemana === diaBuscar && h.abierto);
        if (horario) return horario;
    }
    return undefined;
}

/**
 * Evalúa si `horaActual` cae dentro del turno de ese día.
 * Devuelve null si estamos fuera del turno.
 */
function estadoEnTurno(horario: Horario, horaActual: string): InfoHorario | null {
    const { horaApertura, horaCierre, tieneHorarioComida, comidaInicio, comidaFin } = horario;
    if (!horario.abierto || !horaApertura || !horaCierre) return null;

    const duracion = duracionTurno(horaApertura, horaCierre);
    const posicion = minutosDesdeApertura(horaActual, horaApertura);
    if (posicion >= duracion) return null;

    if (tieneHorarioComida && comidaInicio && comidaFin) {
        const inicioRel = minutosDesdeApertura(comidaInicio, horaApertura);
        const finRel = minutosDesdeApertura(comidaFin, horaApertura);
        if (posicion >= inicioRel && posicion < finRel) {
            return { estado: 'comida', proximaApertura: comidaFin };
        }
    }

    return { estado: 'abierto', proximoCierre: horaCierre };
}

/**
 * Estado del negocio en este momento. Lo consumen las cards, el perfil y
 * ChatYA, así que todos coinciden.
 */
export function calcularEstadoNegocio(horarios: Horario[], zonaHoraria?: string): InfoHorario {
    if (!horarios || horarios.length === 0) {
        return { estado: 'cerrado_hoy' };
    }

    const ahora = zonaHoraria
        ? new Date(new Date().toLocaleString('en-US', { timeZone: zonaHoraria }))
        : new Date();
    const diaActual = ahora.getDay();
    const horaActual =
        ahora.getHours().toString().padStart(2, '0') + ':' +
        ahora.getMinutes().toString().padStart(2, '0');

    // 1. Turno de AYER que cerró de madrugada y todavía sigue vigente.
    //    A la 01:00 del martes, quien está abierto es el turno del lunes 20:00–03:00.
    const horarioAyer = horarios.find(h => h.diaSemana === (diaActual + 6) % 7);
    if (
        horarioAyer?.abierto &&
        horarioAyer.horaApertura &&
        horarioAyer.horaCierre &&
        cruzaMedianoche(horarioAyer.horaApertura, horarioAyer.horaCierre) &&
        horaAMinutos(horaActual) < horaAMinutos(horarioAyer.horaCierre)
    ) {
        const estadoAyer = estadoEnTurno(horarioAyer, horaActual);
        if (estadoAyer) return estadoAyer;
    }

    // 2. Turno de HOY.
    const horarioHoy = horarios.find(h => h.diaSemana === diaActual);

    if (!horarioHoy || !horarioHoy.abierto || !horarioHoy.horaApertura || !horarioHoy.horaCierre) {
        const proximoHorario = encontrarProximaApertura(horarios, diaActual);
        return { estado: 'cerrado_hoy', proximaApertura: proximoHorario?.horaApertura };
    }

    const estadoHoy = estadoEnTurno(horarioHoy, horaActual);
    if (estadoHoy) return estadoHoy;

    // Fuera del turno: si aún no abre, abre hoy; si ya cerró, toca el siguiente día.
    if (horaAMinutos(horaActual) < horaAMinutos(horarioHoy.horaApertura)) {
        return { estado: 'cerrado', proximaApertura: horarioHoy.horaApertura };
    }

    const proximoHorario = encontrarProximaApertura(horarios, diaActual);
    return { estado: 'cerrado', proximaApertura: proximoHorario?.horaApertura };
}
