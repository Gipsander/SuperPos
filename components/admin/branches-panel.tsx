'use client';
import { useState } from 'react';
import { ArrowUpRight, Boxes, MapPin, Pencil, Plus, Store, Users } from 'lucide-react';
import type { Sede, User } from '@/lib/types';
import { getStock, guardarSede, useStore, type DatosSede } from '@/lib/store';
import { ROLES } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { ErrorBox, Field, Input, SearchBox, Select, Switch } from '@/components/ui/form';
import { Box, EmptyState, PageHeading, StatCard } from '@/components/ui/layout';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { StatusBadge } from './users-panel';
import type { AdminPage } from './modules';
import { useSubBack } from './sub-back';

export function BranchesPanel({ user, onNavigate }: { user: User; onNavigate: (page: AdminPage, sedeId: string) => void }) {
  const state = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState<Sede | 'new' | null>(null);
  const sede = state.sedes.find((s) => s.id === selected);
  const rows = state.sedes.filter((s) => (!status || s.activa === (status === 'activa')) && `${s.codigo} ${s.nombre} ${s.estado} ${s.ciudad}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  useSubBack(sede ? { label: 'Sedes', onBack: () => setSelected('') } : null);
  const team = sede ? state.usuarios.filter((u) => u.sedeId === sede.id) : [];
  const stock = sede ? getStock(state, sede.id) : [];
  return <section className="mx-auto w-full max-w-[1180px]">
    {sede ? <>
      <PageHeading eyebrow={`Sedes · ${sede.codigo}`} title={sede.nombre} description={`${sede.ciudad}, ${sede.estado} · ${sede.direccion}`} actions={<Button onClick={() => setEditing(sede)}><Pencil aria-hidden="true" />Editar sede</Button>} />
      <div className="mb-5 flex flex-wrap items-center gap-3"><StatusBadge active={sede.activa} feminine />{!sede.activa && <p className="m-0 text-muted">Operación suspendida. Se conservan el equipo, las existencias y el historial.</p>}</div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Usuarios asignados" value={team.length} icon={Users} />
        <StatCard label="Productos activos habilitados" value={stock.length} icon={Boxes} tone="brand" />
        <StatCard label="Ventas registradas" value={state.ventas.filter((v) => v.sedeId === sede.id).length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Equipo de la sede" icon={Users}>
          {team.length ? <ul className="mb-4 divide-y divide-line">{team.map((u) => <li key={u.username} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><strong className="text-strong">{u.name}</strong><p className="m-0 text-xs text-muted">@{u.username} · {ROLES[u.role].label}</p></div><StatusBadge active={u.activo} /></li>)}</ul> : <p className="text-muted">Esta sede todavía no tiene usuarios asignados.</p>}
          <Button onClick={() => onNavigate('usuarios', sede.id)}>Gestionar usuarios<ArrowUpRight aria-hidden="true" /></Button>
        </Box>
        <Box title="Operación de la sede" icon={Store}>
          <p className="mb-4 text-muted">Habilita productos del catálogo compartido, ingresa mercancía y consulta las existencias de esta tienda.</p>
          <div className="flex flex-wrap gap-2"><Button disabled={!sede.activa} onClick={() => onNavigate('productos', sede.id)}>Habilitar productos<ArrowUpRight aria-hidden="true" /></Button><Button variant="primary" disabled={!sede.activa} onClick={() => onNavigate('inventario', sede.id)}>Ver inventario<ArrowUpRight aria-hidden="true" /></Button></div>
          {sede.activa && stock.length === 0 && <p className="mt-4 text-sm text-muted">Para empezar: habilita un producto y registra su primera entrada en Inventario.</p>}
        </Box>
      </div>
    </> : <>
      <PageHeading eyebrow="Administración · Tiendas" title="Sedes" description="Administra las tiendas, su ubicación y el equipo que trabaja en cada una."
        actions={<Button variant="primary" onClick={() => setEditing('new')}><Plus aria-hidden="true" />Crear sede</Button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><StatCard label="Sedes registradas" value={state.sedes.length} icon={Store} /><StatCard label="Sedes activas" value={state.sedes.filter((s) => s.activa).length} tone="brand" /><StatCard label="Sedes inactivas" value={state.sedes.filter((s) => !s.activa).length} /></div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><SearchBox label="Buscar sede" placeholder="Buscar por nombre, código o ubicación" value={query} onChange={setQuery} /><Select aria-label="Filtrar estado de sede" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option><option value="activa">Activas</option><option value="inactiva">Inactivas</option></Select></div>
      {rows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((s) => <article key={s.id} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Store className="size-5" aria-hidden="true" /></span><StatusBadge active={s.activa} feminine /></div>
        <p className="mb-1 text-xs font-bold tracking-wide text-muted">{s.codigo}</p><h2 className="mb-2 break-words text-lg font-bold text-strong">{s.nombre}</h2>
        <p className="mb-1 flex items-start gap-2 text-muted"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{s.ciudad && s.estado ? `${s.ciudad}, ${s.estado}` : 'Ubicación por completar'}</p><p className="mb-4 break-words text-sm text-muted">{s.direccion || 'Edita la sede para completar su dirección.'}</p>
        <p className="mt-auto mb-4 text-sm text-muted">{state.usuarios.filter((u) => u.sedeId === s.id).length} usuarios asignados</p>
        <div className="flex flex-wrap gap-2"><Button variant="primary" onClick={() => setSelected(s.id)} aria-label={`Ver ${s.nombre}`}>Ver sede<ArrowUpRight aria-hidden="true" /></Button><Button onClick={() => setEditing(s)} aria-label={`Editar ${s.nombre}`}><Pencil aria-hidden="true" />Editar</Button></div>
      </article>)}</div> : <EmptyState title="No hay sedes con estos filtros" icon={Store}>Prueba otra búsqueda o registra una nueva tienda.</EmptyState>}
    </>}
    {editing && <SedeForm user={user} sede={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={(id) => { setSelected(id); setEditing(null); }} />}
  </section>;
}

function SedeForm({ user, sede, onClose, onSaved }: { user: User; sede?: Sede; onClose: () => void; onSaved: (id: string) => void }) {
  const state = useStore();
  const toast = useToast();
  const [error, setError] = useState('');
  const [form, setForm] = useState<DatosSede>({ codigo: sede?.codigo ?? '', nombre: sede?.nombre ?? '', estado: sede?.estado ?? '', ciudad: sede?.ciudad ?? '', direccion: sede?.direccion ?? '', activa: sede?.activa ?? true });
  const set = <K extends keyof DatosSede>(key: K, value: DatosSede[K]) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = guardarSede(user, form, sede?.id);
    if (!result.ok) { setError(result.error); return; }
    toast(sede ? 'Sede actualizada' : 'Sede creada. Ahora puedes asignar usuarios y habilitar productos.');
    onSaved(result.id);
  }
  return <Modal title={sede ? 'Editar sede' : 'Crear sede'} onClose={onClose}>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <Field label="Código" hint="Único, sin espacios.">{(id, hint) => <Input id={id} aria-describedby={hint} value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required maxLength={16} placeholder="Ej. OESTE" />}</Field>
        <Field label="Nombre de la sede">{(id) => <Input id={id} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required maxLength={80} placeholder="Ej. Sede Oeste" />}</Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estado geográfico">{(id) => <Input id={id} value={form.estado} onChange={(e) => set('estado', e.target.value)} required maxLength={60} placeholder="Ej. Lara" />}</Field>
        <Field label="Ciudad">{(id) => <Input id={id} value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} required maxLength={60} placeholder="Ej. Barquisimeto" />}</Field>
      </div>
      <Field label="Dirección">{(id) => <Input id={id} value={form.direccion} onChange={(e) => set('direccion', e.target.value)} required maxLength={180} placeholder="Avenida, calle, local y referencia" />}</Field>
      <Switch checked={form.activa} onChange={() => set('activa', !form.activa)} label="Sede activa" text={form.activa ? 'Sede activa' : 'Sede inactiva'} />
      {!form.activa && <p className="m-0 rounded-xl bg-warn-bg p-3 text-sm text-warn">Esta sede no estará disponible en caja ni inventario. Sus usuarios operativos no podrán ingresar; el historial se conserva.{sede && ` Usuarios asignados: ${state.usuarios.filter((u) => u.sedeId === sede.id && u.role !== 'admin' && u.activo).length}.`}</p>}
      {!sede && <p className="m-0 text-sm text-muted">La nueva sede empezará sin productos habilitados ni existencias. Podrás configurarlos desde su panel.</p>}
      <ErrorBox message={error} />
      <div className="flex flex-wrap justify-end gap-2"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">{sede ? 'Guardar cambios' : 'Crear sede'}</Button></div>
    </form>
  </Modal>;
}
