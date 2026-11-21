'use client';
import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, PackageX, Receipt, ShoppingBag, Trophy, TriangleAlert } from 'lucide-react';
import { getMovimientos, getProducto, getSede, getStock, claveDia, setExchangeRate, tasaDeVenta, tasaDelDia, useStore } from '@/lib/store';
import { bs, cx, fechaCorta, fechaHora, money, num } from '@/lib/format';
import { Dual } from '@/components/ui/money';
import { Tag, StockBadge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/form';
import { Box, EmptyState, PageHeading, StatCard, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { metodoLabel } from '@/components/pos/payment-method-selector';
import { CajeroAvatar, TrofeoIcon } from '@/components/ui/icons';
import type { User, Venta } from '@/lib/types';
import { BarChart, LineChart, type Dato } from './charts';

interface FilaCajero { nombre: string; ventas: number; total: number; totalBs: number; sedeId: string; ultima: string }

/** Agrupa las ventas por cajero (nombre guardado en cada Venta) y ordena de mayor a menor dinero recaudado. */
function rankingCajeros(ventas: Venta[], bsDe: (v: Venta) => number): FilaCajero[] {
  const m = new Map<string, FilaCajero>();
  ventas.forEach((v) => {
    const c = m.get(v.cajero) ?? { nombre: v.cajero, ventas: 0, total: 0, totalBs: 0, sedeId: v.sedeId, ultima: '' };
    c.ventas += 1; c.total += v.total; c.totalBs += bsDe(v);
    if (v.fecha > c.ultima) { c.ultima = v.fecha; c.sedeId = v.sedeId; }
    m.set(v.cajero, c);
  });
  return [...m.values()].sort((a, b) => b.total - a.total);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
/** yyyy-mm-dd en hora local, formato de <input type="date">. */
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const desdeIso = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };

/**
 * Tasa de un día. La de HOY se edita (al instante en todo el sistema); la de días anteriores es de solo lectura
 * para que los reportes históricos no cambien.
 */
function TasaDelDia({ user, clave }: { user: User; clave: string }) {
  const state = useStore();
  const editable = clave === claveDia();
  const vigente = tasaDelDia(state, clave);
  const [texto, setTexto] = useState(String(vigente));
  const [error, setError] = useState('');
  const etiqueta = editable ? 'hoy' : desdeIso(clave).toLocaleDateString('es', { day: '2-digit', month: 'short' });
  return (
    <div className="flex min-w-[190px] flex-col gap-1">
      <label htmlFor="dash-tasa" className="text-xs font-bold tracking-wide text-muted uppercase">Tasa {etiqueta} (Bs. / $)</label>
      <Input id="dash-tasa" type="number" min={0.01} step={0.01} inputMode="decimal" value={editable ? texto : vigente} readOnly={!editable} aria-invalid={!!error}
        onChange={(e) => {
          if (!editable) return;
          setTexto(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value === '' || !(n > 0)) { setError('Ingresa una tasa mayor a 0.'); return; }
          const r = setExchangeRate(user, n);
          setError(r.ok ? '' : r.error);
        }} />
      {error ? <span role="alert" className="text-xs font-semibold text-danger">{error}</span>
        : !editable && <span className="text-xs text-muted">Día cerrado: la tasa no se puede cambiar.</span>}
    </div>
  );
}

/** Módulo 6 · Panel y reportes: ventas, faltantes y movimientos conectados al store compartido. */
export function Dashboard({ user }: { user: User }) {
  const state = useStore();
  const [sedeId, setSedeId] = useState('');
  const [modo, setModo] = useState<'semana' | 'dia'>('semana');
  const [fecha, setFecha] = useState(() => isoLocal(new Date()));
  const bsDe = (v: Venta) => v.total * tasaDeVenta(state, v);
  const sumaBs = (l: Venta[]) => l.reduce((t, v) => t + bsDe(v), 0);
  /** Bs. de un total que mezcla ventas de distintos días: se suma venta por venta, con la tasa de cada una. */
  const bsTotal = (bsSuma: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bsSuma)}`;
  const enAlcance = (id: string) => !sedeId || id === sedeId;

  const ventas = useMemo(() => state.ventas.filter((v) => !sedeId || v.sedeId === sedeId), [state.ventas, sedeId]);
  const faltantes = useMemo(() => state.sedes.filter((s) => enAlcance(s.id)).flatMap((s) =>
    getStock(state, s.id).filter((r) => r.estado !== 'ok').map((r) => ({ ...r, sede: s.nombre }))
  ).sort((a, b) => (a.estado === b.estado ? b.faltan - a.faltan : a.estado === 'agotado' ? -1 : 1)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [state, sedeId]);
  const movs = useMemo(() => getMovimientos(state, { sedeId: sedeId || undefined, limit: 8 }), [state, sedeId]);
  const nMovs = useMemo(() => state.movimientos.filter((m) => enAlcance(m.sedeId)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.movimientos, sedeId]);

  // Ventas del día elegido (modo «Por Día»): alimentan las métricas, las gráficas por hora y el detalle.
  const ventasDia = useMemo(() => {
    const k = dayKey(desdeIso(fecha || isoLocal(new Date())));
    return ventas.filter((v) => dayKey(new Date(v.fecha)) === k);
  }, [ventas, fecha]);
  const { porHora, unidadesHora } = useMemo(() => {
    const horas = ventasDia.map((v) => new Date(v.fecha).getHours());
    const desde = Math.min(8, ...horas), hasta = Math.max(20, ...horas);
    const rango = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
    const ing = new Map(rango.map((h) => [h, 0])), uni = new Map(rango.map((h) => [h, 0]));
    ventasDia.forEach((v) => {
      const h = new Date(v.fecha).getHours();
      ing.set(h, ing.get(h)! + v.total);
      uni.set(h, uni.get(h)! + v.items.reduce((t, i) => t + i.cantidad, 0));
    });
    const mk = (m: Map<number, number>): Dato[] => rango.map((h) => ({ label: `${h}h`, value: Math.round(m.get(h)! * 100) / 100 }));
    return { porHora: mk(ing), unidadesHora: mk(uni) };
  }, [ventasDia]);

  const { porDia, unidadesDia } = useMemo(() => {
    const dias: Date[] = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); dias.push(d); }
    const ingresos = new Map(dias.map((d) => [dayKey(d), 0]));
    const unidades = new Map(dias.map((d) => [dayKey(d), 0]));
    ventas.forEach((v) => {
      const k = dayKey(new Date(v.fecha));
      if (!ingresos.has(k)) return;
      ingresos.set(k, ingresos.get(k)! + v.total);
      unidades.set(k, unidades.get(k)! + v.items.reduce((t, i) => t + i.cantidad, 0));
    });
    const mk = (m: Map<string, number>): Dato[] => dias.map((d) => ({ label: fechaCorta(d.toISOString()).replace('.', ''), value: Math.round((m.get(dayKey(d)) ?? 0) * 100) / 100 }));
    return { porDia: mk(ingresos), unidadesDia: mk(unidades) };
  }, [ventas]);

  const porSede: Dato[] = useMemo(() => state.sedes.map((s) => ({
    label: s.nombre.replace('Sede ', ''),
    value: Math.round(state.ventas.filter((v) => v.sedeId === s.id).reduce((t, v) => t + v.total, 0) * 100) / 100,
  })), [state.ventas, state.sedes]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cajeros = useMemo(() => rankingCajeros(ventas, bsDe), [ventas, state.tasas]);
  const semana = useMemo(() => {
    const desde = Date.now() - 7 * 86400e3;
    const lista = rankingCajeros(ventas.filter((v) => new Date(v.fecha).getTime() >= desde), bsDe);
    return { lista, total: lista.reduce((t, c) => t + c.total, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas, state.tasas]);
  const ganador = semana.lista[0];

  const dia = modo === 'dia';
  const ventasVista = dia ? ventasDia : ventas;
  const ingresos = ventasVista.reduce((t, v) => t + v.total, 0);
  const ingresosBs = sumaBs(ventasVista);
  const desdeSemana = new Date(); desdeSemana.setHours(0, 0, 0, 0); desdeSemana.setDate(desdeSemana.getDate() - 6);
  const ventasSemana = ventas.filter((v) => new Date(v.fecha) >= desdeSemana);
  const agotados = faltantes.filter((f) => f.estado === 'agotado').length;
  const ultimas = [...ventasVista].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading
        eyebrow="Administración" title="Panel y reportes"
        description="Resumen de ventas, faltantes y movimientos de inventario de toda la cadena."
        actions={<div className="flex flex-wrap items-start gap-3">
          <TasaDelDia key={dia ? fecha : 'hoy'} user={user} clave={dia ? fecha : claveDia()} />
          <div className="flex min-w-[210px] flex-col gap-1">
            <label htmlFor="dash-sede" className="text-xs font-bold tracking-wide text-muted uppercase">Sede</label>
            <Select id="dash-sede" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              <option value="">Todas las sedes</option>
              {state.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </div>
        </div>}
      />
      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard icon={CircleDollarSign} label={dia ? 'Ingresos del día' : 'Ingresos totales'} value={money(ingresos)} tone="brand" note={`${bsTotal(ingresosBs)} · ${num(ventasVista.length)} ventas ${dia ? 'ese día' : 'registradas'}`} />
        <StatCard icon={Receipt} label="Ticket promedio" value={money(ventasVista.length ? ingresos / ventasVista.length : 0)} note={bsTotal(ventasVista.length ? ingresosBs / ventasVista.length : 0)} />
        <StatCard icon={PackageX} label="Faltantes" value={num(faltantes.length)} tone={faltantes.length ? 'warn' : 'default'} note={`${num(agotados)} agotados · ${num(faltantes.length - agotados)} con stock bajo`} />
        <StatCard icon={ArrowUpFromLine} label="Movimientos" value={num(nMovs)} note="entradas y salidas de inventario" />
      </div>

      <div role="group" aria-label="Periodo de las gráficas de ventas" className="mb-3 flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-xl border border-line bg-soft p-[3px]">
          {([['dia', 'Por Día'], ['semana', 'Semanal (Últimos 7 días)']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={modo === id} onClick={() => setModo(id)}
              className={cx('min-h-10 rounded-[9px] px-4 py-1.5 font-semibold', modo === id ? 'bg-white text-brand-dark shadow-sm' : 'text-muted')}>{label}</button>
          ))}
        </div>
        {dia && (
          <div className="flex flex-col gap-1">
            <label htmlFor="dash-fecha" className="text-xs font-bold tracking-wide text-muted uppercase">Fecha</label>
            <Input id="dash-fecha" type="date" value={fecha} max={isoLocal(new Date())} onChange={(e) => setFecha(e.target.value || isoLocal(new Date()))} className="w-auto" />
          </div>
        )}
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        {dia ? <>
          <Box title={`Ingresos por hora · ${desdeIso(fecha).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}`} icon={CircleDollarSign}>
            <BarChart gap={4} data={porHora} format={(n) => `$${Math.round(n)}`} ariaLabel={`Ingresos por hora. Total del día: ${money(ingresos)} (${bsTotal(ingresosBs)})`} />
            <p className="mt-2 mb-0 text-sm text-muted">Total del día: <strong className="text-strong">{money(ingresos)}</strong> · {bsTotal(ingresosBs)}{ventasDia.length === 0 && ' · Sin ventas en esta fecha.'}</p>
          </Box>
          <Box title="Unidades vendidas por hora" icon={ShoppingBag}>
            <LineChart data={unidadesHora} format={num} ariaLabel={`Unidades vendidas por hora. Total: ${num(unidadesHora.reduce((t, d) => t + d.value, 0))} unidades`} />
          </Box>
        </> : <>
          <Box title="Ingresos de los últimos 7 días" icon={CircleDollarSign}>
            <BarChart data={porDia} format={(n) => `$${Math.round(n)}`} ariaLabel={`Ingresos por día. Total de la semana: ${money(porDia.reduce((t, d) => t + d.value, 0))}`} />
            <p className="mt-2 mb-0 text-sm text-muted">Total de la semana: <strong className="text-strong">{money(porDia.reduce((t, d) => t + d.value, 0))}</strong> · {bsTotal(sumaBs(ventasSemana))}</p>
          </Box>
          <Box title="Unidades vendidas por día" icon={ShoppingBag}>
            <LineChart data={unidadesDia} format={num} ariaLabel={`Tendencia de unidades vendidas. Total: ${num(unidadesDia.reduce((t, d) => t + d.value, 0))} unidades`} />
          </Box>
        </>}
        <Box title="Ingresos por sede" icon={CircleDollarSign} className="lg:col-span-2">
          <BarChart horizontal data={porSede} format={money} ariaLabel="Ingresos acumulados por sede" />
          <p className="mt-2 mb-0 text-sm text-muted">Equivalente en bolívares: {state.sedes.map((s, i) => `${porSede[i].label} ${bsTotal(sumaBs(state.ventas.filter((v) => v.sedeId === s.id)))}`).join(' · ')}</p>
        </Box>
      </div>

      <Box title="Rendimiento de Cajeros (Por Ingresos Generados)" icon={Trophy} className="mb-[18px]">
        {cajeros.length === 0 ? (
          <EmptyState title="Aún no hay ventas" icon={Trophy}>Cuando los cajeros registren ventas aparecerá el ranking.</EmptyState>
        ) : (
          <>
            {ganador ? (
              <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-brand bg-brand-soft px-4 py-3.5">
                <TrofeoIcon className="size-10 shrink-0 text-brand" />
                <CajeroAvatar className="size-12 bg-white" />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold tracking-[1.6px] text-brand-dark uppercase">🏆 Empleado de la Semana · últimos 7 días</span>
                  <p className="m-0 truncate text-[22px] font-bold tracking-tight text-strong">{ganador.nombre}</p>
                  <span className="text-[13px] text-muted">{getSede(state, ganador.sedeId)?.nombre ?? 'Sede'} · {num(ganador.ventas)} {ganador.ventas === 1 ? 'ticket' : 'tickets'}</span>
                </div>
                <div className="text-right">
                  <strong className="block text-[26px] leading-tight tracking-tight text-strong tabular-nums">{money(ganador.total)}</strong>
                  <strong className="block text-sm text-brand-dark tabular-nums">{bsTotal(ganador.totalBs)}</strong>
                  <span className="text-xs text-muted">{(semana.total ? (ganador.total / semana.total) * 100 : 0).toFixed(1)}% del total vendido por todos los cajeros</span>
                </div>
              </div>
            ) : (
              <p className="mb-4 rounded-xl border border-line bg-soft px-4 py-3 text-muted">Sin ventas en los últimos 7 días: todavía no hay Empleado de la Semana.</p>
            )}
            <TableWrap caption="Ranking de cajeros por ingresos generados" minWidth={560} className="border-0">
              <thead><tr><th scope="col" className={thCls}>#</th><th scope="col" className={thCls}>Cajero</th><th scope="col" className={thCls}>Sede</th><th scope="col" className={cx(thCls, numCls)}>Ventas</th><th scope="col" className={cx(thCls, numCls)}>Total recaudado</th><th scope="col" className={thCls}>% del total</th></tr></thead>
              <tbody>
                {cajeros.map((c, i) => {
                  const pct = ingresos ? (c.total / ingresos) * 100 : 0;
                  return (
                    <tr key={c.nombre} className="group">
                      <td className={cx(tdCls, 'text-[13px] font-bold', i === 0 && 'text-brand')}>{i + 1}</td>
                      <th scope="row" className={cx(tdCls, 'text-left text-[13px] font-normal')}><span className="flex items-center gap-2"><CajeroAvatar className="size-8" /><strong className="text-strong">{c.nombre}</strong></span></th>
                      <td className={cx(tdCls, 'text-[13px]')}>{getSede(state, c.sedeId)?.nombre}</td>
                      <td className={cx(tdCls, numCls, 'text-[13px]')}>{num(c.ventas)}</td>
                      <td className={cx(tdCls, numCls, 'text-[13px] font-bold text-strong')}><Dual usd={c.total} tasa={c.total ? c.totalBs / c.total : undefined} /></td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <div role="progressbar" aria-label={`${c.nombre}: ${pct.toFixed(1)}% de los ingresos`} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-soft">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs text-muted tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </>
        )}
      </Box>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <Box title="Últimas ventas" icon={Receipt}>
          <TableWrap caption="Últimas ventas registradas" minWidth={340} className="border-0">
            <thead><tr><th scope="col" className={thCls}>Venta</th><th scope="col" className={thCls}>Sede</th><th scope="col" className={cx(thCls, numCls)}>Total</th></tr></thead>
            <tbody>
              {ultimas.length === 0 && <tr><td colSpan={3}><EmptyState title="Aún no hay ventas" icon={Receipt}>Las ventas confirmadas en caja aparecerán aquí.</EmptyState></td></tr>}
              {ultimas.map((v) => (
                <tr key={v.id} className="group">
                  <th scope="row" className={cx(tdCls, 'text-left text-[13px] font-normal')}><strong className="text-strong">{v.id}</strong><Sub>{fechaHora(v.fecha)} · {metodoLabel(v.metodo)}</Sub></th>
                  <td className={cx(tdCls, 'text-[13px] whitespace-nowrap')}>{getSede(state, v.sedeId)?.nombre}</td>
                  <td className={cx(tdCls, numCls, 'text-[13px] font-bold text-strong')}><Dual usd={v.total} tasa={tasaDeVenta(state, v)} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Box>
        <Box title="Productos por reponer" icon={TriangleAlert}>
          <TableWrap caption="Faltantes de inventario" minWidth={420} className="border-0">
            <thead><tr><th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Sede</th><th scope="col" className={cx(thCls, numCls)}>Faltan</th><th scope="col" className={thCls}>Estado</th></tr></thead>
            <tbody>
              {faltantes.length === 0 && <tr><td colSpan={4}><EmptyState title="Todo en orden">No hay productos agotados ni con stock bajo.</EmptyState></td></tr>}
              {faltantes.slice(0, 8).map((f) => (
                <tr key={`${f.sedeId}-${f.productoCodigo}`} className="group">
                  <th scope="row" className={cx(tdCls, 'text-left text-[13px] font-normal')}><strong className="text-strong">{f.producto.nombre}</strong><Sub>{num(f.cantidad)} de {num(f.stockMinimo)} {f.producto.unidadMedida}</Sub></th>
                  <td className={cx(tdCls, 'text-[13px]')}>{f.sede}</td>
                  <td className={cx(tdCls, numCls, 'text-[13px] font-bold')}>{num(f.faltan)}</td>
                  <td className={tdCls}><StockBadge estado={f.estado} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {faltantes.length > 8 && <p className="mt-2 mb-0 text-xs text-muted">Mostrando 8 de {faltantes.length}. Revisa el detalle en Inventario.</p>}
        </Box>
      </div>

      <Box title="Movimientos recientes" icon={ArrowDownToLine}>
        <TableWrap caption="Movimientos recientes de inventario" minWidth={560} className="border-0">
          <thead><tr><th scope="col" className={thCls}>Fecha</th><th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Sede</th><th scope="col" className={thCls}>Tipo</th><th scope="col" className={cx(thCls, numCls)}>Cantidad</th><th scope="col" className={thCls}>Motivo</th></tr></thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={6}><EmptyState title="Sin movimientos">Aún no hay movimientos de inventario.</EmptyState></td></tr>}
            {movs.map((m) => (
              <tr key={m.id} className="group">
                <td className={cx(tdCls, 'text-[13px]')}>{fechaHora(m.fecha)}</td>
                <td className={cx(tdCls, 'text-[13px]')}>{getProducto(state, m.productoCodigo)?.nombre}<Sub>{m.productoCodigo}</Sub></td>
                <td className={cx(tdCls, 'text-[13px]')}>{getSede(state, m.sedeId)?.nombre}</td>
                <td className={tdCls}><Tag tone={m.tipo === 'ENTRADA' ? 'in' : 'out'}>{m.tipo}</Tag></td>
                <td className={cx(tdCls, numCls, 'text-[13px]')}>{m.tipo === 'ENTRADA' ? '+' : '−'}{num(m.cantidad)}</td>
                <td className={cx(tdCls, 'text-[13px]')}>{m.motivo}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Box>
    </section>
  );
}
