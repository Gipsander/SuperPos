'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { CuentaDemo, Rol, User } from '@/lib/types';
import { eliminarUsuario, guardarUsuario, useStore, type DatosUsuario } from '@/lib/store';
import { ROLES } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { ErrorBox, Field, Input, SearchBox, Select, Switch } from '@/components/ui/form';
import { EmptyState, PageHeading, StatCard, Sub, TableWrap, tdCls, thCls } from '@/components/ui/layout';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

export function UsersPanel({ user, initialSedeId = '' }: { user: User; initialSedeId?: string }) {
  const state = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [sedeId, setSedeId] = useState(initialSedeId);
  const [editing, setEditing] = useState<CuentaDemo | 'new' | null>(null);
  const [toggle, setToggle] = useState<CuentaDemo | null>(null);
  const [borrar, setBorrar] = useState<CuentaDemo | null>(null);
  const rows = state.usuarios.filter((u) => (!role || u.role === role) && (!sedeId || u.sedeId === sedeId) &&
    `${u.name} ${u.username}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  function changeStatus() {
    if (!toggle) return;
    const result = guardarUsuario(user, { ...toggle, password: '', activo: !toggle.activo }, toggle.username);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast(toggle.activo ? 'Usuario desactivado' : 'Usuario activado');
    setToggle(null);
  }

  function remove() {
    if (!borrar) return;
    const result = eliminarUsuario(user, borrar.username);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast(`Usuario ${borrar.name} eliminado`);
    setBorrar(null);
  }

  return <section className="mx-auto w-full max-w-[1180px]">
    <PageHeading eyebrow="Administración · Accesos" title="Usuarios y roles" description="Organiza tu equipo: cada usuario tiene un rol y una única sede asignada."
      actions={<Button variant="primary" onClick={() => setEditing('new')}><Plus aria-hidden="true" />Crear usuario</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <StatCard label="Usuarios registrados" value={state.usuarios.length} icon={Users} />
      <StatCard label="Usuarios activos" value={state.usuarios.filter((u) => u.activo).length} tone="brand" />
      <StatCard label="Administradores activos" value={state.usuarios.filter((u) => u.activo && u.role === 'admin').length} />
    </div>
    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
      <SearchBox value={query} onChange={setQuery} label="Buscar usuario" placeholder="Buscar por nombre o usuario" />
      <Select aria-label="Filtrar por rol" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Todos los roles</option>{Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}</Select>
      <Select aria-label="Filtrar por sede" value={sedeId} onChange={(e) => setSedeId(e.target.value)}><option value="">Todas las sedes</option>{state.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}{!s.activa ? ' (inactiva)' : ''}</option>)}</Select>
    </div>
    {rows.length ? <TableWrap caption="Usuarios, roles y sede asignada" minWidth={780}>
      <thead><tr>{['Usuario', 'Rol', 'Sede asignada', 'Estado', 'Acciones'].map((h) => <th key={h} className={thCls} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((u) => {
        const sede = state.sedes.find((s) => s.id === u.sedeId);
        return <tr key={u.username} className="group">
          <td className={tdCls}><strong className="text-strong">{u.name}</strong><Sub>@{u.username}{u.username === user.username ? ' · Tú' : ''}</Sub></td>
          <td className={tdCls}>{ROLES[u.role].label}{u.role === 'admin' && <Sub>Supervisa todas las sedes</Sub>}</td>
          <td className={tdCls}>{sede?.nombre ?? 'Sin sede'}{sede && !sede.activa && <Sub>Sede inactiva · acceso operativo suspendido</Sub>}</td>
          <td className={tdCls}><StatusBadge active={u.activo} /></td>
          <td className={tdCls}><div className="flex gap-2">
            <Button small onClick={() => setEditing(u)} aria-label={`Editar a ${u.name}`}><Pencil aria-hidden="true" />Editar</Button>
            <Button small disabled={u.username === user.username} onClick={() => setToggle(u)} aria-label={`${u.activo ? 'Desactivar' : 'Activar'} a ${u.name}`}>{u.activo ? 'Desactivar' : 'Activar'}</Button>
            <Button small variant="danger" disabled={u.username === user.username} onClick={() => setBorrar(u)} aria-label={`Eliminar a ${u.name}`} title={u.username === user.username ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}><Trash2 aria-hidden="true" /></Button>
          </div></td>
        </tr>;
      })}</tbody>
    </TableWrap> : <EmptyState title="No hay usuarios con estos filtros" icon={Users}>Prueba otra búsqueda o crea un usuario para tu equipo.</EmptyState>}
    <p className="mt-3 text-xs text-muted">El rol determina las opciones disponibles al iniciar sesión. Los usuarios desactivados no pueden ingresar.</p>
    {editing && <UserForm user={user} account={editing === 'new' ? undefined : editing} defaultSedeId={sedeId} onClose={() => setEditing(null)} />}
    {borrar && <ConfirmModal title="Eliminar usuario" message={`${borrar.name} (@${borrar.username}) se eliminará de forma permanente y ya no podrá iniciar sesión. Sus ventas y movimientos se conservarán.`} confirmText="Eliminar usuario" danger onCancel={() => setBorrar(null)} onConfirm={remove} />}
    {toggle && <ConfirmModal title={`${toggle.activo ? 'Desactivar' : 'Activar'} usuario`} message={toggle.activo ? `${toggle.name} dejará de poder iniciar sesión. Sus ventas y movimientos se conservarán.` : `${toggle.name} podrá iniciar sesión con su rol y sede asignados.`} confirmText={toggle.activo ? 'Desactivar usuario' : 'Activar usuario'} danger={toggle.activo} onCancel={() => setToggle(null)} onConfirm={changeStatus} />}
  </section>;
}

export function StatusBadge({ active, feminine = false }: { active: boolean; feminine?: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${active ? 'bg-brand-soft text-brand-dark' : 'bg-soft text-muted'}`}>{active ? (feminine ? 'Activa' : 'Activo') : (feminine ? 'Inactiva' : 'Inactivo')}</span>;
}

function UserForm({ user, account, defaultSedeId, onClose }: { user: User; account?: CuentaDemo; defaultSedeId: string; onClose: () => void }) {
  const state = useStore();
  const toast = useToast();
  const [error, setError] = useState('');
  const [form, setForm] = useState<DatosUsuario>({ username: account?.username ?? '', name: account?.name ?? '', password: '', role: account?.role ?? 'cajero', sedeId: account?.sedeId ?? (state.sedes.find((s) => s.id === defaultSedeId && s.activa)?.id || ''), activo: account?.activo ?? true });
  const set = <K extends keyof DatosUsuario>(key: K, value: DatosUsuario[K]) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };
  const own = account?.username === user.username;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = guardarUsuario(user, form, account?.username);
    if (!result.ok) { setError(result.error); return; }
    toast(account ? 'Usuario actualizado' : 'Usuario creado. Ya puede iniciar sesión con su cuenta.');
    onClose();
  }
  return <Modal title={account ? 'Editar usuario' : 'Crear usuario'} onClose={onClose}>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre completo">{(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={80} placeholder="Ej. Ana Pérez" />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Usuario de acceso" hint={account ? 'El acceso se conserva para identificar la cuenta.' : 'Entre 3 y 30 caracteres, sin espacios.'}>{(id, hint) => <Input id={id} aria-describedby={hint} value={form.username} readOnly={!!account} onChange={(e) => set('username', e.target.value)} required maxLength={30} autoCapitalize="none" autoComplete="off" placeholder="Ej. ana.perez" />}</Field>
        <Field label={account ? 'Nueva contraseña' : 'Contraseña'} hint={account ? 'Déjala vacía para conservar la actual.' : 'Mínimo 4 caracteres. Usa datos ficticios.'}>{(id, hint) => <Input id={id} aria-describedby={hint} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required={!account} autoComplete="new-password" />}</Field>
      </div>
      <Field label="Rol" hint={own ? 'Tu cuenta conserva el rol de administrador.' : ROLES[form.role].descripcion}>{(id, hint) => <Select id={id} aria-describedby={hint} disabled={own} value={form.role} onChange={(e) => set('role', e.target.value as Rol)}>{Object.entries(ROLES).map(([r, data]) => <option key={r} value={r}>{data.label}</option>)}</Select>}</Field>
      <Field label="Sede asignada" hint={form.role === 'admin' ? 'Una sede de adscripción; este rol supervisa todas las sedes.' : 'Solo podrá operar en esta sede.'}>{(id, hint) => <Select id={id} aria-describedby={hint} value={form.sedeId} onChange={(e) => set('sedeId', e.target.value)} required><option value="">Selecciona una sede</option>{state.sedes.filter((s) => s.activa || s.id === account?.sedeId).map((s) => <option key={s.id} value={s.id} disabled={!s.activa}>{s.nombre}{!s.activa ? ' (inactiva)' : ''}</option>)}</Select>}</Field>
      {!own && <Switch checked={form.activo} onChange={() => set('activo', !form.activo)} label="Usuario activo" text={form.activo ? 'Usuario activo' : 'Usuario inactivo'} />}
      <ErrorBox message={error} />
      <div className="flex flex-wrap justify-end gap-2"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">{account ? 'Guardar cambios' : 'Crear usuario'}</Button></div>
    </form>
  </Modal>;
}
