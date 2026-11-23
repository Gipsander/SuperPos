'use client';
import { bs, cx, money } from '@/lib/format';
import { tasaHoy, useStore } from '@/lib/store';

/** Monto en $ (base) con su equivalente en Bs. según la tasa del día (o la `tasa` histórica indicada). */
export function Dual({ usd, tasa, className, bsClassName, inline }: {
  usd: number; tasa?: number; className?: string; bsClassName?: string; inline?: boolean;
}) {
  const state = useStore();
  return (
    <span className={cx(inline ? 'inline-flex flex-wrap items-baseline gap-x-1.5' : 'inline-flex flex-col leading-tight', className)}>
      <span>{money(usd)}</span>
      <span className={cx('text-[0.78em] font-normal text-muted', bsClassName)}>{bs(usd, tasa ?? tasaHoy(state))}</span>
    </span>
  );
}

/** Tasa vigente para textos. */
export const useTasa = () => tasaHoy(useStore());
