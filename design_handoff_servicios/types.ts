/**
 * Domain types for the Servicios section.
 * Use these as the source of truth — your API contracts should align.
 */

export type ISODate = string;
export type DiaSemana = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export type Modalidad = 'presencial' | 'remoto' | 'hibrido';
export type EstadoPublicacion = 'activa' | 'pausada';

/** Discriminated union — el wizard ofrece estas 5 opciones */
export type Precio =
  | { kind: 'fijo'; monto: number; moneda?: 'MXN' }
  | { kind: 'hora'; monto: number; moneda?: 'MXN' }
  | { kind: 'rango'; min: number; max: number; moneda?: 'MXN' }
  | { kind: 'mensual'; monto: number; moneda?: 'MXN' }
  | { kind: 'a-convenir' };

export type Persona = {
  id: string;
  nombre: string;
  iniciales: string; // ej. "JR"
  avatarUrl?: string;
  ratingPromedio: number; // 0..5
  totalReseñas: number;
  disponible: boolean;
  tiempoRespuestaHoras: number;
  miembroDesde: ISODate;
  identidadVerificada: boolean;
  bio?: string;       // max 200 chars
  skills?: string[];  // max 8
  añosExperiencia?: number;
};

export type Empresa = {
  id: string;
  nombre: string;
  iniciales: string;
  logoUrl?: string;
  verificada: boolean;
  miembroDesde: ISODate;
};

export type Ubicacion = {
  ciudad: string; // siempre "Puerto Peñasco, Sonora" en MVP
  zonas: string[]; // ej. ["Centro", "Las Conchas"]
  /** Radio aproximado en metros mostrado en mapa (privacidad: nunca dirección exacta) */
  radioAprox: number;
  lat?: number;
  lng?: number;
};

export type Publicacion = {
  id: string;
  modo: 'ofrezco' | 'solicito';
  tipo: 'servicio-persona' | 'vacante-empresa' | 'solicito';
  titulo: string;       // max 60 chars
  descripcion: string;   // 30..500 chars
  fotos: string[];       // URLs · 0..6 servicios · 0..1 vacantes
  precio: Precio;
  modalidad: Modalidad;
  ubicacion: Ubicacion;
  estado: EstadoPublicacion;
  createdAt: ISODate;
  expiresAt: ISODate;    // TTL 30 días desde createdAt
  // Solo vacante:
  requisitos?: string[];
  horario?: string;
  dias?: DiaSemana[];
  // Solo "solicito":
  presupuesto?: { min: number; max: number };
  // Relaciones (uno de los dos según tipo)
  oferente?: Persona | Empresa;
  solicitante?: Persona;
};

/** Pregunta de Q&A — privada hasta que el oferente responde */
export type Pregunta = {
  id: string;
  publicacionId: string;
  autor: Persona;
  texto: string;
  createdAt: ISODate;
  respuesta?: {
    texto: string;
    createdAt: ISODate;
  };
};

/** Wizard state — auto-guardado a sessionStorage */
export type WizardDraft = {
  paso: 1 | 2 | 3 | 4;
  modo?: 'ofrezco' | 'solicito';
  subtipo?: 'servicio-personal' | 'busco-empleo' | 'servicio-puntual' | 'vacante-empresa';
  titulo?: string;
  descripcion?: string;
  fotos?: string[];
  skills?: string[];
  modalidad?: Modalidad;
  precio?: Precio;
  zonas?: string[];
  horario?: string;
  dias?: DiaSemana[];
  checks: { legal: boolean; verdadera: boolean; coordinacion: boolean };
  updatedAt?: ISODate;
};

/** Filtros del buscador — reflejados en URL query params */
export type FiltrosBusqueda = {
  q?: string;
  modalidad?: Modalidad[];
  tipo?: Array<'servicio' | 'empleo' | 'persona'>;
  distanciaKm?: number; // 1..50 (50 = toda la ciudad)
  precioMin?: number;
  precioMax?: number;
  disponibilidad?: 'hoy' | 'semana' | 'cualquier';
};
