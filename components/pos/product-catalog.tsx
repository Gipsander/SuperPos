'use client';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { FilaStock } from '@/lib/types';
import { money, norm, num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { SearchBox } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/layout';
import { ProductIcon } from '@/components/ui/icons';

/** Búsqueda auxiliar: los productos aparecen solo al escribir. */
export function ProductCatalog({ rows, enCarrito, onAdd }: {
  rows: FilaStock[]; enCarrito: Record<string, number>; onAdd: (r: FilaStock) => void;
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => q.trim() ? rows.filter((r) => norm(`${r.producto.nombre} ${r.productoCodigo} ${r.producto.codigoBarras ?? ''}`).includes(norm(q.trim())))
    .sort((a,b) => Number(a.estado === 'agotado') - Number(b.estado === 'agotado') || a.producto.nombre.localeCompare(b.producto.nombre, 'es')) : [], [rows,q]);
  return <div>
    <SearchBox value={q} onChange={setQ} placeholder="Nombre, código interno o código de barras" />
    {!q.trim() ? <EmptyState title="Busca el producto">Escribe su nombre o código. Para productos por kilo se solicitará el peso.</EmptyState> : !list.length ? <EmptyState title="Sin coincidencias">Revisa el nombre o código. Solo se muestran productos activos y habilitados en esta sede.</EmptyState> :
      <ul className="m-0 mt-3 max-h-[50dvh] list-none overflow-auto p-0">{list.map((r) => {
        const disponible = r.cantidad - (enCarrito[r.productoCodigo] ?? 0);
        return <li key={r.productoCodigo} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
          <ProductIcon nombre={r.producto.nombre} categoria={r.producto.categoria} className="size-10" />
          <div className="min-w-[150px] flex-1"><strong className="block text-strong">{r.producto.nombre}</strong><span className="text-xs text-muted">{r.productoCodigo} · Disponible: {num(disponible)} {r.producto.unidadMedida}</span></div>
          <strong className="text-strong">{money(r.producto.precioGlobal)}<span className="text-xs font-normal"> / {r.producto.unidadMedida}</span></strong>
          <Button small disabled={disponible <= 0} onClick={() => onAdd(r)} aria-label={`Agregar ${r.producto.nombre}`}><Plus aria-hidden="true" />{disponible <= 0 ? 'Sin stock' : r.producto.unidadMedida === 'kg' ? 'Ingresar peso' : 'Agregar'}</Button>
        </li>;
      })}</ul>}
  </div>;
}
