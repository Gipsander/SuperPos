'use client';
import { useMemo, useState } from 'react';
import { ContactRound, Pencil, SearchX } from 'lucide-react';
import type { Cliente, User } from '@/lib/types';
import { actualizarCliente, useStore } from '@/lib/store';
import { norm } from '@/lib/format';
import { normalizarCedula } from '@/lib/pos';
import { Button } from '@/components/ui/button';
import { ErrorBox, Field, Input, SearchBox, Select, inputCls } from '@/components/ui/form';
import { EmptyState, PageHeading, StatCard, Sub, TableWrap, tdCls, thCls } from '@/components/ui/layout';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const esEmpresa = (cliente: Cliente) => /^[JG]/i.test(cliente.cedula.trim());

export function CustomersPanel({ user }: { user: User }) {
  const state = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState('');
  const [editing, setEditing] = useState<Cliente | null>(null);
  const empresas = state.clientes.filter(esEmpresa).length;
  const rows = useMemo(() => {
    const q = norm(query.trim());
    const compacto = q.replace(/[.\s()-]/g, '');
    return state.clientes.filter((c) => {
      if (tipo === 'empresas' && !esEmpresa(c)) return false;
      if (tipo === 'personas' && esEmpresa(c)) return false;
      return !q || norm(`${c.nombres} ${c.apellidos} ${c.cedula} ${c.telefono} ${c.telefonoConocido ?? ''}`).includes(q) ||
        (!!compacto && norm(`${c.cedula} ${c.telefono} ${c.telefonoConocido ?? ''}`).replace(/[.\s()-]/g, '').includes(compacto));
    }).sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es'));
  }, [state.clientes, query, tipo]);

  if (user.role !== 'admin') return <EmptyState title="Acceso restringido">Solo el administrador puede modificar clientes.</EmptyState>;

  return <section className="mx-auto w-full max-w-[1180px]">
    <PageHeading eyebrow="Administración · Clientes" title="Clientes" description="Consulta los clientes registrados y corrige sus datos para las próximas ventas." />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <StatCard label="Clientes registrados" value={state.clientes.length} icon={ContactRound} tone="brand" />
      <StatCard label="Personas" value={state.clientes.length - empresas} />
      <StatCard label="Empresas y organismos" value={empresas} />
    </div>
    <p className="mb-4 rounded-xl border border-line bg-soft px-4 py-3 text-sm text-muted">Los clientes con “Demo” en su nombre son ejemplos ficticios que puedes editar para probar el módulo.</p>
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
      <SearchBox value={query} onChange={setQuery} label="Buscar cliente" placeholder="Buscar por nombre, cédula, RIF o teléfono" />
      <Select aria-label="Filtrar clientes por tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="">Todos los clientes</option><option value="personas">Personas</option><option value="empresas">Empresas y organismos</option>
      </Select>
    </div>
    {rows.length ? <TableWrap caption="Clientes registrados y datos de contacto" minWidth={780}>
      <thead><tr>{['Cliente', 'Contacto', 'Dirección', 'Acciones'].map((h) => <th scope="col" key={h} className={thCls}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((c) => <tr key={c.cedula} className="group">
        <td className={tdCls}><strong className="text-strong">{c.nombres} {c.apellidos}</strong><Sub>{c.cedula}</Sub></td>
        <td className={tdCls}>{c.telefono}{c.telefonoConocido && <Sub>Alternativo: {c.telefonoConocido}</Sub>}</td>
        <td className={`${tdCls} max-w-[320px] whitespace-normal break-words`}>{c.direccion || <span className="text-muted">Sin dirección registrada</span>}</td>
        <td className={tdCls}><Button small onClick={() => setEditing(c)} aria-label={`Editar cliente ${c.nombres} ${c.apellidos}`.trim()}><Pencil aria-hidden="true" />Editar</Button></td>
      </tr>)}</tbody>
    </TableWrap> : <EmptyState title={state.clientes.length ? 'No hay clientes con estos filtros' : 'Todavía no hay clientes registrados'} icon={SearchX}>
      {state.clientes.length ? <Button onClick={() => { setQuery(''); setTipo(''); }}>Limpiar filtros</Button> : 'Los clientes registrados desde caja aparecerán aquí.'}
    </EmptyState>}
    <p role="status" className="mt-3 text-sm text-muted">{rows.length} de {state.clientes.length} clientes</p>
    {editing && <EditCustomer key={editing.cedula} cliente={editing} onClose={() => setEditing(null)} onSave={(input) => {
      const result = actualizarCliente(user, editing.cedula, input);
      if (!result.ok) return result.error;
      setEditing(null);
      toast('Cliente actualizado. Sus datos corregidos estarán disponibles en caja.');
      return null;
    }} />}
  </section>;
}

function EditCustomer({ cliente, onClose, onSave }: { cliente: Cliente; onClose: () => void; onSave: (input: Cliente) => string | null }) {
  const [form, setForm] = useState<Cliente>({ ...cliente, direccion: cliente.direccion ?? '', telefonoConocido: cliente.telefonoConocido ?? '' });
  const [error, setError] = useState('');
  const empresa = esEmpresa(form);
  const set = (key: keyof Cliente, value: string) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };
  const cambiaDocumento = normalizarCedula(form.cedula) !== cliente.cedula;

  return <Modal title="Editar cliente" onClose={onClose} wide>
    <form className="flex flex-col gap-3.5" noValidate onSubmit={(e) => { e.preventDefault(); setError(onSave(form) ?? ''); }}>
      <p className="m-0 text-sm text-muted">Corrige los datos del cliente. Los recibos de ventas anteriores conservarán la información con la que se emitieron.</p>
      <Field label="Cédula o RIF" hint="Incluye el tipo V-, E-, J- o G-. Ejemplo: V-91000001.">{(id, desc) => <Input id={id} aria-describedby={desc} value={form.cedula} autoComplete="off" spellCheck={false} required onChange={(e) => set('cedula', e.target.value)} />}</Field>
      {cambiaDocumento && <p className="m-0 rounded-lg bg-soft px-3 py-2 text-sm text-muted">Documento actual: <strong>{cliente.cedula}</strong>. Después de guardar, consulta al cliente en caja con su documento corregido.</p>}
      <div className={empresa ? '' : 'grid gap-3 sm:grid-cols-2'}>
        <Field label={empresa ? 'Razón social' : 'Nombres'}>{(id) => <Input id={id} value={form.nombres} required maxLength={120} autoComplete={empresa ? 'organization' : 'given-name'} onChange={(e) => set('nombres', e.target.value)} />}</Field>
        {!empresa && <Field label="Apellidos">{(id) => <Input id={id} value={form.apellidos} required maxLength={80} autoComplete="family-name" onChange={(e) => set('apellidos', e.target.value)} />}</Field>}
      </div>
      <Field label="Número de teléfono">{(id) => <Input id={id} type="tel" value={form.telefono} required maxLength={22} autoComplete="tel" onChange={(e) => set('telefono', e.target.value)} />}</Field>
      <Field label={empresa ? 'Dirección de la empresa' : 'Dirección de hogar'}>{(id) => <textarea id={id} className={inputCls} value={form.direccion} required maxLength={300} rows={2} autoComplete="street-address" onChange={(e) => set('direccion', e.target.value)} />}</Field>
      <Field label="Teléfono de un conocido (opcional)">{(id) => <Input id={id} type="tel" value={form.telefonoConocido} maxLength={22} autoComplete="off" onChange={(e) => set('telefonoConocido', e.target.value)} />}</Field>
      <ErrorBox message={error} />
      <div className="flex flex-wrap justify-end gap-2"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">Guardar cambios</Button></div>
    </form>
  </Modal>;
}
