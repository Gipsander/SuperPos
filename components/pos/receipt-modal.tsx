'use client';
import { Printer } from 'lucide-react';
import type { Venta } from '@/lib/types';
import { asset, fechaHora, money, num } from '@/lib/format';
import { getSede, useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { metodoLabel } from './payment-method-selector';

/** Recibo virtual de la venta confirmada (se puede imprimir). */
export function ReceiptModal({ venta, onClose }: { venta: Venta; onClose: () => void }) {
  const state = useStore();
  return (
    <Modal title="Venta registrada" onClose={onClose} printable>
      <div className="flex flex-col gap-3 text-[13px]">
        <div className="flex flex-col items-center gap-0.5 border-b border-dashed border-edge pb-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset('/logo.svg')} alt="" width={36} height={36} />
          <strong className="text-base text-strong">Superpos</strong>
          <span className="text-muted">{getSede(state, venta.sedeId)?.nombre} · Folio {venta.id}</span>
          <span className="text-muted">{fechaHora(venta.fecha)} · Cajero: {venta.cajero}</span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {venta.items.map((it) => (
            <li key={it.codigo} className="flex justify-between gap-3">
              <span>{num(it.cantidad)} × {it.nombre}<span className="block text-xs text-muted">{money(it.precio)} / {it.unidadMedida}</span></span>
              <span className="tabular-nums">{money(it.cantidad * it.precio)}</span>
            </li>
          ))}
        </ul>
        <dl className="m-0 flex flex-col gap-1 border-t border-dashed border-edge pt-3">
          <div className="flex justify-between text-base"><dt className="font-bold text-strong">Total</dt><dd className="m-0 font-bold text-strong tabular-nums">{money(venta.total)}</dd></div>
          <div className="flex justify-between"><dt>Método de pago</dt><dd className="m-0">{metodoLabel(venta.metodo)}</dd></div>
          {venta.recibido !== undefined && (
            <>
              <div className="flex justify-between"><dt>Recibido</dt><dd className="m-0 tabular-nums">{money(venta.recibido)}</dd></div>
              <div className="flex justify-between"><dt>Cambio</dt><dd className="m-0 tabular-nums">{money(venta.recibido - venta.total)}</dd></div>
            </>
          )}
        </dl>
        <p className="m-0 text-center text-muted">¡Gracias por tu compra! · Recibo de demostración</p>
        <div className="flex flex-wrap justify-end gap-2.5 print:hidden">
          <Button onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir</Button>
          <Button variant="primary" onClick={onClose} data-autofocus>Nueva venta</Button>
        </div>
      </div>
    </Modal>
  );
}
