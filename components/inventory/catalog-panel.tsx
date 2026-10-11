'use client';
import { useMemo, useState } from 'react';
import { Pencil, Plus, SearchX } from 'lucide-react';
import type { Producto, User } from '@/lib/types';
import {
  CATEGORIAS, UNIDADES, actualizarProducto, crearProducto, getExistencia, getProducto, getSede, habilitarEnSede,
  sedesDeUsuario, sedesHabilitadas, setActivo, siguienteCodigo, useStore,
} from '@/lib/store';
import { cx, money, norm } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/badge';
import { CategorySelect, ErrorBox, Field, Input, SearchBox, Select, Switch, Toolbar } from '@/components/ui/form';
import { EmptyState, PageHeading, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Vista = 'lista' | 'sedes';
type EstadoFiltro = 'todos' | 'activo' | 'inactivo';

/**
 * Módulo 2 · Catálogo de productos (F04 registrar, F05 actualizar, F06 habilitar por sede).
 * Solo el administrador edita; cualquier otro rol lo consulta en modo lectura.
 */
export function CatalogPanel({ user, embedded, initialSedeId = '' }: { user: User; embedded?: boolean; initialSedeId?: string }) {
  const state = useStore();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [sedeScope, setSedeScope] = useState(initialSedeId);
  const disponibles = useMemo(() => sedesDeUsuario(state, user), [state, user]);
  const sedes = disponibles.filter((s) => !sedeScope || s.id === sedeScope);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [estado, setEstado] = useState<EstadoFiltro>('todos');
  const [vista, setVista] = useState<Vista>(initialSedeId ? 'sedes' : 'lista');
  const [form, setForm] = useState<{ codigo: string | null } | null>(null);
  const [quitar, setQuitar] = useState<{ sedeId: string; codigo: string } | null>(null);

  const list = useMemo(() => state.productos.filter((p) =>
    (!cat || p.categoria === cat) &&
    (estado === 'todos' || (estado === 'activo') === p.activo) &&
    (!q || norm(p.nombre).includes(norm(q)) || norm(p.codigo).includes(norm(q))),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [state.productos, q, cat, estado]);

  function toggleSede(sedeId: string, codigo: string, habilitar: boolean) {
    const ex = getExistencia(state, sedeId, codigo);
    if (!habilitar && ex?.habilitado && ex.cantidad > 0) { setQuitar({ sedeId, codigo }); return; }
    aplicarSede(sedeId, codigo, habilitar);
  }
  function aplicarSede(sedeId: string, codigo: string, habilitar: boolean) {
    const result = habilitarEnSede(sedeId, codigo, habilitar);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast(`${getProducto(state, codigo)?.nombre} ${habilitar ? 'habilitado en' : 'quitado de'} ${getSede(state, sedeId)?.nombre}`);
  }

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading
        as={embedded ? 'h2' : 'h1'}
        eyebrow={embedded ? undefined : isAdmin ? 'Administración' : 'Consulta'}
        title="Catálogo de productos"
        description={isAdmin ? 'Un solo catálogo para toda la cadena. Cada producto tiene un único precio global.' : 'Consulta los productos y su precio global. Solo el administrador puede modificarlos.'}
        actions={isAdmin && <Button variant="primary" onClick={() => setForm({ codigo: null })}><Plus aria-hidden="true" />Nuevo producto</Button>}
      />
      {isAdmin ? (
        <div role="group" aria-label="Vista del catálogo" className="mb-3.5 inline-flex rounded-xl border border-line bg-soft p-[3px]">
          {([['lista', 'Productos'], ['sedes', 'Disponibilidad por sede']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={vista === id} onClick={() => setVista(id)}
              className={cx('min-h-10 rounded-[9px] px-4 py-1.5 font-semibold', vista === id ? 'bg-white text-brand-dark shadow-sm' : 'text-muted')}>{label}</button>
          ))}
        </div>
      ) : (
        <p className="mb-4 rounded-xl border border-line bg-soft px-3.5 py-2.5 text-muted">Solo lectura: el catálogo y los precios los gestiona el administrador.</p>
      )}
      <Toolbar>
        <SearchBox value={q} onChange={setQ} />
        <CategorySelect value={cat} onChange={setCat} options={CATEGORIAS} />
        <div>
          <label htmlFor="cat-estado" className="sr-only">Estado</label>
          <Select id="cat-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoFiltro)}>
            <option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option>
          </Select>
        </div>
      </Toolbar>
      {isAdmin && vista === 'sedes' && <div className="mb-4 max-w-sm"><Field label="Sede del catálogo">{(id) => <Select id={id} value={sedeScope} onChange={(e) => setSedeScope(e.target.value)}><option value="">Todas las sedes activas</option>{disponibles.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</Select>}</Field></div>}

      {vista === 'lista' ? (
        <TableWrap caption="Catálogo de productos">
          <thead>
            <tr>
              <th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Categoría</th><th scope="col" className={thCls}>Unidad</th>
              <th scope="col" className={cx(thCls, numCls)}>Precio global</th><th scope="col" className={thCls}>Sedes</th><th scope="col" className={thCls}>Estado</th>
              {isAdmin && <th scope="col" className={thCls}><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7}><EmptyState title="No hay productos para mostrar" icon={SearchX}>Cambia la búsqueda o los filtros{isAdmin ? ', o registra un producto nuevo' : ''}.</EmptyState></td></tr>}
            {list.map((p) => (
              <tr key={p.codigo} className="group hover:bg-[#f8fbfe]">
                <th scope="row" className={cx(tdCls, 'text-left font-normal')}><strong className="text-strong">{p.nombre}</strong><Sub>{p.codigo}</Sub></th>
                <td className={tdCls}>{p.categoria}</td><td className={tdCls}>{p.unidadMedida}</td>
                <td className={cx(tdCls, numCls)}>{money(p.precioGlobal)}</td>
                <td className={tdCls}>{sedesHabilitadas(state, p.codigo).filter((id) => sedes.some((s) => s.id === id)).length} de {sedes.length}</td>
                <td className={tdCls}>
                  {isAdmin
                    ? <Switch checked={p.activo} label={`Producto activo: ${p.nombre}`} text={p.activo ? 'Activo' : 'Inactivo'}
                        onChange={() => { setActivo(p.codigo, !p.activo); toast(`${p.nombre}: ${p.activo ? 'desactivado' : 'activado'}`); }} />
                    : <Tag tone={p.activo ? 'in' : 'off'}>{p.activo ? 'Activo' : 'Inactivo'}</Tag>}
                </td>
                {isAdmin && (
                  <td className={cx(tdCls, 'text-right whitespace-nowrap')}>
                    <Button small onClick={() => setForm({ codigo: p.codigo })} aria-label={`Editar ${p.nombre}`}><Pencil aria-hidden="true" />Editar</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <>
          <p className="mb-3.5 text-muted">Marca en qué sedes se vende y se controla cada producto. Cada sede lleva sus existencias de forma independiente.</p>
          <TableWrap caption="Productos habilitados por sede" minWidth={560}>
            <thead>
              <tr>
                <th scope="col" className={thCls}>Producto</th>
                {sedes.map((s) => <th key={s.id} scope="col" className={cx(thCls, 'text-center')}>{s.nombre}</th>)}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={sedes.length + 1}><EmptyState title="Sin resultados" icon={SearchX}>No hay productos que coincidan.</EmptyState></td></tr>}
              {list.map((p) => (
                <tr key={p.codigo} className="group hover:bg-[#f8fbfe]">
                  <th scope="row" className={cx(tdCls, 'text-left font-normal')}><strong className="text-strong">{p.nombre}</strong><Sub>{p.codigo}{p.activo ? '' : ' · inactivo'}</Sub></th>
                  {sedes.map((s) => (
                    <td key={s.id} className={cx(tdCls, 'text-center')}>
                      <input type="checkbox" className="size-[22px] cursor-pointer accent-brand" checked={!!getExistencia(state, s.id, p.codigo)?.habilitado}
                        aria-label={`Habilitar ${p.nombre} en ${s.nombre}`} onChange={(e) => toggleSede(s.id, p.codigo, e.target.checked)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
      <p role="status" className="mt-2.5 ml-0.5 text-[13px] text-muted">{list.length} productos</p>

      {form && <ProductForm codigo={form.codigo} onClose={() => setForm(null)} />}
      {quitar && (
        <ConfirmModal title="Quitar de la sede" danger confirmText="Quitar" onCancel={() => setQuitar(null)}
          onConfirm={() => { aplicarSede(quitar.sedeId, quitar.codigo, false); setQuitar(null); }}
          message={`${getProducto(state, quitar.codigo)?.nombre} tiene ${getExistencia(state, quitar.sedeId, quitar.codigo)?.cantidad} unidades en ${getSede(state, quitar.sedeId)?.nombre}. Si lo quitas, dejará de mostrarse en su inventario (el stock se conserva por si lo habilitas de nuevo).`} />
      )}
    </section>
  );
}

/** F04 registrar / F05 actualizar producto. */
function ProductForm({ codigo, onClose }: { codigo: string | null; onClose: () => void }) {
  const state = useStore();
  const toast = useToast();
  const editando: Producto | undefined = codigo ? getProducto(state, codigo) : undefined;
  const [f, setF] = useState({
    nombre: editando?.nombre ?? '', categoria: editando?.categoria ?? CATEGORIAS[0],
    unidadMedida: editando?.unidadMedida ?? 'unidad', precio: '', activo: editando?.activo ?? true,
  });
  const codigoMostrado = editando ? editando.codigo : f.categoria ? siguienteCodigo(state.productos, f.categoria) : 'Selecciona categoría...';
  const [sedesNuevo, setSedesNuevo] = useState<string[]>([]);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((s) => ({ ...s, [k]: v })); setError(''); };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editando) {
      const r = actualizarProducto(editando.codigo, { nombre: f.nombre, categoria: f.categoria, unidadMedida: f.unidadMedida, activo: f.activo });
      if (!r.ok) { setError(r.error); return; }
      toast(`Cambios guardados en ${f.nombre.trim()}`);
    } else {
      const r = crearProducto({ nombre: f.nombre, categoria: f.categoria, unidadMedida: f.unidadMedida, precioGlobal: f.precio, activo: f.activo });
      if (!r.ok) { setError(r.error); return; }
      sedesNuevo.forEach((id) => habilitarEnSede(id, r.codigo, true));
      toast(`Producto ${r.codigo} registrado`);
    }
    onClose();
  }

  return (
    <Modal title={editando ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Nombre">{(id) => <Input id={id} value={f.nombre} maxLength={60} autoComplete="off" onChange={(e) => set('nombre', e.target.value)} />}</Field>
          <Field label="Categoría">
            {(id) => (
              <Select id={id} value={f.categoria} onChange={(e) => set('categoria', e.target.value)}>
                {!editando && <option value="">Selecciona…</option>}
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Código">{(id) => <Input id={id} title="Se genera automáticamente según la categoría" value={codigoMostrado} readOnly tabIndex={-1} className="cursor-not-allowed bg-soft text-muted" />}</Field>
          <Field label="Unidad de medida">
            {(id) => <Select id={id} value={f.unidadMedida} onChange={(e) => set('unidadMedida', e.target.value)}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</Select>}
          </Field>
          {!editando && <Field label="Precio global (USD)">{(id) => <Input id={id} type="number" min={0} step={0.01} inputMode="decimal" placeholder="0.00" value={f.precio} onChange={(e) => set('precio', e.target.value)} />}</Field>}
        </div>
        {editando
          ? <p className="m-0 text-[13px] text-muted">El precio global se modifica desde la sección Precios.</p>
          : (
            <fieldset className="rounded-[10px] border border-line px-3.5 py-3">
              <legend className="px-1 font-semibold text-strong">Habilitar en sedes</legend>
              {state.sedes.filter((s) => s.activa).map((s) => (
                <label key={s.id} className="flex min-h-9 cursor-pointer items-center gap-2.5">
                  <input type="checkbox" className="size-[18px] accent-brand" checked={sedesNuevo.includes(s.id)}
                    onChange={(e) => setSedesNuevo((l) => e.target.checked ? [...l, s.id] : l.filter((x) => x !== s.id))} />
                  {s.nombre}
                </label>
              ))}
              <p className="mt-1 mb-0 text-[13px] text-muted">Cada sede lleva su propio stock. Puedes cambiarlo después.</p>
            </fieldset>
          )}
        <label className="flex min-h-9 cursor-pointer items-center gap-2.5">
          <input type="checkbox" className="size-[18px] accent-brand" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} /> Producto activo
        </label>
        <ErrorBox message={error} />
        <div className="mt-1.5 flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">{editando ? 'Guardar cambios' : 'Registrar producto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
