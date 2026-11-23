'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ScanBarcode, Search, TriangleAlert, UserRoundSearch, X } from 'lucide-react';
import type { Cliente, FilaStock, MetodoPago, User, Venta } from '@/lib/types';
import { getStock, registrarVenta, sedesDeUsuario, useStore } from '@/lib/store';
import { cantidadValida, importeLinea, redondearCantidad } from '@/lib/pos';
import { norm, num } from '@/lib/format';
import { EmptyState } from '@/components/ui/layout';
import { ErrorBox, Field, Input, SedeSelect } from '@/components/ui/form';
import { Button, IconButton } from '@/components/ui/button';
import { Kbd } from '@/components/ui/badge';
import { Dual } from '@/components/ui/money';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { ProductIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { CartPanel } from './cart-panel';
import { CustomerPanel } from './customer-panel';
import { PaymentModal } from './payment-modal';
import { ProductCatalog } from './product-catalog';
import { ReceiptModal } from './receipt-modal';

interface Item { codigo: string; cantidad: number }
interface AlertaStock { codigo: string; nombre: string; unidad: string; stock: number; enVenta: number; restante: number }
/** Marca que add() ya mostró la alerta grande de stock: los llamadores no repiten el aviso. */
const ALERTADO = '__stock_alertado__';

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
  const [abiertoDropdown, setAbiertoDropdown] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [alertaStock, setAlertaStock] = useState<AlertaStock | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<FilaStock | null>(null);
  const [cantidadEntrada, setCantidadEntrada] = useState('1');
  const cantidadRef = useRef<HTMLInputElement>(null);
  const [cobrando, setCobrando] = useState(false);
  const [venta, setVenta] = useState<Venta | null>(null);
  const [pendiente, setPendiente] = useState<{ sede?: string } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const dropdownWrapRef = useRef<HTMLDivElement>(null);
  const confirmando = useRef(false);

  const rows = useMemo(() => (sedeId ? getStock(state, sedeId) : []), [state, sedeId]);
  const byCode = useMemo(() => new Map(rows.map((r) => [r.productoCodigo, r])), [rows]);
  const lineas = cart.flatMap((i) => {
    const fila = byCode.get(i.codigo);
    return fila ? [{ fila, cantidad: i.cantidad }] : [];
  });
  const enCarrito = Object.fromEntries(cart.map((i) => [i.codigo, i.cantidad]));
  const total = Math.round(lineas.reduce((t, l) => t + importeLinea(l.fila.producto.precioGlobal, l.cantidad), 0) * 100) / 100;
  const invalido =
    lineas.length !== cart.length ||
    lineas.some((l) => !cantidadValida(l.fila.producto, l.cantidad) || l.cantidad > l.fila.cantidad);
  const puedeCobrar = cart.length > 0 && !!cliente && !invalido && !seleccionado;
  const modalAbierto = buscando || cobrando || !!venta || !!pendiente;

  // Filtrado en vivo:
  // - Si el usuario introduce números (ej. últimos 2 o últimos 4 dígitos, con o sin '*'),
  //   filtra EXCLUSIVAMENTE los productos cuyo código de barras termine en esos dígitos (endsWith).
  // - Si escribe letras/texto, busca por nombre o código interno (ej. L-001, leche).
  const sugerencias = useMemo(() => {
    const raw = codigo.trim();
    if (!raw || seleccionado) return [];

    const limpioDigitos = raw.startsWith('*') ? raw.slice(1).trim() : raw;
    const soloDigitos = /^[0-9]+$/.test(limpioDigitos);
    const termNorm = norm(raw);

    return rows
      .filter((r) => {
        const barras = r.producto.codigoBarras ?? '';
        const codInterno = r.productoCodigo;

        if (raw.startsWith('*') || soloDigitos) {
          return limpioDigitos.length > 0 && barras.endsWith(limpioDigitos);
        }

        return (
          norm(r.producto.nombre).includes(termNorm) ||
          norm(codInterno).includes(termNorm)
        );
      })
      .sort((a, b) => {
        const dispA = a.cantidad - (enCarrito[a.productoCodigo] ?? 0) > 0 ? 0 : 1;
        const dispB = b.cantidad - (enCarrito[b.productoCodigo] ?? 0) > 0 ? 0 : 1;
        if (dispA !== dispB) return dispA - dispB;
        return a.producto.nombre.localeCompare(b.producto.nombre, 'es');
      });
  }, [rows, codigo, seleccionado, enCarrito]);

  useEffect(() => {
    if (modalAbierto || !cliente) return;
    const input = seleccionado ? cantidadRef.current : scanRef.current;
    input?.focus();
    input?.select();
  }, [modalAbierto, seleccionado, cliente]);



  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownWrapRef.current && !dropdownWrapRef.current.contains(e.target as Node)) {
        setAbiertoDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (document.querySelector('[role="dialog"]') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!cliente && (e.key === 'F2' || e.key === 'F3')) return;
      if (e.key === 'F2' || (e.key === 'Escape' && (seleccionado || abiertoDropdown))) {
        e.preventDefault();
        setSeleccionado(null);
        setAbiertoDropdown(false);
        setCantidadEntrada('1');
        setError('');
        scanRef.current?.focus();
        scanRef.current?.select();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setBuscando(true);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (puedeCobrar) {
          (document.activeElement as HTMLElement)?.blur();
          confirmando.current = false;
          setCobrando(true);
        }
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [puedeCobrar, seleccionado, abiertoDropdown, cliente]);

  if (!sedeId) {
    return <EmptyState title="Sin sedes asignadas">Pide al administrador que te asigne una sede para vender.</EmptyState>;
  }

  function add(r: FilaStock, cantidad: number): string | null {
    if (!cliente) return 'Selecciona un cliente antes de agregar productos.';
    const actual = byCode.get(r.productoCodigo);
    if (!actual) return 'Ingresa una cantidad válida.';
    // Sin existencias en esta sede la venta se bloquea sola, sin depender de apagar el producto a mano.
    if (actual.cantidad <= 0) { avisarStock(actual); return ALERTADO; }
    if (!cantidadValida(actual.producto, cantidad)) return 'Ingresa una cantidad válida.';
    const nueva = redondearCantidad((enCarrito[r.productoCodigo] ?? 0) + cantidad);
    if (nueva > actual.cantidad) { avisarStock(actual); return ALERTADO; }
    // El producto agregado o escaneado sube al principio de la lista.
    setCart((c) => {
      const previo = c.find((i) => i.codigo === r.productoCodigo);
      return [{ codigo: r.productoCodigo, cantidad: redondearCantidad((previo?.cantidad ?? 0) + cantidad) }, ...c.filter((i) => i.codigo !== r.productoCodigo)];
    });
    setAlertaStock(null);
    setCodigo('');
    setAbiertoDropdown(false);
    setSeleccionado(null);
    setCantidadEntrada('1');
    setError('');
    setMensaje(`${actual.producto.nombre} agregado · ${cantidad} ${actual.producto.unidadMedida}`);
    scanRef.current?.focus();
    return null;
  }

  function avisarStock(f: FilaStock) {
    const enVenta = enCarrito[f.productoCodigo] ?? 0;
    setAlertaStock({
      codigo: f.productoCodigo, nombre: f.producto.nombre, unidad: f.producto.unidadMedida,
      stock: f.cantidad, enVenta, restante: Math.max(0, redondearCantidad(f.cantidad - enVenta)),
    });
    setError('');
  }

  function seleccionarProducto(r: FilaStock) {
    if (!cliente) { setError('Selecciona un cliente antes de agregar productos.'); return; }
    setSeleccionado(r); setCodigo(r.producto.nombre); setAbiertoDropdown(false); setError(''); setMensaje('');
  }

  function agregarDirecto(r: FilaStock, cantidadFija?: number) {
    const cantParsed = Number(cantidadEntrada.replace(',', '.'));
    const cantidad = cantidadFija ?? cantParsed;
    const fallo = add(r, cantidad);
    if (fallo && fallo !== ALERTADO) {
      setError(fallo);
      toast(fallo, 'error');
    }
  }

  function reset() {
    setAbiertoDropdown(false);
    setCart([]);
    setSeleccionado(null);
    setCantidadEntrada('1');
    setCliente(null);
    setRevisionCliente((n) => n + 1);
    setCodigo('');
    setError('');
    setMensaje('');
    setAlertaStock(null);
  }

  function cambiarSede(id: string) {
    if (cart.length || cliente) setPendiente({ sede: id });
    else {
      reset();
      setElegida(id);
    }
  }

  function confirmar(metodo: MetodoPago, recibido?: number): string | null {
    if (confirmando.current) return 'El cobro ya se está procesando.';
    if (!cliente || invalido || seleccionado) return 'Revisa el cliente y los productos antes de cobrar.';
    confirmando.current = true;
    const r = registrarVenta(sedeId!, cart, metodo, user.name, recibido, cliente.cedula);
    if (!r.ok) {
      confirmando.current = false;
      return r.error;
    }
    setCobrando(false);
    reset();
    setVenta(r.venta);
    toast(`Venta ${r.venta.id} registrada`);
    return null;
  }

  const sufijoBuscado = (() => {
    const raw = codigo.trim();
    const limpio = raw.startsWith('*') ? raw.slice(1).trim() : raw;
    return /^[0-9]+$/.test(limpio) ? limpio : '';
  })();

  return (
    <section className="mx-auto w-full max-w-[1440px]">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold text-strong">Punto de venta</h1>
          <p className="m-0 text-sm text-muted">Identifica al cliente, selecciona productos y cantidades, y cobra.</p>
        </div>
        {user.role === 'admin' ? (
          <SedeSelect sedes={sedes} value={sedeId} onChange={cambiarSede} />
        ) : (
          <div className="rounded-xl border border-line bg-white px-4 py-2">
            <span className="block text-xs text-muted">Sede asignada</span>
            <strong className="text-strong">{sedes.find((s) => s.id === sedeId)?.nombre}</strong>
          </div>
        )}
      </header>

      <CustomerPanel key={revisionCliente} user={user} cliente={cliente} onChange={(next) => {
        setCliente(next); setAlertaStock(null); setError('');
        if (!next) { setSeleccionado(null); setCodigo(''); setBuscando(false); setAbiertoDropdown(false); setCantidadEntrada('1'); }
      }} />

      {!cliente && (
        <div role="alert" className="mb-3 flex items-start gap-3 rounded-xl border-2 border-warn bg-warn-bg px-4 py-3 text-warn">
          <UserRoundSearch className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <p className="m-0 text-base font-bold">Primero identifica al cliente: consulta su cédula o RIF, regístralo o elígelo del directorio para poder agregar productos.</p>
        </div>
      )}

      {alertaStock && (() => {
        const actual = byCode.get(alertaStock.codigo);
        const stockActual = actual?.cantidad ?? 0;
        const enVentaActual = enCarrito[alertaStock.codigo] ?? 0;
        const a = { ...alertaStock, stock: stockActual, enVenta: enVentaActual, restante: Math.max(0, redondearCantidad(stockActual - enVentaActual)) };
        const agotado = a.stock <= 0;
        const u = a.unidad === 'unidad' ? 'unidades' : a.unidad;
        const fila = byCode.get(a.codigo);
        return (
          <div role="alert" className="mb-3 overflow-hidden rounded-2xl border-2 border-danger bg-white shadow-lg">
            <div className="flex items-center gap-3 bg-danger px-4 py-3 text-white">
              <TriangleAlert className="size-7 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-lg leading-tight font-extrabold">{agotado ? 'Producto agotado en esta sede' : 'Stock insuficiente'}</p>
                <p className="m-0 truncate text-sm opacity-90">{a.nombre}</p>
              </div>
              <IconButton className="size-9 text-white hover:bg-white/20" onClick={() => setAlertaStock(null)} aria-label="Cerrar alerta de stock"><X aria-hidden="true" /></IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
              <p className="m-0 min-w-[220px] flex-1 text-base font-semibold text-strong">
                {agotado
                  ? <>No quedan existencias de este producto en esta sede.</>
                  : <>Stock insuficiente: solo quedan <strong className="text-danger">{num(a.stock)} {u}</strong> disponibles en esta sede.</>}
                {!agotado && a.enVenta > 0 && a.restante === 0 && <span className="block text-sm font-normal text-muted">Ya tienes todo el stock disponible en esta venta.</span>}
              </p>
              <dl className="m-0 flex gap-2 text-center">
                {[['En la sede', a.stock, 'bg-soft text-strong'], ['En la venta', a.enVenta, 'bg-soft text-strong'], ['Puedes agregar', a.restante, a.restante > 0 ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger']].map(([t, v, c]) => (
                  <div key={t as string} className={`min-w-[88px] rounded-xl px-3 py-1.5 ${c}`}>
                    <dt className="text-[11px] font-semibold opacity-80">{t}</dt>
                    <dd className="m-0 text-xl leading-tight font-extrabold tabular-nums">{num(v as number)}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-2">
                {fila && a.restante > 0 && (
                  <Button variant="primary" disabled={!cliente} onClick={() => agregarDirecto(fila, a.restante)}>Agregar los {num(a.restante)} disponibles</Button>
                )}
                <Button onClick={() => { setAlertaStock(null); scanRef.current?.focus(); }}>Entendido</Button>
              </div>
            </div>
          </div>
        );
      })()}

      <fieldset disabled={!cliente} className={`m-0 mb-4 min-w-0 rounded-xl border border-line bg-white p-4 ${cliente ? '' : 'opacity-60'}`}>
        <legend className="sr-only">Agregar productos a la venta</legend>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (seleccionado) {
              const cantidad = Number(cantidadEntrada.replace(',', '.'));
              const fallo = add(seleccionado, cantidad);
              if (fallo) {
                if (fallo !== ALERTADO) setError(fallo);
                cantidadRef.current?.focus();
                cantidadRef.current?.select();
              }
              return;
            }
            const raw = codigo.trim();
            if (!raw) return;

            const key = raw.toUpperCase();
            const exacto = rows.find((r) => r.productoCodigo.toUpperCase() === key || r.producto.codigoBarras === key);
            if (exacto) {
              seleccionarProducto(exacto);
              return;
            }
            if (sugerencias.length === 1) {
              seleccionarProducto(sugerencias[0]);
              return;
            }
            if (sugerencias.length > 1) {
              setAbiertoDropdown(true);
              return;
            }
            setError('No se encontraron productos con ese nombre o terminación en esta sede.');
            setMensaje('');
            scanRef.current?.select();
          }}
        >
          <div ref={dropdownWrapRef} className="relative min-w-[240px] flex-1">
            <Field label="Buscar por nombre, código o terminación · F2">
              {(id) => (
                <Input
                  ref={scanRef}
                  id={id}
                  value={codigo}
                  autoComplete="off"
                  placeholder="Nombre o últimos 2 o 4 dígitos del código."
                  aria-invalid={!!error}
                  aria-expanded={abiertoDropdown && sugerencias.length > 0}
                  aria-controls="pos-dropdown-sugerencias"
                  onFocus={() => {
                    if (codigo.trim() && !seleccionado) setAbiertoDropdown(true);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCodigo(val);
                    setSeleccionado(null);
                    setError('');
                    setAbiertoDropdown(val.trim().length > 0);
                  }}
                />
              )}
            </Field>

            {abiertoDropdown && codigo.trim().length > 0 && (
              <div
                id="pos-dropdown-sugerencias"
                role="listbox"
                aria-label="Productos sugeridos"
                className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-edge bg-white p-1.5 shadow-xl"
              >
                {sugerencias.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted">
                    No hay productos activos cuyo código termine en <strong>&ldquo;{codigo.trim()}&rdquo;</strong>.
                  </div>
                ) : (
                  <ul className="m-0 list-none divide-y divide-line p-0">
                    {sugerencias.map((r) => {
                      const disponible = redondearCantidad(r.cantidad - (enCarrito[r.productoCodigo] ?? 0));
                      const agotado = disponible <= 0;
                      const barras = r.producto.codigoBarras ?? '';
                      const tieneSufijo = sufijoBuscado && barras.endsWith(sufijoBuscado);

                      return (
                        <li key={r.productoCodigo}>
                          <button
                            type="button"
                            disabled={agotado}
                            onClick={() => seleccionarProducto(r)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <ProductIcon nombre={r.producto.nombre} categoria={r.producto.categoria} className="size-9" />
                              <div className="min-w-0">
                                <strong className="block truncate text-sm text-strong">{r.producto.nombre}</strong>
                                <span className="block text-xs text-muted">
                                  {barras ? (
                                    <>
                                      Barras:{' '}
                                      {tieneSufijo ? (
                                        <span className="tabular-nums">
                                          {barras.slice(0, barras.length - sufijoBuscado.length)}
                                          <strong className="rounded bg-brand-soft px-1 font-bold text-brand-dark">
                                            {sufijoBuscado}
                                          </strong>
                                        </span>
                                      ) : (
                                        <strong className="font-semibold text-brand-dark tabular-nums">{barras}</strong>
                                      )}{' '}
                                      ·{' '}
                                    </>
                                  ) : null}
                                  {r.productoCodigo} ·{' '}
                                  {agotado ? (
                                    <span className="font-semibold text-danger">Sin stock disponible</span>
                                  ) : (
                                    `Disponible: ${num(disponible)} ${r.producto.unidadMedida}`
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2.5">
                              <div className="text-right">
                                <strong className="block text-right text-sm text-strong tabular-nums"><Dual usd={r.producto.precioGlobal} /></strong>
                                <span className="block text-[11px] text-muted">/ {r.producto.unidadMedida}</span>
                              </div>
                              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-white">
                                <Plus className="size-4" aria-hidden="true" />
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="w-32">
            <Field label={seleccionado?.producto.unidadMedida === 'kg' ? 'Peso (kg)' : 'Cantidad'}>
              {(id) => (
                <Input
                  ref={cantidadRef}
                  id={id}
                  value={cantidadEntrada}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="1"
                  aria-describedby="entrada-producto"
                  aria-invalid={!!error && !!seleccionado}
                  onChange={(e) => {
                    setCantidadEntrada(e.target.value);
                    setError('');
                  }}
                />
              )}
            </Field>
          </div>

          <Button type="submit" variant="primary" disabled={!codigo.trim()}>
            <ScanBarcode aria-hidden="true" />
            {seleccionado ? 'Agregar' : 'Seleccionar'} <Kbd onBrand>Enter</Kbd>
          </Button>
          <Button onClick={() => setBuscando(true)}>
            <Search aria-hidden="true" />
            Buscar <Kbd>F3</Kbd>
          </Button>
          <Button
            title="Escribe * y los últimos dígitos del código de barras"
            onClick={() => { setCodigo('*'); setSeleccionado(null); setError(''); setAbiertoDropdown(false); scanRef.current?.focus(); }}
          >
            Código corto <Kbd>*1234</Kbd>
          </Button>
        </form>

        {seleccionado && <div className="mt-3 rounded-xl border border-brand bg-brand-soft p-4">
          <strong className="block text-lg">{seleccionado.producto.nombre}</strong>
          <p>Indica la cantidad o el peso y pulsa Agregar. Disponible: {num(Math.max(0, redondearCantidad((byCode.get(seleccionado.productoCodigo)?.cantidad ?? 0) - (enCarrito[seleccionado.productoCodigo] ?? 0))))} {seleccionado.producto.unidadMedida}.</p>
          <Button onClick={() => { setSeleccionado(null); setCodigo(''); setCantidadEntrada('1'); setError(''); }}>Cancelar selección</Button>
        </div>}
        <div id="entrada-producto" className="mt-2 text-sm" role="status">
          {error ? (
            <ErrorBox message={error} />
          ) : (
            <span className="text-muted">
              {mensaje || 'Escribe el nombre o los últimos 2 o 4 dígitos del código de barras y selecciona el producto para indicar su cantidad.'}
            </span>
          )}
        </div>
        <p className="mt-2 mb-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span><Kbd>Enter</Kbd> Agregar</span><span><Kbd>F2</Kbd> Ir al buscador</span><span><Kbd>F3</Kbd> Buscar en catálogo</span>
          <span><Kbd>F8</Kbd> Cobrar</span><span><Kbd>*1234</Kbd> Código corto</span><span>Todo se puede hacer también con el mouse.</span>
        </p>
      </fieldset>

      <CartPanel
        lineas={lineas}
        cliente={cliente}
        invalido={invalido || !!seleccionado}
        onChange={(cod, cantidad) => {
          const fila = byCode.get(cod);
          if (!fila || !cantidadValida(fila.producto, cantidad)) {
            toast('Cantidad inválida.', 'error');
            return false;
          }
          if (cantidad > fila.cantidad) { avisarStock(fila); return false; }
          setAlertaStock(null);
          setCart((c) => c.map((i) => (i.codigo === cod ? { ...i, cantidad } : i)));
          return true;
        }}
        onRemove={(cod) => setCart((c) => c.filter((i) => i.codigo !== cod))}
        onClear={() => setPendiente({})}
        onPay={() => {
          if (puedeCobrar) {
            confirmando.current = false;
            setCobrando(true);
          }
        }}
      />

      {invalido && (
        <div className="mt-3">
          <ErrorBox message="La disponibilidad cambió. Revisa las cantidades o cancela la venta y vuelve a ingresar los productos." />
        </div>
      )}
      {buscando && (
        <Modal wide title="Buscar producto" onClose={() => setBuscando(false)}>
          <ProductCatalog
            rows={rows}
            enCarrito={enCarrito}
            onAdd={(r) => {
              seleccionarProducto(r);
              setBuscando(false);
            }}
          />
        </Modal>
      )}
      {cobrando && <PaymentModal total={total} cliente={cliente!} onClose={() => setCobrando(false)} onConfirm={confirmar} />}
      {venta && (
        <ReceiptModal
          venta={venta}
          onClose={() => {
            setVenta(null);
            confirmando.current = false;
          }}
        />
      )}
      {pendiente && (
        <ConfirmModal
          title={pendiente.sede ? 'Cambiar de sede' : 'Cancelar venta'}
          message="Se descartarán los productos y el cliente de esta venta. El registro del cliente se conserva."
          confirmText="Descartar venta"
          danger
          onCancel={() => setPendiente(null)}
          onConfirm={() => {
            reset();
            if (pendiente.sede) setElegida(pendiente.sede);
            setPendiente(null);
          }}
        />
      )}
    </section>
  );
}