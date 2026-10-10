import { Check, TriangleAlert } from 'lucide-react';
import type { EstadoStock } from '@/lib/types';
import { cx } from '@/lib/format';

const tone: Record<EstadoStock, string> = {
  agotado: 'bg-danger-bg text-danger',
  bajo: 'bg-warn-bg text-warn',
  ok: 'bg-ok-bg text-ok',
};
const defaults: Record<EstadoStock, string> = { agotado: 'Agotado', bajo: 'Stock bajo', ok: 'Disponible' };

/** Estado de stock: nunca solo color, siempre icono + texto. */
export function StockBadge({ estado, label }: { estado: EstadoStock; label?: string }) {
  const Icon = estado === 'ok' ? Check : TriangleAlert;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-2 text-xs font-bold whitespace-nowrap', tone[estado])}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? defaults[estado]}
    </span>
  );
}

export function Tag({ tone: t, children }: { tone: 'in' | 'out' | 'off'; children: React.ReactNode }) {
  return (
    <span className={cx('inline-block rounded-md px-2 py-0.5 text-xs font-bold', t === 'in' ? 'bg-ok-bg text-ok' : 'bg-[#e8eef4] text-[#3f5870]')}>
      {children}
    </span>
  );
}

export function Falta({ estado, n }: { estado: EstadoStock; n: number }) {
  if (!n) return <span className="text-muted" aria-label="Ninguna">—</span>;
  return (
    <span className={cx('font-bold', estado === 'agotado' ? 'text-danger' : 'text-warn')}>
      {n} <small className="font-normal">faltan</small>
    </span>
  );
}
