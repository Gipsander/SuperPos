'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, PackageSearch } from 'lucide-react';
import type { EstadoStock, FilaStock } from '@/lib/types';
import { getExistencia, getProducto, getSede, getStock, registrarEntrada, faltan, useStore } from '@/lib/store';
import { coincideCodigoBarras } from '@/lib/pos';
import { cx, money, norm, num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Falta, StockBadge } from '@/components/ui/badge';
import { CategorySelect, Chip, ErrorBox, Field, Input, SearchBox, Toolbar } from '@/components/ui/form';
import { EmptyState, StatCard, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { Modal } from '@/components/ui/modal';
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
  const [ingreso, setIngreso] = useState<string | null>(null);

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
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre o código" />
        <CategorySelect value={cat} onChange={setCat} options={categorias} />
      </Toolbar>

      <div role="group" aria-label="Filtrar por estado" className="mb-3.5 flex flex-wrap gap-2">
        <Chip active={filtro === 'todos'} count={n.todos} onClick={() => setFiltro('todos')}>Todos</Chip>
        <Chip active={filtro === 'agotado'} count={n.agotado} onClick={() => setFiltro('agotado')}>Agotados</Chip>
        <Chip active={filtro === 'bajo'} count={n.bajo} onClick={() => setFiltro('bajo')}>Stock bajo</Chip>
        <Chip active={filtro === 'ok'} count={n.ok} onClick={() => setFiltro('ok')}>Disponibles</Chip>
      </div>

      <TableWrap caption="Existencias de la sede seleccionada">
        <thead>
          <tr>
            <th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Categoría</th>
            <th scope="col" className={cx(thCls, numCls)}>Precio global</th><th scope="col" className={cx(thCls, numCls)}>Existencia</th>
            <th scope="col" className={cx(thCls, numCls)}>Mínimo</th><th scope="col" className={cx(thCls, numCls)}>Faltan</th>
            <th scope="col" className={thCls}>Estado</th><th scope="col" className={thCls}><span className="sr-only">Acciones</span></th>
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
              <td className={cx(tdCls, numCls)}>{money(r.producto.precioGlobal)}</td>
              <td className={cx(tdCls, numCls)}><strong className="text-strong">{num(r.cantidad)}</strong> <span className="text-xs text-muted">{r.producto.unidadMedida}</span></td>
              <td className={cx(tdCls, numCls)}>{num(r.stockMinimo)}</td>
              <td className={cx(tdCls, numCls)}><Falta estado={r.estado} n={r.faltan} /></td>
              <td className={tdCls}><StockBadge estado={r.estado} /></td>
              <td className={cx(tdCls, 'text-right whitespace-nowrap')}>
                <Button small onClick={() => setIngreso(r.productoCodigo)} aria-label={`Ingresar mercancía de ${r.producto.nombre}`}><Download aria-hidden="true" />Ingresar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p role="status" className="mt-2.5 ml-0.5 text-[13px] text-muted">{list.length} de {rows.length} productos</p>
      {ingreso && <IngresoModal sedeId={sedeId} codigo={ingreso} onClose={() => setIngreso(null)} onDone={setFlash} />}
    </>
  );
}

/** Ingreso rápido desde la fila del producto (F12). */
function IngresoModal({ sedeId, codigo, onClose, onDone }: { sedeId: string; codigo: string; onClose: () => void; onDone: (codigo: string) => void }) {
  const state = useStore();
  const toast = useToast();
  const e = getExistencia(state, sedeId, codigo);
  const p = getProducto(state, codigo);
  const falta = e ? faltan(e) : 0;
  const [cant, setCant] = useState(falta ? String(falta) : '');
  const [motivo, setMotivo] = useState('Recepción de proveedor');
  const [error, setError] = useState('');
  if (!e || !p) return null;

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const r = registrarEntrada(sedeId, codigo, cant, motivo);
    if (!r.ok) { setError(r.error); return; }
    onDone(codigo);
    onClose();
    toast(`${p!.nombre}: ${num(r.anterior)} → ${num(r.nueva)} ${p!.unidadMedida}`);
  }
  return (
    <Modal title="Ingresar mercancía" onClose={onClose}>
      <p className="mb-3.5">
        <strong className="text-strong">{p.nombre}</strong> · {codigo}<br />
        {getSede(state, sedeId)?.nombre} · Existencia actual: <strong>{num(e.cantidad)} {p.unidadMedida}</strong> · Mínimo: {num(e.stockMinimo)}
        {falta > 0 && <> · <span className="font-bold text-warn">Faltan {num(falta)}</span></>}
      </p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label={`Cantidad recibida (${p.unidadMedida})`}>
          {(id) => <Input id={id} type="number" min={1} step={1} inputMode="numeric" required value={cant} aria-invalid={!!error} onChange={(ev) => { setCant(ev.target.value); setError(''); }} />}
        </Field>
        <Field label="Motivo">{(id) => <Input id={id} maxLength={80} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />}</Field>
        <ErrorBox message={error} />
        <div className="mt-1.5 flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Registrar ingreso</Button>
        </div>
      </form>
    </Modal>
  );
}