/** Obtiene las iniciales (2 letras) de un nombre para fallback de avatar */
export const obtenerIniciales = (nombre: string): string => {
  const partes = nombre.trim().split(' ');
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
};
