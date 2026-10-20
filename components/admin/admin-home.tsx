'use client';
import {
  ArrowUpRight, BarChart3, Box, Boxes, ContactRound, Hammer, Store, Tag, Users, type LucideIcon,
} from 'lucide-react';
import type { AdminPage } from '@/components/admin/modules';
import { ADMIN_MODULES } from '@/components/admin/modules';
import { PageHeading } from '@/components/ui/layout';

const ICONS: Record<string, LucideIcon> = { users: Users, customers: ContactRound, store: Store, box: Box, inventory: Boxes, price: Tag, chart: BarChart3 };

export function AdminHome({ name, onNavigate }: { name: string; onNavigate: (p: AdminPage) => void }) {
  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading eyebrow="Panel de administración" title={`Hola, ${name}`} description="Todo lo que necesitas para administrar tu supermercado, en un solo lugar." />
      <div className="mb-7 flex items-center justify-between gap-4 rounded-[20px] bg-gradient-to-br from-brand to-brand-dark p-7 text-white">
        <div>
          <h2 className="mb-1.5 text-[22px] font-bold tracking-tight">Bienvenido a SuperPOS</h2>
          <p className="m-0 max-w-[52ch] opacity-90">Catálogo, precios, inventario, ventas y reportes comparten los mismos datos: lo que cambias en un módulo se refleja al instante en los demás.</p>
        </div>
        <Store className="hidden size-16 shrink-0 opacity-60 sm:block" aria-hidden="true" />
      </div>
      <h2 className="mb-3 text-lg font-bold text-strong">¿Por dónde empezamos?</h2>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5 p-0">
        {ADMIN_MODULES.map((m) => {
          const Icon = ICONS[m.icon];
          return (
            <li key={m.id}>
              <button type="button" onClick={() => onNavigate(m.id)} className="flex h-full w-full flex-col gap-2 rounded-2xl border border-line bg-white p-[18px] text-left transition-shadow hover:shadow-md">
                <span className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" aria-hidden="true" /></span>
                  <ArrowUpRight className="size-[18px] text-muted" aria-hidden="true" />
                </span>
                <h3 className="m-0 text-[17px] font-bold text-strong">{m.title}</h3>
                <p className="m-0 text-muted">{m.description}</p>
                {!m.ready && <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-muted"><Hammer className="size-3" aria-hidden="true" />Pendiente · {m.owner}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
