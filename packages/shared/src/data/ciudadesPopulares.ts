/**
 * ciudadesPopulares.ts
 * ====================
 * Base de datos de ciudades populares de México para el selector de ubicación.
 * Incluye coordenadas para GPS y alias para búsqueda flexible.
 *
 * Ubicación: packages/shared/src/data/ciudadesPopulares.ts
 */

// =============================================================================
// TIPOS
// =============================================================================

export interface Ciudad {
  nombre: string;
  estado: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  alias?: string[];
  importancia: number;
}

export interface CiudadConNombreCompleto extends Ciudad {
  nombre_completo: string;
}

// =============================================================================
// DATOS - CIUDADES POPULARES DE MÉXICO (~70 ciudades)
// =============================================================================

export const ciudadesPopulares: Ciudad[] = [
  // ===================================
  // ZONAS METROPOLITANAS PRINCIPALES
  // ===================================
  {
    nombre: "Ciudad de México",
    estado: "Ciudad de México",
    coordenadas: { lat: 19.4326, lng: -99.1332 },
    alias: ["cdmx", "df", "distrito federal", "mexico city"],
    importancia: 100
  },
  {
    nombre: "Guadalajara",
    estado: "Jalisco",
    coordenadas: { lat: 20.6597, lng: -103.3496 },
    alias: ["gdl", "perla tapatia"],
    importancia: 95
  },
  {
    nombre: "Monterrey",
    estado: "Nuevo León",
    coordenadas: { lat: 25.6866, lng: -100.3161 },
    alias: ["mty", "sultan del norte"],
    importancia: 90
  },
  {
    nombre: "Puebla",
    estado: "Puebla",
    coordenadas: { lat: 19.0414, lng: -98.2063 },
    alias: ["puebla de zaragoza", "angelopolis"],
    importancia: 85
  },

  // ===================================
  // BAJA CALIFORNIA
  // ===================================
  {
    nombre: "Tijuana",
    estado: "Baja California",
    coordenadas: { lat: 32.5149, lng: -117.0382 },
    alias: ["tj", "tijuana bc"],
    importancia: 88
  },
  {
    nombre: "Mexicali",
    estado: "Baja California",
    coordenadas: { lat: 32.6245, lng: -115.4523 },
    alias: ["mxl", "mexicali bc"],
    importancia: 78
  },
  {
    nombre: "Ensenada",
    estado: "Baja California",
    coordenadas: { lat: 31.8665, lng: -116.5956 },
    alias: ["ensenada bc"],
    importancia: 72
  },
  {
    nombre: "Playas de Rosarito",
    estado: "Baja California",
    coordenadas: { lat: 32.3668, lng: -117.0618 },
    alias: ["rosarito"],
    importancia: 65
  },
  {
    nombre: "Tecate",
    estado: "Baja California",
    coordenadas: { lat: 32.5764, lng: -116.6283 },
    alias: ["tecate bc"],
    importancia: 62
  },

  // ===================================
  // BAJA CALIFORNIA SUR
  // ===================================
  {
    nombre: "La Paz",
    estado: "Baja California Sur",
    coordenadas: { lat: 24.1426, lng: -110.3128 },
    alias: ["la paz bcs"],
    importancia: 74
  },
  {
    nombre: "Los Cabos",
    estado: "Baja California Sur",
    coordenadas: { lat: 22.8905, lng: -109.9167 },
    alias: ["cabo san lucas", "san jose del cabo", "cabos"],
    importancia: 85
  },
  {
    nombre: "Cabo San Lucas",
    estado: "Baja California Sur",
    coordenadas: { lat: 22.8909, lng: -109.9124 },
    alias: ["cabo", "csl"],
    importancia: 82
  },
  {
    nombre: "San José del Cabo",
    estado: "Baja California Sur",
    coordenadas: { lat: 23.0545, lng: -109.6970 },
    alias: ["san jose cabo", "sjc"],
    importancia: 78
  },
  {
    nombre: "Loreto",
    estado: "Baja California Sur",
    coordenadas: { lat: 26.0130, lng: -111.3486 },
    alias: ["loreto bcs"],
    importancia: 68
  },

  // ===================================
  // SONORA
  // ===================================
  {
    nombre: "Hermosillo",
    estado: "Sonora",
    coordenadas: { lat: 29.0729, lng: -110.9559 },
    alias: ["hermosillo sonora", "hmo"],
    importancia: 78
  },
  {
    nombre: "Ciudad Obregón",
    estado: "Sonora",
    coordenadas: { lat: 27.4827, lng: -109.9309 },
    alias: ["obregon"],
    importancia: 75
  },
  {
    nombre: "Nogales",
    estado: "Sonora",
    coordenadas: { lat: 31.3167, lng: -110.9481 },
    alias: ["nogales sonora"],
    importancia: 72
  },
  {
    nombre: "Puerto Peñasco",
    estado: "Sonora",
    coordenadas: { lat: 31.3167, lng: -113.5350 },
    alias: ["rocky point", "puerto penasco"],
    importancia: 70
  },
  {
    nombre: "Navojoa",
    estado: "Sonora",
    coordenadas: { lat: 27.0729, lng: -109.4431 },
    alias: ["navojoa sonora"],
    importancia: 68
  },
  {
    nombre: "Guaymas",
    estado: "Sonora",
    coordenadas: { lat: 27.9202, lng: -110.9031 },
    alias: ["guaymas sonora"],
    importancia: 70
  },
  {
    nombre: "San Luis Río Colorado",
    estado: "Sonora",
    coordenadas: { lat: 32.4606, lng: -114.7705 },
    alias: ["san luis rc", "slrc"],
    importancia: 68
  },
  {
    nombre: "Agua Prieta",
    estado: "Sonora",
    coordenadas: { lat: 31.3278, lng: -109.5487 },
    alias: ["agua prieta sonora"],
    importancia: 65
  },
  {
    nombre: "Caborca",
    estado: "Sonora",
    coordenadas: { lat: 30.7185, lng: -112.1737 },
    alias: ["caborca sonora"],
    importancia: 62
  },
  {
    nombre: "Cananea",
    estado: "Sonora",
    coordenadas: { lat: 30.9597, lng: -110.2976 },
    alias: ["cananea sonora"],
    importancia: 60
  },

  // ===================================
  // CIUDADES FRONTERIZAS
  // ===================================
  {
    nombre: "Ciudad Juárez",
    estado: "Chihuahua",
    coordenadas: { lat: 31.7619, lng: -106.4850 },
    alias: ["juarez", "paso del norte"],
    importancia: 82
  },
  {
    nombre: "Nuevo Laredo",
    estado: "Tamaulipas",
    coordenadas: { lat: 27.4758, lng: -99.5155 },
    alias: ["nuevo laredo tamaulipas"],
    importancia: 70
  },
  {
    nombre: "Reynosa",
    estado: "Tamaulipas",
    coordenadas: { lat: 26.0759, lng: -98.2816 },
    alias: ["reynosa tamaulipas"],
    importancia: 72
  },
  {
    nombre: "Matamoros",
    estado: "Tamaulipas",
    coordenadas: { lat: 25.8388, lng: -97.5047 },
    alias: ["matamoros tamaulipas"],
    importancia: 68
  },

  // ===================================
  // CAPITALES ESTATALES
  // ===================================
  {
    nombre: "Toluca",
    estado: "Estado de México",
    coordenadas: { lat: 19.2888, lng: -99.6557 },
    alias: ["toluca de lerdo"],
    importancia: 78
  },
  {
    nombre: "León",
    estado: "Guanajuato",
    coordenadas: { lat: 21.1250, lng: -101.6703 },
    alias: ["leon gto", "leon guanajuato"],
    importancia: 80
  },
  {
    nombre: "Querétaro",
    estado: "Querétaro",
    coordenadas: { lat: 20.5888, lng: -100.3899 },
    alias: ["qro"],
    importancia: 82
  },
  {
    nombre: "San Luis Potosí",
    estado: "San Luis Potosí",
    coordenadas: { lat: 22.1565, lng: -100.9855 },
    alias: ["slp", "san luis"],
    importancia: 74
  },
  {
    nombre: "Aguascalientes",
    estado: "Aguascalientes",
    coordenadas: { lat: 21.8818, lng: -102.2916 },
    alias: ["ags"],
    importancia: 72
  },
  {
    nombre: "Morelia",
    estado: "Michoacán",
    coordenadas: { lat: 19.7069, lng: -101.1958 },
    alias: ["morelia michoacan"],
    importancia: 76
  },
  {
    nombre: "Saltillo",
    estado: "Coahuila",
    coordenadas: { lat: 25.4232, lng: -101.0053 },
    alias: ["saltillo coahuila"],
    importancia: 72
  },
  {
    nombre: "Chihuahua",
    estado: "Chihuahua",
    coordenadas: { lat: 28.6353, lng: -106.0889 },
    alias: ["chihuahua capital"],
    importancia: 76
  },
  {
    nombre: "Culiacán",
    estado: "Sinaloa",
    coordenadas: { lat: 24.7999, lng: -107.3841 },
    alias: ["culiacan"],
    importancia: 74
  },
  {
    nombre: "Durango",
    estado: "Durango",
    coordenadas: { lat: 24.0277, lng: -104.6532 },
    alias: ["durango capital"],
    importancia: 68
  },
  {
    nombre: "Oaxaca",
    estado: "Oaxaca",
    coordenadas: { lat: 17.0732, lng: -96.7266 },
    alias: ["oaxaca de juarez"],
    importancia: 78
  },
  {
    nombre: "Xalapa",
    estado: "Veracruz",
    coordenadas: { lat: 19.5438, lng: -96.9102 },
    alias: ["jalapa", "xalapa veracruz"],
    importancia: 70
  },
  {
    nombre: "Tuxtla Gutiérrez",
    estado: "Chiapas",
    coordenadas: { lat: 16.7516, lng: -93.1161 },
    alias: ["tuxtla"],
    importancia: 72
  },
  {
    nombre: "Villahermosa",
    estado: "Tabasco",
    coordenadas: { lat: 17.9869, lng: -92.9303 },
    alias: ["villahermosa tabasco"],
    importancia: 70
  },
  {
    nombre: "Mérida",
    estado: "Yucatán",
    coordenadas: { lat: 20.9674, lng: -89.5926 },
    alias: ["merida yucatan"],
    importancia: 82
  },
  {
    nombre: "Cuernavaca",
    estado: "Morelos",
    coordenadas: { lat: 18.9242, lng: -99.2216 },
    alias: ["cuernavaca morelos"],
    importancia: 75
  },
  {
    nombre: "Pachuca",
    estado: "Hidalgo",
    coordenadas: { lat: 20.1011, lng: -98.7591 },
    alias: ["pachuca hidalgo"],
    importancia: 72
  },
  {
    nombre: "Guanajuato",
    estado: "Guanajuato",
    coordenadas: { lat: 21.0190, lng: -101.2574 },
    alias: ["guanajuato capital"],
    importancia: 78
  },
  {
    nombre: "Zacatecas",
    estado: "Zacatecas",
    coordenadas: { lat: 22.7709, lng: -102.5832 },
    alias: ["zacatecas capital"],
    importancia: 74
  },
  {
    nombre: "Campeche",
    estado: "Campeche",
    coordenadas: { lat: 19.8301, lng: -90.5349 },
    alias: ["campeche capital"],
    importancia: 72
  },
  {
    nombre: "Tepic",
    estado: "Nayarit",
    coordenadas: { lat: 21.5039, lng: -104.8946 },
    alias: ["tepic nayarit"],
    importancia: 68
  },
  {
    nombre: "Colima",
    estado: "Colima",
    coordenadas: { lat: 19.2433, lng: -103.7250 },
    alias: ["colima capital"],
    importancia: 66
  },
  {
    nombre: "Tlaxcala",
    estado: "Tlaxcala",
    coordenadas: { lat: 19.3139, lng: -98.2404 },
    alias: ["tlaxcala capital"],
    importancia: 64
  },
  {
    nombre: "Ciudad Victoria",
    estado: "Tamaulipas",
    coordenadas: { lat: 23.7369, lng: -99.1411 },
    alias: ["victoria tamaulipas"],
    importancia: 68
  },
  {
    nombre: "Chetumal",
    estado: "Quintana Roo",
    coordenadas: { lat: 18.5001, lng: -88.2962 },
    alias: ["chetumal quintana roo"],
    importancia: 70
  },
  {
    nombre: "Chilpancingo",
    estado: "Guerrero",
    coordenadas: { lat: 17.5510, lng: -99.5005 },
    alias: ["chilpancingo guerrero"],
    importancia: 66
  },

  // ===================================
  // CIUDADES TURÍSTICAS
  // ===================================
  {
    nombre: "Cancún",
    estado: "Quintana Roo",
    coordenadas: { lat: 21.1619, lng: -86.8515 },
    alias: ["cancun"],
    importancia: 90
  },
  {
    nombre: "Puerto Vallarta",
    estado: "Jalisco",
    coordenadas: { lat: 20.6534, lng: -105.2253 },
    alias: ["vallarta", "pvr"],
    importancia: 85
  },
  {
    nombre: "Playa del Carmen",
    estado: "Quintana Roo",
    coordenadas: { lat: 20.6296, lng: -87.0739 },
    alias: ["playa carmen", "playacar"],
    importancia: 82
  },
  {
    nombre: "Mazatlán",
    estado: "Sinaloa",
    coordenadas: { lat: 23.2494, lng: -106.4103 },
    alias: ["mazatlan"],
    importancia: 78
  },
  {
    nombre: "Acapulco",
    estado: "Guerrero",
    coordenadas: { lat: 16.8531, lng: -99.8237 },
    alias: ["acapulco guerrero"],
    importancia: 80
  },
  {
    nombre: "Cozumel",
    estado: "Quintana Roo",
    coordenadas: { lat: 20.5083, lng: -86.9458 },
    alias: ["isla cozumel"],
    importancia: 75
  },
  {
    nombre: "Tulum",
    estado: "Quintana Roo",
    coordenadas: { lat: 20.2114, lng: -87.4654 },
    alias: ["tulum quintana roo"],
    importancia: 80
  },
  {
    nombre: "San Miguel de Allende",
    estado: "Guanajuato",
    coordenadas: { lat: 20.9144, lng: -100.7452 },
    alias: ["san miguel", "sma"],
    importancia: 80
  },
  {
    nombre: "San Cristóbal de las Casas",
    estado: "Chiapas",
    coordenadas: { lat: 16.7370, lng: -92.6376 },
    alias: ["san cristobal", "jovel"],
    importancia: 76
  },

  // ===================================
  // CIUDADES INDUSTRIALES
  // ===================================
  {
    nombre: "Irapuato",
    estado: "Guanajuato",
    coordenadas: { lat: 20.6767, lng: -101.3542 },
    alias: ["irapuato gto"],
    importancia: 70
  },
  {
    nombre: "Celaya",
    estado: "Guanajuato",
    coordenadas: { lat: 20.5289, lng: -100.8157 },
    alias: ["celaya gto"],
    importancia: 72
  },
  {
    nombre: "Torreón",
    estado: "Coahuila",
    coordenadas: { lat: 25.5428, lng: -103.4068 },
    alias: ["torreon"],
    importancia: 74
  },

  // ===================================
  // CIUDADES PORTUARIAS
  // ===================================
  {
    nombre: "Veracruz",
    estado: "Veracruz",
    coordenadas: { lat: 19.1738, lng: -96.1342 },
    alias: ["puerto veracruz"],
    importancia: 78
  },
  {
    nombre: "Tampico",
    estado: "Tamaulipas",
    coordenadas: { lat: 22.2331, lng: -97.8414 },
    alias: ["tampico tamaulipas"],
    importancia: 72
  },
  {
    nombre: "Coatzacoalcos",
    estado: "Veracruz",
    coordenadas: { lat: 18.1340, lng: -94.4058 },
    alias: ["coatzacoalcos veracruz"],
    importancia: 70
  }
];

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Normaliza texto para búsqueda (quita acentos, minúsculas, caracteres especiales)
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9\s]/g, "") // Quitar caracteres especiales
    .trim();
}

/**
 * Busca ciudades por texto (nombre, estado o alias)
 */
export function buscarCiudades(texto: string, limite: number = 10): CiudadConNombreCompleto[] {
  if (!texto || texto.length < 2) return [];

  const textoNormalizado = normalizarTexto(texto);

  return ciudadesPopulares
    .filter((ciudad) => {
      const nombreNormalizado = normalizarTexto(ciudad.nombre);
      const estadoNormalizado = normalizarTexto(ciudad.estado);

      const coincideNombre = nombreNormalizado.includes(textoNormalizado);
      const coincideEstado = estadoNormalizado.includes(textoNormalizado);
      const coincideAlias = ciudad.alias?.some((alias) =>
        normalizarTexto(alias).includes(textoNormalizado)
      );

      return coincideNombre || coincideEstado || coincideAlias;
    })
    .map((ciudad) => ({
      ...ciudad,
      nombre_completo: `${ciudad.nombre}, ${ciudad.estado}`
    }))
    .sort((a, b) => {
      // Priorizar coincidencia exacta al inicio del nombre
      const aStartsWith = normalizarTexto(a.nombre).startsWith(textoNormalizado);
      const bStartsWith = normalizarTexto(b.nombre).startsWith(textoNormalizado);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Luego por importancia
      return b.importancia - a.importancia;
    })
    .slice(0, limite);
}

/**
 * Obtiene las ciudades más importantes (para mostrar por defecto)
 */
export function getCiudadesPopulares(limite: number = 15): CiudadConNombreCompleto[] {
  return ciudadesPopulares
    .sort((a, b) => b.importancia - a.importancia)
    .slice(0, limite)
    .map((ciudad) => ({
      ...ciudad,
      nombre_completo: `${ciudad.nombre}, ${ciudad.estado}`
    }));
}

/**
 * Calcula la distancia entre dos coordenadas (fórmula Haversine)
 */
function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Encuentra la ciudad más cercana a unas coordenadas GPS
 */
export function buscarCiudadCercana(
  lat: number,
  lng: number
): CiudadConNombreCompleto | null {
  if (!lat || !lng) return null;

  let ciudadMasCercana: Ciudad | null = null;
  let distanciaMinima = Infinity;

  for (const ciudad of ciudadesPopulares) {
    const distancia = calcularDistancia(
      lat,
      lng,
      ciudad.coordenadas.lat,
      ciudad.coordenadas.lng
    );

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      ciudadMasCercana = ciudad;
    }
  }

  if (!ciudadMasCercana) return null;

  return {
    ...ciudadMasCercana,
    nombre_completo: `${ciudadMasCercana.nombre}, ${ciudadMasCercana.estado}`
  };
}

// =============================================================================
// EXPORTS ADICIONALES
// =============================================================================

export const totalCiudades = ciudadesPopulares.length;