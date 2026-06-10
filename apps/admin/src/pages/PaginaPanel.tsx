/**
 * PaginaPanel.tsx
 * ================
 * Shell del Panel. Elige la vista escritorio o móvil según el viewport (no por
 * rol — responsive). El rol (del store, traído por /api/admin/yo) filtra el menú
 * y el alcance. Negocios ya está construida; las demás secciones son placeholders por ahora.
 *
 * Ubicación: apps/admin/src/pages/PaginaPanel.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthPanelStore } from '../stores/useAuthPanelStore';
import { useFiltroRegion } from '../stores/useFiltroRegion';
import { useEsEscritorio } from '../hooks/useEsEscritorio';
import { obtenerTema, alternarTema, type Tema } from '../utils/tema';
import { iconoDeSeccion } from '../config/iconosPanel';
import { itemsParaRol, etiquetaDe, type RolPanel } from '../data/menuPanel';
import { LayoutEscritorio } from '../components/shell/LayoutEscritorio';
import { LayoutMovil } from '../components/shell/LayoutMovil';
import PaginaSeguridad from './PaginaSeguridad';
import { SeccionNegocios } from '../components/negocios/SeccionNegocios';

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

function PaginaPanel() {
  const navigate = useNavigate();
  const usuario = useAuthPanelStore((s) => s.usuario);
  const cerrarSesion = useAuthPanelStore((s) => s.cerrarSesion);
  const esEscritorio = useEsEscritorio();

  const [tema, setTema] = useState<Tema>(obtenerTema());
  const [seccionActivaId, setSeccion] = useState('resumen');
  // Filtro global de región (solo el superadmin lo cambia). '' = toda la plataforma.
  const regionFiltro = useFiltroRegion((s) => s.regionId);
  const setRegionFiltro = useFiltroRegion((s) => s.setRegion);
  const regionActivaId = regionFiltro ?? '';
  const onCambiarRegion = (id: string) => setRegionFiltro(id || null);

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
  const items = itemsParaRol(rol);
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
  ) : seccionActivaId === 'negocios' ? (
    <SeccionNegocios rol={rol} />
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
      >
        {contenido}
      </LayoutEscritorio>
    );
  }

  return (
    <LayoutMovil
      rol={rol}
      nombre={nombre}
      avatarUrl={usuario.avatarUrl}
      seccionActivaId={seccionActivaId}
      onSeleccionar={setSeccion}
      regionActivaId={regionActivaId}
      tema={tema}
      onAlternarTema={onAlternarTema}
      onCerrarSesion={onCerrarSesion}
    >
      {contenido}
    </LayoutMovil>
  );
}

export default PaginaPanel;
