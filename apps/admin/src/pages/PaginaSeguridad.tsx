/**
 * PaginaSeguridad.tsx
 * ====================
 * "Mi cuenta → Seguridad": interruptor del 2FA del Panel (opcional, por cuenta).
 * Activar: genera QR → escaneas con Google Authenticator → tecleas el primer
 * código → queda prendido (y se reemplazan los tokens por los "marcados").
 *
 * Ubicación: apps/admin/src/pages/PaginaSeguridad.tsx
 */

import { useEffect, useState } from 'react';
import { ShieldCheck, Check, TriangleAlert, ScanLine } from 'lucide-react';
import { estado2fa, generar2fa, activar2fa, desactivar2fa } from '../services/seguridad2faService';
import { useAuthPanelStore } from '../stores/useAuthPanelStore';

type Vista = 'cargando' | 'apagado' | 'qr' | 'encendido';

export default function PaginaSeguridad() {
  const setTokens = useAuthPanelStore((s) => s.setTokens);

  const [vista, setVista] = useState<Vista>('cargando');
  const [qr, setQr] = useState<string>();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await estado2fa();
        setVista(r.data?.habilitado ? 'encendido' : 'apagado');
      } catch {
        setVista('apagado');
      }
    })();
  }, []);

  async function comenzarActivacion() {
    setError(undefined);
    setCargando(true);
    try {
      const r = await generar2fa();
      if (r.success && r.data) {
        setQr(r.data.qrCode);
        setCodigo('');
        setVista('qr');
      } else {
        setError(r.message || 'No se pudo generar el código.');
      }
    } catch {
      setError('No se pudo generar el código. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  async function confirmarActivacion() {
    setError(undefined);
    setCargando(true);
    try {
      const r = await activar2fa(codigo);
      if (r.success && r.data) {
        setTokens(r.data.accessToken, r.data.refreshToken);
        setVista('encendido');
      } else {
        setError(r.message || 'Código incorrecto.');
      }
    } catch {
      setError('Código incorrecto. Revisa tu app de autenticación.');
    } finally {
      setCargando(false);
    }
  }

  async function apagar() {
    setError(undefined);
    setCargando(true);
    try {
      const r = await desactivar2fa();
      if (r.success) {
        setVista('apagado');
        setQr(undefined);
        setCodigo('');
      } else {
        setError(r.message || 'No se pudo desactivar.');
      }
    } catch {
      setError('No se pudo desactivar. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Encabezado */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-marca-suave text-marca">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.2px] text-texto">Verificación en dos pasos</h2>
            <p className="text-[13px] text-texto-3">Protege el acceso al Panel con Google Authenticator.</p>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="overflow-hidden rounded-[18px] border border-borde bg-superficie shadow-tarjeta-panel">
          {/* Barra de estado (apagado / encendido) */}
          {vista !== 'qr' && vista !== 'cargando' && (
            <div className="flex items-center justify-between border-b border-borde px-5 py-3.5">
              <span className="text-[13px] font-semibold text-texto-2">Estado</span>
              {vista === 'encendido' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--panel-ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--panel-ok)_12%,transparent)] px-2.5 py-1 text-[12px] font-semibold text-ok">
                  <Check size={13} /> Activada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-lienzo px-2.5 py-1 text-[12px] font-semibold text-texto-3">
                  <span className="h-2 w-2 rounded-full bg-texto-4" /> Desactivada
                </span>
              )}
            </div>
          )}

          <div className="p-5 lg:p-6">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-[11px] border border-[color-mix(in_srgb,var(--panel-danger)_30%,transparent)] bg-peligro-suave p-3 text-sm text-texto-2">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-peligro" />
                <span>{error}</span>
              </div>
            )}

            {/* CARGANDO */}
            {vista === 'cargando' && (
              <div className="flex items-center gap-2 py-2 text-sm text-texto-3">
                <span className="spinner-panel" style={{ borderTopColor: 'var(--panel-brand)' }} /> Cargando…
              </div>
            )}

            {/* APAGADO */}
            {vista === 'apagado' && (
              <div>
                <p className="mb-5 text-sm leading-relaxed text-texto-3">
                  Al entrar al Panel te pediremos un código de tu app de autenticación, además de la
                  contraseña. Es opcional, pero recomendado.
                </p>
                <button
                  type="button"
                  data-testid="seguridad-activar"
                  onClick={comenzarActivacion}
                  disabled={cargando}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-marca px-5 py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px disabled:opacity-85"
                >
                  {cargando ? (
                    <>
                      <span className="spinner-panel" /> Generando…
                    </>
                  ) : (
                    <>
                      <ScanLine size={17} /> Activar verificación en dos pasos
                    </>
                  )}
                </button>
              </div>
            )}

            {/* QR (setup) */}
            {vista === 'qr' && (
              <div>
                <div className="mb-4 space-y-2.5">
                  {[
                    'Abre Google Authenticator y escanea el código.',
                    'Escribe el código de 6 dígitos que aparece para confirmar.',
                  ].map((paso, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-suave text-[12px] font-bold text-marca">
                        {i + 1}
                      </span>
                      <span className="text-sm text-texto-2">{paso}</span>
                    </div>
                  ))}
                </div>

                {qr && (
                  <div className="mb-5 flex justify-center">
                    <div className="rounded-[16px] border border-borde bg-lienzo p-3">
                      <img
                        src={qr}
                        alt="Código QR para 2FA"
                        className="h-44 w-44 rounded-[10px] bg-white p-2"
                      />
                    </div>
                  </div>
                )}

                <label htmlFor="codigo-2fa" className="mb-2 block text-center text-[13px] font-semibold text-texto-2">
                  Código de confirmación
                </label>
                <input
                  id="codigo-2fa"
                  data-testid="seguridad-codigo"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  className="mx-auto mb-5 block w-full max-w-[220px] rounded-[12px] border-2 border-campo-borde bg-campo px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_4px_var(--panel-ring)]"
                />

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setVista('apagado')}
                    className="flex-1 rounded-[12px] border border-borde py-3 text-sm font-semibold text-texto-2 transition hover:bg-marca-suave"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    data-testid="seguridad-confirmar"
                    onClick={confirmarActivacion}
                    disabled={cargando || codigo.length < 6}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cargando ? (
                      <>
                        <span className="spinner-panel" /> Confirmando…
                      </>
                    ) : (
                      'Confirmar y activar'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ENCENDIDO */}
            {vista === 'encendido' && (
              <div>
                <p className="mb-5 text-sm leading-relaxed text-texto-3">
                  Cada vez que entres al Panel te pediremos el código de tu app de autenticación.
                </p>
                <button
                  type="button"
                  data-testid="seguridad-desactivar"
                  onClick={apagar}
                  disabled={cargando}
                  className="rounded-[12px] border-2 border-peligro/40 px-5 py-2.5 text-sm font-semibold text-peligro transition hover:bg-peligro hover:text-white disabled:opacity-60"
                >
                  {cargando ? 'Desactivando…' : 'Desactivar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
