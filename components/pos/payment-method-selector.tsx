'use client';
import { Banknote, CreditCard, Landmark, type LucideIcon } from 'lucide-react';
import type { MetodoPago } from '@/lib/types';
import { cx } from '@/lib/format';

export const METODOS: { id: MetodoPago; label: string; icon: LucideIcon }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia', icon: Landmark },
];
export const metodoLabel = (m: MetodoPago) => METODOS.find((x) => x.id === m)!.label;

export function PaymentMethodSelector({ value, onChange }: { value: MetodoPago; onChange: (m: MetodoPago) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 font-semibold text-strong">Método de pago</legend>
      <div className="grid grid-cols-3 gap-2">
        {METODOS.map(({ id, label, icon: Icon }) => (
          <label key={id} className={cx('flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[#64b5ed]',
            value === id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-edge bg-white text-ink hover:bg-soft')}>
            <input type="radio" name="metodo" value={id} checked={value === id} onChange={() => onChange(id)} className="sr-only" />
            <Icon className="size-5" aria-hidden="true" />{label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
