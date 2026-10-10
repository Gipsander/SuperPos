'use client';
import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';
import { cx } from '@/lib/format';

export function PageHeading({ eyebrow, title, description, actions, as: H = 'h1' }: {
  eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; as?: 'h1' | 'h2';
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <span className="text-[11px] font-bold tracking-[1.8px] text-muted uppercase">{eyebrow}</span>}
        <H className={cx('mt-1 mb-1.5 font-bold tracking-tight text-strong', H === 'h1' ? 'text-[28px]' : 'text-[22px]')}>{title}</H>
        {description && <p className="m-0 max-w-[58ch] text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Box({ title, icon: Icon, children, className }: { title?: string; icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-white p-[18px]', className)}>
      {title && (
        <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold tracking-tight text-strong">
          {Icon && <Icon className="size-[18px] text-brand" aria-hidden="true" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const tones = {
  default: 'border-line bg-white',
  danger: 'border-[#f5c6c2] bg-danger-bg',
  warn: 'border-[#f1d9a6] bg-warn-bg',
  brand: 'border-[#bfdcf1] bg-brand-soft',
} as const;
const toneText = { default: 'text-strong', danger: 'text-danger', warn: 'text-warn', brand: 'text-brand-dark' } as const;

export function StatCard({ label, value, tone = 'default', icon: Icon, note }: {
  label: string; value: string | number; tone?: keyof typeof tones; icon?: LucideIcon; note?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-0.5 rounded-xl border px-4 py-3.5', tones[tone])}>
      <span className="flex items-center gap-1.5 text-[13px] text-muted">
        {Icon && <Icon className="size-4" aria-hidden="true" />}{label}
      </span>
      <strong className={cx('text-[28px] leading-tight tabular-nums', toneText[tone])}>{value}</strong>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

export function EmptyState({ title, children, icon: Icon = PackageOpen }: { title: string; children?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="px-3 py-8 text-center text-muted">
      <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-soft text-brand"><Icon className="size-7" aria-hidden="true" /></span>
      <h3 className="mb-1 text-[17px] font-bold text-strong">{title}</h3>
      {children && <div className="mx-auto max-w-[44ch]">{children}</div>}
    </div>
  );
}

export function TableWrap({ caption, minWidth = 640, children, className }: { caption: string; minWidth?: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto rounded-xl border border-line bg-white', className)}>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const thCls = 'border-b border-line bg-soft px-3.5 py-2.5 text-left text-xs font-bold tracking-wide whitespace-nowrap text-muted uppercase';
export const tdCls = 'border-b border-line px-3.5 py-2.5 align-middle group-last:border-b-0';
export const numCls = 'text-right tabular-nums whitespace-nowrap';

export function Sub({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs text-muted">{children}</span>;
}

/** Pestañas accesibles (role=tablist) con navegación por flechas. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  return (
    <div role="tablist" aria-label={label} className="mb-[18px] flex gap-1 overflow-x-auto border-b border-line"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = tabs.findIndex((t) => t.id === value);
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id;
        onChange(next);
        refs.current[next]?.focus();
      }}>
      {tabs.map((t) => (
        <button
          key={t.id} ref={(el) => { refs.current[t.id] = el; }} role="tab" id={`tab-${t.id}`} aria-selected={t.id === value} aria-controls="tab-panel"
          tabIndex={t.id === value ? 0 : -1} onClick={() => onChange(t.id)}
          className={cx('-mb-px min-h-11 flex-none border-b-[3px] px-4 py-2.5 font-semibold', t.id === value ? 'border-brand text-brand-dark' : 'border-transparent text-muted hover:text-strong')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
