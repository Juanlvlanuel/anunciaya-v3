/**
 * useDocumentoChat.ts
 * =====================
 * Hook para preparar documentos antes de enviarlos en ChatYA.
 *
 * UBICACIÓN: apps/web/src/hooks/useDocumentoChat.ts
 *
 * QUÉ HACE:
 * 1. Valida tipo MIME y tamaño del archivo
 * 2. Extrae metadatos: nombre, tamaño, tipo MIME
 * 3. Empaqueta todo en MetadatosDocumento listo para enviar
 *
 * NO HACE:
 * - No comprime ni optimiza (los documentos se suben tal cual)
 * - No genera thumbnails ni previews visuales
 * - No sube a R2 (eso lo maneja InputMensaje al enviar)
 *
 * ES SIMPLE A PROPÓSITO:
 * A diferencia de useImagenChat que necesita canvas para WebP + LQIP,
 * los documentos solo necesitan validación + metadatos.
 */

import { useState, useCallback } from 'react';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Tamaño máximo: 25 MB (alineado con backend) */
const MAX_TAMANO_BYTES = 25 * 1024 * 1024;

/** Tipos MIME de documentos permitidos */
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',                                                          // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',      // .docx
  'application/vnd.ms-excel',                                                    // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',            // .xlsx
  'application/vnd.ms-powerpoint',                                               // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',   // .pptx
  'text/plain',                                                                  // .txt
  'text/csv',                                                                    // .csv
];

/** String para el atributo accept del input file */
export const ACCEPT_DOCUMENTOS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

// =============================================================================
// TIPOS
// =============================================================================

export interface MetadatosDocumento {
  /** El archivo original (se sube tal cual, sin compresión) */
  archivo: File;
  /** Nombre original del archivo (ej: "reporte-Q3.pdf") */
  nombre: string;
  /** Tamaño en bytes */
  tamano: number;
  /** Tipo MIME (ej: "application/pdf") */
  tipoArchivo: string;
  /** Extensión sin punto (ej: "pdf", "docx") */
  extension: string;
}

interface UseDocumentoChatResult {
  /** Documento procesado listo para enviar (null si no hay) */
  documentoListo: MetadatosDocumento | null;
  /** Mensaje de error si algo falló */
  error: string | null;
  /** Procesar un archivo de documento */
  procesarDocumento: (archivo: File) => void;
  /** Cancelar/limpiar el documento seleccionado */
  limpiar: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Extrae la extensión de un nombre de archivo (sin punto, minúsculas) */
function extraerExtension(nombre: string): string {
  const partes = nombre.split('.');
  return partes.length > 1 ? partes.pop()!.toLowerCase() : '';
}

/** Formatea bytes a string legible (ej: "2.4 MB", "340 KB") */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Verifica si un tipo MIME es un documento permitido */
export function esDocumentoPermitido(tipo: string): boolean {
  return TIPOS_PERMITIDOS.includes(tipo);
}

// =============================================================================
// HOOK
// =============================================================================

export function useDocumentoChat(): UseDocumentoChatResult {
  const [documentoListo, setDocumentoListo] = useState<MetadatosDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Procesar documento: validar → empaquetar metadatos
  // ---------------------------------------------------------------------------
  const procesarDocumento = useCallback((archivo: File) => {
    setError(null);

    // ── Validar tipo ──
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError('Tipo de documento no soportado. Usa PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT o CSV.');
      return;
    }

    // ── Validar tamaño ──
    if (archivo.size > MAX_TAMANO_BYTES) {
      const maxMB = (MAX_TAMANO_BYTES / (1024 * 1024)).toFixed(0);
      setError(`El documento no puede pesar más de ${maxMB}MB.`);
      return;
    }

    // ── Empaquetar metadatos ──
    setDocumentoListo({
      archivo,
      nombre: archivo.name,
      tamano: archivo.size,
      tipoArchivo: archivo.type,
      extension: extraerExtension(archivo.name),
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Limpiar
  // ---------------------------------------------------------------------------
  const limpiar = useCallback(() => {
    setDocumentoListo(null);
    setError(null);
  }, []);

  return {
    documentoListo,
    error,
    procesarDocumento,
    limpiar,
  };
}

export default useDocumentoChat;