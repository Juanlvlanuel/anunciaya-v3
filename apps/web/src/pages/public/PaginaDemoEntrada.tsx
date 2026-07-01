/**
 * PaginaDemoEntrada.tsx
 * =====================
 * Entrada al Demo de Business Studio (ver docs/arquitectura/Demo_Business_Studio.md).
 *
 * Esta página se carga EMBEBIDA (iframe) dentro del Panel cuando un vendedor abre el demo. Lee el
 * `?handoff` de la URL, lo canjea por una sesión de impersonación (POST /auth/demo/canjear-handoff)
 * y deja al usuario dentro de Business Studio en modo comercial sobre su copia del demo.
 *
 * Es una ruta PÚBLICA: no hay sesión previa en este origen; el handoff token es la autorización.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore, type Usuario } from '../../stores/useAuthStore';

export default function PaginaDemoEntrada() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const loginExitoso = useAuthStore((s) => s.loginExitoso);
  const [error, setError] = useState<string | null>(null);
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    const handoff = params.get('handoff');
    if (!handoff) {
      setError('El enlace del demo está incompleto.');
      return;
    }

    (async () => {
      try {
        const resp = await api.post('/auth/demo/canjear-handoff', { handoffToken: handoff });
        if (!resp.data?.success || !resp.data?.data) {
          setError(resp.data?.message || 'No se pudo abrir el demo.');
          return;
        }
        const { usuario, accessToken, refreshToken } = resp.data.data as {
          usuario: Usuario;
          accessToken: string;
          refreshToken: string;
        };
        await loginExitoso(usuario, accessToken, refreshToken);
        navigate('/business-studio', { replace: true });
      } catch {
        setError('El enlace del demo es inválido o expiró. Vuelve a abrirlo desde el Panel.');
      }
    })();
  }, [params, loginExitoso, navigate]);

  return (
    <div
      data-testid="demo-entrada"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"
    >
      {error ? (
        <>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <p data-testid="demo-entrada-error" className="max-w-sm text-[15px] font-medium text-slate-700">
            {error}
          </p>
        </>
      ) : (
        <>
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          <p className="text-[15px] font-medium text-slate-600">Abriendo el demo de Business Studio…</p>
        </>
      )}
    </div>
  );
}
