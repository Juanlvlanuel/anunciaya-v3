/**
 * InputMensaje.tsx
 * =================
 * Campo de entrada para escribir y enviar mensajes.
 * Envía con Enter o botón. Emite eventos de escribiendo/dejar-escribir.
 *
 * Sprint 4: solo texto.
 * Sprints futuros: botón adjuntar (imagen, audio, documento), emojis.
 *
 * UBICACIÓN: apps/web/src/components/chatya/InputMensaje.tsx
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Pencil, Reply, Smile, Paperclip, Camera, Image as ImageIcon, FileText } from 'lucide-react';
import { SelectorEmojis } from './SelectorEmojis';
import { TextoConEmojis } from './TextoConEmojis';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { emitirEvento } from '../../services/socketService';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useImagenChat } from '../../hooks/useImagenChat';
import { useDocumentoChat, ACCEPT_DOCUMENTOS, formatearTamano, esDocumentoPermitido } from '../../hooks/useDocumentoChat';
import * as chatyaService from '../../services/chatyaService';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Delay para dejar de emitir "escribiendo" después de dejar de teclear */
const ESCRIBIENDO_DELAY_MS = 2000;

// =============================================================================
// TIPOS
// =============================================================================

interface InputMensajeProps {
  /** Mensaje que se está editando (null si no hay edición activa) */
  mensajeEditando?: Mensaje | null;
  /** Callback para cancelar la edición */
  onCancelarEdicion?: () => void;
  /** Mensaje al que se está respondiendo (null si no hay respuesta activa) */
  mensajeRespondiendo?: Mensaje | null;
  /** Callback para cancelar la respuesta */
  onCancelarRespuesta?: () => void;
  /** Si el contacto está bloqueado, deshabilitar el input */
  bloqueado?: boolean;
  /** Nombre del contacto (para mostrar en barra de respuesta/edición) */
  nombreContacto?: string;
  /** ID del usuario actual (para determinar "Tú" vs nombre del contacto) */
  miId?: string;
  /** Archivos soltados desde drag & drop en VentanaChat (zona amplia) */
  archivosDrop?: File[] | null;
  /** Callback para limpiar archivosDrop después de procesarlos */
  onArchivosDropProcesados?: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function InputMensaje({
  mensajeEditando = null,
  onCancelarEdicion,
  mensajeRespondiendo = null,
  onCancelarRespuesta,
  bloqueado = false,
  nombreContacto = '',
  miId = '',
  archivosDrop = null,
  onArchivosDropProcesados,
}: InputMensajeProps) {
  const enviarMensaje = useChatYAStore((s) => s.enviarMensaje);
  const enviandoMensaje = useChatYAStore((s) => s.enviandoMensaje);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const chatTemporal = useChatYAStore((s) => s.chatTemporal);
  const crearConversacion = useChatYAStore((s) => s.crearConversacion);
  const transicionarAConversacionReal = useChatYAStore((s) => s.transicionarAConversacionReal);
  const borradores = useChatYAStore((s) => s.borradores);
  const guardarBorrador = useChatYAStore((s) => s.guardarBorrador);
  const limpiarBorrador = useChatYAStore((s) => s.limpiarBorrador);

  const [texto, setTexto] = useState('');
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [pickerSaliendo, setPickerSaliendo] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const smileBtnRef = useRef<HTMLButtonElement>(null);
  const escribiendoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estaEscribiendoRef = useRef(false);

  // Hook de procesamiento de imagen (pipeline zero-flicker) — soporta múltiples
  const {
    imagenesListas,
    procesando: procesandoImagen,
    error: errorImagen,
    procesarImagen,
    procesarImagenes,
    removerImagen,
    setCaption,
    limpiar: limpiarImagen,
    puedeAgregarMas,
    maxImagenes,
  } = useImagenChat();

  // Hook de procesamiento de documento
  const {
    documentoListo,
    error: errorDocumento,
    procesarDocumento,
    limpiar: limpiarDocumento,
  } = useDocumentoChat();

  // Refs para inputs de archivo ocultos
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);

  // Estado drag & drop
  const [dragActivo, setDragActivo] = useState(false);

  // Focus automático al montar (solo en escritorio, en móvil evita abrir el teclado)
  const { esMobile } = useBreakpoint();

  // Effect: al cambiar de conversación → guardar borrador actual y cargar el de la nueva
  const conversacionAnteriorRef = useRef<string | null>(null);
  useEffect(() => {
    const anterior = conversacionAnteriorRef.current;

    // Guardar borrador de la conversación anterior
    if (anterior && anterior !== conversacionActivaId) {
      if (texto.trim()) {
        guardarBorrador(anterior, texto);
      } else {
        limpiarBorrador(anterior);
      }
    }

    // Cargar borrador de la nueva conversación (solo si no hay modo edición)
    if (conversacionActivaId && !mensajeEditando) {
      setTexto(borradores[conversacionActivaId] || '');
    }

    conversacionAnteriorRef.current = conversacionActivaId;
  }, [conversacionActivaId]);

  useEffect(() => {
    if (!esMobile) {
      inputRef.current?.focus();
    }
  }, [conversacionActivaId, esMobile]);

  // ---------------------------------------------------------------------------
  // Effect: Pre-llenar texto cuando se activa modo edición
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mensajeEditando) {
      setTexto(mensajeEditando.contenido || '');
      inputRef.current?.focus();
    }
  }, [mensajeEditando]);

  // ---------------------------------------------------------------------------
  // Effect: Focus al activar modo respuesta
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mensajeRespondiendo) {
      inputRef.current?.focus();
    }
  }, [mensajeRespondiendo]);

  // ---------------------------------------------------------------------------
  // Emitir eventos de escribiendo/dejar-escribir
  // ---------------------------------------------------------------------------

  /** Cierra el picker de emojis con animación funnel */
  const cerrarPicker = useCallback(() => {
    if (!pickerAbierto || pickerSaliendo) return;
    setPickerSaliendo(true);
    setTimeout(() => {
      setPickerAbierto(false);
      setPickerSaliendo(false);
    }, 200);
  }, [pickerAbierto, pickerSaliendo]);
  const manejarEscribiendo = useCallback(() => {
    if (!conversacionActivaId) return;

    // Emitir "escribiendo" solo si no lo habíamos emitido
    if (!estaEscribiendoRef.current) {
      estaEscribiendoRef.current = true;
      emitirEvento('chatya:escribiendo', { conversacionId: conversacionActivaId });
    }

    // Resetear el timer
    if (escribiendoTimerRef.current) {
      clearTimeout(escribiendoTimerRef.current);
    }

    // Después de X ms sin teclear, emitir "dejar-escribir"
    escribiendoTimerRef.current = setTimeout(() => {
      if (conversacionActivaId) {
        emitirEvento('chatya:dejar-escribir', { conversacionId: conversacionActivaId });
      }
      estaEscribiendoRef.current = false;
    }, ESCRIBIENDO_DELAY_MS);
  }, [conversacionActivaId]);

  // Cleanup del timer al desmontar
  useEffect(() => {
    return () => {
      if (escribiendoTimerRef.current) {
        clearTimeout(escribiendoTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Enviar mensaje
  // ---------------------------------------------------------------------------
  const handleEnviar = useCallback(async () => {
    const contenido = texto.trim();
    const tieneTexto = contenido.length > 0;
    const tieneImagenes = imagenesListas.length > 0;
    const tieneDocumento = !!documentoListo;

    if ((!tieneTexto && !tieneImagenes && !tieneDocumento) || enviandoMensaje) return;

    // Limpiar input y borrador inmediatamente (optimista)
    setTexto('');
    if (conversacionActivaId) limpiarBorrador(conversacionActivaId);

    // Dejar de emitir "escribiendo"
    if (escribiendoTimerRef.current) {
      clearTimeout(escribiendoTimerRef.current);
    }
    if (conversacionActivaId && estaEscribiendoRef.current) {
      emitirEvento('chatya:dejar-escribir', { conversacionId: conversacionActivaId });
      estaEscribiendoRef.current = false;
    }

    // ── MODO EDICIÓN: actualizar mensaje existente (solo texto) ──
    if (mensajeEditando) {
      try {
        await chatyaService.editarMensaje(mensajeEditando.id, { contenido });
      } catch {
        void 0;
      }
      onCancelarEdicion?.();
      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO DE IMÁGENES (una o múltiples) ──
    if (tieneImagenes) {
      // Copiar array y limpiar preview inmediatamente (optimista)
      const loteImagenes = [...imagenesListas];
      limpiarImagen();

      try {
        // 1. Pedir presigned URLs para todas las imágenes en paralelo
        const presignedPromises = loteImagenes.map((img) =>
          chatyaService.obtenerPresignedUrlImagen(img.archivo.name, img.archivo.type)
        );
        const presignedResults = await Promise.all(presignedPromises);

        // 2. Subir todas a R2 en paralelo
        const uploadPromises = loteImagenes.map((img, i) =>
          chatyaService.subirArchivoAR2(presignedResults[i].uploadUrl, img.archivo, img.archivo.type)
        );
        await Promise.all(uploadPromises);

        // 3. Enviar un mensaje por cada imagen (secuencial para mantener orden)
        for (let i = 0; i < loteImagenes.length; i++) {
          const img = loteImagenes[i];
          const contenidoImagen = JSON.stringify({
            url: presignedResults[i].publicUrl,
            ancho: img.ancho,
            alto: img.alto,
            peso: img.peso,
            miniatura: img.miniatura,
            caption: i === 0 ? (img.caption || undefined) : undefined, // Caption solo en la primera
          });

          await enviarMensaje({ contenido: contenidoImagen, tipo: 'imagen' });
        }

        // Si también hay texto, enviar como mensaje separado al final
        if (tieneTexto) {
          await enviarMensaje({ contenido, tipo: 'texto' });
        }
      } catch (err) {
        console.error('Error al enviar imágenes:', err);
        // TODO: Mostrar toast de error
      }

      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO DE DOCUMENTO ──
    if (tieneDocumento) {
      const datosDoc = documentoListo;
      limpiarDocumento(); // Limpiar preview inmediatamente (optimista)

      try {
        // 1. Pedir presigned URL
        const { uploadUrl, publicUrl } = await chatyaService.obtenerPresignedUrlDocumento(
          datosDoc.archivo.name,
          datosDoc.tipoArchivo,
          datosDoc.tamano
        );

        // 2. Subir a R2
        await chatyaService.subirArchivoAR2(uploadUrl, datosDoc.archivo, datosDoc.tipoArchivo);

        // 3. Construir contenido JSON de documento
        const contenidoDocumento = JSON.stringify({
          url: publicUrl,
          nombre: datosDoc.nombre,
          tamano: datosDoc.tamano,
          tipoArchivo: datosDoc.tipoArchivo,
          extension: datosDoc.extension,
        });

        // 4. Enviar mensaje tipo documento
        await enviarMensaje({ contenido: contenidoDocumento, tipo: 'documento' });

        // Si también hay texto, enviar como mensaje separado
        if (tieneTexto) {
          await enviarMensaje({ contenido, tipo: 'texto' });
        }
      } catch (err) {
        console.error('Error al enviar documento:', err);
      }

      inputRef.current?.focus();
      return;
    }

    // ── CHAT TEMPORAL: crear conversación real primero, luego enviar ──
    if (chatTemporal && conversacionActivaId?.startsWith('temp_')) {
      const conv = await crearConversacion(chatTemporal.datosCreacion);
      if (!conv) {
        setTexto(contenido);
        return;
      }
      transicionarAConversacionReal(conv.id);
      await enviarMensaje({ contenido, tipo: 'texto' });
      inputRef.current?.focus();
      return;
    }

    // ── MODO RESPUESTA: enviar con referencia al mensaje original ──
    if (mensajeRespondiendo) {
      await enviarMensaje({ contenido, tipo: 'texto', respuestaAId: mensajeRespondiendo.id });
      onCancelarRespuesta?.();
      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO NORMAL ──
    await enviarMensaje({ contenido, tipo: 'texto' });
    inputRef.current?.focus();
  }, [texto, enviandoMensaje, enviarMensaje, conversacionActivaId, mensajeEditando, onCancelarEdicion, mensajeRespondiendo, onCancelarRespuesta, imagenesListas, limpiarImagen, documentoListo, limpiarDocumento]);

  // ---------------------------------------------------------------------------
  // Enter para enviar (Shift+Enter para nueva línea futuro)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (pickerAbierto) cerrarPicker();
      handleEnviar();
    }
    if (e.key === 'Escape') {
      if (mensajeEditando) {
        setTexto('');
        onCancelarEdicion?.();
      }
      if (mensajeRespondiendo) {
        onCancelarRespuesta?.();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Selección de archivo (galería o cámara)
  // ---------------------------------------------------------------------------
  const handleSeleccionArchivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) return;

    // Separar imágenes de documentos
    const imagenes: File[] = [];
    const documentos: File[] = [];
    Array.from(archivos).forEach((f) => {
      if (f.type.startsWith('image/')) imagenes.push(f);
      else if (esDocumentoPermitido(f.type)) documentos.push(f);
    });

    // Procesar imágenes (múltiples)
    if (imagenes.length === 1) {
      procesarImagen(imagenes[0]);
    } else if (imagenes.length > 1) {
      procesarImagenes(imagenes);
    }

    // Procesar documento (solo 1 a la vez)
    if (documentos.length > 0) {
      procesarDocumento(documentos[0]);
    }

    // Reset del input para poder seleccionar los mismos archivos
    e.target.value = '';
  }, [procesarImagen, procesarImagenes, procesarDocumento]);

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bloqueado) return;
    setDragActivo(true);
  }, [bloqueado]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);
    if (bloqueado) return;

    const archivos = Array.from(e.dataTransfer.files);
    const imagenes = archivos.filter((f) => f.type.startsWith('image/'));
    const documentos = archivos.filter((f) => esDocumentoPermitido(f.type));

    if (imagenes.length === 1) {
      procesarImagen(imagenes[0]);
    } else if (imagenes.length > 1) {
      procesarImagenes(imagenes);
    }

    if (documentos.length > 0) {
      procesarDocumento(documentos[0]);
    }
  }, [bloqueado, procesarImagen, procesarImagenes, procesarDocumento]);

  // ---------------------------------------------------------------------------
  // Effect: procesar imágenes recibidas via drag & drop desde VentanaChat
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (archivosDrop && archivosDrop.length > 0 && !bloqueado && !mensajeEditando) {
      if (archivosDrop.length === 1) {
        procesarImagen(archivosDrop[0]);
      } else {
        procesarImagenes(archivosDrop);
      }
      onArchivosDropProcesados?.();
    }
  }, [archivosDrop]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const puedeEnviar = (texto.trim().length > 0 || imagenesListas.length > 0 || !!documentoListo) && !enviandoMensaje && !bloqueado && !procesandoImagen;

  return (
    <div
      className={`shrink-0 px-0.5 lg:px-3 pb-3 pt-1 bg-[#050d1a]/80 lg:bg-transparent relative ${dragActivo ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay drag & drop */}
      {dragActivo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px] rounded-xl pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Suelta archivos aquí</span>
          </div>
        </div>
      )}

      {/* ── Error de imagen ── */}
      {errorImagen && (
        <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-600">
          <X className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{errorImagen}</span>
        </div>
      )}

      {/* ── Error de documento ── */}
      {errorDocumento && (
        <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-600">
          <X className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{errorDocumento}</span>
        </div>
      )}

      {/* ── Preview de imágenes seleccionadas (strip horizontal) ── */}
      {imagenesListas.length > 0 && (
        <div className="mx-4 mb-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm">
          {/* Fila: thumbnails + badge + botón limpiar todo */}
          <div className="flex items-center gap-2">
            {/* Strip horizontal con scroll */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
              {imagenesListas.map((img, i) => (
                <div key={img.blobUrl} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100 group">
                  <img
                    src={img.blobUrl}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Botón X individual por imagen */}
                  <button
                    onClick={() => removerImagen(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {/* Spinner si está procesando más imágenes */}
              {procesandoImagen && (
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}

              {/* Botón "+" para agregar más (si caben) */}
              {puedeAgregarMas && !procesandoImagen && (
                <button
                  onClick={() => inputArchivoRef.current?.click()}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-50/50"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Badge contador */}
            {imagenesListas.length > 1 && (
              <span className="text-xs font-semibold text-gray-500 shrink-0">
                {imagenesListas.length}/{maxImagenes}
              </span>
            )}

            {/* Botón limpiar todo */}
            <button
              onClick={limpiarImagen}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* Input caption global (debajo de los thumbnails) */}
          <input
            type="text"
            value={imagenesListas[0]?.caption || ''}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Agregar pie de foto..."
            maxLength={200}
            className="w-full mt-1.5 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>
      )}

      {/* ── Preview de documento seleccionado ── */}
      {documentoListo && (
        <div className="flex items-center gap-3 mx-4 mb-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm">
          {/* Icono según extensión */}
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
            documentoListo.extension === 'pdf' ? 'bg-red-100 text-red-600' :
            ['doc', 'docx'].includes(documentoListo.extension) ? 'bg-blue-100 text-blue-600' :
            ['xls', 'xlsx', 'csv'].includes(documentoListo.extension) ? 'bg-green-100 text-green-600' :
            ['ppt', 'pptx'].includes(documentoListo.extension) ? 'bg-orange-100 text-orange-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <FileText className="w-5 h-5" />
          </div>
          {/* Nombre + tamaño */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{documentoListo.nombre}</p>
            <p className="text-xs text-gray-500">{formatearTamano(documentoListo.tamano)} · {documentoListo.extension.toUpperCase()}</p>
          </div>
          {/* Botón cancelar */}
          <button
            onClick={limpiarDocumento}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      )}

      {/* ── Barra de edición ── */}
      {mensajeEditando && (
        <div className="flex items-center gap-2.5 mb-2 mr-4 ml-4 px-6 py-1.5 bg-white/70 backdrop-blur-sm border border-amber-300 rounded-full shadow-sm">
          {/* Borde lateral decorativo */}
          <div className="w-[3.5px] self-stretch rounded-full bg-linear-to-b from-amber-500 to-amber-400 shrink-0" />
          {/* Ícono en caja */}
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-amber-400 flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(245,158,11,0.25)]">
            <Pencil className="w-[15px] h-[15px] text-white" />
          </div>
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-600 leading-tight">Editando</p>
            <p className="text-sm text-slate-500 truncate mt-px">
              <TextoConEmojis texto={mensajeEditando.contenido || ''} tamañoEmoji={20} />
            </p>
          </div>
          {/* Botón cerrar */}
          <button
            onClick={() => { setTexto(''); onCancelarEdicion?.(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 text-amber-600" />
          </button>
        </div>
      )}

      {/* ── Barra de respuesta ── */}
      {mensajeRespondiendo && !mensajeEditando && (
        <div className="flex items-center gap-2.5 mb-2 mr-4 ml-4 px-6 py-1.5 bg-white/70 backdrop-blur-sm border border-blue-300 rounded-full shadow-sm">
          {/* Borde lateral decorativo */}
          <div className="w-[3.5px] self-stretch rounded-full bg-linear-to-b from-blue-500 to-blue-400 shrink-0" />
          {/* Ícono en caja */}
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-400 flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(59,130,246,0.25)]">
            <Reply className="w-4 h-4 text-white" />
          </div>
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-600 leading-tight">
              {mensajeRespondiendo.emisorId === miId ? 'Tú' : nombreContacto || 'Mensaje'}
            </p>
            <p className="text-sm text-slate-500 truncate mt-px">
              <TextoConEmojis texto={mensajeRespondiendo.contenido || ''} tamañoEmoji={20} />
            </p>
          </div>
          {/* Botón cerrar */}
          <button
            onClick={() => onCancelarRespuesta?.()}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 text-blue-600" />
          </button>
        </div>
      )}

      {/* ── Input + botón enviar ── */}
      <div className="flex items-center gap-2 lg:gap-2.5 px-0 lg:px-4 py-1 pb-0">

        {/* Botón adjuntar imagen (galería) */}
        <button
          onClick={() => inputArchivoRef.current?.click()}
          disabled={bloqueado || !!mensajeEditando}
          className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-transform duration-75 hover:scale-110 active:scale-95
            ${bloqueado || mensajeEditando ? 'opacity-30 cursor-not-allowed' : 'text-white/60 hover:text-white/90 lg:text-gray-500 lg:hover:text-gray-700'}
          `}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Botón cámara (solo móvil) */}
        <button
          onClick={() => inputCamaraRef.current?.click()}
          disabled={bloqueado || !!mensajeEditando}
          className={`shrink-0 flex lg:hidden items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-transform duration-75 hover:scale-110 active:scale-95
            ${bloqueado || mensajeEditando ? 'opacity-30 cursor-not-allowed' : 'text-white/60 hover:text-white/90'}
          `}
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Pill: emoji + input */}
        <div className="flex-1 flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/15 lg:bg-gray-200 lg:border-gray-300 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] focus-within:shadow-[0_4px_22px_rgba(0,0,0,0.45)] transition-shadow duration-150">

          {/* Botón emoji (solo desktop) */}
          <button
            ref={smileBtnRef}
            onClick={() => {
              if (pickerAbierto) {
                cerrarPicker();
              } else {
                const rect = smileBtnRef.current?.getBoundingClientRect();
                if (rect) {
                  setPickerPos({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }
                setPickerAbierto(true);
              }
            }}
            disabled={bloqueado}
            className={`shrink-0 hidden lg:flex items-center justify-center cursor-pointer transition-transform duration-75 hover:scale-110 active:scale-95 text-gray-600 hover:text-gray-900 ${bloqueado ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Smile className="w-6 h-6" />
          </button>

          {/* Input de texto */}
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => {
              if (bloqueado) return;
              setTexto(e.target.value);
              if (e.target.value.trim()) manejarEscribiendo();
            }}
            onKeyDown={handleKeyDown}
            disabled={bloqueado}
            placeholder={bloqueado ? 'No puedes enviar mensajes a este contacto' : mensajeEditando ? 'Editar mensaje...' : mensajeRespondiendo ? 'Escribir respuesta...' : 'Escribe un mensaje...'}
            maxLength={5000}
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            enterKeyHint="send"
            style={{ fontFamily: 'Inter, "Noto Color Emoji", sans-serif' }}
            className="flex-1 px-2 bg-transparent border-none outline-none text-[17px] lg:text-[15px] font-medium text-white/90 lg:text-gray-800 placeholder:text-white/40 lg:placeholder:text-gray-500 disabled:text-white/30 lg:disabled:text-gray-400 disabled:cursor-not-allowed"
          />
        </div>

        {/* Portal: Picker completo de emojis */}
        {(pickerAbierto || pickerSaliendo) && pickerPos && createPortal(
          <div
            className="fixed z-9999"
            style={{
              left: pickerPos.x,
              top: pickerPos.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div
              className={`picker-portal-centrado ${pickerSaliendo ? 'emoji-popup-out' : 'emoji-popup-in'}`}
              style={{ transformOrigin: 'center bottom' }}
            >
              <SelectorEmojis
                onSeleccionar={(emoji) => {
                  setTexto((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                onCerrar={cerrarPicker}
                posicion="arriba-izq"
                ancho={470}
                alto={430}
                cerrarAlSeleccionar={false}
              />
            </div>
          </div>,
          document.body
        )}

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          className={`
            w-11 h-11 rounded-full flex items-center justify-center shrink-0
            ${puedeEnviar
              ? mensajeEditando
                ? 'bg-linear-to-br from-amber-500 to-amber-400 text-white shadow-[0_3px_10px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-linear-to-br from-blue-600 to-blue-500 text-white shadow-[0_3px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-white/10 text-white/30 lg:bg-gray-300 lg:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* ── Inputs ocultos de archivo ── */}
      <input
        ref={inputArchivoRef}
        type="file"
        accept={`image/jpeg,image/png,image/webp,image/gif,${ACCEPT_DOCUMENTOS}`}
        multiple
        onChange={handleSeleccionArchivo}
        className="hidden"
      />
      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSeleccionArchivo}
        className="hidden"
      />

    </div>
  );
}

export default InputMensaje;