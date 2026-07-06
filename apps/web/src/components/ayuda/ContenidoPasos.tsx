import type { ReactNode } from 'react';

interface ContenidoPasosProps {
  texto: string | null;
}

/**
 * Render mínimo de Markdown para los pasos de un tutorial. Cubre lo que un
 * tutorial necesita sin sumar dependencia: **negrita**, listas numeradas
 * (`1.`) y viñetas (`- `), y párrafos sueltos. No es un parser completo.
 */
function renderInline(linea: string): ReactNode[] {
  return linea.split(/(\*\*[^*]+\*\*)/g).map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{parte}</span>;
  });
}

export function ContenidoPasos({ texto }: ContenidoPasosProps) {
  if (!texto || !texto.trim()) return null;

  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  let paso = 0;

  return (
    <div data-testid="ayuda-pasos">
      {lineas.map((linea, i) => {
        const num = linea.match(/^(\d+)[.)]\s+(.*)$/);
        const vin = linea.match(/^[-*]\s+(.*)$/);
        if (num || vin) {
          paso += 1;
          const contenido = num ? num[2] : (vin as RegExpMatchArray)[1];
          return (
            <div
              key={i}
              className="flex gap-3 border-t border-slate-200 py-2 text-sm font-medium text-slate-700 first:border-t-0"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700">
                {paso}
              </span>
              <span className="pt-px">{renderInline(contenido)}</span>
            </div>
          );
        }
        return (
          <p key={i} className="py-1 text-sm font-medium leading-relaxed text-slate-700">
            {renderInline(linea)}
          </p>
        );
      })}
    </div>
  );
}
