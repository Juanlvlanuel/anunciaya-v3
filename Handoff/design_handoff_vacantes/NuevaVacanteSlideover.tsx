/**
 * NuevaVacanteSlideover.tsx — Slideover desde la derecha para crear
 * una vacante. Maneja state local, validación cliente y publica vía
 * el callback `onPublicar` que el padre conecta a React Query.
 *
 * Patrón consistente con ModalArticulo / ModalOferta de Business Studio.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { ICONOS } from './iconos';
import {
  DIAS_ORDEN,
  DIA_CORTO,
  validarVacante,
  esFormularioValido,
} from './helpers';
import type {
  CrearVacanteInput,
  DiaSemana,
  Modalidad,
  Precio,
  Sucursal,
  TipoEmpleo,
} from './types';

interface Props {
  open: boolean;
  sucursales: Sucursal[];
  onClose: () => void;
  onPublicar: (input: CrearVacanteInput) => Promise<void>;
}

/** Subset de UI para el selector de unidad del salario. */
type UnidadSalario = 'mes-rango' | 'mes-fijo' | 'hora' | 'proyecto';

const VERSION_TYC: CrearVacanteInput['confirmaciones']['version'] = 'v1-2026-05-17';

export function NuevaVacanteSlideover({ open, sucursales, onClose, onPublicar }: Props) {
  /* ------------- state -------------------------------------- */
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? '');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoEmpleo, setTipoEmpleo] = useState<TipoEmpleo>('tiempo-completo');
  const [modalidad, setModalidad] = useState<Modalidad>('presencial');

  // salario
  const [aConvenir, setAConvenir] = useState(false);
  const [unidad, setUnidad] = useState<UnidadSalario>('mes-rango');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  // tags
  const [requisitos, setRequisitos] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState('');
  const [beneficios, setBeneficios] = useState<string[]>([]);
  const [benInput, setBenInput] = useState('');

  // horario / días
  const [horario, setHorario] = useState('');
  const [dias, setDias] = useState<DiaSemana[]>([]);

  // confirmaciones legales (los 3 son obligatorios)
  const [confirms, setConfirms] = useState({ real: false, legal: false, coord: false });
  const [submitting, setSubmitting] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement>(null);

  /* ------------- esc + body scroll + focus inicial --------- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  /* ------------- derivados ---------------------------------- */
  const precio: Precio = useMemo(() => {
    if (aConvenir) return { kind: 'a-convenir' };
    const min = Number(montoMin) || 0;
    const max = Number(montoMax) || 0;
    switch (unidad) {
      case 'mes-rango': return { kind: 'rango',   min, max, moneda: 'MXN' };
      case 'mes-fijo':  return { kind: 'mensual', monto: min };
      case 'hora':      return { kind: 'hora',    monto: min };
      case 'proyecto':  return { kind: 'fijo',    monto: min };
    }
  }, [aConvenir, unidad, montoMin, montoMax]);

  const confirmacionesOk =
    confirms.real && confirms.legal && confirms.coord;

  const errores = useMemo(() =>
    validarVacante({
      sucursalId, titulo, descripcion, requisitos, beneficios,
      horario, precio, confirmacionesOk,
    }),
    [sucursalId, titulo, descripcion, requisitos, beneficios, horario, precio, confirmacionesOk],
  );
  const valido = esFormularioValido(errores);

  const showMax = unidad === 'mes-rango';
  const montoLabel = unidad === 'mes-rango' ? 'Mínimo' : 'Monto';

  /* ------------- handlers ----------------------------------- */
  const onTipoChange = (t: TipoEmpleo) => {
    setTipoEmpleo(t);
    if (t === 'por-proyecto')   setUnidad('proyecto');
    else if (t === 'eventual')  setUnidad('hora');
    else                         setUnidad('mes-rango');
  };

  const toggleDia = (d: DiaSemana) =>
    setDias((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const addRequisito = () => {
    const t = reqInput.trim();
    if (!t || requisitos.includes(t) || requisitos.length >= 20) return;
    setRequisitos((r) => [...r, t]);
    setReqInput('');
  };
  const addBeneficio = () => {
    const t = benInput.trim();
    if (!t || beneficios.includes(t) || beneficios.length >= 8) return;
    setBeneficios((b) => [...b, t]);
    setBenInput('');
  };

  const handlePublicar = async () => {
    if (!valido || submitting) return;
    setSubmitting(true);
    try {
      await onPublicar({
        sucursalId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipoEmpleo,
        modalidad,
        precio,
        requisitos,
        beneficios,
        horario: horario.trim() || undefined,
        diasSemana: dias.length > 0 ? dias : undefined,
        confirmaciones: {
          legal: true,
          verdadera: true,
          coordinacion: true,
          version: VERSION_TYC,
        },
      });
      // TODO: notificar.exito('Vacante publicada con éxito');
      onClose();
    } catch (err) {
      // TODO: notificar.error('No pudimos publicar la vacante');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  /* ------------- render ------------------------------------- */
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="nueva-vacante-title"
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[720px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <header className="flex items-start gap-3.5 px-7 py-5 border-b border-slate-200 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0">
            <Icon icon={ICONOS.vacante} className="w-[22px] h-[22px]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="nueva-vacante-title" className="text-[22px] font-extrabold tracking-tight text-slate-900">
              Nueva vacante
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Publícala y aparecerá en la sección Servicios de AnunciaYA.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <Icon icon={ICONOS.cerrar_x} className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
          {/* Puesto + Sucursal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Field label="Puesto" required>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Diseñador gráfico"
                maxLength={80}
                className={inputCls}
              />
            </Field>
            <Field label="Sucursal" required>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className={inputCls}
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}{s.esMatriz ? ' · Matriz' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Tipo */}
          <Field label="Tipo de empleo" required>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {(['tiempo-completo', 'medio-tiempo', 'por-proyecto', 'eventual'] as TipoEmpleo[]).map((t) => (
                <Choice
                  key={t}
                  selected={tipoEmpleo === t}
                  title={TIPO_LABEL[t]}
                  subtitle={TIPO_SUB[t]}
                  onClick={() => onTipoChange(t)}
                />
              ))}
            </div>
          </Field>

          {/* Modalidad */}
          <Field label="Modalidad" required>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
              {(['presencial', 'remoto', 'hibrido'] as Modalidad[]).map((m) => (
                <Choice
                  key={m}
                  selected={modalidad === m}
                  title={MOD_LABEL[m]}
                  subtitle={MOD_SUB[m]}
                  onClick={() => setModalidad(m)}
                />
              ))}
            </div>
          </Field>

          {/* Salario */}
          <Field label="Salario (MXN)">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Toggle on={aConvenir} onToggle={() => setAConvenir((v) => !v)} />
              <span className="text-sm font-semibold text-slate-700">Dejar a convenir</span>
              <span className="text-[13px] text-slate-500">
                Sin monto público — los candidatos preguntan por chat.
              </span>
            </div>
            {!aConvenir && (
              <>
                <div
                  className="grid items-end gap-2.5"
                  style={{ gridTemplateColumns: showMax ? '1fr 1fr auto' : '1fr auto' }}
                >
                  <InputPrefix
                    prefix="$"
                    placeholder={montoLabel}
                    value={montoMin}
                    onChange={setMontoMin}
                  />
                  {showMax && (
                    <InputPrefix
                      prefix="$"
                      placeholder="Máximo"
                      value={montoMax}
                      onChange={setMontoMax}
                    />
                  )}
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value as UnidadSalario)}
                    className={`${inputCls} w-[180px]`}
                  >
                    <option value="mes-rango">/mes (rango)</option>
                    <option value="mes-fijo">/mes (fijo)</option>
                    <option value="hora">/hora</option>
                    <option value="proyecto">/proyecto</option>
                  </select>
                </div>
                <p className="text-[13px] text-slate-500 mt-2">
                  {unidad === 'mes-rango' && 'Define el rango salarial mensual.'}
                  {unidad === 'mes-fijo'  && 'Define el sueldo mensual fijo.'}
                  {unidad === 'hora'      && 'Pago por hora trabajada.'}
                  {unidad === 'proyecto'  && 'Pago único al completar el proyecto.'}
                </p>
              </>
            )}
            {errores.precio && <ErrorText msg={errores.precio} />}
          </Field>

          {/* Descripción */}
          <Field label="Descripción" required>
            <textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              placeholder="Describe el puesto, responsabilidades y a qué tipo de candidato buscas..."
              className={`${inputCls} resize-y min-h-[100px]`}
            />
            <Meta
              left={`Mínimo 30 caracteres (${descripcion.length}/30)`}
              right={`${descripcion.length}/500`}
              ok={descripcion.length >= 30}
            />
          </Field>

          {/* Requisitos */}
          <Field label="Requisitos · habilidades clave">
            <p className="text-[13px] text-slate-500 -mt-1 mb-2">
              Agrega entre 3 y 20 elementos. Presiona Enter para añadir.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={reqInput}
                onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequisito(); } }}
                placeholder="Ej: Adobe Illustrator, Inglés avanzado..."
                maxLength={200}
                className={inputCls}
              />
              <button type="button" onClick={addRequisito} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors">
                Agregar
              </button>
            </div>
            {requisitos.length > 0 && (
              <Tags
                items={requisitos}
                tono="sky"
                onRemove={(t) => setRequisitos((r) => r.filter((x) => x !== t))}
              />
            )}
            {errores.requisitos && <ErrorText msg={errores.requisitos} />}
          </Field>

          {/* Beneficios */}
          <Field label="Beneficios" hint="(opcional · máx 8)">
            <div className="flex gap-2">
              <input
                type="text"
                value={benInput}
                onChange={(e) => setBenInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBeneficio(); } }}
                placeholder="Ej: Aguinaldo, 2 días home office, Bonos..."
                maxLength={100}
                className={inputCls}
              />
              <button type="button" onClick={addBeneficio} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors">
                Agregar
              </button>
            </div>
            {beneficios.length > 0 && (
              <Tags
                items={beneficios}
                tono="emerald"
                onRemove={(t) => setBeneficios((b) => b.filter((x) => x !== t))}
              />
            )}
          </Field>

          {/* Horario y días */}
          <Field label="Horario y días" hint="(opcional)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                maxLength={150}
                placeholder="Ej: L–V 9:00 a 18:00"
                className={inputCls}
              />
              <div className="flex gap-1.5">
                {DIAS_ORDEN.map((d) => {
                  const on = dias.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDia(d)}
                      className={
                        'flex-1 py-2.5 rounded-lg text-[13px] font-bold tracking-wider uppercase border lg:cursor-pointer transition-colors ' +
                        (on
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400')
                      }
                    >
                      {DIA_CORTO[d]}
                    </button>
                  );
                })}
              </div>
            </div>
          </Field>

          {/* Vigencia (info chip) */}
          <Field label="Vigencia">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-700">
              <Icon icon={ICONOS.horario} className="w-4 h-4" />
              <span>
                La vacante queda activa por <b className="text-slate-900">30 días</b>. Al vencer, se auto-pausa y puedes reactivarla con un click.
              </span>
            </div>
          </Field>

          {/* Confirmaciones legales */}
          <Field label="Confirmaciones legales" required>
            <div className="grid gap-2.5">
              <ConfirmCard
                checked={confirms.real}
                onToggle={() => setConfirms((s) => ({ ...s, real: !s.real }))}
                text="Confirmo que esta vacante es real y vigente."
              />
              <ConfirmCard
                checked={confirms.legal}
                onToggle={() => setConfirms((s) => ({ ...s, legal: !s.legal }))}
                text="Acepto que el contenido cumple con las leyes locales y los términos de AnunciaYA."
              />
              <ConfirmCard
                checked={confirms.coord}
                onToggle={() => setConfirms((s) => ({ ...s, coord: !s.coord }))}
                text="Entiendo que el contacto con candidatos se coordina entre las partes; AnunciaYA solo conecta."
              />
            </div>
          </Field>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2.5 px-7 py-4 border-t border-slate-200 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePublicar}
            disabled={!valido || submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publicando…' : 'Publicar vacante'}
          </button>
        </footer>
      </aside>
    </>
  );
}

/* ============================================================
   Labels locales
   ============================================================ */
const TIPO_LABEL: Record<TipoEmpleo, string> = {
  'tiempo-completo': 'Tiempo completo',
  'medio-tiempo':    'Medio tiempo',
  'por-proyecto':    'Por proyecto',
  'eventual':        'Eventual',
};
const TIPO_SUB: Record<TipoEmpleo, string> = {
  'tiempo-completo': '40 hrs / sem',
  'medio-tiempo':    '20 hrs / sem',
  'por-proyecto':    'Plazo definido',
  'eventual':        'Por evento o turno',
};
const MOD_LABEL: Record<Modalidad, string> = {
  presencial: 'Presencial',
  remoto:     'Remoto',
  hibrido:    'Híbrido',
};
const MOD_SUB: Record<Modalidad, string> = {
  presencial: 'En la sucursal',
  remoto:     'Desde casa',
  hibrido:    'Mezcla de ambos',
};

/* ============================================================
   Subcomponentes locales (Tailwind v4)
   ============================================================ */
const inputCls =
  'w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white text-[15px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-colors';

function Field({
  label, hint, required, children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold tracking-wider uppercase text-slate-700 mb-2">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
        {hint && (
          <span className="ml-2 normal-case tracking-normal font-medium text-slate-500">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Choice({
  selected, title, subtitle, onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-left px-3.5 py-3 rounded-lg border-2 lg:cursor-pointer transition-colors ' +
        (selected
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-200 bg-white hover:border-slate-400')
      }
    >
      <strong className="block text-[15px] font-bold text-slate-900">{title}</strong>
      <span className="block text-[13px] text-slate-500 mt-0.5">{subtitle}</span>
    </button>
  );
}

function InputPrefix({
  prefix, placeholder, value, onChange,
}: {
  prefix: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-slate-500 pointer-events-none">
        {prefix}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-9`}
      />
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={
        'relative w-10 h-[22px] rounded-full lg:cursor-pointer transition-colors ' +
        (on ? 'bg-slate-900' : 'bg-slate-300')
      }
    >
      <span
        className={
          'absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ' +
          (on ? 'translate-x-[18px]' : 'translate-x-0.5')
        }
      />
    </button>
  );
}

function Tags({
  items, tono, onRemove,
}: {
  items: string[];
  tono: 'sky' | 'emerald';
  onRemove: (t: string) => void;
}) {
  const cls =
    tono === 'sky'
      ? 'bg-sky-50 text-sky-700 border-sky-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const closeCls = tono === 'sky' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700';
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {items.map((t) => (
        <span key={t} className={`inline-flex items-center gap-1.5 pl-3 pr-1 py-1 border rounded-full text-[13px] font-semibold ${cls}`}>
          {t}
          <button
            type="button"
            onClick={() => onRemove(t)}
            aria-label={`Quitar ${t}`}
            className={`w-[18px] h-[18px] rounded-full grid place-items-center text-white lg:cursor-pointer ${closeCls}`}
          >
            <Icon icon={ICONOS.cerrar_x} className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

function ConfirmCard({
  checked, onToggle, text,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        'w-full flex items-start gap-3.5 px-4 py-3.5 rounded-lg border-2 text-left lg:cursor-pointer transition-colors ' +
        (checked
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-200 bg-white hover:border-slate-400')
      }
    >
      <span
        className={
          'w-[22px] h-[22px] rounded-md grid place-items-center shrink-0 mt-px transition-colors ' +
          (checked
            ? 'bg-slate-900 border-2 border-slate-900 text-white'
            : 'border-2 border-slate-400 bg-white')
        }
      >
        {checked && <Icon icon={ICONOS.cheque} className="w-3.5 h-3.5" />}
      </span>
      <span className="text-sm text-slate-700 leading-relaxed">{text}</span>
    </button>
  );
}

function Meta({ left, right, ok }: { left: string; right: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center mt-1.5 text-[13px] text-slate-500">
      <span className={ok ? 'text-emerald-600 font-semibold' : ''}>{left}</span>
      <span className="tabular-nums">{right}</span>
    </div>
  );
}

function ErrorText({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-rose-600 mt-1.5">
      <Icon icon={ICONOS.alerta} className="w-3.5 h-3.5" />
      {msg}
    </div>
  );
}
