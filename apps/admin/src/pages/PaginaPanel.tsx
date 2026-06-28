/**
 * PaginaPanel.tsx
 * ================
 * Shell del Panel. Elige la vista escritorio o móvil según el viewport (no por
 * rol — responsive). El rol (del store, traído por /api/admin/yo) filtra el menú
 * y el alcance. Negocios ya está construida; las demás secciones son placeholders por ahora.
 *
 * Ubicación: apps/admin/src/pages/PaginaPanel.tsx
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthPanelStore } from '../stores/useAuthPanelStore';
import { useFiltroRegion } from '../stores/useFiltroRegion';
import { refrescarSesion, msDesdeUltimoRefresh } from '../services/api';
import { useEsEscritorio } from '../hooks/useEsEscritorio';
import { useConteoNegocios } from '../hooks/queries/useNegociosAdmin';
import { useConteoUsuarios } from '../hooks/queries/useUsuariosAdmin';
import { useConteoEquipo } from '../hooks/queries/useEquipoAdmin';
import { useSolicitudesPendientes } from '../hooks/queries/useSuscripcionesAdmin';
import { usePrecargarConfiguracion } from '../hooks/queries/useConfiguracionAdmin';
import { useContadorPanel } from '../stores/useContadorPanel';
import { obtenerTema, alternarTema, type Tema } from '../utils/tema';
import { iconoDeSeccion } from '../config/iconosPanel';
import { itemsParaRol, etiquetaDe, type RolPanel } from '../data/menuPanel';
import { useNavegacionPanel } from '../stores/useNavegacionPanel';
import { LayoutEscritorio } from '../components/shell/LayoutEscritorio';
import { LayoutMovil } from '../components/shell/LayoutMovil';
import PaginaSeguridad from './PaginaSeguridad';
import { SeccionResumen } from '../components/resumen/SeccionResumen';
import { SeccionMetricas } from '../components/metricas/SeccionMetricas';
import { SeccionNegocios } from '../components/negocios/SeccionNegocios';
import { SeccionUsuarios } from '../components/usuarios/SeccionUsuarios';
import { SeccionSuscripciones } from '../components/suscripciones/SeccionSuscripciones';
import { SeccionRecibos } from '../components/recibos/SeccionRecibos';
import { SeccionEquipo } from '../components/equipo/SeccionEquipo';
import { SeccionVendedores } from '../components/vendedores/SeccionVendedores';
import { SeccionConfiguracion } from '../components/configuracion/SeccionConfiguracion';
import { SeccionCiudades } from '../components/ciudades/SeccionCiudades';
import { SeccionTerritorios } from '../components/territorios/SeccionTerritorios';
import { SeccionAuditoria } from '../components/auditoria/SeccionAuditoria';
import { SeccionPublicidad } from '../components/publicidad/SeccionPublicidad';
import { SeccionMantenimiento } from '../components/mantenimiento/SeccionMantenimiento';

function ContenidoSeccion({ titulo, iconoClave }: { titulo: string; iconoClave: string }) {
  const Icono = iconoDeSeccion(iconoClave);
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl border border-borde text-texto-3">
        <Icono size={28} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-texto">{titulo}</h3>
      <p className="mt-1 max-w-sm text-sm text-texto-3">
        El contenido de esta sección se diseñará por separado. Este es el armazón del Panel.
      </p>
      <span className="mt-3 rounded-full border border-borde px-3 py-1 font-mono text-[11px] text-texto-4">
        sección · contenido por diseñar
      </span>
    </div>
  );
}

/** Recuerda la última sección abierta entre recargas (clave de localStorage). */
const CLAVE_SECCION = 'panel:seccion';
function leerSeccionInicial(): string {
  try {
    return localStorage.getItem(CLAVE_SECCION) || 'resumen';
  } catch {
    return 'resumen';
  }
}

function PaginaPanel() {
  const navigate = useNavigate();
  const usuario = useAuthPanelStore((s) => s.usuario);
  const cerrarSesion = useAuthPanelStore((s) => s.cerrarSesion);
  const esEscritorio = useEsEscritorio();

  const [tema, setTema] = useState<Tema>(obtenerTema());
  // Sección activa: arranca en la última recordada y se persiste en cada cambio.
  const [seccionActivaId, setSeccionRaw] = useState<string>(leerSeccionInicial);
  const setSeccion = useCallback((id: string) => {
    setSeccionRaw(id);
    try {
      localStorage.setItem(CLAVE_SECCION, id);
    } catch {
      /* ignore */
    }
  }, []);
  // Filtro global de región (solo el superadmin lo cambia). '' = toda la plataforma.
  const regionFiltro = useFiltroRegion((s) => s.regionId);
  const setRegionFiltro = useFiltroRegion((s) => s.setRegion);
  const regionActivaId = regionFiltro ?? '';
  const onCambiarRegion = (id: string) => setRegionFiltro(id || null);

  // Menú según el rol (se calcula ANTES de los conteos para gatearlos: un rol que no tiene el módulo
  // —p. ej. el vendedor con Usuarios/Equipo— no debe pedir su conteo, el endpoint le daría 403).
  const rolMenu = (usuario?.rolEquipo ?? null) as RolPanel | null;
  const items = useMemo(() => (rolMenu ? itemsParaRol(rolMenu) : []), [rolMenu]);
  const puedeVer = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  // Contadores del menú: Negocios = conteo general del alcance; Usuarios = total de la sección
  // (refleja los filtros aplicados; lo publica SeccionUsuarios en el store).
  const { data: totalNegocios } = useConteoNegocios(puedeVer('negocios'));
  const { data: totalUsuariosGeneral } = useConteoUsuarios(puedeVer('usuarios'));
  const totalUsuariosFiltrado = useContadorPanel((s) => s.usuarios);
  const { data: totalEquipoGeneral } = useConteoEquipo(puedeVer('equipo'));
  const totalEquipoFiltrado = useContadorPanel((s) => s.equipo);
  // Suscripciones = nº de pagos manuales "Por verificar" (cola accionable). Mismo hook que la
  // pestaña, así el badge del menú y el de la pestaña siempre cuadran. Gateado por acceso.
  const { data: solicitudesPendientes } = useSolicitudesPendientes(puedeVer('suscripciones'));
  // Filtrado (de la sección activa) si lo hay; si no, el conteo general (visible desde el inicio).
  const totalUsuarios = totalUsuariosFiltrado ?? totalUsuariosGeneral;
  const totalEquipo = totalEquipoFiltrado ?? totalEquipoGeneral;
  const totalPorVerificar = solicitudesPendientes?.length ?? 0;
  const contadores = useMemo(() => {
    const c: Record<string, number> = {};
    if (totalNegocios != null) c.negocios = totalNegocios;
    if (totalUsuarios != null) c.usuarios = totalUsuarios;
    if (totalEquipo != null) c.equipo = totalEquipo;
    if (totalPorVerificar > 0) c.suscripciones = totalPorVerificar;
    return Object.keys(c).length ? c : undefined;
  }, [totalNegocios, totalUsuarios, totalEquipo, totalPorVerificar]);

  // Si la sección recordada (de una recarga) no aplica a este rol, se cae a la primera del menú;
  // "seguridad" (Mi cuenta) siempre es válida. (rolMenu/items se declaran arriba, junto a los conteos.)
  useEffect(() => {
    if (!items.length) return;
    if (seccionActivaId !== 'seguridad' && !items.some((i) => i.id === seccionActivaId)) {
      setSeccion(items[0]?.id ?? 'resumen');
    }
  }, [items, seccionActivaId, setSeccion]);

  // Precarga en segundo plano los datos de Configuración (solo el rol con acceso al módulo) al entrar
  // al Panel, para que la sección abra sin el estado "Cargando…" ni el parpadeo del precio.
  const puedeConfig = useMemo(() => items.some((i) => i.id === 'configuracion'), [items]);
  usePrecargarConfiguracion(puedeConfig);

  // Keep-alive de la sesión: el access token dura 1h y solo se renueva al hacer peticiones; este
  // refresco proactivo (cada ~50 min, y al volver a la pestaña si ya pasó el intervalo) evita que el
  // token venza mientras el usuario trabaja solo en la UI y lo expulse al login.
  const haySesion = !!usuario;
  useEffect(() => {
    if (!haySesion) return;
    const INTERVALO = 50 * 60 * 1000;
    const id = window.setInterval(() => { void refrescarSesion(); }, INTERVALO);
    const alVolver = () => {
      if (document.visibilityState === 'visible' && msDesdeUltimoRefresh() > INTERVALO) void refrescarSesion();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [haySesion]);

  // Deep-link desde el Resumen / la campana: cuando se pide navegar a una sección (con filtro
  // inicial), cambiamos a ella y limpiamos el destino. El filtro lo consume la sección destino.
  const destinoNav = useNavegacionPanel((s) => s.destino);
  const limpiarDestino = useNavegacionPanel((s) => s.limpiarDestino);
  useEffect(() => {
    if (!destinoNav) return;
    setSeccion(destinoNav);
    limpiarDestino();
  }, [destinoNav, setSeccion, limpiarDestino]);

  // Si por algo entramos sin rol de equipo, no hay menú que mostrar.
  if (!usuario?.rolEquipo) {
    return (
      <div className="grid min-h-screen place-items-center bg-lienzo p-6 text-center">
        <div>
          <p className="text-sm text-texto-3">Esta cuenta no tiene acceso al Panel.</p>
          <button
            type="button"
            onClick={() => {
              cerrarSesion();
              navigate('/', { replace: true });
            }}
            className="mt-3 rounded-[10px] bg-marca px-4 py-2 text-sm font-semibold text-marca-contraste"
          >
            Volver al acceso
          </button>
        </div>
      </div>
    );
  }

  const rol = usuario.rolEquipo as RolPanel;
  // "seguridad" es una sección especial (Mi cuenta), no está en el menú lateral.
  const esSeguridad = seccionActivaId === 'seguridad';
  const itemActivo = items.find((i) => i.id === seccionActivaId) ?? items[0];
  const titulo = esSeguridad ? 'Seguridad' : etiquetaDe(itemActivo, rol);
  const iconoClave = esSeguridad ? 'seguridad' : itemActivo.icono;
  const nombre =
    [usuario.nombre, usuario.apellidos].filter(Boolean).join(' ') || usuario.correo || 'Usuario';

  const onAlternarTema = () => setTema(alternarTema());
  const onCerrarSesion = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  const contenido = esSeguridad ? (
    <PaginaSeguridad />
  ) : seccionActivaId === 'resumen' ? (
    <SeccionResumen rol={rol} />
  ) : seccionActivaId === 'metricas' ? (
    <SeccionMetricas rol={rol} />
  ) : seccionActivaId === 'negocios' ? (
    <SeccionNegocios rol={rol} />
  ) : seccionActivaId === 'usuarios' ? (
    <SeccionUsuarios />
  ) : seccionActivaId === 'suscripciones' ? (
    <SeccionSuscripciones rol={rol} />
  ) : seccionActivaId === 'recibos' ? (
    <SeccionRecibos rol={rol} />
  ) : seccionActivaId === 'equipo' ? (
    <SeccionEquipo />
  ) : seccionActivaId === 'comisiones' ? (
    <SeccionVendedores rol={rol} />
  ) : seccionActivaId === 'territorios' ? (
    <SeccionTerritorios rol={rol} />
  ) : seccionActivaId === 'configuracion' ? (
    <SeccionConfiguracion />
  ) : seccionActivaId === 'ciudades' ? (
    <SeccionCiudades />
  ) : seccionActivaId === 'auditoria' ? (
    <SeccionAuditoria rol={rol} />
  ) : seccionActivaId === 'publicidad' ? (
    <SeccionPublicidad rol={rol} />
  ) : seccionActivaId === 'mantenimiento' ? (
    <SeccionMantenimiento />
  ) : (
    <ContenidoSeccion titulo={titulo} iconoClave={itemActivo.icono} />
  );

  if (esEscritorio) {
    return (
      <LayoutEscritorio
        rol={rol}
        nombre={nombre}
        avatarUrl={usuario.avatarUrl}
        seccionActivaId={seccionActivaId}
        tituloSeccion={titulo}
        iconoSeccionClave={iconoClave}
        onSeleccionar={setSeccion}
        regionActivaId={regionActivaId}
        onCambiarRegion={onCambiarRegion}
        tema={tema}
        onAlternarTema={onAlternarTema}
        onCerrarSesion={onCerrarSesion}
        contadores={contadores}
      >
        {contenido}
      </LayoutEscritorio>
    );
  }

  return (
    <LayoutMovil
      rol={rol}
      seccionActivaId={seccionActivaId}
      onSeleccionar={setSeccion}
      regionActivaId={regionActivaId}
      onCambiarRegion={onCambiarRegion}
      tema={tema}
      onAlternarTema={onAlternarTema}
      onCerrarSesion={onCerrarSesion}
      contadores={contadores}
    >
      {contenido}
    </LayoutMovil>
  );
}

export default PaginaPanel;
