'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FilaStock } from '@/lib/types';
import { getStock, setStockMinimo, useStore } from '@/lib/store';
import { cx, num } from '@/lib/format';
import { Falta, StockBadge } from '@/components/ui/badge';
import { CategorySelect, Input, SearchBox, Toolbar } from '@/components/ui/form';
import { EmptyState, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';
import { coincide } from './tab-stock';

/** F13 — Configurar mínimos: las alertas de reposición se actualizan al instante. */
export function TabMinimos({ sedeId }: { sedeId: string }) {
  const state = useStore();
  const rows = useMemo(() => getStock(state, sedeId), [state, sedeId]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const categorias = useMemo(() => [...new Set(rows.map((r) => r.producto.categoria))].sort(), [rows]);
  const list = useMemo(() => rows.filter((r) => coincide(r, q, cat)).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es')), [rows, q, cat]);

  return (
    <>
      <p className="mb-3.5 text-muted">Define a partir de qué cantidad un producto debe reponerse en esta sede. Las alertas se actualizan al instante.</p>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre o código" />
        <CategorySelect value={cat} onChange={setCat} options={categorias} />
      </Toolbar>
      <TableWrap caption="Stock mínimo por producto en la sede seleccionada" minWidth={600}>
        <thead>
          <tr>
            <th scope="col" className={thCls}>Producto</th><th scope="col" className={cx(thCls, numCls)}>Existencia</th>
            <th scope="col" className={cx(thCls, numCls)}>Stock mínimo</th><th scope="col" className={cx(thCls, numCls)}>Faltan</th><th scope="col" className={thCls}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={5}><EmptyState title="Sin resultados">No hay productos que coincidan.</EmptyState></td></tr>}
          {list.map((r) => <MinRow key={`${sedeId}-${r.productoCodigo}`} row={r} sedeId={sedeId} />)}
        </tbody>
      </TableWrap>
      <p role="status" className="mt-2.5 ml-0.5 text-[13px] text-muted">{list.length} productos</p>
    </>
  );
}

function MinRow({ row, sedeId }: { row: FilaStock; sedeId: string }) {
  const toast = useToast();
  const [valor, setValor] = useState(String(row.stockMinimo));
  useEffect(() => setValor(String(row.stockMinimo)), [row.stockMinimo]);

  function commit() {
    if (valor === String(row.stockMinimo)) return;
    const r = setStockMinimo(sedeId, row.productoCodigo, valor);
    if (r.ok) toast(`Mínimo de ${row.producto.nombre}: ${num(Number(valor))}`);
    else { setValor(String(row.stockMinimo)); toast(r.error, 'error'); }
  }
  return (
    <tr className="group hover:bg-[#f8fbfe]">
      <th scope="row" className={cx(tdCls, 'text-left font-normal')}>
        <strong className="text-strong">{row.producto.nombre}</strong>
        <Sub>{row.productoCodigo}{row.producto.codigoBarras ? ` · Barras: ${row.producto.codigoBarras}` : ''}</Sub>
      </th>
      <td className={cx(tdCls, numCls)}><strong className="text-strong">{num(row.cantidad)}</strong> <span className="text-xs text-muted">{row.producto.unidadMedida}</span></td>
      <td className={cx(tdCls, numCls)}>
        <label className="sr-only" htmlFor={`min-${sedeId}-${row.productoCodigo}`}>Stock mínimo de {row.producto.nombre}</label>
        <Input
          id={`min-${sedeId}-${row.productoCodigo}`} type="number" min={0} step={1} inputMode="numeric" className="w-[92px] text-right"
          value={valor} onChange={(e) => setValor(e.target.value)} onBlur={commit}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const inputs = [...document.querySelectorAll<HTMLInputElement>('input[id^="min-"]')];
            const next = inputs[inputs.indexOf(e.currentTarget) + 1];
            if (next) next.focus(); else e.currentTarget.blur();
          }}
        />
      </td>
      <td className={cx(tdCls, numCls)}><Falta estado={row.estado} n={row.faltan} /></td>
      <td className={tdCls}><StockBadge estado={row.estado} /></td>
    </tr>
  );
}