'use client';
import { useEffect, useState } from 'react';
import { CreditCard, ScanBarcode, Trash2 } from 'lucide-react';
import type { Cliente } from '@/lib/types';
import { money, num } from '@/lib/format';
import { cantidadValida, importeLinea } from '@/lib/pos';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/layout';
import { ProductIcon } from '@/components/ui/icons';
import type { LineaCarrito } from './cart-line';

export function CartPanel({ lineas, cliente, invalido, onChange, onRemove, onClear, onPay }: {
  lineas: LineaCarrito[]; cliente: Cliente | null; invalido: boolean;
  onChange: (codigo: string, cantidad: number) => void; onRemove: (codigo: string) => void; onClear: () => void; onPay: () => void;
}) {
  const total = Math.round(lineas.reduce((t, l) => t + importeLinea(l.fila.producto.precioGlobal, l.cantidad), 0) * 100) / 100;
  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
    <section aria-labelledby="cart-title" className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="cart-title" className="m-0 text-lg font-bold text-strong">Detalle de la venta</h2>
        <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted">{lineas.length} {lineas.length === 1 ? 'producto' : 'productos'}</span>
      </div>
      {lineas.length === 0 ? <div className="grid min-h-[280px] place-items-center"><EmptyState title="Listo para una nueva venta" icon={ScanBarcode}>Escanea un código o usa Buscar producto para comenzar.</EmptyState></div> :
        <div className="max-h-[48dvh] overflow-auto"><table className="w-full min-w-[580px] border-collapse text-sm">
          <caption className="sr-only">Productos de la venta actual</caption>
          <thead className="sticky top-0 z-10 bg-soft text-xs text-muted"><tr>
            <th scope="col" className="px-4 py-3 text-left">Producto</th><th scope="col" className="px-3 py-3 text-right">Precio</th><th scope="col" className="px-3 py-3 text-center">Cantidad</th><th scope="col" className="px-3 py-3 text-right">Importe</th><th scope="col"><span className="sr-only">Eliminar</span></th>
          </tr></thead>
          <tbody>{lineas.map((l) => <tr key={l.fila.productoCodigo} className="border-t border-line">
            <th scope="row" className="px-4 py-3 text-left font-normal"><ProductIcon nombre={l.fila.producto.nombre} categoria={l.fila.producto.categoria} className="float-left mr-2 size-9" /><strong className="block text-strong">{l.fila.producto.nombre}</strong><span className="text-xs text-muted">{l.fila.productoCodigo} · {l.fila.producto.unidadMedida}</span>{l.cantidad > l.fila.cantidad && <p role="alert" className="text-xs text-danger">Disponible: {num(l.fila.cantidad)}</p>}</th>
            <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{money(l.fila.producto.precioGlobal)}</td>
            <td className="w-28 px-3 py-3"><Quantity linea={l} onChange={(n) => onChange(l.fila.productoCodigo, n)} /></td>
            <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-strong tabular-nums">{money(importeLinea(l.fila.producto.precioGlobal, l.cantidad))}</td>
            <td className="pr-2"><IconButton onClick={() => onRemove(l.fila.productoCodigo)} aria-label={`Eliminar ${l.fila.producto.nombre}`}><Trash2 aria-hidden="true" /></IconButton></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
    <aside className="rounded-xl border border-line bg-white p-5 lg:sticky lg:top-4" aria-label="Resumen de cobro">
      <h2 className="m-0 text-lg font-bold text-strong">Resumen de venta</h2>
      <p className="mt-2 mb-0 text-sm text-muted">{cliente ? `Cliente: ${cliente.cedula}` : 'Cliente pendiente de identificar'}</p>
      <div className="my-3 border-y border-line py-3"><p className="m-0 text-sm text-muted">Total a cobrar · USD</p><strong className="block text-[38px] leading-tight tracking-tight text-strong tabular-nums">{money(total)}</strong></div>
      <Button variant="primary" className="min-h-14 w-full text-base" disabled={!lineas.length || !cliente || invalido} onClick={onPay}><CreditCard aria-hidden="true" />Cobrar · F8</Button>
      {!cliente && <p className="mt-2 text-xs text-muted">Consulta o registra al cliente para habilitar el cobro.</p>}
      <Button className="mt-3 w-full" disabled={!lineas.length && !cliente} onClick={onClear}><Trash2 aria-hidden="true" />Cancelar venta</Button>
      <p className="mt-4 mb-0 text-xs text-muted">El inventario se descuenta al confirmar el cobro.</p>
    </aside>
  </div>;
}

function Quantity({ linea, onChange }: { linea: LineaCarrito; onChange: (n: number) => void }) {
  const [value, setValue] = useState(String(linea.cantidad));
  const [error, setError] = useState(false);
  useEffect(() => { setValue(String(linea.cantidad)); setError(false); }, [linea.cantidad]);
  function commit() {
    const n = Number(value.replace(',', '.'));
    if (!cantidadValida(linea.fila.producto, n) || n > linea.fila.cantidad) {
      setValue(String(linea.cantidad)); setError(true); return;
    }
    setError(false); onChange(n);
  }
  return <><Input aria-label={`Cantidad de ${linea.fila.producto.nombre}`} className="min-w-20 text-center tabular-nums" inputMode={linea.fila.producto.unidadMedida === 'kg' ? 'decimal' : 'numeric'} value={value} aria-invalid={error} onChange={(e) => { setValue(e.target.value); setError(false); }} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />{error && <span role="alert" className="block text-xs text-danger">Cantidad inválida; se conservó la anterior.</span>}</>;
}
