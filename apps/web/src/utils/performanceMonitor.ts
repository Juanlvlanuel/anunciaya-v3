/**
 * performanceMonitor.ts
 * ======================
 * Store singleton para monitoreo de performance de Business Studio.
 * Sin dependencias de React ni Zustand — clase TypeScript pura.
 *
 * CÓMO USAR:
 * 1. Abrir DevTools en producción
 * 2. En consola escribir: window.__PERF_BS__ = true
 * 3. Navegar entre módulos de Business Studio normalmente
 * 4. Clic en "Descargar reporte" en el panel flotante (esquina inferior izquierda)
 * 5. Subir el archivo .json al chat para análisis
 *
 * Ubicación: apps/web/src/utils/performanceMonitor.ts
 */

// ============================================================
// TIPOS
// ============================================================

export interface LlamadaAPI {
  url: string;
  duracion_ms: number;
  status: number;
  origen: 'red' | 'error';
}

interface EntradaNavegacion {
  modulo: string;
  ruta: string;
  timestamp: string;
  tiempo_hasta_primer_render_ms: number;
  origen_render: 'cache' | 'red' | '';
  llamadas_api: LlamadaAPI[];
}

interface ResumenReporte {
  total_navegaciones: number;
  promedio_carga_ms: number;
  mas_lento_ms: number;
  mas_rapido_ms: number;
  total_llamadas_api: number;
  errores_red: number;
  timeouts: number;
}

interface ReportePerformance {
  meta: {
    ambiente: string;
    fecha: string;
    url_base: string;
    duracion_sesion_ms: number;
  };
  navegacion: EntradaNavegacion[];
  resumen: ResumenReporte;
}

// ============================================================
// HELPERS
// ============================================================

const NOMBRES_MODULOS: Record<string, string> = {
  '/business-studio': 'Dashboard',
  '/business-studio/perfil': 'Mi Perfil',
  '/business-studio/catalogo': 'Catálogo',
  '/business-studio/promociones': 'Promociones',
  '/business-studio/puntos': 'Puntos',
  '/business-studio/transacciones': 'Transacciones',
  '/business-studio/clientes': 'Clientes',
  '/business-studio/opiniones': 'Opiniones',
  '/business-studio/alertas': 'Alertas',
  '/business-studio/empleados': 'Empleados',
  '/business-studio/reportes': 'Reportes',
  '/business-studio/sucursales': 'Sucursales',
};

function obtenerNombreModulo(ruta: string): string {
  if (NOMBRES_MODULOS[ruta]) return NOMBRES_MODULOS[ruta];
  const coincidencia = Object.keys(NOMBRES_MODULOS).find(
    k => k !== '/business-studio' && ruta.startsWith(k)
  );
  return coincidencia ? NOMBRES_MODULOS[coincidencia] : 'Business Studio';
}

function formatTimestamp(fecha: Date): string {
  return fecha.toTimeString().slice(0, 8);
}

// ============================================================
// CLASE SINGLETON
// ============================================================

class PerformanceMonitor {
  private navegaciones: EntradaNavegacion[] = [];
  private inicioSesion: number = performance.now();
  private navegacionActual: EntradaNavegacion | null = null;
  private inicioNavegacion: number = 0;

  // ---- Navegación ----

  registrarNavegacion(ruta: string): void {
    // Guardar navegación anterior si existe
    if (this.navegacionActual) {
      if (this.navegacionActual.tiempo_hasta_primer_render_ms === 0) {
        this.navegacionActual.tiempo_hasta_primer_render_ms = Math.round(
          performance.now() - this.inicioNavegacion
        );
      }
      this.navegaciones.push(this.navegacionActual);
    }

    // Solo monitorear rutas de Business Studio
    if (!ruta.includes('/business-studio')) {
      this.navegacionActual = null;
      return;
    }

    this.inicioNavegacion = performance.now();
    this.navegacionActual = {
      modulo: obtenerNombreModulo(ruta),
      ruta,
      timestamp: formatTimestamp(new Date()),
      tiempo_hasta_primer_render_ms: 0,
      origen_render: '',
      llamadas_api: [],
    };

    // Doble rAF: garantiza que React ya pintó el primer frame.
    // Si no llegó ninguna llamada API antes, cerramos el timer aquí (caché).
    const tiempoInicio = this.inicioNavegacion;
    const navegacionActiva = this.navegacionActual;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (navegacionActiva.tiempo_hasta_primer_render_ms === 0) {
          navegacionActiva.tiempo_hasta_primer_render_ms =
            Math.round(performance.now() - tiempoInicio);
          navegacionActiva.origen_render = 'cache';
        }
      });
    });
  }

  // ---- Llamadas API ----

  registrarLlamadaAPI(llamada: LlamadaAPI): void {
    if (!this.navegacionActual) return;

    // La primera llamada API marca el tiempo hasta primer render (si el rAF aún no lo hizo)
    if (
      this.navegacionActual.llamadas_api.length === 0 &&
      this.navegacionActual.tiempo_hasta_primer_render_ms === 0
    ) {
      this.navegacionActual.tiempo_hasta_primer_render_ms = Math.round(
        performance.now() - this.inicioNavegacion
      );
      this.navegacionActual.origen_render = 'red';
    }

    this.navegacionActual.llamadas_api.push(llamada);
  }

  // ---- Estado ----

  obtenerContadores(): { navegaciones: number; llamadasAPI: number } {
    const completadas = this.navegaciones.length;
    const hayActual = this.navegacionActual ? 1 : 0;
    const llamadasCompletadas = this.navegaciones.reduce(
      (acc, n) => acc + n.llamadas_api.length,
      0
    );
    const llamadasActuales = this.navegacionActual?.llamadas_api.length ?? 0;

    return {
      navegaciones: completadas + hayActual,
      llamadasAPI: llamadasCompletadas + llamadasActuales,
    };
  }

  limpiar(): void {
    this.navegaciones = [];
    this.navegacionActual = null;
    this.inicioSesion = performance.now();
    this.inicioNavegacion = 0;
  }

  // ---- Generar y descargar reporte ----

  descargarReporte(): void {
    // Incluir navegación actual en el reporte sin cerrarla
    const todasLasNavegaciones = [...this.navegaciones];
    if (this.navegacionActual) {
      const copia: EntradaNavegacion = {
        ...this.navegacionActual,
        llamadas_api: [...this.navegacionActual.llamadas_api],
      };
      if (copia.tiempo_hasta_primer_render_ms === 0) {
        copia.tiempo_hasta_primer_render_ms = Math.round(
          performance.now() - this.inicioNavegacion
        );
      }
      todasLasNavegaciones.push(copia);
    }

    const tiemposCarga = todasLasNavegaciones.map(n => n.tiempo_hasta_primer_render_ms);
    const totalLlamadas = todasLasNavegaciones.reduce(
      (acc, n) => acc + n.llamadas_api.length,
      0
    );
    const erroresRed = todasLasNavegaciones.reduce(
      (acc, n) => acc + n.llamadas_api.filter(l => l.origen === 'error').length,
      0
    );
    const timeouts = todasLasNavegaciones.reduce(
      (acc, n) => acc + n.llamadas_api.filter(l => l.status === 0).length,
      0
    );

    const resumen: ResumenReporte = {
      total_navegaciones: todasLasNavegaciones.length,
      promedio_carga_ms: tiemposCarga.length
        ? Math.round(tiemposCarga.reduce((a, b) => a + b, 0) / tiemposCarga.length)
        : 0,
      mas_lento_ms: tiemposCarga.length ? Math.max(...tiemposCarga) : 0,
      mas_rapido_ms: tiemposCarga.length ? Math.min(...tiemposCarga) : 0,
      total_llamadas_api: totalLlamadas,
      errores_red: erroresRed,
      timeouts,
    };

    const reporte: ReportePerformance = {
      meta: {
        ambiente: import.meta.env.MODE,
        fecha: new Date().toISOString(),
        url_base: window.location.origin,
        duracion_sesion_ms: Math.round(performance.now() - this.inicioSesion),
      },
      navegacion: todasLasNavegaciones,
      resumen,
    };

    const blob = new Blob([JSON.stringify(reporte, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    const fechaArchivo = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    enlace.href = url;
    enlace.download = `perf-bs-${fechaArchivo}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

// ============================================================
// INSTANCIA SINGLETON EXPORTADA
// ============================================================

export const performanceMonitor = new PerformanceMonitor();
