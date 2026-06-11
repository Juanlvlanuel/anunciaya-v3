/**
 * admin/usuarios.service.ts
 * =========================
 * Lecturas de la sección Usuarios del Panel Admin (mesa de ayuda + moderación de personas).
 *
 * Dos lecturas:
 *   1. listarUsuarios     — tabla paginada (nombre / correo / tipo / estado) + conteos por estado
 *   2. obtenerExpediente  — ficha-RESUMEN de una persona: sus "sombreros" (dueño/empleado/vendedor/
 *                           equipo) + contadores (puntos, reseñas) + diagnóstico de acceso.
 *
 * ALCANCE: superadmin + gerente ven TODOS los usuarios (sin filtro regional — los usuarios-cliente
 * no tienen región hoy; ver Panel_Admin.md §Cimientos). El control de acceso lo hace
 * `requierePanel(['superadmin','gerente'])` en la ruta. El filtro global de región (?regionId) NO
 * aplica a usuarios: se ignora a propósito.
 *
 * SEGURIDAD: este service NUNCA expone secretos (contrasena_hash, *_secreto, codigo_verificacion).
 * Solo devuelve booleanos derivados (tieneContrasena, etc.).
 *
 * APRETÓN DE ALTURA: el expediente es un RESUMEN (sombreros + contadores), nunca listados
 * navegables (sus pedidos / sus chats / sus reseñas en detalle es V2 o nunca). Ver Usuarios_Pendientes.md.
 *
 * Solo lecturas: este service NO modifica datos. Las escrituras (suspender/reactivar + rescates de
 * acceso) viven en `usuarios-acciones.service.ts` (Fase 2).
 *
 * Ubicación: apps/api/src/services/admin/usuarios.service.ts
 */

import { and, eq, asc, desc, ilike, or, isNotNull, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usuarios, negocios } from '../../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Estados válidos de una cuenta (= CHECK de usuarios.estado). */
export const ESTADOS_USUARIO = ['activo', 'suspendido', 'inactivo'] as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[number];

/** "Tipos" para el filtro de la lista (no son mutuamente excluyentes; se aplican como predicado). */
export const TIPOS_USUARIO = ['personal', 'comercial', 'equipo', 'vendedor'] as const;
export type TipoUsuario = (typeof TIPOS_USUARIO)[number];

/** Opciones de orden de la tabla (corre en servidor por el paginado). */
export const ORDENES_USUARIO = [
    'nombre_az',
    'nombre_za',
    'registro_recientes',
    'registro_antiguos',
    'ultima_conexion',
    'estado',
] as const;
export type OrdenUsuarios = (typeof ORDENES_USUARIO)[number];

export interface FiltrosUsuarios {
    busqueda?: string;     // nombre / apellidos / correo / teléfono (ILIKE)
    estado?: EstadoUsuario;
    tipo?: TipoUsuario;
    orden?: OrdenUsuarios;
    pagina: number;        // 1-based
    porPagina: number;
}

/** Conteos por estado para los chips (reflejan los filtros activos EXCEPTO el de estado).
 *  Array {estado,total} a propósito: keys neutras que el middleware snake→camel no toca. */
export interface ConteosEstado {
    total: number;
    porEstado: Array<{ estado: string; total: number }>;
}

/** Una fila de la tabla. */
export interface UsuarioFila {
    id: string;
    nombre: string;           // nombre + apellidos
    correo: string;
    telefono: string | null;
    avatarUrl: string | null;
    perfil: string;           // personal | comercial
    estado: string;           // activo | suspendido | inactivo
    rolEquipo: string | null; // superadmin | gerente | vendedor | null
    esEmbajador: boolean;
    esDueno: boolean;         // tiene negocio asociado
    ultimaConexion: string | null;
    createdAt: string | null;
}

export interface ListaUsuarios {
    items: UsuarioFila[];
    total: number;
    pagina: number;
    porPagina: number;
    conteos: ConteosEstado;
}

/** Diagnóstico de acceso: por qué una cuenta puede o no iniciar sesión. */
export interface DiagnosticoAcceso {
    correoVerificado: boolean;
    tieneContrasena: boolean;        // contrasena_hash != null (modelo C nace en false)
    bloqueadoPorIntentos: boolean;   // bloqueado_hasta en el futuro
    bloqueadoHasta: string | null;
    intentosFallidos: number;
    requiereCambioContrasena: boolean;
    /** Derivado conservador: lo que el login realmente exige (estado activo + contraseña + no bloqueado). */
    puedeIniciarSesion: boolean;
}

/** Los "sombreros" de la persona, en resumen (contadores, no listados). */
export interface SombrerosUsuario {
    esDueno: boolean;
    negocioId: string | null;
    negocioNombre: string | null;
    esEmpleado: boolean;
    totalEmpleos: number;
    esEmbajador: boolean;
    codigoReferido: string | null;
    rolEquipo: string | null;
    totalBilleterasPuntos: number;
    saldoPuntos: number;
    totalResenas: number;
}

/** Expediente 360 (RESUMEN) de una persona. */
export interface UsuarioExpediente {
    // Identidad
    id: string;
    nombre: string | null;
    apellidos: string | null;
    nombreCompleto: string;
    correo: string;
    alias: string | null;
    telefono: string | null;
    ciudad: string | null;        // texto libre (los usuarios no tienen región estructurada)
    avatarUrl: string | null;
    genero: string | null;
    fechaNacimiento: string | null;
    createdAt: string | null;
    ultimaConexion: string | null;
    // Estado administrativo (lo muestra el badge de la cabecera de la ficha)
    estado: string;
    // Tipo de cuenta
    perfil: string;
    membresia: number;
    tieneModoComercial: boolean;
    modoActivo: string;
    // Verificaciones y métodos de auth (sin secretos)
    correoVerificado: boolean;
    correoVerificadoAt: string | null;
    telefonoVerificado: boolean;
    autenticadoPorGoogle: boolean;
    autenticadoPorFacebook: boolean;
    dobleFactorHabilitado: boolean;
    panel2faHabilitado: boolean;
    // Reputación
    calificacionPromedio: string | null;
    totalCalificaciones: number;
    // Bloques compuestos
    diagnostico: DiagnosticoAcceso;
    sombreros: SombrerosUsuario;
}

// =============================================================================
// HELPERS
// =============================================================================

function nombreCompleto(nombre: string | null, apellidos: string | null): string {
    return `${nombre ?? ''} ${apellidos ?? ''}`.trim();
}

/** Predicado del filtro "tipo" (los tipos no son exclusivos; cada uno es un EXISTS lógico). */
function condicionTipo(tipo?: TipoUsuario): SQL | undefined {
    switch (tipo) {
        case 'personal':
            return eq(usuarios.perfil, 'personal');
        case 'comercial':
            return eq(usuarios.perfil, 'comercial');
        case 'equipo':
            return isNotNull(usuarios.rolEquipo);
        case 'vendedor':
            return eq(usuarios.esEmbajador, true);
        default:
            return undefined;
    }
}

/** Búsqueda por nombre / apellidos / correo / teléfono (ILIKE OR). */
function condicionBusqueda(busqueda?: string): SQL | undefined {
    if (!busqueda) return undefined;
    const t = `%${busqueda}%`;
    return or(
        ilike(usuarios.nombre, t),
        ilike(usuarios.apellidos, t),
        ilike(usuarios.correo, t),
        ilike(usuarios.telefono, t),
    );
}

/** Traduce la opción de orden a expresiones ORDER BY (corre en servidor). */
function ordenarPor(orden?: OrdenUsuarios): SQL[] {
    switch (orden) {
        case 'nombre_za':
            return [desc(usuarios.nombre), asc(usuarios.apellidos)];
        case 'registro_recientes':
            return [desc(usuarios.createdAt)];
        case 'registro_antiguos':
            return [asc(usuarios.createdAt)];
        case 'ultima_conexion':
            return [sql`${usuarios.ultimaConexion} DESC NULLS LAST`];
        case 'estado':
            return [
                sql`CASE ${usuarios.estado} WHEN 'activo' THEN 0 WHEN 'suspendido' THEN 1 WHEN 'inactivo' THEN 2 ELSE 3 END`,
                asc(usuarios.nombre),
            ];
        case 'nombre_az':
        default:
            return [asc(usuarios.nombre), asc(usuarios.apellidos)];
    }
}

// =============================================================================
// 1. LISTA PAGINADA
// =============================================================================

export async function listarUsuarios(filtros: FiltrosUsuarios): Promise<ListaUsuarios> {
    const condBusqueda = condicionBusqueda(filtros.busqueda);
    const condTipo = condicionTipo(filtros.tipo);

    // BASE = búsqueda + tipo (SIN estado). Sobre esta base se calculan los conteos por estado,
    // para que cada chip cuadre con lo demás filtrado.
    const base: SQL[] = [];
    if (condBusqueda) base.push(condBusqueda);
    if (condTipo) base.push(condTipo);

    // LISTA = base + estado (lo que realmente se muestra/pagina).
    const condLista = [...base];
    if (filtros.estado) condLista.push(eq(usuarios.estado, filtros.estado));

    const whereBase = base.length ? and(...base) : undefined;
    const whereLista = condLista.length ? and(...condLista) : undefined;

    // Total (con estado, para el paginado).
    const [{ total }] = await db.select({ total: count() }).from(usuarios).where(whereLista);

    // Conteos por estado (SIN el filtro de estado en el WHERE).
    const filasConteo = await db
        .select({ estado: usuarios.estado, n: count() })
        .from(usuarios)
        .where(whereBase)
        .groupBy(usuarios.estado);

    let totalConteo = 0;
    const porEstado = filasConteo.map((f) => {
        const t = Number(f.n);
        totalConteo += t;
        return { estado: f.estado, total: t };
    });
    const conteos: ConteosEstado = { total: totalConteo, porEstado };

    // Página.
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            avatarUrl: usuarios.avatarUrl,
            perfil: usuarios.perfil,
            estado: usuarios.estado,
            rolEquipo: usuarios.rolEquipo,
            esEmbajador: usuarios.esEmbajador,
            negocioId: usuarios.negocioId,
            ultimaConexion: usuarios.ultimaConexion,
            createdAt: usuarios.createdAt,
        })
        .from(usuarios)
        .where(whereLista)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items: UsuarioFila[] = filas.map((f) => ({
        id: f.id,
        nombre: nombreCompleto(f.nombre, f.apellidos),
        correo: f.correo,
        telefono: f.telefono ?? null,
        avatarUrl: f.avatarUrl ?? null,
        perfil: f.perfil,
        estado: f.estado,
        rolEquipo: f.rolEquipo ?? null,
        esEmbajador: f.esEmbajador,
        esDueno: f.negocioId != null,
        ultimaConexion: f.ultimaConexion ?? null,
        createdAt: f.createdAt ?? null,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// 2. EXPEDIENTE 360 (RESUMEN)
// =============================================================================

export async function obtenerExpediente(usuarioId: string): Promise<UsuarioExpediente | null> {
    // Usuario base + nombre del negocio (si es dueño). NO se selecciona ningún secreto;
    // de contrasena_hash solo se deriva el booleano `tieneContrasena`.
    const [u] = await db
        .select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            correo: usuarios.correo,
            alias: usuarios.alias,
            telefono: usuarios.telefono,
            ciudad: usuarios.ciudad,
            avatarUrl: usuarios.avatarUrl,
            genero: usuarios.genero,
            fechaNacimiento: usuarios.fechaNacimiento,
            createdAt: usuarios.createdAt,
            ultimaConexion: usuarios.ultimaConexion,
            estado: usuarios.estado,
            perfil: usuarios.perfil,
            membresia: usuarios.membresia,
            tieneModoComercial: usuarios.tieneModoComercial,
            modoActivo: usuarios.modoActivo,
            correoVerificado: usuarios.correoVerificado,
            correoVerificadoAt: usuarios.correoVerificadoAt,
            telefonoVerificado: usuarios.telefonoVerificado,
            autenticadoPorGoogle: usuarios.autenticadoPorGoogle,
            autenticadoPorFacebook: usuarios.autenticadoPorFacebook,
            dobleFactorHabilitado: usuarios.dobleFactorHabilitado,
            panel2faHabilitado: usuarios.panel2faHabilitado,
            requiereCambioContrasena: usuarios.requiereCambioContrasena,
            intentosFallidos: usuarios.intentosFallidos,
            bloqueadoHasta: usuarios.bloqueadoHasta,
            calificacionPromedio: usuarios.calificacionPromedio,
            totalCalificaciones: usuarios.totalCalificaciones,
            esEmbajador: usuarios.esEmbajador,
            rolEquipo: usuarios.rolEquipo,
            negocioId: usuarios.negocioId,
            tieneContrasena: sql<boolean>`(${usuarios.contrasenaHash} IS NOT NULL)`,
            negocioNombre: negocios.nombre,
        })
        .from(usuarios)
        .leftJoin(negocios, eq(negocios.id, usuarios.negocioId))
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

    if (!u) return null;

    // Contadores de los sombreros en UNA sola ida a BD (subqueries escalares).
    const agg = (await db.execute(sql`
        SELECT
            (SELECT COUNT(*) FROM empleados e WHERE e.usuario_id = ${usuarioId} AND e.eliminado_at IS NULL)::int AS total_empleos,
            (SELECT COUNT(*) FROM puntos_billetera pb WHERE pb.usuario_id = ${usuarioId})::int AS total_billeteras,
            (SELECT COALESCE(SUM(pb.puntos_disponibles), 0) FROM puntos_billetera pb WHERE pb.usuario_id = ${usuarioId})::int AS saldo_puntos,
            (SELECT COUNT(*) FROM resenas r WHERE r.autor_id = ${usuarioId} AND r.autor_tipo = 'cliente')::int AS total_resenas,
            (SELECT e.codigo_referido FROM embajadores e WHERE e.usuario_id = ${usuarioId} LIMIT 1) AS codigo_referido
    `)).rows[0] as {
        total_empleos: number; total_billeteras: number; saldo_puntos: number;
        total_resenas: number; codigo_referido: string | null;
    };

    const bloqueadoPorIntentos = !!u.bloqueadoHasta && new Date(u.bloqueadoHasta).getTime() > Date.now();
    const tieneContrasena = !!u.tieneContrasena;

    const diagnostico: DiagnosticoAcceso = {
        correoVerificado: !!u.correoVerificado,
        tieneContrasena,
        bloqueadoPorIntentos,
        bloqueadoHasta: u.bloqueadoHasta ?? null,
        intentosFallidos: u.intentosFallidos ?? 0,
        requiereCambioContrasena: u.requiereCambioContrasena,
        // Lo que el login REALMENTE exige: estado activo + contraseña creada + no bloqueado por intentos.
        puedeIniciarSesion: u.estado === 'activo' && tieneContrasena && !bloqueadoPorIntentos,
    };

    const sombreros: SombrerosUsuario = {
        esDueno: u.negocioId != null,
        negocioId: u.negocioId ?? null,
        negocioNombre: u.negocioNombre ?? null,
        esEmpleado: agg.total_empleos > 0,
        totalEmpleos: agg.total_empleos,
        esEmbajador: u.esEmbajador,
        codigoReferido: agg.codigo_referido ?? null,
        rolEquipo: u.rolEquipo ?? null,
        totalBilleterasPuntos: agg.total_billeteras,
        saldoPuntos: agg.saldo_puntos,
        totalResenas: agg.total_resenas,
    };

    return {
        id: u.id,
        nombre: u.nombre ?? null,
        apellidos: u.apellidos ?? null,
        nombreCompleto: nombreCompleto(u.nombre, u.apellidos),
        correo: u.correo,
        alias: u.alias ?? null,
        telefono: u.telefono ?? null,
        ciudad: u.ciudad ?? null,
        avatarUrl: u.avatarUrl ?? null,
        genero: u.genero ?? null,
        fechaNacimiento: u.fechaNacimiento ?? null,
        createdAt: u.createdAt ?? null,
        ultimaConexion: u.ultimaConexion ?? null,
        estado: u.estado,
        perfil: u.perfil,
        membresia: u.membresia,
        tieneModoComercial: u.tieneModoComercial,
        modoActivo: u.modoActivo,
        correoVerificado: !!u.correoVerificado,
        correoVerificadoAt: u.correoVerificadoAt ?? null,
        telefonoVerificado: !!u.telefonoVerificado,
        autenticadoPorGoogle: !!u.autenticadoPorGoogle,
        autenticadoPorFacebook: !!u.autenticadoPorFacebook,
        dobleFactorHabilitado: !!u.dobleFactorHabilitado,
        panel2faHabilitado: u.panel2faHabilitado,
        calificacionPromedio: u.calificacionPromedio ?? null,
        totalCalificaciones: u.totalCalificaciones ?? 0,
        diagnostico,
        sombreros,
    };
}
