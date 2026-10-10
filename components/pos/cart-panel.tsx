'use client';
import { CreditCard, ShoppingCart, Trash2 } from 'lucide-react';
import { money, num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/layout';
import { CartLine, type LineaCarrito } from './cart-line';

export function CartPanel({ lineas, onChange, onRemove, onClear, onPay }: {
  lineas: LineaCarrito[]; onChange: (codigo: string, cantidad: number) => void; onRemove: (codigo: string) => void; onClear: () => void; onPay: () => void;
}) {
  const unidades = lineas.reduce((t, l) => t + l.cantidad, 0);
  const total = lineas.reduce((t, l) => t + l.cantidad * l.fila.producto.precioGlobal, 0);
  const invalido = lineas.some((l) => l.cantidad > l.fila.cantidad || l.cantidad < 1);

  return (
    <section aria-labelledby="cart-title" className="flex flex-col rounded-xl border border-line bg-white p-[18px] lg:sticky lg:top-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="cart-title" className="m-0 flex items-center gap-2 text-[17px] font-bold tracking-tight text-strong">
          <ShoppingCart className="size-[18px] text-brand" aria-hidden="true" />Carrito
        </h2>
        {lineas.length > 0 && <Button small onClick={onClear}><Trash2 aria-hidden="true" />Vaciar</Button>}
      </div>
      {lineas.length === 0 ? (
        <EmptyState title="El carrito está vacío" icon={ShoppingCart}>Agrega productos desde el catálogo para iniciar una venta.</EmptyState>
      ) : (
        <ul className="m-0 max-h-[46dvh] list-none overflow-auto p-0">
          {lineas.map((l) => (
            <CartLine key={l.fila.productoCodigo} linea={l} onChange={(c) => onChange(l.fila.productoCodigo, c)} onRemove={() => onRemove(l.fila.productoCodigo)} />
          ))}
        </ul>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-muted">Total · {num(unidades)} {unidades === 1 ? 'unidad' : 'unidades'}</span>
          <strong className="text-[28px] tracking-tight text-strong tabular-nums">{money(total)}</strong>
        </div>
        <Button variant="primary" className="w-full" disabled={!lineas.length || invalido} onClick={onPay}><CreditCard aria-hidden="true" />Cobrar</Button>
      </div>
    </section>
  );
}
