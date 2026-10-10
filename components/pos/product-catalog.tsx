'use client';
import { useMemo, useState } from 'react';
import { Plus, SearchX } from 'lucide-react';
import type { FilaStock } from '@/lib/types';
import { cx, money, norm, num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { StockBadge } from '@/components/ui/badge';
import { CategorySelect, SearchBox, Toolbar } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/layout';

/** Catálogo de venta: tarjetas con precio global y estado de stock de la sede. */
export function ProductCatalog({ rows, enCarrito, onAdd }: {
  rows: FilaStock[]; enCarrito: Record<string, number>; onAdd: (r: FilaStock) => void;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const categorias = useMemo(() => [...new Set(rows.map((r) => r.producto.categoria))].sort(), [rows]);
  const list = useMemo(() => rows
    .filter((r) => (!cat || r.producto.categoria === cat) && (!q || norm(r.producto.nombre).includes(norm(q)) || norm(r.productoCodigo).includes(norm(q))))
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es')), [rows, q, cat]);

  return (
    <div>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} />
        <CategorySelect value={cat} onChange={setCat} options={categorias} />
      </Toolbar>
      {list.length === 0 ? (
        <div className="rounded-xl border border-line bg-white">
          <EmptyState title="No hay productos para vender" icon={SearchX}>Prueba con otra búsqueda o categoría.</EmptyState>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-0">
          {list.map((r) => {
            const n = enCarrito[r.productoCodigo] ?? 0;
            const agotado = r.estado === 'agotado';
            const tope = n >= r.cantidad;
            const label = agotado ? 'Agotado' : r.estado === 'bajo' ? `Stock bajo · ${num(r.cantidad)} ${r.producto.unidadMedida}` : `${num(r.cantidad)} ${r.producto.unidadMedida}`;
            return (
              <li key={r.productoCodigo} className={cx('flex flex-col gap-2 rounded-xl border bg-white p-3.5', n > 0 ? 'border-brand ring-1 ring-brand' : 'border-line', agotado && 'opacity-75')}>
                <div className="min-h-[44px]">
                  <strong className="block leading-snug text-strong">{r.producto.nombre}</strong>
                  <span className="text-xs text-muted">{r.productoCodigo} · {r.producto.categoria}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[22px] font-bold tracking-tight text-strong tabular-nums">{money(r.producto.precioGlobal)}</span>
                  <span className="text-xs text-muted">/ {r.producto.unidadMedida}</span>
                </div>
                <StockBadge estado={r.estado} label={label} />
                <Button
                  variant="primary" disabled={agotado || tope} onClick={() => onAdd(r)} className="mt-auto"
                  aria-label={`Agregar ${r.producto.nombre} al carrito${n ? ` (${n} en el carrito)` : ''}`}
                >
                  <Plus aria-hidden="true" />{agotado ? 'Sin stock' : tope ? 'Máximo en carrito' : n ? `Agregar otro (${n})` : 'Agregar'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
