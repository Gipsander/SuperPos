'use client';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { faltan, getExistencia, getMovimientos, getProducto, getSede, getStock, registrarEntrada, useStore } from '@/lib/store';
import { cx, fechaHora, num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/badge';
import { ErrorBox, Field, Input, Select } from '@/components/ui/form';
import { Box, EmptyState, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';

/** F12 · Registrar mercancía: suma stock en la sede y guarda el movimiento ENTRADA. */
export function TabIngreso({ sedeId }: { sedeId: string }) {
  const state = useStore();
  const toast = useToast();
  const opciones = useMemo(() => getStock(state, sedeId).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es')), [state, sedeId]);
  const movs = useMemo(() => getMovimientos(state, { sedeId, limit: 10 }), [state, sedeId]);
  const [codigo, setCodigo] = useState('');
  const [cant, setCant] = useState('');
  const [motivo, setMotivo] = useState('Recepción de proveedor');
  const [error, setError] = useState('');

  const ex = codigo ? getExistencia(state, sedeId, codigo) : undefined;
  const p = codigo ? getProducto(state, codigo) : undefined;
  const falta = ex ? faltan(ex) : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo || !p) { setError('Selecciona el producto que recibiste.'); return; }
    const r = registrarEntrada(sedeId, codigo, cant, motivo);
    if (!r.ok) { setError(r.error); return; }
    setError(''); setCant('');
    toast(`${p.nombre}: ${num(r.anterior)} → ${num(r.nueva)} ${p.unidadMedida}`);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      <Box title="Registrar ingreso">
        <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
          <p className="m-0 text-muted">La cantidad se suma al stock de <strong>{getSede(state, sedeId)?.nombre}</strong> y queda guardada como movimiento de entrada.</p>
          <Field label="Producto" hint={ex && p ? `Existencia actual: ${num(ex.cantidad)} ${p.unidadMedida} · Mínimo: ${num(ex.stockMinimo)}${falta ? ` · Faltan ${num(falta)}` : ' · Stock suficiente'}` : 'Elige un producto para ver su existencia actual.'}>
            {(id, desc) => (
              <Select id={id} aria-describedby={desc} value={codigo} onChange={(e) => { setCodigo(e.target.value); setError(''); }}>
                <option value="">Selecciona un producto…</option>
                {opciones.map((r) => <option key={r.productoCodigo} value={r.productoCodigo}>{r.producto.nombre} · {r.productoCodigo}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Cantidad recibida">
            {(id) => (
              <div className="flex flex-wrap gap-2">
                <Input id={id} type="number" min={p?.unidadMedida === 'kg' ? 0.001 : 1} step={p?.unidadMedida === 'kg' ? 0.001 : 1} inputMode="decimal" required className="min-w-0 flex-1 basis-[120px]" value={cant} aria-invalid={!!error && !!codigo}
                  onChange={(e) => { setCant(e.target.value); setError(''); }} />
                {falta > 0 && <Button onClick={() => setCant(String(falta))}>Reponer faltante ({num(falta)})</Button>}
              </div>
            )}
          </Field>
          <Field label="Motivo">{(id) => <Input id={id} maxLength={80} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}</Field>
          <ErrorBox message={error} />
          <Button type="submit" variant="primary"><Download aria-hidden="true" />Registrar ingreso</Button>
        </form>
      </Box>
      <Box title="Últimos movimientos">
        <TableWrap caption="Movimientos de inventario de la sede" minWidth={480} className="border-0">
          <thead>
            <tr>
              <th scope="col" className={thCls}>Fecha</th><th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Tipo</th>
              <th scope="col" className={cx(thCls, numCls)}>Cantidad</th><th scope="col" className={thCls}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={5}><EmptyState title="Sin movimientos">Aún no hay movimientos en esta sede.</EmptyState></td></tr>}
            {movs.map((m) => (
              <tr key={m.id} className="group">
                <td className={cx(tdCls, 'text-[13px]')}>{fechaHora(m.fecha)}</td>
                <td className={cx(tdCls, 'text-[13px]')}>{getProducto(state, m.productoCodigo)?.nombre ?? m.productoCodigo}<Sub>{m.productoCodigo}</Sub></td>
                <td className={tdCls}><Tag tone={m.tipo === 'ENTRADA' ? 'in' : 'out'}>{m.tipo}</Tag></td>
                <td className={cx(tdCls, numCls, 'text-[13px]')}>{m.tipo === 'ENTRADA' ? '+' : '−'}{num(m.cantidad)}</td>
                <td className={cx(tdCls, 'text-[13px]')}>{m.motivo}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Box>
    </div>
  );
}
