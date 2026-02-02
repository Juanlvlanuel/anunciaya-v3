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

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../../services/api';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { notificar } from '../../../../../utils/notificaciones';
import { detectarZonaHoraria } from '../../../../../utils/zonaHoraria';

// =============================================================================
// TIPOS
// =============================================================================

export interface DatosInformacion {
  nombre: string;
  descripcion: string;
  categoriaId: number;
  subcategoriasIds: number[];
  participaCardYA: boolean;
}

export interface DatosUbicacion {
  direccion: string;
  ciudad: string;
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
    descripcion: '',
    categoriaId: 0,
    subcategoriasIds: [],
    participaCardYA: false,
  });

  const [datosUbicacion, setDatosUbicacion] = useState<DatosUbicacion>({
    direccion: '',
    ciudad: '',
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
  // CARGAR DATOS INICIALES
  // =============================================================================

  const cargarDatos = useCallback(async () => {
    if (!sucursalActiva || !negocioId) {
      setError('No hay sucursal activa');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener perfil completo de la sucursal
      const response = await api.get<{ success: boolean; data: PerfilCompleto }>(
        `/negocios/sucursal/${sucursalActiva}`
      );

      if (response.data.success && response.data.data) {
        const perfil = response.data.data;

        // Mapear a estados locales
        const infoInicial = {
          nombre: perfil.negocioNombre,
          descripcion: perfil.negocioDescripcion || '',
          categoriaId: perfil.categorias[0]?.categoria.id || 0,
          subcategoriasIds: perfil.categorias.map(c => c.id),
          participaCardYA: perfil.aceptaCardya,
        };
        setDatosInformacion(infoInicial);
        setDatosInicialesInformacion(infoInicial);

        const ubicacionInicial = {
          direccion: perfil.direccion || '',
          ciudad: perfil.ciudad || '',
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
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar datos');
      notificar.error('Error al cargar datos del perfil');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, negocioId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

      // =========================================================================
      // INFORMACIÓN (solo dueños)
      // =========================================================================
      if (!esGerente && datosInicialesInformacion) {
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
            });

            // Actualizar nombreNegocio en authStore si cambió el nombre
            if (usuario && datosInformacion.nombre !== datosInicialesInformacion.nombre) {
              const usuarioActual = useAuthStore.getState().usuario;
              if (usuarioActual) {
                useAuthStore.getState().setUsuario({
                  ...usuarioActual,
                  nombreNegocio: datosInformacion.nombre,
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
        
        if (cambioContacto) {
          cambiosDetectados.push(esGerente ? 'Datos de Sucursal' : 'Contacto');
          const datosAnteriores = { ...datosContacto };
          
          try {
            await api.put(`/negocios/${negocioId}/contacto`, {
              nombreSucursal: esGerente ? datosContacto.nombreSucursal : undefined,
              telefono: datosContacto.telefono,
              whatsapp: datosContacto.whatsapp,
              correo: datosContacto.email,
              sitioWeb: !esGerente ? datosContacto.sitioWeb : undefined,
              redesSociales: datosContacto.redesSociales,
            });
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

      // Recargar datos para actualizar estados iniciales
      await cargarDatos();

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

  return {
    // Estado general
    loading,
    guardando,
    error,
    esGerente,

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
    refetch: cargarDatos,
  };
}

export default usePerfil;