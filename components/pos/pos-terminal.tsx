'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScanBarcode, Search } from 'lucide-react';
import type { Cliente, FilaStock, MetodoPago, User, Venta } from '@/lib/types';
import { getStock, registrarVenta, sedesDeUsuario, useStore } from '@/lib/store';
import { cantidadValida, coincideCodigoBarras, importeLinea, redondearCantidad } from '@/lib/pos';
import { money, num } from '@/lib/format';
import { EmptyState } from '@/components/ui/layout';
import { ErrorBox, Field, Input, SedeSelect } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { CartPanel } from './cart-panel';
import { CustomerPanel } from './customer-panel';
import { PaymentModal } from './payment-modal';
import { ProductCatalog } from './product-catalog';
import { ReceiptModal } from './receipt-modal';

interface Item { codigo: string; cantidad: number }

export function PosTerminal({ user }: { user: User }) {
  const state = useStore();
  const toast = useToast();
  const sedes = useMemo(() => sedesDeUsuario(state, user), [state, user]);
  const [elegida, setElegida] = useState('');
  const sedeId = sedes.some((s) => s.id === elegida) ? elegida : sedes[0]?.id;
  const [cart, setCart] = useState<Item[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [revisionCliente, setRevisionCliente] = useState(0);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<FilaStock | null>(null);
  const [cantidadEntrada, setCantidadEntrada] = useState('1');
  const cantidadRef = useRef<HTMLInputElement>(null);
  const [cobrando, setCobrando] = useState(false);
  const [venta, setVenta] = useState<Venta | null>(null);
  const [pendiente, setPendiente] = useState<{ sede?: string } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const confirmando = useRef(false);

  const rows = useMemo(() => sedeId ? getStock(state, sedeId) : [], [state, sedeId]);
  const byCode = useMemo(() => new Map(rows.map((r) => [r.productoCodigo, r])), [rows]);
  const lineas = cart.flatMap((i) => { const fila = byCode.get(i.codigo); return fila ? [{ fila, cantidad: i.cantidad }] : []; });
  const enCarrito = Object.fromEntries(cart.map((i) => [i.codigo, i.cantidad]));
  const total = Math.round(lineas.reduce((t, l) => t + importeLinea(l.fila.producto.precioGlobal, l.cantidad), 0) * 100) / 100;
  const invalido = lineas.length !== cart.length || lineas.some((l) => !cantidadValida(l.fila.producto, l.cantidad) || l.cantidad > l.fila.cantidad);
  const puedeCobrar = cart.length > 0 && !!cliente && !invalido && !seleccionado;
  const modalAbierto = buscando || cobrando || !!venta || !!pendiente;

  // Filtrado rápido cuando el cajero escribe * + últimos dígitos (ej. *8143)
  const filtroAsterisco = !seleccionado && /^\*\d{1,4}$/.test(codigo.trim()) ? codigo.trim() : '';
  const coincidenciasAsterisco = useMemo(
    () => filtroAsterisco ? rows.filter((r) => coincideCodigoBarras(r.producto.codigoBarras, filtroAsterisco)) : [],
    [rows, filtroAsterisco],
  );

  useEffect(() => {
    if (modalAbierto) return;
    const input = seleccionado ? cantidadRef.current : scanRef.current;
    input?.focus(); input?.select();
  }, [modalAbierto, seleccionado]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (document.querySelector('[role="dialog"]') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'F2' || (e.key === 'Escape' && seleccionado)) { e.preventDefault(); setSeleccionado(null); setCantidadEntrada('1'); setError(''); scanRef.current?.focus(); scanRef.current?.select(); }
      if (e.key === 'F3') { e.preventDefault(); setBuscando(true); }
      if (e.key === 'F8') { e.preventDefault(); if (puedeCobrar) { (document.activeElement as HTMLElement)?.blur(); confirmando.current = false; setCobrando(true); } }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [puedeCobrar, seleccionado]);

  if (!sedeId) return <EmptyState title="Sin sedes asignadas">Pide al administrador que te asigne una sede para vender.</EmptyState>;

  function add(r: FilaStock, cantidad: number): string | null {
    const actual = byCode.get(r.productoCodigo);
    if (!actual || !cantidadValida(actual.producto, cantidad)) return 'Ingresa una cantidad válida.';
    const nueva = redondearCantidad((enCarrito[r.productoCodigo] ?? 0) + cantidad);
    if (nueva > actual.cantidad) return `Stock insuficiente de ${actual.producto.nombre}. Puedes agregar ${redondearCantidad(actual.cantidad - (enCarrito[r.productoCodigo] ?? 0))} ${actual.producto.unidadMedida} más.`;
    setCart((c) => c.some((i) => i.codigo === r.productoCodigo)
      ? c.map((i) => i.codigo === r.productoCodigo ? { ...i, cantidad: redondearCantidad(i.cantidad + cantidad) } : i)
      : [...c, { codigo: r.productoCodigo, cantidad }]);
    setCodigo(''); setSeleccionado(null); setCantidadEntrada('1'); setError(''); setMensaje(`${actual.producto.nombre} agregado · ${cantidad} ${actual.producto.unidadMedida}`);
    scanRef.current?.focus();
    return null;
  }

  function seleccionar(r: FilaStock) {
    const disponible = redondearCantidad(r.cantidad - (enCarrito[r.productoCodigo] ?? 0));
    if (disponible <= 0) {
      setSeleccionado(null); setError('No queda stock disponible para agregar este producto.');
      scanRef.current?.focus(); scanRef.current?.select(); return;
    }
    // Autocompleta el código de barras completo de 8 dígitos si el producto lo tiene
    setCodigo(r.producto.codigoBarras || r.productoCodigo);
    setSeleccionado(r);
    setCantidadEntrada(r.producto.unidadMedida === 'kg' ? '' : '1');
    setError(''); setMensaje(''); setBuscando(false);
    cantidadRef.current?.focus(); cantidadRef.current?.select();
  }

  function reset() {
    setCart([]); setSeleccionado(null); setCantidadEntrada('1'); setCliente(null); setRevisionCliente((n) => n + 1); setCodigo(''); setError(''); setMensaje('');
  }
  function cambiarSede(id: string) {
    if (cart.length || cliente) setPendiente({ sede: id });
    else { reset(); setElegida(id); }
  }
  function confirmar(metodo: MetodoPago, recibido?: number): string | null {
    if (confirmando.current) return 'El cobro ya se está procesando.';
    if (!cliente || invalido || seleccionado) return 'Revisa el cliente y los productos antes de cobrar.';
    confirmando.current = true;
    const r = registrarVenta(sedeId!, cart, metodo, user.name, recibido, cliente.cedula);
    if (!r.ok) { confirmando.current = false; return r.error; }
    setCobrando(false); reset(); setVenta(r.venta);
    toast(`Venta ${r.venta.id} registrada`);
    return null;
  }

  return <section className="mx-auto w-full max-w-[1440px]">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h1 className="m-0 text-2xl font-bold text-strong">Punto de venta</h1><p className="m-0 text-sm text-muted">Escanea los productos, identifica al cliente y cobra.</p></div>
      {user.role === 'admin' ? <SedeSelect sedes={sedes} value={sedeId} onChange={cambiarSede} />
        : <div className="rounded-xl border border-line bg-white px-4 py-2"><span className="block text-xs text-muted">Sede asignada</span><strong className="text-strong">{sedes.find((s) => s.id === sedeId)?.nombre}</strong></div>}</header>
    <CustomerPanel key={revisionCliente} user={user} cliente={cliente} onChange={setCliente} />
    <div className="mb-4 rounded-xl border border-line bg-white p-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (seleccionado) {
          const cantidad = Number(cantidadEntrada.replace(',', '.'));
          const fallo = add(seleccionado, cantidad);
          if (fallo) { setError(fallo); cantidadRef.current?.focus(); cantidadRef.current?.select(); }
          return;
        }
        const raw = codigo.trim();
        if (raw.startsWith('*')) {
          if (!/^\*[0-9]{4}$/.test(raw)) {
            setError('Usa * seguido de los últimos 4 dígitos del código de barras (ej. *8143).');
            setMensaje('');
            return;
          }
          const matches = rows.filter((r) => coincideCodigoBarras(r.producto.codigoBarras, raw));
          if (matches.length === 0) {
            setError('No hay productos habilitados en esta sede cuyo código de barras termine en esos 4 dígitos.');
            setMensaje(''); scanRef.current?.select(); return;
          }
          if (matches.length > 1) {
            setError('Hay varios productos con esos últimos 4 dígitos. Selecciona uno de la lista inferior.');
            setMensaje(''); return;
          }
          seleccionar(matches[0]);
          return;
        }
        const key = raw.toUpperCase();
        const r = rows.find((r) => r.productoCodigo.toUpperCase() === key || r.producto.codigoBarras === key);
        if (!r) { setError('Código no encontrado o producto no habilitado en esta sede. Usa Buscar producto.'); setMensaje(''); scanRef.current?.select(); return; }
        seleccionar(r);
      }}>
        <div className="min-w-[200px] flex-1"><Field label="Escanear o ingresar código · F2">{(id) => <Input ref={scanRef} id={id} value={codigo} autoComplete="off" placeholder="Código de barras, *últimos 4 o código interno" aria-invalid={!!error} onChange={(e) => { setCodigo(e.target.value); setSeleccionado(null); setCantidadEntrada('1'); setError(''); }} />}</Field></div>
        <div className="w-32"><Field label={seleccionado?.producto.unidadMedida === 'kg' ? 'Peso (kg)' : 'Cantidad'}>{(id) => <Input ref={cantidadRef} id={id} disabled={!seleccionado} value={cantidadEntrada} inputMode={seleccionado?.producto.unidadMedida === 'kg' ? 'decimal' : 'numeric'} autoComplete="off" placeholder={seleccionado?.producto.unidadMedida === 'kg' ? '0,750' : '1'} aria-describedby="entrada-producto" aria-invalid={!!error && !!seleccionado} onChange={(e) => { setCantidadEntrada(e.target.value); setError(''); }} />}</Field></div>
        <Button type="submit" variant="primary" disabled={!codigo.trim()}><ScanBarcode aria-hidden="true" />{seleccionado ? 'Agregar · Enter' : 'Continuar · Enter'}</Button>
        <Button onClick={() => setBuscando(true)}><Search aria-hidden="true" />Buscar producto · F3</Button>
      </form>

      {filtroAsterisco && coincidenciasAsterisco.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-soft px-4 py-3 text-xs">
          {coincidenciasAsterisco.map((r) => {
            const disp = redondearCantidad(r.cantidad - (enCarrito[r.productoCodigo] ?? 0));
            return (
              <button
                key={r.productoCodigo}
                type="button"
                disabled={disp <= 0}
                onClick={() => seleccionar(r)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-edge bg-white px-4 py-2 text-[14px] font-semibold text-strong shadow-2xs transition-colors hover:bg-brand-soft disabled:opacity-50"
              >
                <span className="text-brand-dark tabular-nums">{r.producto.codigoBarras}</span>
                <span>· {r.producto.nombre}</span>
                <span className="text-muted">({money(r.producto.precioGlobal)} · Disp: {num(disp)})</span>
              </button>
            );
          })}
        </div>
      )}

      <div id="entrada-producto" className="mt-2 text-sm" role="status">{seleccionado && <span className="mb-1 block font-semibold text-strong">{seleccionado.producto.nombre} ({seleccionado.producto.codigoBarras ?? seleccionado.productoCodigo}) · Disponible para agregar: {redondearCantidad(seleccionado.cantidad - (enCarrito[seleccionado.productoCodigo] ?? 0))} {seleccionado.producto.unidadMedida}</span>}{error ? <ErrorBox message={error} /> : <span className="text-muted">{seleccionado ? (seleccionado.producto.unidadMedida === 'kg' ? 'Ingresa el peso de la balanza (hasta 3 decimales) y pulsa Enter. Esc vuelve al código.' : 'Escribe la cantidad y pulsa Enter para agregar. Esc vuelve al código.') : mensaje || 'Código o *últimos 4 dígitos + Enter → cantidad + Enter.'}</span>}</div>
    </div>
    <CartPanel lineas={lineas} cliente={cliente} invalido={invalido || !!seleccionado} onChange={(codigo, cantidad) => {
      const fila = byCode.get(codigo);
      if (!fila || !cantidadValida(fila.producto, cantidad) || cantidad > fila.cantidad) { toast('Cantidad inválida o superior al stock disponible.', 'error'); return; }
      setCart((c) => c.map((i) => i.codigo === codigo ? { ...i, cantidad } : i));
    }} onRemove={(codigo) => setCart((c) => c.filter((i) => i.codigo !== codigo))} onClear={() => setPendiente({})} onPay={() => { if (puedeCobrar) { confirmando.current = false; setCobrando(true); } }} />
    {invalido && <div className="mt-3"><ErrorBox message="La disponibilidad cambió. Revisa las cantidades o cancela la venta y vuelve a ingresar los productos." /></div>}
    {buscando && <Modal wide title="Buscar producto" onClose={() => setBuscando(false)}><ProductCatalog rows={rows} enCarrito={enCarrito} onAdd={seleccionar} /></Modal>}
    {cobrando && <PaymentModal total={total} cliente={cliente!} onClose={() => setCobrando(false)} onConfirm={confirmar} />}
    {venta && <ReceiptModal venta={venta} onClose={() => { setVenta(null); confirmando.current = false; }} />}
    {pendiente && <ConfirmModal title={pendiente.sede ? 'Cambiar de sede' : 'Cancelar venta'} message="Se descartarán los productos y el cliente de esta venta. El registro del cliente se conserva." confirmText="Descartar venta" danger onCancel={() => setPendiente(null)} onConfirm={() => { reset(); if (pendiente.sede) setElegida(pendiente.sede); setPendiente(null); }} />}
  </section>;
}