'use client';
import { useId } from 'react';
import { Search } from 'lucide-react';
import { cx } from '@/lib/format';

export const inputCls =
  'min-h-11 w-full rounded-[10px] border border-edge bg-white px-3 py-2 text-strong placeholder:text-muted aria-[invalid=true]:border-danger read-only:bg-soft read-only:text-muted';

export function Input(props: React.ComponentProps<'input'>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Select(props: React.ComponentProps<'select'>) {
  return <select {...props} className={cx(inputCls, props.className)} />;
}

/** Campo con etiqueta visible, ayuda opcional y error asociado por aria-describedby. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string, describedBy?: string) => React.ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold text-strong">{label}</label>
      {children(id, hintId)}
      {hint && <p id={hintId} className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p role="alert" className="m-0 rounded-[10px] bg-danger-bg px-3 py-2 font-semibold text-danger">{message}</p> : null;
}

export function SearchBox({ value, onChange, placeholder = 'Buscar por nombre o código', label = 'Buscar producto' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string;
}) {
  const id = useId();
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type="search" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputCls, 'pl-10')} />
    </div>
  );
}

export function CategorySelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">Categoría</label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todas las categorías</option>
        {options.map((c) => <option key={c}>{c}</option>)}
      </Select>
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_repeat(auto-fit,minmax(190px,220px))]">{children}</div>;
}

export function Chip({ active, count, children, onClick }: { active: boolean; count?: number; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button" aria-pressed={active} onClick={onClick}
      className={cx('min-h-10 rounded-full border px-3.5 py-1.5 font-semibold transition-colors', active ? 'border-brand bg-brand text-white' : 'border-edge bg-white text-ink hover:bg-brand-soft')}
    >
      {children}
      {count !== undefined && <span className={cx('ml-1.5 inline-block min-w-[22px] rounded-full px-1.5 text-center text-xs', active ? 'bg-white/25' : 'bg-soft')}>{count}</span>}
    </button>
  );
}

export function Switch({ checked, onChange, label, text }: { checked: boolean; onChange: () => void; label: string; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className="inline-flex min-h-10 items-center gap-2.5 px-1 font-semibold text-ink">
      <span aria-hidden="true" className={cx('relative h-[22px] w-10 rounded-full transition-colors', checked ? 'bg-ok' : 'bg-[#9db2c4]')}>
        <span className={cx('absolute top-[3px] left-[3px] size-4 rounded-full bg-white transition-transform', checked && 'translate-x-[18px]')} />
      </span>
      <span>{text}</span>
    </button>
  );
}

export function SedeSelect({ sedes, value, onChange }: { sedes: { id: string; nombre: string }[]; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex min-w-[210px] flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold tracking-wide text-muted uppercase">Sede</label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </Select>
    </div>
  );
}
