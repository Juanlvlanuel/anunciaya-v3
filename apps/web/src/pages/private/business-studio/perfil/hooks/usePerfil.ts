/**
 * ============================================================================
 * HOOK: usePerfil
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/hooks/usePerfil.ts
 * 
 * PROPÓSITO:
 * Hook principal para EDITAR el perfil del negocio/sucursal en Business Studio
 * Maneja estado, validaciones y actualizaciones por tabs
 * 
 * CARACTERÍSTICAS:
 * - Carga datos iniciales del negocio/sucursal
 * - Estado separado por tabs
 * - Actualizaciones optimistas
 * - Integración con negocioManagement.service
 * - Manejo de imágenes con Cloudinary
 * - Validaciones por sección
 * - Guardado independiente por tab
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../../services/api';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { notificar } from '../../../../../utils/notificaciones';
import { detectarZonaHoraria } from '../../../../../utils/zonaHoraria';
import { usePerfilSucursal, usePerfilSucursales } from '../../../../../hooks/queries/usePerfil';
import { queryKeys } from '../../../../../config/queryKeys';

// =============================================================================
// TIPOS
// =============================================================================

export interface DatosInformacion {
  nombre: string;
  nombreSucursal: string;
  descripcion: string;
  categoriaId: number;
  subcategoriasIds: number[];
  participaCardYA: boolean;
  esPrincipal: boolean;
  totalSucursales: number;
}

export interface DatosUbicacion {
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  latitud: number | null;
  longitud: number | null;
}

export interface DatosContacto {
  nombreSucursal?: string;  // Solo para gerentes
  telefono: string;
  whatsapp: string;
  email: string;
  sitioWeb: string;
  redesSociales: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  };
}

export interface HorarioDia {
  diaSemana: number;
  abierto: boolean;
  horaApertura: string | null;
  horaCierre: string | null;
  tieneHorarioComida: boolean;
  comidaInicio: string | null;
  comidaFin: string | null;
}

export interface DatosHorarios {
  horarios: HorarioDia[];
}

export interface DatosOperacion {
  metodosPago: {
    efectivo: boolean;
    tarjeta: boolean;
    transferencia: boolean;
  };
  tieneEnvio: boolean;
  tieneServicio: boolean;
}

export interface DatosImagenes {
  logoUrl: string | null;
  fotoPerfilUrl: string | null;
  portadaUrl: string | null;
  galeria: Array<{
    id: number;
    url: string;
    orden: number;
  }>;
}

interface PerfilCompleto {
  // Nivel Negocio
  negocioId: string;
  negocioNombre: string;
  negocioDescripcion: string;
  logoUrl: string | null;
  sitioWeb: string | null;
  aceptaCardya: boolean;

  // Nivel Sucursal
  sucursalId: string;
  sucursalNombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  fotoPerfilUrl: string | null;
  portadaUrl: string | null;
  tieneEnvioDomicilio: boolean;
  tieneServicioDomicilio: boolean;

  // Relaciones
  categorias: Array<{
    id: number;           // ID de subcategoría
    nombre: string;       // Nombre de subcategoría
    categoria: {          // Categoría padre
      id: number;
      nombre: string;
      icono: string;
    };
  }>;
  horarios: HorarioDia[];
  metodosPago: string[];
  redesSociales: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  };
  galeria: Array<{
    id: number;
    url: string;
    orden: number;
  }>;

}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export function usePerfil() {
  const usuario = useAuthStore((state) => state.usuario);
  const sucursalActiva = usuario?.sucursalActiva;
  const negocioId = usuario?.negocioId;
  const esGerente = usuario?.sucursalAsignada !== null;
  const qc = useQueryClient();

  // React Query — datos del servidor
  const perfilQuery = usePerfilSucursal();
  const sucursalesQuery = usePerfilSucursales();
  const sincronizadoRef = useRef<string | null>(null);

  // =============================================================================
  // ESTADO
  // =============================================================================

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados iniciales para detectar cambios
  const [datosInicialesInformacion, setDatosInicialesInformacion] = useState<DatosInformacion | null>(null);
  const [datosInicialesUbicacion, setDatosInicialesUbicacion] = useState<DatosUbicacion | null>(null);
  const [datosInicialesContacto, setDatosInicialesContacto] = useState<DatosContacto | null>(null);
  const [datosInicialesHorarios, setDatosInicialesHorarios] = useState<DatosHorarios | null>(null);
  const [datosInicialesOperacion, setDatosInicialesOperacion] = useState<DatosOperacion | null>(null);

  // Estados por tabs
  const [datosInformacion, setDatosInformacion] = useState<DatosInformacion>({
    nombre: '',
    nombreSucursal: '',
    descripcion: '',
    categoriaId: 0,
    subcategoriasIds: [],
    participaCardYA: false,
    esPrincipal: true,
    totalSucursales: 1,
  });

  const [datosUbicacion, setDatosUbicacion] = useState<DatosUbicacion>({
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    latitud: null,
    longitud: null,
  });

  const [datosContacto, setDatosContacto] = useState<DatosContacto>({
    nombreSucursal: '',
    telefono: '',
    whatsapp: '',
    email: '',
    sitioWeb: '',
    redesSociales: {},
  });

  const [datosHorarios, setDatosHorarios] = useState<DatosHorarios>({
    horarios: Array.from({ length: 7 }, (_, i) => ({
      diaSemana: i,
      abierto: i !== 0 && i !== 6, // Lunes-Viernes abiertos por defecto
      horaApertura: '09:00:00',
      horaCierre: '21:00:00',
      tieneHorarioComida: false,
      comidaInicio: '14:00:00',
      comidaFin: '16:00:00',
    })),
  });

  const [datosOperacion, setDatosOperacion] = useState<DatosOperacion>({
    metodosPago: {
      efectivo: false,
      tarjeta: false,
      transferencia: false,
    },
    tieneEnvio: false,
    tieneServicio: false,
  });

  const [datosImagenes, setDatosImagenes] = useState<DatosImagenes>({
    logoUrl: null,
    fotoPerfilUrl: null,
    portadaUrl: null,
    galeria: [],
  });

  // =============================================================================
  // SINCRONIZAR DATOS DE REACT QUERY → FORMULARIO LOCAL
  // =============================================================================

  const perfil = perfilQuery.data as PerfilCompleto | null | undefined;
  const sucursalesData = sucursalesQuery.data as Array<{ id: string; esPrincipal: boolean }> | undefined;

  useEffect(() => {
    if (!perfil || !sucursalActiva) return;

    // Evitar re-sincronizar si ya procesamos estos datos
    const clave = `${sucursalActiva}-${JSON.stringify(perfil).length}`;
    if (sincronizadoRef.current === clave) return;
    sincronizadoRef.current = clave;

    let totalSucursales = 1;
    let esPrincipal = true;
    if (sucursalesData) {
      totalSucursales = sucursalesData.length;
      const sucursalActual = sucursalesData.find(s => s.id === sucursalActiva);
      esPrincipal = sucursalActual?.esPrincipal ?? true;
    }

    const infoInicial = {
      nombre: perfil.negocioNombre,
      nombreSucursal: perfil.sucursalNombre || '',
      descripcion: perfil.negocioDescripcion || '',
      categoriaId: perfil.categorias[0]?.categoria.id || 0,
      subcategoriasIds: perfil.categorias.map(c => c.id),
      participaCardYA: perfil.aceptaCardya,
      esPrincipal,
      totalSucursales,
    };
    setDatosInformacion(infoInicial);
    setDatosInicialesInformacion(infoInicial);

    const ubicacionInicial = {
      direccion: perfil.direccion || '',
      ciudad: perfil.ciudad || '',
      estado: perfil.estado || '',
      codigoPostal: '',
      latitud: perfil.latitud,
      longitud: perfil.longitud,
    };
    setDatosUbicacion(ubicacionInicial);
    setDatosInicialesUbicacion(ubicacionInicial);

    const contactoInicial = {
      nombreSucursal: perfil.sucursalNombre || '',
      telefono: perfil.telefono || '',
      whatsapp: perfil.whatsapp || '',
      email: perfil.correo || '',
      sitioWeb: perfil.sitioWeb || '',
      redesSociales: perfil.redesSociales || {},
    };
    setDatosContacto(contactoInicial);
    setDatosInicialesContacto(contactoInicial);

    const horariosInicial = {
      horarios: perfil.horarios.map(h => ({
        diaSemana: h.diaSemana,
        abierto: h.abierto,
        horaApertura: h.horaApertura,
        horaCierre: h.horaCierre,
        tieneHorarioComida: h.tieneHorarioComida ?? false,
        comidaInicio: h.comidaInicio ?? '14:00:00',
        comidaFin: h.comidaFin ?? '16:00:00',
      })),
    };
    setDatosHorarios(horariosInicial);
    setDatosInicialesHorarios(horariosInicial);

    const operacionInicial = {
      metodosPago: {
        efectivo: perfil.metodosPago?.includes('efectivo') ?? false,
        tarjeta: (perfil.metodosPago?.includes('tarjeta_debito') || perfil.metodosPago?.includes('tarjeta_credito')) ?? false,
        transferencia: perfil.metodosPago?.includes('transferencia') ?? false,
      },
      tieneEnvio: perfil.tieneEnvioDomicilio ?? false,
      tieneServicio: perfil.tieneServicioDomicilio ?? false,
    };
    setDatosOperacion(operacionInicial);
    setDatosInicialesOperacion(operacionInicial);

    setDatosImagenes({
      logoUrl: perfil.logoUrl,
      fotoPerfilUrl: perfil.fotoPerfilUrl,
      portadaUrl: perfil.portadaUrl,
      galeria: perfil.galeria,
    });

    setLoading(false);
  }, [perfil, sucursalesData, sucursalActiva]);

  // Refetch helper — invalida React Query cache para recargar.
  // Incluye todas las caches que muestran datos del negocio/sucursal:
  // - perfil.sucursal: formulario y vista previa de Mi Perfil
  // - perfil.sucursales: lista global usada por SelectorSucursalesInline
  //   (header/sidebar) y modales de Duplicar en Catálogo/Ofertas
  // - negocios.detalle: página pública del negocio (mismo endpoint, diferente key)
  // - negocios.lista: cards de la sección pública Negocios (nombre, horarios, etc.)
  // - guardados.negocios: cards en "Mis Guardados" del usuario
  const refetch = useCallback(() => {
    sincronizadoRef.current = null;
    if (sucursalActiva) {
      qc.invalidateQueries({ queryKey: queryKeys.perfil.sucursal(sucursalActiva) });
      qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(sucursalActiva) });
      qc.invalidateQueries({ queryKey: ['negocios', 'lista'] });
      qc.invalidateQueries({ queryKey: ['guardados', 'negocios'] });
      qc.invalidateQueries({ queryKey: ['perfil', 'sucursales'] });
    }
  }, [sucursalActiva, qc]);

  /**
 * ============================================================================
 * FUNCIÓN DE VALIDACIÓN DE HORARIOS
 * ============================================================================
 * 
 * DÓNDE AGREGAR: apps/web/src/pages/private/business-studio/perfil/hooks/usePerfil.ts
 * UBICACIÓN: Agregar ANTES de la función guardarTodo() (aproximadamente línea 330)
 * 
 * PROPÓSITO:
 * Validar que los horarios sean consistentes antes de guardar
 * - Si está abierto, debe tener hora_apertura Y hora_cierre
 * - hora_cierre debe ser MAYOR que hora_apertura
 * - Si tiene horario de comida, comida_fin debe ser MAYOR que comida_inicio
 */

  function validarHorarios(horarios: HorarioDia[]): string[] {
    const errores: string[] = [];
    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (const horario of horarios) {
      const nombreDia = diasNombres[horario.diaSemana];

      // Si está marcado como abierto, DEBE tener horarios
      if (horario.abierto) {
        if (!horario.horaApertura || !horario.horaCierre) {
          errores.push(`${nombreDia}: Falta hora de apertura o cierre`);
          continue;
        }

        // Validar que hora_cierre > hora_apertura
        const apertura = horario.horaApertura.substring(0, 5); // "09:00"
        const cierre = horario.horaCierre.substring(0, 5);     // "21:00"

        if (cierre <= apertura) {
          errores.push(`${nombreDia}: La hora de cierre (${cierre}) debe ser mayor que la de apertura (${apertura})`);
        }

        // Validar horario de comida si existe
        if (horario.tieneHorarioComida && horario.comidaInicio && horario.comidaFin) {
          const comidaInicio = horario.comidaInicio.substring(0, 5);
          const comidaFin = horario.comidaFin.substring(0, 5);

          // Validar que comida_fin > comida_inicio
          if (comidaFin <= comidaInicio) {
            errores.push(`${nombreDia}: El fin de comida (${comidaFin}) debe ser mayor que el inicio (${comidaInicio})`);
          }

          // Validar que el horario de comida esté dentro del horario de operación
          if (comidaInicio < apertura || comidaFin > cierre) {
            errores.push(`${nombreDia}: El horario de comida debe estar dentro del horario de operación`);
          }
        }
      }
    }

    return errores;
  }

  // =============================================================================
  // FUNCIÓN ÚNICA DE GUARDADO
  // =============================================================================

  /**
   * Guarda todos los cambios detectados en Mi Perfil
   * Detecta automáticamente qué tabs fueron modificados
   */
  const guardarTodo = async () => {
    if (!negocioId) return;

    const cambiosDetectados: string[] = [];
    const errores: string[] = [];

    try {
      setGuardando(true);

      // Determinar si el dueño está viendo como gerente (sucursal secundaria)
      const vistaComoGerenteGuardado = esGerente || (datosInformacion.totalSucursales > 1 && !datosInformacion.esPrincipal);

      // =========================================================================
      // INFORMACIÓN (solo dueños en sucursal principal o con 1 sucursal)
      // =========================================================================
      if (!vistaComoGerenteGuardado && datosInicialesInformacion) {
        const cambioInfo = JSON.stringify(datosInformacion) !== JSON.stringify(datosInicialesInformacion);

        if (cambioInfo) {
          cambiosDetectados.push('Datos del Negocio');
          const datosAnteriores = { ...datosInformacion };

          try {
            await api.put(`/negocios/${negocioId}/informacion`, {
              nombre: datosInformacion.nombre,
              descripcion: datosInformacion.descripcion,
              subcategoriasIds: datosInformacion.subcategoriasIds,
              participaCardYA: datosInformacion.participaCardYA,
              ...(datosInformacion.totalSucursales > 1 && {
                nombreSucursal: datosInformacion.nombreSucursal,
                sucursalId: sucursalActiva,
              }),
            });

            // Sincronizar authStore con los campos que se leen desde Navbar,
            // MenuDrawer, SelectorSucursalesInline y ColumnaIzquierda.
            // Estos componentes NO usan React Query para estos datos, leen
            // directo del store de Zustand persistido al login.
            const usuarioActual = useAuthStore.getState().usuario;
            if (usuarioActual) {
              const cambioNombre = datosInformacion.nombre !== datosInicialesInformacion.nombre;
              const cambioNombreSucursal =
                datosInformacion.totalSucursales > 1 &&
                datosInformacion.nombreSucursal !== datosInicialesInformacion.nombreSucursal;
              if (cambioNombre || cambioNombreSucursal) {
                useAuthStore.getState().setUsuario({
                  ...usuarioActual,
                  ...(cambioNombre && { nombreNegocio: datosInformacion.nombre }),
                  ...(cambioNombreSucursal && { nombreSucursalAsignada: datosInformacion.nombreSucursal }),
                });
              }
            }
          } catch (error) {
            setDatosInformacion(datosAnteriores);
            errores.push('Datos del Negocio');
            console.error('Error al guardar información:', error);
          }
        }
      }

      // =========================================================================
      // CONTACTO
      // =========================================================================
      if (datosInicialesContacto) {
        const cambioContacto = JSON.stringify(datosContacto) !== JSON.stringify(datosInicialesContacto);
        const cambioNombreSucursal = vistaComoGerenteGuardado && datosInicialesInformacion
          ? datosInformacion.nombreSucursal !== datosInicialesInformacion.nombreSucursal
          : false;

        if (cambioContacto || cambioNombreSucursal) {
          cambiosDetectados.push(vistaComoGerenteGuardado ? 'Datos de Sucursal' : 'Contacto');
          const datosAnteriores = { ...datosContacto };

          try {
            await api.put(`/negocios/${negocioId}/contacto`, {
              nombreSucursal: vistaComoGerenteGuardado ? datosInformacion.nombreSucursal : undefined,
              telefono: datosContacto.telefono,
              whatsapp: datosContacto.whatsapp,
              correo: datosContacto.email,
              sitioWeb: !vistaComoGerenteGuardado ? datosContacto.sitioWeb : undefined,
              redesSociales: datosContacto.redesSociales,
            });

            // Sincronizar authStore: Navbar y MenuDrawer muestran el email
            // (correoNegocio / correoSucursalAsignada) como fallback, y el
            // nombre de sucursal cuando se edita en vista gerente.
            const usuarioActual = useAuthStore.getState().usuario;
            if (usuarioActual) {
              const cambioEmail =
                datosInicialesContacto && datosContacto.email !== datosInicialesContacto.email;
              useAuthStore.getState().setUsuario({
                ...usuarioActual,
                ...(cambioEmail && vistaComoGerenteGuardado
                  ? { correoSucursalAsignada: datosContacto.email }
                  : cambioEmail
                  ? { correoNegocio: datosContacto.email }
                  : {}),
                ...(cambioNombreSucursal && {
                  nombreSucursalAsignada: datosInformacion.nombreSucursal,
                }),
              });
            }
          } catch (error) {
            setDatosContacto(datosAnteriores);
            errores.push('Contacto');
            console.error('Error al guardar contacto:', error);
          }
        }
      }

      // =========================================================================
      // UBICACIÓN
      // =========================================================================
      if (datosInicialesUbicacion) {
        const cambioUbicacion = JSON.stringify(datosUbicacion) !== JSON.stringify(datosInicialesUbicacion);

        if (cambioUbicacion) {
          cambiosDetectados.push('Ubicación');
          const datosAnteriores = { ...datosUbicacion };

          try {
            await api.put(`/negocios/${negocioId}/ubicacion`, {
              direccion: datosUbicacion.direccion,
              ciudad: datosUbicacion.ciudad,
              estado: datosUbicacion.estado,
              latitud: datosUbicacion.latitud,
              longitud: datosUbicacion.longitud,
              zonaHoraria: detectarZonaHoraria(
                datosUbicacion.latitud ?? 19.4326,
                datosUbicacion.longitud ?? -99.1332
              ),
            });
          } catch (error) {
            setDatosUbicacion(datosAnteriores);
            errores.push('Ubicación');
            console.error('Error al guardar ubicación:', error);
          }
        }
      }

      // =========================================================================
      // HORARIOS
      // =========================================================================
      if (datosInicialesHorarios) {
        const cambioHorarios = JSON.stringify(datosHorarios) !== JSON.stringify(datosInicialesHorarios);

        if (cambioHorarios) {
          cambiosDetectados.push('Horarios');
          const datosAnteriores = { ...datosHorarios };

          // Validar horarios antes de guardar
          const erroresValidacion = validarHorarios(datosHorarios.horarios);
          if (erroresValidacion.length > 0) {
            notificar.error(`Horarios inválidos:\n${erroresValidacion.join('\n')}`);
            return;
          }

          try {
            await api.put(`/negocios/${negocioId}/horarios`, {
              horarios: datosHorarios.horarios,
            });
          } catch (error) {
            setDatosHorarios(datosAnteriores);
            errores.push('Horarios');
            console.error('Error al guardar horarios:', error);
          }
        }
      }

      // =========================================================================
      // OPERACIÓN
      // =========================================================================
      if (datosInicialesOperacion) {
        const cambioOperacion = JSON.stringify(datosOperacion) !== JSON.stringify(datosInicialesOperacion);

        if (cambioOperacion) {
          cambiosDetectados.push('Operación');
          const datosAnteriores = { ...datosOperacion };

          try {
            const metodos: string[] = [];

            if (datosOperacion.metodosPago.efectivo) {
              metodos.push('efectivo');
            }

            if (datosOperacion.metodosPago.tarjeta) {
              metodos.push('tarjeta_debito');
              metodos.push('tarjeta_credito');
            }

            if (datosOperacion.metodosPago.transferencia) {
              metodos.push('transferencia');
            }

            if (metodos.length === 0) {
              throw new Error('Debes seleccionar al menos un método de pago');
            }

            await api.put(`/negocios/${negocioId}/operacion`, {
              metodosPago: metodos,
              tieneEnvio: datosOperacion.tieneEnvio,
              tieneServicio: datosOperacion.tieneServicio,
            });
          } catch (error) {
            setDatosOperacion(datosAnteriores);
            errores.push('Operación');
            console.error('Error al guardar operación:', error);
          }
        }
      }

      // =========================================================================
      // RESULTADO
      // =========================================================================

      // Si no hay cambios
      if (cambiosDetectados.length === 0) {
        notificar.info('No hay cambios pendientes por guardar');
        return;
      }

      // Recargar datos para actualizar estados iniciales (silencioso = sin spinner)
      refetch();

      // Notificaciones según resultado
      if (errores.length === 0) {
        const seccionesGuardadas = cambiosDetectados.join(', ');
        notificar.exito(`Cambios guardados: ${seccionesGuardadas}`);
      } else if (errores.length < cambiosDetectados.length) {
        const exitosas = cambiosDetectados.filter(c => !errores.includes(c)).join(', ');
        const fallidas = errores.join(', ');
        notificar.advertencia(`Guardado parcial\nExitoso: ${exitosas}\nError: ${fallidas}`);
      } else {
        notificar.error('No se pudo guardar ningún cambio');
      }
    } catch (error) {
      console.error('Error en guardarTodo:', error);
      notificar.error('Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  };

  // =============================================================================
  // RETURN
  // =============================================================================

  // Detectar si hay cambios pendientes (misma lógica que guardarTodo)
  const hayCambios = useMemo(() => {
    const vistaComoG = esGerente || (datosInformacion.totalSucursales > 1 && !datosInformacion.esPrincipal);
    if (!vistaComoG && datosInicialesInformacion && JSON.stringify(datosInformacion) !== JSON.stringify(datosInicialesInformacion)) return true;
    if (datosInicialesContacto && JSON.stringify(datosContacto) !== JSON.stringify(datosInicialesContacto)) return true;
    if (vistaComoG && datosInicialesInformacion && datosInformacion.nombreSucursal !== datosInicialesInformacion.nombreSucursal) return true;
    if (datosInicialesUbicacion && JSON.stringify(datosUbicacion) !== JSON.stringify(datosInicialesUbicacion)) return true;
    if (datosInicialesHorarios && JSON.stringify(datosHorarios) !== JSON.stringify(datosInicialesHorarios)) return true;
    if (datosInicialesOperacion && JSON.stringify(datosOperacion) !== JSON.stringify(datosInicialesOperacion)) return true;
    return false;
  }, [datosInformacion, datosContacto, datosUbicacion, datosHorarios, datosOperacion,
      datosInicialesInformacion, datosInicialesContacto, datosInicialesUbicacion, datosInicialesHorarios, datosInicialesOperacion, esGerente]);

  return {
    // Estado general
    loading,
    guardando,
    error,
    esGerente,
    hayCambios,

    // Datos por tabs
    datosInformacion,
    datosUbicacion,
    datosContacto,
    datosHorarios,
    datosOperacion,
    datosImagenes,

    // Setters
    setDatosInformacion,
    setDatosUbicacion,
    setDatosContacto,
    setDatosHorarios,
    setDatosOperacion,
    setDatosImagenes,

    // Única acción de guardado
    guardarTodo,
    refetch,
  };
}

export default usePerfil;