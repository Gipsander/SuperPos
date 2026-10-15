'use client';
import { useState } from 'react';
import type { Cliente, MetodoPago } from '@/lib/types';
import { money } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ErrorBox, Field, Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { PaymentMethodSelector } from './payment-method-selector';

/** Cobro: elige el método y, en efectivo, calcula el cambio. `onConfirm` devuelve un mensaje si algo falla. */
export function PaymentModal({ total, cliente, onClose, onConfirm }: {
  total: number; cliente: Cliente; onClose: () => void; onConfirm: (metodo: MetodoPago, recibido?: number) => string | null;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [recibido, setRecibido] = useState('');
  const [error, setError] = useState('');
  const monto = Number(recibido);
  const cambio = recibido !== '' && monto >= total ? monto - total : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (metodo === 'efectivo' && (recibido === '' || !Number.isFinite(monto) || monto < total)) {
      setError(`El efectivo recibido debe cubrir ${money(total)}.`);
      return;
    }
    const fallo = onConfirm(metodo, metodo === 'efectivo' ? monto : undefined);
    if (fallo) setError(fallo);
  }

  return (
    <Modal title="Cobrar venta" onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between rounded-xl bg-soft px-4 py-3">
          <span className="text-muted">Total a cobrar</span>
          <strong className="text-[28px] tracking-tight text-strong tabular-nums">{money(total)}</strong>
        </div>
        <p className="m-0 text-sm text-muted">Cliente: <strong>{cliente.nombres} {cliente.apellidos}</strong> · {cliente.cedula}</p>
        <PaymentMethodSelector value={metodo} onChange={(m) => { setMetodo(m); setError(''); }} />
        {metodo === 'efectivo' && (
          <Field label="Efectivo recibido (USD)" hint={recibido !== '' && monto >= total ? `Cambio a entregar: ${money(cambio)}` : 'Ingresa el monto entregado por el cliente.'}>
            {(id, desc) => (
              <div className="flex flex-wrap gap-2">
                <Input id={id} aria-describedby={desc} type="number" min={0} step={0.01} inputMode="decimal" className="min-w-0 flex-1 basis-[140px]" value={recibido}
                  aria-invalid={!!error} onChange={(e) => { setRecibido(e.target.value); setError(''); }} />
                <Button onClick={() => { setRecibido(total.toFixed(2)); setError(''); }}>Monto exacto</Button>
              </div>
            )}
          </Field>
        )}
        <ErrorBox message={error} />
        <div className="mt-1.5 flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Confirmar cobro</Button>
        </div>
      </form>
    </Modal>
  );
}
