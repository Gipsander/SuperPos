'use client';
import type { FilaStock } from '@/lib/types';
import { money, num } from '@/lib/format';
import { redondearCantidad } from '@/lib/pos';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/layout';
import { Modal } from '@/components/ui/modal';

export function SuffixSearchModal({ query, rows, enCarrito, onSelect, onClose }: {
  query: string;
  rows: FilaStock[];
  enCarrito: Record<string, number>;
  onSelect: (row: FilaStock) => void;
  onClose: () => void;
}) {
  return <Modal title="Buscar por terminación" onClose={onClose}>
    <p className="m-0 text-sm text-muted">Códigos de barras que terminan en <strong className="break-all text-strong">{query.slice(1)}</strong>. Selecciona un producto para ingresar la cantidad o el peso.</p>
    <p role="status" className="mt-3 mb-1 text-sm font-semibold text-strong">{rows.length} {rows.length === 1 ? 'coincidencia' : 'coincidencias'}</p>
    {rows.length ? <ul aria-label="Productos coincidentes" className="m-0 max-h-[45dvh] list-none overflow-y-auto p-0">
      {rows.map((r) => {
        const disponible = redondearCantidad(r.cantidad - (enCarrito[r.productoCodigo] ?? 0));
        return <li key={r.productoCodigo} className="border-b border-line py-2">
          <button type="button" disabled={disponible <= 0} data-autofocus={disponible > 0 ? true : undefined}
            onClick={() => onSelect(r)} aria-label={`Seleccionar ${r.producto.nombre}, código ${r.producto.codigoBarras}`}
            className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3 text-left hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60">
            <span className="min-w-0 flex-1 basis-[180px]">
              <strong className="block break-all text-brand-dark tabular-nums">{r.producto.codigoBarras}</strong>
              <span className="block text-sm font-semibold text-strong">{r.producto.nombre}</span>
              <span className="block text-xs text-muted">{r.productoCodigo} · {disponible > 0 ? `Disponible: ${num(disponible)} ${r.producto.unidadMedida}` : 'Sin stock disponible'}</span>
            </span>
            <span className="text-sm font-bold text-strong">{money(r.producto.precioGlobal)}<span className="font-normal text-muted"> / {r.producto.unidadMedida}</span></span>
          </button>
        </li>;
      })}
    </ul> : <EmptyState title="Sin coincidencias">No hay productos activos y habilitados en esta sede con esa terminación. Prueba con menos dígitos o revisa el código.</EmptyState>}
    <div className="mt-4 flex justify-end"><Button onClick={onClose}>Volver al código</Button></div>
  </Modal>;
}
