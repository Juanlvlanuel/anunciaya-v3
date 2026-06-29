/**
 * TabDatosPersonales.tsx
 * =======================
 * Tab "Datos Personales" de Mi Perfil (Modo Personal). Edita los datos del USUARIO
 * (no del negocio): avatar, nombre, apellidos, teléfono, fecha de nacimiento, género
 * y ciudad. El correo es solo-lectura (cambiarlo exige re-verificación).
 *
 * - Avatar: useR2Upload (presigned `generarUrlAvatar`) con preview + cambiar/quitar.
 *   Anti-huérfanas: si se sube un avatar y NO se guarda (se desmonta), se borra de R2.
 * - Guardado: PATCH /auth/perfil con solo los campos que cambiaron + recarga del store.
 *
 * Ubicación: apps/web/src/pages/private/perfil/components/TabDatosPersonales.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Calendar, Camera, Loader2, Mail, MapPin, Save, Trash2, User as UserIcon, ZoomIn } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useR2Upload } from '@/hooks/useR2Upload';
import { actualizarPerfil, generarUrlAvatar, type ActualizarPerfilInput } from '@/services/authService';
import { eliminarImagenHuerfana } from '@/services/r2Service';
import { ModalUbicacion } from '@/components/layout/ModalUbicacion';
import { ModalImagenes } from '@/components/ui/ModalImagenes';
import { CustomSelect, type SelectOption } from '@/components/ui/CustomSelect';
import { InputTelefono, normalizarTelefono } from '@/components/ui/InputTelefono';
import notificar from '@/utils/notificaciones';

/** Dark Gradient de Marca (TC-7) — botón de acción primaria. */
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

const INPUT =
    'w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500';

type Genero = NonNullable<ActualizarPerfilInput['genero']>;

const GENEROS: SelectOption<Genero>[] = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'femenino', label: 'Femenino' },
    { value: 'otro', label: 'Otro' },
    { value: 'no_especificado', label: 'Prefiero no decir' },
];

/**
 * Forma compacta del teléfono para guardar/comparar: "+{lada}{10 dígitos}" (sin espacio),
 * p. ej. "+526381234567". Cadena vacía si no hay número completo. Acepta tanto el formato con
 * espacio de InputTelefono ("+52 6381234567") como el legado sin espacio del registro.
 */
function aTelefonoCompacto(tel: string | null | undefined): string {
    if (!tel) return '';
    const { lada, numero } = normalizarTelefono(tel);
    return numero ? `${lada}${numero}` : '';
}

export default function TabDatosPersonales() {
    const usuario = useAuthStore((s) => s.usuario);
    const recargarDatosUsuario = useAuthStore((s) => s.recargarDatosUsuario);

    // ── Estado del formulario (sembrado del usuario) ──
    const [nombre, setNombre] = useState(usuario?.nombre ?? '');
    const [apellidos, setApellidos] = useState(usuario?.apellidos ?? '');
    const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
    const [fechaNacimiento, setFechaNacimiento] = useState(usuario?.fechaNacimiento ?? '');
    const [genero, setGenero] = useState<Genero>((usuario?.genero as Genero) ?? 'no_especificado');
    const [ciudad, setCiudad] = useState(usuario?.ciudad ?? '');
    const [modalCiudad, setModalCiudad] = useState(false);
    const [verAvatarGrande, setVerAvatarGrande] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // ── Avatar (useR2Upload) ──
    const avatarActual = usuario?.avatarUrl ?? null;
    const [quitarAvatar, setQuitarAvatar] = useState(false);
    const { imageUrl, r2Url, isUploading, uploadImage, reset, setImageUrl, setR2Url } = useR2Upload({
        generarUrl: generarUrlAvatar,
        maxWidth: 512, // un avatar no necesita más: queda nítido en retina y pesa una fracción del default (1920)
    });

    // Anti-huérfanas: si se sube un avatar y NO se guarda (se desmonta el tab), se borra de R2.
    const r2UrlRef = useRef<string | null>(null);
    const guardadoRef = useRef(false);
    useEffect(() => { r2UrlRef.current = r2Url; }, [r2Url]);
    useEffect(() => {
        return () => {
            if (r2UrlRef.current && !guardadoRef.current) {
                eliminarImagenHuerfana(r2UrlRef.current).catch(() => { /* silencioso */ });
            }
        };
    }, []);

    if (!usuario) return null;

    // Avatar mostrado: nuevo subido → preview; si se quitó → placeholder; si no → el actual.
    const avatarMostrado = imageUrl ?? (quitarAvatar ? null : avatarActual);

    // ── Detección de cambios ──
    const telCambiado = aTelefonoCompacto(telefono) !== aTelefonoCompacto(usuario.telefono);
    const avatarCambiado = !!r2Url || (quitarAvatar && !!avatarActual);
    const hayCambios =
        nombre.trim() !== (usuario.nombre ?? '') ||
        apellidos.trim() !== (usuario.apellidos ?? '') ||
        telCambiado ||
        fechaNacimiento !== (usuario.fechaNacimiento ?? '') ||
        genero !== ((usuario.genero as ActualizarPerfilInput['genero']) ?? 'no_especificado') ||
        ciudad !== (usuario.ciudad ?? '') ||
        avatarCambiado;

    function elegirNuevoAvatar(file: File) {
        guardadoRef.current = false; // subida nueva pendiente de guardar (el cleanup debe poder borrarla)
        setQuitarAvatar(false);
        uploadImage(file);
    }

    async function guardar() {
        if (guardando || isUploading) return;

        // Validación de teléfono: solo lada (sin número) lo quita; con número, deben ser 10 dígitos.
        const { numero: telNumero } = normalizarTelefono(telefono);
        if (telNumero && telNumero.length !== 10) {
            notificar.error('El teléfono debe tener 10 dígitos (además de la lada).');
            return;
        }
        if (!nombre.trim() || !apellidos.trim()) {
            notificar.error('Nombre y apellidos son obligatorios.');
            return;
        }

        // Solo enviamos los campos que cambiaron.
        const payload: ActualizarPerfilInput = {};
        if (nombre.trim() !== (usuario!.nombre ?? '')) payload.nombre = nombre.trim();
        if (apellidos.trim() !== (usuario!.apellidos ?? '')) payload.apellidos = apellidos.trim();
        if (telCambiado) payload.telefono = aTelefonoCompacto(telefono) || null;
        if (fechaNacimiento !== (usuario!.fechaNacimiento ?? '')) payload.fechaNacimiento = fechaNacimiento || null;
        if (genero !== ((usuario!.genero as ActualizarPerfilInput['genero']) ?? 'no_especificado')) payload.genero = genero;
        if (ciudad !== (usuario!.ciudad ?? '')) payload.ciudad = ciudad || null;
        if (r2Url) payload.avatarUrl = r2Url;
        else if (quitarAvatar && avatarActual) payload.avatarUrl = null;

        setGuardando(true);
        try {
            const res = await actualizarPerfil(payload);
            if (res.success) {
                guardadoRef.current = true; // el avatar nuevo ya quedó en BD → el cleanup no debe borrarlo
                await recargarDatosUsuario();
                setQuitarAvatar(false);
                // Limpia el estado del avatar subido SIN borrarlo de R2 (ya está en BD): así
                // `r2Url` deja de contar como cambio y el preview cae al avatar ya recargado.
                setImageUrl(null);
                setR2Url(null);
                notificar.exito('Datos actualizados.');
            } else {
                notificar.error(res.message || 'No se pudieron guardar los cambios.');
            }
        } catch {
            notificar.error('No se pudieron guardar los cambios.');
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div data-testid="tab-datos-personales" className="rounded-xl bg-white border border-slate-300 shadow-sm p-5 lg:p-6 space-y-6">
            {/* ── Avatar ── */}
            <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                    {avatarMostrado ? (
                        <button
                            type="button"
                            data-testid="avatar-expandir"
                            onClick={() => setVerAvatarGrande(true)}
                            aria-label="Ver foto de perfil en grande"
                            className="group relative block w-20 h-20 rounded-full cursor-pointer focus:outline-none"
                        >
                            <img
                                src={avatarMostrado}
                                alt="Foto de perfil"
                                className="w-20 h-20 rounded-full object-cover border-2 border-slate-300"
                            />
                            <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
                                <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2.5} />
                            </span>
                        </button>
                    ) : (
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center text-white shrink-0 shadow-md"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                        >
                            <UserIcon className="w-9 h-9" strokeWidth={2} />
                        </div>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 mb-2">Foto de perfil</p>
                    <div className="flex flex-wrap gap-2">
                        <label
                            data-testid="input-avatar"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white text-slate-700 border border-slate-300 px-3 py-1.5 text-sm font-semibold cursor-pointer lg:hover:bg-slate-200"
                        >
                            <Camera className="w-4 h-4" strokeWidth={2} />
                            {avatarMostrado ? 'Cambiar' : 'Subir foto'}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) elegirNuevoAvatar(f);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                        {avatarMostrado && (
                            <button
                                data-testid="btn-quitar-avatar"
                                onClick={() => { reset(); setQuitarAvatar(true); }}
                                disabled={isUploading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white text-red-600 border border-slate-300 px-3 py-1.5 text-sm font-semibold cursor-pointer lg:hover:bg-red-50 disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                                Quitar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Nombre / Apellidos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="dp-nombre" className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre</label>
                    <input
                        id="dp-nombre"
                        data-testid="input-nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        maxLength={100}
                        className={INPUT}
                    />
                </div>
                <div>
                    <label htmlFor="dp-apellidos" className="block text-sm font-semibold text-slate-700 mb-1.5">Apellidos</label>
                    <input
                        id="dp-apellidos"
                        data-testid="input-apellidos"
                        type="text"
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        maxLength={100}
                        className={INPUT}
                    />
                </div>
            </div>

            {/* ── Correo (solo lectura) / Teléfono ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo</label>
                    <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-slate-100 px-3 py-2" title="El correo no se puede cambiar desde aquí">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                        <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600 truncate">{usuario.correo}</span>
                    </div>
                </div>
                <div>
                    <label htmlFor="tel-perfil-numero" className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
                    <InputTelefono
                        prefijo="tel-perfil"
                        value={telefono}
                        onChange={setTelefono}
                        testIdNumero="input-telefono"
                        testIdLada="input-telefono-lada"
                    />
                </div>
            </div>

            {/* ── Fecha de nacimiento / Género / Ciudad ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="dp-fecha" className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de nacimiento</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" strokeWidth={2} />
                        <input
                            id="dp-fecha"
                            data-testid="input-fecha-nacimiento"
                            type="date"
                            value={fechaNacimiento}
                            max="9999-12-31"
                            onChange={(e) => setFechaNacimiento(e.target.value)}
                            className={`${INPUT} pl-9`}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="dp-genero" className="block text-sm font-semibold text-slate-700 mb-1.5">Género</label>
                    <CustomSelect<Genero>
                        id="dp-genero"
                        testId="select-genero"
                        ariaLabel="Género"
                        value={genero}
                        options={GENEROS}
                        onChange={setGenero}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ciudad</label>
                    <button
                        data-testid="btn-ciudad"
                        type="button"
                        onClick={() => setModalCiudad(true)}
                        className="w-full flex items-center gap-2 rounded-lg border-2 border-slate-300 px-3.5 py-2.5 text-base lg:text-sm 2xl:text-base font-medium text-left lg:cursor-pointer hover:border-slate-400"
                    >
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                        <span className={`flex-1 truncate ${ciudad ? 'text-slate-900' : 'text-slate-500'}`}>
                            {ciudad || 'Elegir ciudad'}
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Guardar ── */}
            <div className="flex justify-end pt-1">
                <button
                    data-testid="btn-guardar-datos"
                    onClick={guardar}
                    disabled={!hayCambios || guardando || isUploading}
                    style={hayCambios && !guardando && !isUploading ? { background: GRADIENTE_MARCA } : undefined}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold ${
                        hayCambios && !guardando && !isUploading
                            ? 'text-white shadow-md cursor-pointer'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2} />}
                    Guardar cambios
                </button>
            </div>

            {/* Modal selector de ciudad (reusa el de la app; no toca el gpsStore) */}
            {modalCiudad && (
                <ModalUbicacion
                    onClose={() => setModalCiudad(false)}
                    onSeleccionar={(c) => setCiudad(c.nombre)}
                />
            )}

            {/* Lightbox del avatar en grande (reusa el visor de imágenes de la app) */}
            {avatarMostrado && (
                <ModalImagenes
                    images={[avatarMostrado]}
                    isOpen={verAvatarGrande}
                    onClose={() => setVerAvatarGrande(false)}
                />
            )}
        </div>
    );
}
