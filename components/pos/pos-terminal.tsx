'use client';
import { useMemo, useState } from 'react';
import type { FilaStock, MetodoPago, User, Venta } from '@/lib/types';
import { getStock, registrarVenta, sedesDeUsuario, useStore } from '@/lib/store';
import { EmptyState, PageHeading } from '@/components/ui/layout';
import { SedeSelect } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { CartPanel } from './cart-panel';
import { PaymentModal } from './payment-modal';
import { ProductCatalog } from './product-catalog';
import { ReceiptModal } from './receipt-modal';

interface Item { codigo: string; cantidad: number }

/** Módulo 4 · Punto de venta / Caja: catálogo de la sede, carrito, cobro y descuento de inventario. */
export function PosTerminal({ user }: { user: User }) {
  const state = useStore();
  const toast = useToast();
  const sedes = useMemo(() => sedesDeUsuario(state, user), [state, user]);
  const [elegida, setElegida] = useState('');
  const sedeId = sedes.some((s) => s.id === elegida) ? elegida : sedes[0]?.id;
  const [cart, setCart] = useState<Item[]>([]);
  const [cobrando, setCobrando] = useState(false);
  const [venta, setVenta] = useState<Venta | null>(null);

  const rows = useMemo(() => (sedeId ? getStock(state, sedeId) : []), [state, sedeId]);
  const byCode = useMemo(() => new Map(rows.map((r) => [r.productoCodigo, r])), [rows]);
  const lineas = cart.flatMap((i) => { const fila = byCode.get(i.codigo); return fila ? [{ fila, cantidad: i.cantidad }] : []; });
  const enCarrito = Object.fromEntries(cart.map((i) => [i.codigo, i.cantidad]));
  const total = lineas.reduce((t, l) => t + l.cantidad * l.fila.producto.precioGlobal, 0);

  if (!sedeId) return <EmptyState title="Sin sedes asignadas">Pide al administrador que te asigne una sede para vender.</EmptyState>;

  function add(r: FilaStock) {
    setCart((c) => {
      const i = c.find((x) => x.codigo === r.productoCodigo);
      if (!i) return [...c, { codigo: r.productoCodigo, cantidad: 1 }];
      return c.map((x) => x.codigo === r.productoCodigo ? { ...x, cantidad: Math.min(x.cantidad + 1, r.cantidad) } : x);
    });
  }
  function change(codigo: string, cantidad: number) {
    setCart((c) => cantidad < 1 ? c.filter((x) => x.codigo !== codigo) : c.map((x) => x.codigo === codigo ? { ...x, cantidad } : x));
  }
  function cambiarSede(id: string) {
    if (cart.length) toast('Carrito vaciado al cambiar de sede', 'error');
    setCart([]); setElegida(id);
  }

  function confirmar(metodo: MetodoPago, recibido?: number): string | null {
    // registrarVenta valida todo el carrito y descuenta el inventario (descontarStock por cada ítem) o falla completa.
    const r = registrarVenta(sedeId!, lineas.map((l) => ({ codigo: l.fila.productoCodigo, cantidad: l.cantidad })), metodo, user.name, recibido);
    if (!r.ok) return r.error;
    setCobrando(false);
    setCart([]);
    setVenta(r.venta);
    toast(`Venta ${r.venta.id} registrada`);
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-[1280px]">
      <PageHeading
        eyebrow={user.role === 'admin' ? 'Administración' : undefined}
        title="Punto de venta"
        description="Elige productos de la sede, arma el carrito y cobra. El inventario se descuenta al confirmar."
        actions={<SedeSelect sedes={sedes} value={sedeId} onChange={cambiarSede} />}
      />
      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProductCatalog rows={rows} enCarrito={enCarrito} onAdd={add} />
        <CartPanel lineas={lineas} onChange={change} onRemove={(c) => change(c, 0)} onClear={() => setCart([])} onPay={() => setCobrando(true)} />
      </div>
      {cobrando && <PaymentModal total={total} onClose={() => setCobrando(false)} onConfirm={confirmar} />}
      {venta && <ReceiptModal venta={venta} onClose={() => setVenta(null)} />}
    </section>
  );
}
