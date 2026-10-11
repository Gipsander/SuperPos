'use client';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { FilaStock } from '@/lib/types';
import { money, num } from '@/lib/format';
import { IconButton } from '@/components/ui/button';
import { ProductIcon } from '@/components/ui/icons';

export interface LineaCarrito { fila: FilaStock; cantidad: number }

export function CartLine({ linea, onChange, onRemove }: { linea: LineaCarrito; onChange: (cantidad: number) => void; onRemove: () => void }) {
  const { fila, cantidad } = linea;
  const excede = cantidad > fila.cantidad;
  const nombre = fila.producto.nombre;
  return (
    <li className="flex flex-col gap-1.5 border-b border-line py-3 first:pt-0 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <ProductIcon nombre={nombre} categoria={fila.producto.categoria} className="size-9" />
          <div className="min-w-0">
            <strong className="leading-snug text-strong">{nombre}</strong>
            <span className="block text-xs text-muted">{money(fila.producto.precioGlobal)} / {fila.producto.unidadMedida}</span>
          </div>
        </div>
        <strong className="text-strong tabular-nums">{money(fila.producto.precioGlobal * cantidad)}</strong>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${nombre}`}>
          <IconButton className="size-9 border border-edge" onClick={() => onChange(cantidad - 1)} aria-label={`Quitar una unidad de ${nombre}`}><Minus aria-hidden="true" /></IconButton>
          <span className="min-w-9 text-center font-bold text-strong tabular-nums" aria-live="polite">{num(cantidad)}</span>
          <IconButton className="size-9 border border-edge" onClick={() => onChange(cantidad + 1)} disabled={cantidad >= fila.cantidad} aria-label={`Agregar una unidad de ${nombre}`}><Plus aria-hidden="true" /></IconButton>
        </div>
        <IconButton className="size-9 text-danger hover:bg-danger-bg" onClick={onRemove} aria-label={`Eliminar ${nombre} del carrito`}><Trash2 aria-hidden="true" /></IconButton>
      </div>
      {excede && <p role="alert" className="m-0 text-xs font-semibold text-danger">Solo hay {num(fila.cantidad)} {fila.producto.unidadMedida} disponibles.</p>}
    </li>
  );
}
