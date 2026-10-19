'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, SearchX, Tag as TagIcon } from 'lucide-react';
import type { User } from '@/lib/types';
import { getHistorialPrecios, getProducto, setPrecioGlobal, useStore } from '@/lib/store';
import { coincideCodigoBarras } from '@/lib/pos';
import { cx, fechaHora, money, norm } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ErrorBox, Field, Input, SearchBox, Toolbar } from '@/components/ui/form';
import { Box, EmptyState, PageHeading, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * Módulo 3 — Gestión de precios (F07 modificar precio global).
 * Un único precio por producto, válido en todas las sedes y aplicable a nuevas ventas.
 */
export function PricesPanel({ user }: { user: User }) {
  const state = useStore();
  const isAdmin = user.role === 'admin';
  const [q, setQ] = useState('');
  const [editar, setEditar] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const hist = useMemo(() => getHistorialPrecios(state, 8), [state]);
  const list = useMemo(() => state.productos
    .filter((p) => !q || norm(p.nombre).includes(norm(q)) || norm(p.codigo).includes(norm(q)) || coincideCodigoBarras(p.codigoBarras, q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [state.productos, q]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2000);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading
        eyebrow={isAdmin ? 'Administración' : 'Consulta'} title="Precios"
        description="El precio global se actualiza una sola vez y vale para todas las sedes. Las ventas ya registradas no cambian."
      />
      {!isAdmin && <p className="mb-4 rounded-xl border border-line bg-soft px-3.5 py-2.5 text-muted">Solo lectura: únicamente el administrador puede modificar el precio global.</p>}

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre o código" /></Toolbar>
          <TableWrap caption="Precio global por producto" minWidth={520}>
            <thead>
              <tr>
                <th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Categoría</th>
                <th scope="col" className={cx(thCls, numCls)}>Precio global</th>
                {isAdmin && <th scope="col" className={thCls}><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4}><EmptyState title="Sin resultados" icon={SearchX}>No hay productos que coincidan.</EmptyState></td></tr>}
              {list.map((p) => (
                <tr key={p.codigo} className={cx('group hover:bg-[#f8fbfe]', flash === p.codigo && 'animate-flash')}>
                  <th scope="row" className={cx(tdCls, 'text-left font-normal')}>
                    <strong className="text-strong">{p.nombre}</strong>
                    <Sub>{p.codigo}{p.codigoBarras ? ` · Barras: ${p.codigoBarras}` : ''}{p.activo ? '' : ' · inactivo'}</Sub>
                  </th>
                  <td className={tdCls}>{p.categoria}</td>
                  <td className={cx(tdCls, numCls)}><strong className="text-strong">{money(p.precioGlobal)}</strong> <span className="text-xs text-muted">/ {p.unidadMedida}</span></td>
                  {isAdmin && (
                    <td className={cx(tdCls, 'text-right whitespace-nowrap')}>
                      <Button small onClick={() => setEditar(p.codigo)} aria-label={`Cambiar precio de ${p.nombre}`}><TagIcon aria-hidden="true" />Cambiar precio</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p role="status" className="mt-2.5 ml-0.5 text-[13px] text-muted">{list.length} productos</p>
        </div>

        <Box title="Cambios recientes" icon={History}>
          {hist.length === 0 ? <p className="m-0 text-muted">Todavía no hay cambios de precio.</p> : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {hist.map((x) => (
                <li key={x.id} className="flex flex-col gap-0.5 border-b border-line pb-3 last:border-0 last:pb-0">
                  <strong className="text-strong">{x.nombre}</strong>
                  <span>{money(x.anterior)} → <b className={x.nuevo > x.anterior ? 'text-danger' : 'text-ok'}>{money(x.nuevo)}</b> <i className="sr-only">{x.nuevo > x.anterior ? 'subió' : 'bajó'}</i></span>
                  <time dateTime={x.fecha} className="text-xs text-muted">{fechaHora(x.fecha)} · {x.usuario}</time>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>
      {editar && <PriceForm codigo={editar} user={user} onClose={() => setEditar(null)} onDone={setFlash} />}
    </section>
  );
}

function PriceForm({ codigo, user, onClose, onDone }: { codigo: string; user: User; onClose: () => void; onDone: (c: string) => void }) {
  const state = useStore();
  const toast = useToast();
  const p = getProducto(state, codigo);
  const [valor, setValor] = useState(String(p?.precioGlobal ?? ''));
  const [error, setError] = useState('');
  if (!p) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = setPrecioGlobal(codigo, valor, user.name);
    if (!r.ok) { setError(r.error); return; }
    onDone(codigo);
    onClose();
    toast(`${p!.nombre}: ${money(r.anterior)} → ${money(r.nuevo)}`);
  }
  return (
    <Modal title="Modificar precio global" onClose={onClose}>
      <p className="mb-3.5">
        <strong className="text-strong">{p.nombre}</strong> · {p.codigo}<br />
        Precio actual: <strong>{money(p.precioGlobal)}</strong> por {p.unidadMedida}. El nuevo precio aplica a todas las sedes en las próximas ventas.
      </p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label="Nuevo precio (USD)">
          {(id) => <Input id={id} type="number" min={0} step={0.01} inputMode="decimal" required value={valor} aria-invalid={!!error}
            onFocus={(e) => e.currentTarget.select()} onChange={(e) => { setValor(e.target.value); setError(''); }} />}
        </Field>
        <ErrorBox message={error} />
        <div className="mt-1.5 flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Guardar precio</Button>
        </div>
      </form>
    </Modal>
  );
}