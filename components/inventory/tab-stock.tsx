'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, PackageSearch } from 'lucide-react';
import type { EstadoStock, FilaStock } from '@/lib/types';
import { getStock, registrarEntrada, useStore } from '@/lib/store';
import { coincideCodigoBarras } from '@/lib/pos';
import { cx, norm, num } from '@/lib/format';
import { Dual } from '@/components/ui/money';
import { SaveButton } from '@/components/ui/save-button';
import { Button } from '@/components/ui/button';
import { Falta, StockBadge } from '@/components/ui/badge';
import { CategorySelect, Chip, Input, SearchBox, Toolbar } from '@/components/ui/form';
import { EmptyState, StatCard, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';

type Filtro = 'todos' | EstadoStock;
const ORDEN: Record<EstadoStock, number> = { agotado: 0, bajo: 1, ok: 2 };

export function coincide(r: FilaStock, q: string, cat: string) {
  if (cat && r.producto.categoria !== cat) return false;
  if (!q) return true;
  const t = norm(q);
  return norm(r.producto.nombre).includes(t) || norm(r.productoCodigo).includes(t) || coincideCodigoBarras(r.producto.codigoBarras, q);
}

/** F11 — Consultar stock y faltantes por sede. */
export function TabStock({ sedeId }: { sedeId: string }) {
  const state = useStore();
  const rows = useMemo(() => getStock(state, sedeId), [state, sedeId]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2000);
    return () => clearTimeout(t);
  }, [flash]);

  const n = useMemo(() => {
    const c = { todos: rows.length, agotado: 0, bajo: 0, ok: 0, reponer: 0 };
    rows.forEach((r) => { c[r.estado]++; c.reponer += r.faltan; });
    return c;
  }, [rows]);

  const categorias = useMemo(() => [...new Set(rows.map((r) => r.producto.categoria))].sort(), [rows]);
  const list = useMemo(() => rows
    .filter((r) => coincide(r, q, cat) && (filtro === 'todos' || r.estado === filtro))
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || b.faltan - a.faltan || a.producto.nombre.localeCompare(b.producto.nombre, 'es')),
  [rows, q, cat, filtro]);

  return (
    <>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <StatCard label="Productos en la sede" value={num(n.todos)} />
        <StatCard label="Agotados" value={num(n.agotado)} tone="danger" />
        <StatCard label="Con stock bajo" value={num(n.bajo)} tone="warn" />
        <StatCard label="Unidades por reponer" value={num(n.reponer)} />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} label="Buscar en el inventario" placeholder="Buscar por nombre, código interno o código de barras (*1234)" />
        <CategorySelect value={cat} onChange={setCat} options={categorias} />
      </Toolbar>

      <div role="group" aria-label="Filtrar por estado" className="mb-3.5 flex flex-wrap gap-2">
        <Chip active={filtro === 'todos'} count={n.todos} onClick={() => setFiltro('todos')}>Todos</Chip>
        <Chip active={filtro === 'agotado'} count={n.agotado} onClick={() => setFiltro('agotado')}>Agotados</Chip>
        <Chip active={filtro === 'bajo'} count={n.bajo} onClick={() => setFiltro('bajo')}>Stock bajo</Chip>
        <Chip active={filtro === 'ok'} count={n.ok} onClick={() => setFiltro('ok')}>Disponibles</Chip>
      </div>

      <TableWrap caption="Existencias de la sede seleccionada" minWidth={980}>
        <thead>
          <tr>
            <th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Categoría</th>
            <th scope="col" className={cx(thCls, numCls)}>Precio global</th><th scope="col" className={cx(thCls, numCls)}>Existencia</th>
            <th scope="col" className={cx(thCls, numCls)}>Mínimo</th><th scope="col" className={cx(thCls, numCls)}>Faltan</th>
            <th scope="col" className={thCls}>Estado</th><th scope="col" className={cx(thCls, numCls)}>Ingresar mercancía</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr><td colSpan={8}>
              <EmptyState title="No hay productos para mostrar" icon={PackageSearch}>
                <p className="mb-3">Prueba con otra búsqueda o limpia los filtros.</p>
                <Button onClick={() => { setQ(''); setCat(''); setFiltro('todos'); }}>Limpiar filtros</Button>
              </EmptyState>
            </td></tr>
          )}
          {list.map((r) => (
            <tr key={r.productoCodigo} className={cx('group hover:bg-[#f8fbfe]', flash === r.productoCodigo && 'animate-flash')}>
              <th scope="row" className={cx(tdCls, 'text-left font-normal')}>
                <strong className="text-strong">{r.producto.nombre}</strong>
                <Sub>{r.productoCodigo}{r.producto.codigoBarras ? ` · Barras: ${r.producto.codigoBarras}` : ''}</Sub>
              </th>
              <td className={tdCls}>{r.producto.categoria}</td>
              <td className={cx(tdCls, numCls)}><Dual usd={r.producto.precioGlobal} /></td>
              <td className={cx(tdCls, numCls)}><strong className="text-strong">{num(r.cantidad)}</strong> <span className="text-xs text-muted">{r.producto.unidadMedida}</span></td>
              <td className={cx(tdCls, numCls)}>{num(r.stockMinimo)}</td>
              <td className={cx(tdCls, numCls)}><Falta estado={r.estado} n={r.faltan} /></td>
              <td className={tdCls}><StockBadge estado={r.estado} /></td>
              <td className={cx(tdCls, 'text-right')}>
                <IngresoFila sedeId={sedeId} r={r} onDone={setFlash} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p role="status" className="mt-2.5 ml-0.5 text-[13px] text-muted">{list.length} de {rows.length} productos</p>
    </>
  );
}

/** Ingreso directo en la fila (F12): escribe la cantidad y pulsa «Guardar Ingreso». */
function IngresoFila({ sedeId, r, onDone }: { sedeId: string; r: FilaStock; onDone: (codigo: string) => void }) {
  const toast = useToast();
  const [cant, setCant] = useState('');
  const [error, setError] = useState('');
  const kg = r.producto.unidadMedida === 'kg';
  function guardar(): boolean {
    const res = registrarEntrada(sedeId, r.productoCodigo, cant, 'Ingreso de mercancía');
    if (!res.ok) { setError(res.error); return false; }
    setCant(''); setError('');
    onDone(r.productoCodigo);
    toast(`${r.producto.nombre}: ${num(res.anterior)} → ${num(res.nueva)} ${r.producto.unidadMedida}`);
    return true;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Input aria-label={`Cantidad recibida de ${r.producto.nombre}`} type="number" min={kg ? 0.001 : 1} step={kg ? 0.001 : 1} inputMode="decimal"
          placeholder={r.faltan ? `Faltan ${num(r.faltan)}` : 'Cantidad'} className="min-h-9 w-28 px-2 py-1 text-right" value={cant} aria-invalid={!!error}
          onChange={(e) => { setCant(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('button')?.click(); } }} />
        <SaveButton small onSave={guardar} savedText="Ingreso guardado"><Download aria-hidden="true" />Guardar Ingreso</SaveButton>
      </div>
      {error && <span role="alert" className="max-w-[260px] text-right text-xs font-semibold text-danger">{error}</span>}
    </div>
  );
}
