/**
 * ============================================================================
 * TAB: Contacto
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabContacto.tsx
 */

import { Phone, Mail, Globe, Share2, MapPin } from 'lucide-react';
import type { DatosContacto, DatosInformacion } from '../hooks/usePerfil';

interface TabContactoProps {
  datosContacto: DatosContacto;
  setDatosContacto: (datos: DatosContacto) => void;
  datosInformacion: DatosInformacion;
  setDatosInformacion: (datos: DatosInformacion) => void;
  esGerente: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const ESTILO_INPUT = { border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' } as const;

function normalizarTelefono(tel: string): { lada: string; numero: string } {
  if (!tel) return { lada: '+52', numero: '' };
  if (tel.includes(' ') && tel.startsWith('+')) {
    const partes = tel.split(' ');
    return { lada: partes[0], numero: partes[1] || '' };
  }
  if (tel.startsWith('+')) {
    const soloDigitos = tel.substring(1);
    if (soloDigitos.length >= 10) {
      const numero = soloDigitos.slice(-10);
      const lada = '+' + soloDigitos.slice(0, -10);
      return { lada: lada || '+52', numero };
    }
    return { lada: tel, numero: '' };
  }
  if (/^\d+$/.test(tel)) return { lada: '+52', numero: tel };
  return { lada: '+52', numero: tel.replace(/[^0-9]/g, '') };
}

function InputTelefono({ value, onChange, prefijo = 'contacto' }: { value: string; onChange: (v: string) => void; prefijo?: string }) {
  const { lada, numero } = normalizarTelefono(value);
  return (
    <div className="flex gap-2 min-w-0">
      <div className="flex items-center justify-center w-20 lg:w-16 2xl:w-20 h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-2 shrink-0"
        style={ESTILO_INPUT}>
        <input
          id={`${prefijo}-lada`}
          name={`${prefijo}-lada`}
          type="text"
          value={lada}
          onChange={(e) => {
            let l = e.target.value;
            if (!l.startsWith('+')) l = '+' + l.replace(/[^0-9]/g, '');
            l = l.replace(/[^+0-9]/g, '');
            if (l === '+' || l === '') l = '+52';
            onChange(numero ? `${l} ${numero}` : l);
          }}
          placeholder="+52"
          maxLength={4}
          className="w-full bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 text-center"
        />
      </div>
      <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 flex-1 min-w-0"
        style={ESTILO_INPUT}>
        <input
          id={`${prefijo}-telefono`}
          name={`${prefijo}-telefono`}
          type="tel"
          value={numero}
          onChange={(e) => {
            const n = e.target.value.replace(/[^0-9]/g, '');
            onChange(n ? `${lada} ${n}` : lada);
          }}
          placeholder="6381234567"
          maxLength={10}
          className="w-full min-w-0 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800"
        />
      </div>
    </div>
  );
}

function CampoInput({ label, icono, children }: { label: React.ReactNode; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
        {icono}
        {label}
      </div>
      {children}
    </div>
  );
}

export default function TabContacto({
  datosContacto,
  setDatosContacto,
  datosInformacion,
  setDatosInformacion,
  esGerente,
}: TabContactoProps) {

  const mostrarNombreSucursal = esGerente || (datosInformacion.totalSucursales > 1 && !datosInformacion.esPrincipal);
  const mostrarSitioWeb = !esGerente && (datosInformacion.totalSucursales === 1 || datosInformacion.esPrincipal);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4 lg:items-start">

      {/* ================================================================ */}
      {/* CARD 1: INFORMACIÓN DE CONTACTO */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <Phone className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Información de Contacto</span>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

          {/* Nombre de la Sucursal (solo en vista gerente/secundaria) */}
          {mostrarNombreSucursal && (
            <CampoInput
              label={<>Nombre de la Sucursal <span className="text-red-500">*</span></>}
              icono={<MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
            >
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="contacto-nombre-sucursal"
                  name="nombreSucursal"
                  type="text"
                  value={datosInformacion.nombreSucursal}
                  onChange={(e) => setDatosInformacion({ ...datosInformacion, nombreSucursal: e.target.value })}
                  placeholder="Ej: Mi Negocio Plaza Norte"
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </CampoInput>
          )}

          {/* Teléfono + WhatsApp */}
          <div className="grid grid-cols-1 gap-4 lg:gap-3 2xl:gap-4">
            <CampoInput
              label="Teléfono"
              icono={<Phone className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
            >
              <InputTelefono
                prefijo="contacto-tel"
                value={datosContacto.telefono}
                onChange={(v) => setDatosContacto({ ...datosContacto, telefono: v })}
              />
            </CampoInput>

            <CampoInput
              label="WhatsApp"
              icono={
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              }
            >
              <InputTelefono
                prefijo="contacto-whatsapp"
                value={datosContacto.whatsapp || ''}
                onChange={(v) => setDatosContacto({ ...datosContacto, whatsapp: v })}
              />
            </CampoInput>
          </div>

          {/* Email + Sitio Web */}
          <div className="grid grid-cols-1 gap-4 lg:gap-3 2xl:gap-4">
            <CampoInput
              label="Correo Electrónico"
              icono={<Mail className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
            >
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="contacto-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={datosContacto.email || ''}
                  onChange={(e) => setDatosContacto({ ...datosContacto, email: e.target.value })}
                  placeholder="contacto@tunegocio.com"
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </CampoInput>

            {mostrarSitioWeb && (
              <CampoInput
                label="Sitio Web (opcional)"
                icono={<Globe className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              >
                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                  style={ESTILO_INPUT}>
                  <input
                    id="contacto-sitio-web"
                    name="sitioWeb"
                    type="url"
                    value={datosContacto.sitioWeb || ''}
                    onChange={(e) => setDatosContacto({ ...datosContacto, sitioWeb: e.target.value })}
                    placeholder="https://tusitio.com"
                    className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                  />
                </div>
              </CampoInput>
            )}
          </div>

        </div>
      </div>

      {/* ================================================================ */}
      {/* CARD 2: REDES SOCIALES */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <Share2 className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Redes Sociales</span>
          <span className="ml-auto text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Todas opcionales</span>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4">
          <div className="grid grid-cols-1 gap-4 lg:gap-3 2xl:gap-4">

            {/* Facebook */}
            <CampoInput
              label="Facebook"
              icono={
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              }
            >
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="contacto-facebook"
                  name="facebook"
                  type="text"
                  value={datosContacto.redesSociales.facebook || ''}
                  onChange={(e) => setDatosContacto({ ...datosContacto, redesSociales: { ...datosContacto.redesSociales, facebook: e.target.value } })}
                  placeholder="facebook.com/TuNegocio"
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </CampoInput>

            {/* Instagram */}
            <CampoInput
              label="Instagram"
              icono={
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              }
            >
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="contacto-instagram"
                  name="instagram"
                  type="text"
                  value={datosContacto.redesSociales.instagram || ''}
                  onChange={(e) => setDatosContacto({ ...datosContacto, redesSociales: { ...datosContacto.redesSociales, instagram: e.target.value } })}
                  placeholder="tunegocio"
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </CampoInput>

            {/* TikTok */}
            <CampoInput
              label="TikTok"
              icono={
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              }
            >
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="contacto-tiktok"
                  name="tiktok"
                  type="text"
                  value={datosContacto.redesSociales.tiktok || ''}
                  onChange={(e) => setDatosContacto({ ...datosContacto, redesSociales: { ...datosContacto.redesSociales, tiktok: e.target.value } })}
                  placeholder="@tunegocio"
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </CampoInput>

            {/* Twitter/X */}
            <CampoInput
              label="Twitter / X"
              icono={
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              }
            >
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="contacto-twitter"
                  name="twitter"
                  type="text"
                  value={datosContacto.redesSociales.twitter || ''}
                  onChange={(e) => setDatosContacto({ ...datosContacto, redesSociales: { ...datosContacto.redesSociales, twitter: e.target.value } })}
                  placeholder="@tunegocio"
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </CampoInput>

          </div>
        </div>
      </div>

    </div>
  );
}
