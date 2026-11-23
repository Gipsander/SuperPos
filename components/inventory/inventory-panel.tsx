'use client';
import { useMemo, useState } from 'react';
import type { User } from '@/lib/types';
import { sedesDeUsuario, useStore } from '@/lib/store';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeading, Tabs } from '@/components/ui/layout';
import { SedeSelect } from '@/components/ui/form';
import { CatalogPanel, ProductForm } from './catalog-panel';
import { TabStock } from './tab-stock';
import { TabMovimientos } from './tab-movimientos';
import { TabMinimos } from './tab-minimos';

type Tab = 'stock' | 'movimientos' | 'minimos' | 'catalogo';

/**
 * Módulo 5 · Inventario y reposición (F11 stock y faltantes, F12 ingreso, F13 mínimos).
 * El encargado opera solo en sus sedes; el administrador, en todas.
 */
export function InventoryPanel({ user, initialSedeId = '' }: { user: User; initialSedeId?: string }) {
  const state = useStore();
  const isAdmin = user.role === 'admin';
  const sedes = useMemo(() => sedesDeUsuario(state, user), [state, user]);
  const [tab, setTab] = useState<Tab>('stock');
  const [elegida, setElegida] = useState(initialSedeId);
  const [nuevo, setNuevo] = useState(false);
  const sedeId = sedes.some((s) => s.id === elegida) ? elegida : sedes[0]?.id;

  if (!sedeId) {
    return <EmptyState title="Sin sedes asignadas">Pide al administrador que te asigne una sede para gestionar su inventario.</EmptyState>;
  }
  const tabs: { id: Tab; label: string }[] = [
    { id: 'stock', label: 'Stock e ingreso' },
    { id: 'movimientos', label: 'Movimientos' },
    { id: 'minimos', label: 'Stock mínimo' },
    ...(isAdmin ? [] : [{ id: 'catalogo' as const, label: 'Catálogo y precios' }]),
  ];

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading
        eyebrow={isAdmin ? 'Administración · todas las sedes' : undefined}
        title="Inventario"
        description="Consulta existencias, ingresa mercancía directo en cada producto y define cuándo reponer."
        actions={<div className="flex flex-wrap items-end gap-3">{isAdmin && <Button variant="primary" onClick={() => setNuevo(true)}><Plus aria-hidden="true" />Nuevo producto</Button>}<SedeSelect sedes={sedes} value={sedeId} onChange={setElegida} /></div>}
      />
      <Tabs label="Secciones de inventario" tabs={tabs} value={tab} onChange={setTab} />
      <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1} className="outline-none">
        {tab === 'stock' && <TabStock sedeId={sedeId} />}
        {tab === 'movimientos' && <TabMovimientos sedeId={sedeId} />}
        {tab === 'minimos' && <TabMinimos sedeId={sedeId} />}
        {tab === 'catalogo' && <CatalogPanel user={user} embedded />}
      </div>
      {nuevo && <ProductForm codigo={null} sedeInicial={sedeId} onClose={() => setNuevo(false)} />}
    </section>
  );
}
