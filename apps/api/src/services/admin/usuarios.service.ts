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
 * ALCANCE (visibilidad por jerarquía + región, ver `condicionVisibilidad`):
 *   - superadmin → ve a TODOS; con la LENTE de región (?regionId) acota a esa región (dueños/gerentes
 *                  de sucursal de negocios de la región + vendedores + el gerente regional de la región;
 *                  los clientes, sin región, se ven todos).
 *   - gerente    → NUNCA ve superadmin ni gerentes (ni a sí mismo). Ve los CLIENTES puros (sin negocio)
 *                  de toda la plataforma (no tienen región estructurada), y los COMERCIANTES y VENDEDORES
 *                  SOLO de SU región (comerciante: por la sucursal MATRIZ de su negocio, igual que el
 *                  módulo Negocios; vendedor: por embajador_ciudades, igual que panel.middleware).
 * El acceso a la sección lo controla `requierePanel(['superadmin','gerente'])` en la ruta. La lente
 * ?regionId solo la usa el superadmin; el gerente usa SIEMPRE la región de su token (ignora el query).
 *
 * SEGURIDAD: este service NUNCA expone secretos (contrasena_hash, *_secreto).
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

import { and, eq, asc, desc, ilike, or, isNull, isNotNull, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usuarios, negocios, ciudades } from '../../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Estados válidos de una cuenta (= CHECK de usuarios.estado). */
export const ESTADOS_USUARIO = ['activo', 'suspendido', 'inactivo'] as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[number];

/** "Roles" para el filtro de la lista (no son mutuamente excluyentes; se aplican como predicado).
 *  Coinciden con la columna "Rol": Usuario (cliente puro), Comerciante (dueño), Gerente de sucursal
 *  (encargado), Vendedor, Gerente (del Panel). */
export const TIPOS_USUARIO = ['usuario', 'comerciante', 'gerente_sucursal', 'vendedor', 'gerente'] as const;
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
    ciudadId?: string;     // ciudad_id del catálogo, o el centinela 'sin-ciudad' (ciudad_id IS NULL)
    orden?: OrdenUsuarios;
    pagina: number;        // 1-based
    porPagina: number;
    rolSolicitante?: string;          // rol del que consulta (para la visibilidad por jerarquía)
    regionSolicitante?: string | null; // región del que consulta (acota los vendedores para el gerente)
}

/** Conteos por estado para los chips (reflejan los filtros activos EXCEPTO el de estado).
 *  Array {estado,total} a propósito: keys neutras que el middleware snake→camel no toca. */
export interface ConteosEstado {
    total: number;
    porEstado: Array<{ estado: string; total: number }>;
    // Rol efectivo (mismo predicado que el filtro): '' (todo) · usuario · comerciante · gerente_sucursal
    // · vendedor · gerente. Los roles NO son exclusivos entre sí → 'total' del '' es el real, no la suma.
    porTipo: Array<{ tipo: string; total: number }>;
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
    esDueno: boolean;            // ligado a un negocio (dueño o gerente de sucursal)
    esGerenteSucursal: boolean;  // tiene sucursal asignada → es encargado, NO el dueño
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
    telefono: string | null;
    ciudad: string | null;        // texto libre (los usuarios no tienen región estructurada)
    avatarUrl: string | null;
    genero: string | null;
    fechaNacimiento: string | null;
    createdAt: string | null;
    ultimaConexion: string | null;       // última actividad en la app AnunciaYA (Socket.io)
    ultimoAccesoPanel: string | null;    // última vez que abrió el Panel (solo cuentas de equipo)
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
    autenticadoPorGoogle: boolean;
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

/**
 * Excluye del Panel a los usuarios DEMO de Business Studio: el dueño-sombra del maestro
 * (demo-maestro@…), los dueños-sombra de cada copia (demo-vendedor-<uuid>@…) y los clientes
 * sintéticos (demo-cliente-N@…). No tienen bandera propia, pero TODOS usan el dominio
 * `@demo.anunciaya.local` por construcción (seedDemoMaestro.ts + crearCopiaDemo). Criterio robusto:
 * el correo. COALESCE por si algún correo llegara null (así no se excluiría por error). ILIKE =
 * case-insensitive; no usa índice, irrelevante al volumen de la beta. Se combina SIEMPRE dentro de
 * `condicionVisibilidad`, así toda lectura de usuarios (lista + conteos, contador del menú,
 * por-ciudad, expediente y las series de Métricas·Usuarios) la hereda sin repetir el WHERE. */
const EXCLUIR_USUARIOS_DEMO: SQL = sql`COALESCE(${usuarios.correo}, '') NOT ILIKE '%@demo.anunciaya.local'`;

/** Condición de visibilidad de la lista según QUIÉN consulta:
 *  - superadmin SIN lente de región → ve a TODOS (solo con `EXCLUIR_USUARIOS_DEMO`).
 *  - superadmin CON lente (?regionId) → ve esa región completa: dueños/gerentes de sucursal de negocios
 *    de la región, vendedores de la región, el GERENTE REGIONAL de la región, y los clientes (sin
 *    región) todos. No oculta nada por jerarquía: es el super "viendo como" esa región.
 *  - gerente → NUNCA superadmin ni gerentes (ni a sí mismo); clientes todos; dueños/gerentes de sucursal
 *    y vendedores SOLO de SU región (la de su token). Gerente sin región: solo clientes.
 *  Las deducciones de región son las mismas del resto del Panel (negocio → sucursal MATRIZ → ciudad;
 *  vendedor → embajador_ciudades; gerente regional → usuarios.region_id).
 *  SIEMPRE devuelve un SQL (nunca undefined): la visibilidad por rol se combina con la exclusión de
 *  demos. "Super ve todo" = "todo MENOS los usuarios @demo.anunciaya.local". */
export function condicionVisibilidad(rolSolicitante?: string, regionSolicitante?: string | null): SQL {
    // Cliente "puro": sin rol de equipo y sin negocio → no tiene región, siempre visible.
    const clientePuro = and(isNull(usuarios.rolEquipo), isNull(usuarios.negocioId));
    // Dueño o gerente de sucursal cuyo negocio (sucursal MATRIZ) está en la región dada.
    const negocioEnRegion = (region: string): SQL => sql`(${usuarios.rolEquipo} IS NULL AND ${usuarios.negocioId} IS NOT NULL AND EXISTS (
        SELECT 1 FROM negocio_sucursales ns
        JOIN ciudades c ON c.id = ns.ciudad_id
        WHERE ns.negocio_id = usuarios.negocio_id AND ns.es_principal = true AND c.region_id = ${region}
    ))`;
    // Vendedor que cubre alguna ciudad de la región dada.
    const vendedorEnRegion = (region: string): SQL => sql`(${usuarios.rolEquipo} = 'vendedor' AND EXISTS (
        SELECT 1 FROM embajadores e
        JOIN embajador_ciudades ec ON ec.embajador_id = e.id
        JOIN ciudades c ON c.id = ec.ciudad_id
        WHERE e.usuario_id = usuarios.id AND c.region_id = ${region}
    ))`;

    if (rolSolicitante === 'gerente') {
        if (!regionSolicitante) return and(EXCLUIR_USUARIOS_DEMO, clientePuro)!;
        return and(EXCLUIR_USUARIOS_DEMO, or(clientePuro, negocioEnRegion(regionSolicitante), vendedorEnRegion(regionSolicitante)))!;
    }

    if (rolSolicitante === 'superadmin' && regionSolicitante) {
        // Lente de región del super: la región completa, incluido SU gerente regional.
        return and(EXCLUIR_USUARIOS_DEMO, or(
            clientePuro,
            negocioEnRegion(regionSolicitante),
            vendedorEnRegion(regionSolicitante),
            and(eq(usuarios.rolEquipo, 'gerente'), eq(usuarios.regionId, regionSolicitante)),
        ))!;
    }

    return EXCLUIR_USUARIOS_DEMO; // superadmin sin lente: toda la plataforma MENOS demos
}

/** Predicado del filtro "rol" (no exclusivos entre sí; cada uno es un EXISTS lógico). */
function condicionTipo(tipo?: TipoUsuario): SQL | undefined {
    switch (tipo) {
        case 'usuario':
            // Cliente "puro": sin rol de equipo y sin negocio propio.
            return and(isNull(usuarios.rolEquipo), isNull(usuarios.negocioId));
        case 'comerciante':
            // Dueño real: ligado a un negocio pero SIN sucursal asignada.
            return and(isNotNull(usuarios.negocioId), isNull(usuarios.sucursalAsignada));
        case 'gerente_sucursal':
            // Encargado de una sucursal (no es el dueño).
            return isNotNull(usuarios.sucursalAsignada);
        case 'vendedor':
            return eq(usuarios.rolEquipo, 'vendedor');
        case 'gerente':
            return eq(usuarios.rolEquipo, 'gerente');
        default:
            return undefined;
    }
}

/** Predicado del filtro "ciudad": una ciudad del catálogo, o el centinela 'sin-ciudad'
 *  (usuarios con ciudad_id NULL — "Sin ciudad"). */
function condicionCiudad(ciudadId?: string): SQL | undefined {
    if (!ciudadId) return undefined;
    if (ciudadId === 'sin-ciudad') return isNull(usuarios.ciudadId);
    return eq(usuarios.ciudadId, ciudadId);
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
    const condVisibilidad = condicionVisibilidad(filtros.rolSolicitante, filtros.regionSolicitante);
    const condBusqueda = condicionBusqueda(filtros.busqueda);
    const condTipo = condicionTipo(filtros.tipo);
    const condCiudad = condicionCiudad(filtros.ciudadId);

    // COMÚN = visibilidad + búsqueda + ciudad (SIN tipo NI estado). Sobre esta base + el filtro
    // contrario se calculan las facetas (por estado y por tipo): cada una cuenta EXCLUYENDO su propio
    // filtro (y NO cuenta cuentas que no se ven).
    const condEstado = filtros.estado ? eq(usuarios.estado, filtros.estado) : undefined;
    const comun: SQL[] = [];
    if (condVisibilidad) comun.push(condVisibilidad);
    if (condBusqueda) comun.push(condBusqueda);
    if (condCiudad) comun.push(condCiudad);
    const armar = (...extra: (SQL | undefined)[]) => {
        const conds = [...comun, ...extra.filter((x): x is SQL => x != null)];
        return conds.length ? and(...conds) : undefined;
    };

    const whereBase = armar(condTipo);              // porEstado (excluye estado)
    const whereTipo = armar(condEstado);            // porTipo (excluye tipo)
    const whereLista = armar(condTipo, condEstado); // tabla + total

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

    // Conteos por tipo/rol efectivo (reusa los predicados del filtro con FILTER). Roles NO exclusivos
    // → 'todo' = total real, no la suma. Excluye el propio filtro de tipo.
    const [filaTipo] = await db
        .select({
            todo: count(),
            usuario: sql<number>`count(*) FILTER (WHERE ${condicionTipo('usuario')!})`,
            comerciante: sql<number>`count(*) FILTER (WHERE ${condicionTipo('comerciante')!})`,
            gerenteSucursal: sql<number>`count(*) FILTER (WHERE ${condicionTipo('gerente_sucursal')!})`,
            vendedor: sql<number>`count(*) FILTER (WHERE ${condicionTipo('vendedor')!})`,
            gerente: sql<number>`count(*) FILTER (WHERE ${condicionTipo('gerente')!})`,
        })
        .from(usuarios)
        .where(whereTipo);

    const conteos: ConteosEstado = {
        total: totalConteo,
        porEstado,
        porTipo: [
            { tipo: '', total: Number(filaTipo?.todo ?? 0) },
            { tipo: 'usuario', total: Number(filaTipo?.usuario ?? 0) },
            { tipo: 'comerciante', total: Number(filaTipo?.comerciante ?? 0) },
            { tipo: 'gerente_sucursal', total: Number(filaTipo?.gerenteSucursal ?? 0) },
            { tipo: 'vendedor', total: Number(filaTipo?.vendedor ?? 0) },
            { tipo: 'gerente', total: Number(filaTipo?.gerente ?? 0) },
        ],
    };

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
            sucursalAsignada: usuarios.sucursalAsignada,
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
        esGerenteSucursal: f.sucursalAsignada != null,
        ultimaConexion: f.ultimaConexion ?? null,
        createdAt: f.createdAt ?? null,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina, conteos };
}

// =============================================================================
// CONTEO GENERAL (badge del menú) — total de usuarios sin filtros
// =============================================================================

/** Total de usuarios para el contador del menú (respeta la visibilidad por jerarquía y región del solicitante). */
export async function contarUsuarios(rolSolicitante?: string, regionSolicitante?: string | null): Promise<number> {
    const [{ total }] = await db
        .select({ total: count() })
        .from(usuarios)
        .where(condicionVisibilidad(rolSolicitante, regionSolicitante));
    return Number(total);
}

// =============================================================================
// USUARIOS POR CIUDAD (métrica + opciones del filtro de ciudad)
// =============================================================================

/** Un grupo del desglose por ciudad. `ciudadId === null` es el grupo "Sin ciudad". */
export interface CiudadConteo {
    ciudadId: string | null;
    ciudad: string;            // nombre del catálogo, o "Sin ciudad"
    estado: string | null;     // estado/provincia del catálogo (null para "Sin ciudad")
    total: number;
}

/**
 * Conteo de usuarios agrupado por ciudad (respeta la visibilidad por jerarquía + región).
 * Sirve para DOS cosas: la métrica "usuarios por ciudad" y poblar las opciones del filtro.
 *
 * Agrupa por `ciudad_id` con el query builder (reusa `condicionVisibilidad` tal cual, que
 * referencia la tabla `usuarios` SIN alias) y resuelve los nombres con el catálogo `ciudades`
 * (71 filas, trivial en memoria). El grupo NULL ("Sin ciudad") siempre se incluye si existe.
 * Orden: por total desc, y "Sin ciudad" al final.
 */
export async function usuariosPorCiudad(rolSolicitante?: string, regionSolicitante?: string | null): Promise<CiudadConteo[]> {
    const cond = condicionVisibilidad(rolSolicitante, regionSolicitante);

    // Las dos consultas son INDEPENDIENTES (el catálogo no depende del conteo) → en paralelo,
    // para recortar la latencia del endpoint a la mitad (importa cuando el pooler va lento).
    const [filas, catRes] = await Promise.all([
        db
            .select({ ciudadId: usuarios.ciudadId, total: count() })
            .from(usuarios)
            .where(cond)
            .groupBy(usuarios.ciudadId),
        // Catálogo completo (id → nombre/estado). Solo lectura, pocas filas.
        db.execute(sql`SELECT id::text AS id, nombre, estado FROM ciudades`),
    ]);

    const cat = catRes.rows as Array<{ id: string; nombre: string; estado: string }>;
    const mapa = new Map(cat.map((c) => [c.id, c]));

    const grupos: CiudadConteo[] = filas.map((f) => {
        const info = f.ciudadId ? mapa.get(f.ciudadId) : undefined;
        return {
            ciudadId: f.ciudadId ?? null,
            ciudad: info?.nombre ?? (f.ciudadId ? 'Ciudad desconocida' : 'Sin ciudad'),
            estado: info?.estado ?? null,
            total: Number(f.total),
        };
    });

    // Orden: por total desc; el grupo "Sin ciudad" siempre al final.
    grupos.sort((a, b) => {
        if (a.ciudadId === null) return 1;
        if (b.ciudadId === null) return -1;
        return b.total - a.total;
    });

    return grupos;
}

// =============================================================================
// 2. EXPEDIENTE 360 (RESUMEN)
// =============================================================================

export async function obtenerExpediente(usuarioId: string, rolSolicitante?: string, regionSolicitante?: string | null): Promise<UsuarioExpediente | null> {
    // Usuario base + nombre del negocio (si es dueño). NO se selecciona ningún secreto;
    // de contrasena_hash solo se deriva el booleano `tieneContrasena`.
    const [u] = await db
        .select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            ciudad: ciudades.nombre,
            avatarUrl: usuarios.avatarUrl,
            genero: usuarios.genero,
            fechaNacimiento: usuarios.fechaNacimiento,
            createdAt: usuarios.createdAt,
            ultimaConexion: usuarios.ultimaConexion,
            ultimoAccesoPanel: usuarios.ultimoAccesoPanel,
            estado: usuarios.estado,
            perfil: usuarios.perfil,
            membresia: usuarios.membresia,
            tieneModoComercial: usuarios.tieneModoComercial,
            modoActivo: usuarios.modoActivo,
            correoVerificado: usuarios.correoVerificado,
            correoVerificadoAt: usuarios.correoVerificadoAt,
            autenticadoPorGoogle: usuarios.autenticadoPorGoogle,
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
        .leftJoin(ciudades, eq(ciudades.id, usuarios.ciudadId))
        .leftJoin(negocios, eq(negocios.id, usuarios.negocioId))
        .where(and(eq(usuarios.id, usuarioId), condicionVisibilidad(rolSolicitante, regionSolicitante)))
        .limit(1);

    // Sin fila = no existe O el solicitante no tiene permiso de verlo (gerente ante super/gerente/
    // vendedor de otra región). En ambos casos respondemos 404 (no se filtra la existencia).
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
    const autenticadoPorGoogle = !!u.autenticadoPorGoogle;

    const diagnostico: DiagnosticoAcceso = {
        correoVerificado: !!u.correoVerificado,
        tieneContrasena,
        bloqueadoPorIntentos,
        bloqueadoHasta: u.bloqueadoHasta ?? null,
        intentosFallidos: u.intentosFallidos ?? 0,
        requiereCambioContrasena: u.requiereCambioContrasena,
        // Lo que el login REALMENTE exige: estado activo + (contraseña creada O cuenta Google) + no bloqueado.
        // Una cuenta Google pura no tiene contraseña local pero SÍ inicia sesión con Google (ver auth.service login).
        puedeIniciarSesion: u.estado === 'activo' && (tieneContrasena || autenticadoPorGoogle) && !bloqueadoPorIntentos,
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
        telefono: u.telefono ?? null,
        ciudad: u.ciudad ?? null,
        avatarUrl: u.avatarUrl ?? null,
        genero: u.genero ?? null,
        fechaNacimiento: u.fechaNacimiento ?? null,
        createdAt: u.createdAt ?? null,
        ultimaConexion: u.ultimaConexion ?? null,
        ultimoAccesoPanel: u.ultimoAccesoPanel ?? null,
        estado: u.estado,
        perfil: u.perfil,
        membresia: u.membresia,
        tieneModoComercial: u.tieneModoComercial,
        modoActivo: u.modoActivo,
        correoVerificado: !!u.correoVerificado,
        correoVerificadoAt: u.correoVerificadoAt ?? null,
        autenticadoPorGoogle: !!u.autenticadoPorGoogle,
        dobleFactorHabilitado: !!u.dobleFactorHabilitado,
        panel2faHabilitado: u.panel2faHabilitado,
        calificacionPromedio: u.calificacionPromedio ?? null,
        totalCalificaciones: u.totalCalificaciones ?? 0,
        diagnostico,
        sombreros,
    };
}
