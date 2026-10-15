'use client';
import { useState } from 'react';
import { UserRound, Search } from 'lucide-react';
import type { Cliente, User } from '@/lib/types';
import { buscarCliente, getState, registrarCliente } from '@/lib/store';
import { normalizarCedula } from '@/lib/pos';
import { Button } from '@/components/ui/button';
import { ErrorBox, Field, Input, Select, inputCls } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';

type Prefijo = 'V' | 'E' | 'J' | 'G';
function separarDocumento(value: string) {
  const match = /^([VEJG])-?(.*)$/i.exec(value.trim());
  return { prefijo: (match?.[1]?.toUpperCase() ?? 'V') as Prefijo, numero: match?.[2] ?? value };
}
function DocumentFields({ value, onChange, invalid }: {
  value: { prefijo: Prefijo; numero: string }; onChange: (v: { prefijo: Prefijo; numero: string }) => void; invalid: boolean;
}) {
  return <div className="grid grid-cols-[156px_minmax(0,1fr)] gap-2">
    <Field label="Tipo">{(id) => <Select id={id} aria-label="Tipo de documento" value={value.prefijo} onChange={(e) => onChange({ ...value, prefijo: e.target.value as Prefijo })}>
      <option value="V">V-</option><option value="E">E- Extranjero</option><option value="J">J- RIF</option><option value="G">G- RIF</option>
    </Select>}</Field>
    <Field label="Cédula o RIF">{(id) => <Input id={id} value={value.numero} placeholder="Número de documento" inputMode="numeric" autoComplete="off" aria-invalid={invalid} onChange={(e) => {
      const numero = e.target.value;
      // Permite pegar el documento completo, además de escribir solo el número.
      onChange(/^[VEJG][\s.-]*\d/i.test(numero.trim()) ? separarDocumento(numero) : { ...value, numero });
    }} />}</Field>
  </div>;
}

export function CustomerPanel({ user, cliente, onChange }: { user: User; cliente: Cliente | null; onChange: (c: Cliente | null) => void }) {
  const [documento, setDocumento] = useState(() => separarDocumento(cliente?.cedula ?? ''));
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState('');
  function consultar(e: React.FormEvent) {
    e.preventDefault();
    const key = normalizarCedula(`${documento.prefijo}-${documento.numero}`);
    onChange(null);
    if (!key) { setError('Selecciona el tipo e ingresa el número del documento.'); return; }
    setDocumento(separarDocumento(key)); setError('');
    const found = buscarCliente(getState(), key);
    if (found) onChange(found); else setNueva(key);
  }
  return <section className="mb-4 rounded-xl border border-line bg-white p-4" aria-label="Cliente de la venta">
    <form onSubmit={consultar} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(280px,400px)_auto_minmax(0,1fr)]" noValidate>
      <DocumentFields value={documento} invalid={!!error} onChange={(v) => { setDocumento(v); setError(''); onChange(null); }} />
      <Button type="submit"><Search aria-hidden="true" />Consultar</Button>
      <div role="status" className="flex min-h-11 items-center sm:col-span-2 lg:col-span-1 gap-2 rounded-lg bg-soft px-3 py-2">
        <UserRound className="size-5 shrink-0 text-brand" aria-hidden="true" />
        {cliente ? <div><strong className="block text-strong">{cliente.nombres} {cliente.apellidos}</strong><span className="text-xs text-muted">Cliente identificado · {cliente.telefono}</span></div>
          : <span className="text-sm text-muted">Consulta el documento para identificar al cliente.</span>}
      </div>
    </form>
    {error && <div className="mt-3"><ErrorBox message={error} /></div>}
    {nueva && <RegisterCustomer user={user} cedula={nueva} onClose={() => setNueva('')} onSave={(c) => { onChange(c); setDocumento(separarDocumento(c.cedula)); setNueva(''); }} />}
  </section>;
}

function RegisterCustomer({ user, cedula, onClose, onSave }: { user: User; cedula: string; onClose: () => void; onSave: (c: Cliente) => void }) {
  const [documento, setDocumento] = useState(() => separarDocumento(cedula));
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefonoConocido, setTelefonoConocido] = useState('');
  const [error, setError] = useState('');
  const empresa = ['J', 'G'].includes(documento.prefijo);
  return <Modal title="Registrar cliente" onClose={onClose} wide>
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => {
      e.preventDefault();
      const r = registrarCliente(user, { cedula: `${documento.prefijo}-${documento.numero}`, nombres, apellidos, telefono, direccion, telefonoConocido });
      if (!r.ok) { setError(r.error); return; }
      onSave(r.cliente);
    }}>
      <p className="m-0 text-sm text-muted">Completa los datos del cliente. Puedes corregir el tipo o número de documento antes de guardar.</p>
      <DocumentFields value={documento} invalid={!!error && !normalizarCedula(`${documento.prefijo}-${documento.numero}`)} onChange={(v) => { setDocumento(v); setError(''); }} />
      <div className={empresa ? '' : 'grid gap-3 sm:grid-cols-2'}>
        <Field label={empresa ? 'Razón social' : 'Nombres'}>{(id) => <Input id={id} value={nombres} maxLength={120} autoComplete={empresa ? 'organization' : 'given-name'} onChange={(e) => { setNombres(e.target.value); setError(''); }} />}</Field>
        {!empresa && <Field label="Apellidos">{(id) => <Input id={id} value={apellidos} maxLength={80} autoComplete="family-name" onChange={(e) => { setApellidos(e.target.value); setError(''); }} />}</Field>}
      </div>
      <Field label="Número de teléfono">{(id) => <Input id={id} type="tel" value={telefono} maxLength={22} autoComplete="tel" placeholder="04121234567" onChange={(e) => { setTelefono(e.target.value); setError(''); }} />}</Field>
      <Field label={empresa ? 'Dirección de la empresa' : 'Dirección de hogar'}>{(id) => <textarea id={id} className={inputCls} value={direccion} maxLength={300} rows={2} autoComplete="street-address" placeholder="Estado, ciudad, calle y casa o edificio" onChange={(e) => { setDireccion(e.target.value); setError(''); }} />}</Field>
      <Field label="Teléfono de un conocido (opcional)">{(id) => <Input id={id} type="tel" value={telefonoConocido} maxLength={22} autoComplete="off" placeholder="Número de contacto alternativo" onChange={(e) => { setTelefonoConocido(e.target.value); setError(''); }} />}</Field>
      <ErrorBox message={error} />
      <div className="flex flex-wrap justify-end gap-2"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">Guardar y usar cliente</Button></div>
    </form>
  </Modal>;
}
