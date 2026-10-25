'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ScanBarcode, Search } from 'lucide-react';
import type { Cliente, FilaStock, MetodoPago, User, Venta } from '@/lib/types';
import { getStock, registrarVenta, sedesDeUsuario, useStore } from '@/lib/store';
import { cantidadValida, importeLinea, redondearCantidad } from '@/lib/pos';
import { money, norm, num } from '@/lib/format';
import { EmptyState } from '@/components/ui/layout';
import { ErrorBox, Field, Input, SedeSelect } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { ProductIcon } from '@/components/ui/icons';
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
  const [abiertoDropdown, setAbiertoDropdown] = useState(false);
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
    if (modalAbierto) return;
    const input = seleccionado ? cantidadRef.current : scanRef.current;
    input?.focus();
    input?.select();
  }, [modalAbierto, seleccionado]);

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
  }, [puedeCobrar, seleccionado, abiertoDropdown]);

  if (!sedeId) {
    return <EmptyState title="Sin sedes asignadas">Pide al administrador que te asigne una sede para vender.</EmptyState>;
  }

  function add(r: FilaStock, cantidad: number): string | null {
    const actual = byCode.get(r.productoCodigo);
    if (!actual || !cantidadValida(actual.producto, cantidad)) return 'Ingresa una cantidad válida.';
    const nueva = redondearCantidad((enCarrito[r.productoCodigo] ?? 0) + cantidad);
    if (nueva > actual.cantidad) {
      return `Stock insuficiente de ${actual.producto.nombre}. Puedes agregar ${redondearCantidad(
        actual.cantidad - (enCarrito[r.productoCodigo] ?? 0),
      )} ${actual.producto.unidadMedida} más.`;
    }
    setCart((c) =>
      c.some((i) => i.codigo === r.productoCodigo)
        ? c.map((i) => (i.codigo === r.productoCodigo ? { ...i, cantidad: redondearCantidad(i.cantidad + cantidad) } : i))
        : [...c, { codigo: r.productoCodigo, cantidad }],
    );
    setCodigo('');
    setAbiertoDropdown(false);
    setSeleccionado(null);
    setCantidadEntrada('1');
    setError('');
    setMensaje(`${actual.producto.nombre} agregado · ${cantidad} ${actual.producto.unidadMedida}`);
    scanRef.current?.focus();
    return null;
  }

  function agregarDirecto(r: FilaStock) {
    const cantParsed = Number(cantidadEntrada.replace(',', '.'));
    const cantidad = Number.isFinite(cantParsed) && cantParsed > 0 ? cantParsed : 1;
    const fallo = add(r, cantidad);
    if (fallo) {
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
          <p className="m-0 text-sm text-muted">Escanea los productos, identifica al cliente y cobra.</p>
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

      <CustomerPanel key={revisionCliente} user={user} cliente={cliente} onChange={setCliente} />

      <div className="mb-4 rounded-xl border border-line bg-white p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (seleccionado) {
              const cantidad = Number(cantidadEntrada.replace(',', '.'));
              const fallo = add(seleccionado, cantidad);
              if (fallo) {
                setError(fallo);
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
              agregarDirecto(exacto);
              return;
            }
            if (sugerencias.length === 1) {
              agregarDirecto(sugerencias[0]);
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
                    if (codigo.trim()) setAbiertoDropdown(true);
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
                            onClick={() => agregarDirecto(r)}
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
                                <strong className="block text-sm text-strong tabular-nums">{money(r.producto.precioGlobal)}</strong>
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
            Agregar · Enter
          </Button>
          <Button onClick={() => setBuscando(true)}>
            <Search aria-hidden="true" />
            Catálogo · F3
          </Button>
        </form>

        <div id="entrada-producto" className="mt-2 text-sm" role="status">
          {error ? (
            <ErrorBox message={error} />
          ) : (
            <span className="text-muted">
              {mensaje || 'Escribe el nombre o los últimos 2 o 4 dígitos del código de barras y haz clic en el producto para agregarlo.'}
            </span>
          )}
        </div>
      </div>

      <CartPanel
        lineas={lineas}
        cliente={cliente}
        invalido={invalido || !!seleccionado}
        onChange={(cod, cantidad) => {
          const fila = byCode.get(cod);
          if (!fila || !cantidadValida(fila.producto, cantidad) || cantidad > fila.cantidad) {
            toast('Cantidad inválida o superior al stock disponible.', 'error');
            return;
          }
          setCart((c) => c.map((i) => (i.codigo === cod ? { ...i, cantidad } : i)));
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
              agregarDirecto(r);
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