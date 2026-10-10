'use client';
import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, PackageX, Receipt, ShoppingBag, TriangleAlert } from 'lucide-react';
import { getMovimientos, getProducto, getSede, getStock, useStore } from '@/lib/store';
import { cx, fechaCorta, fechaHora, money, num } from '@/lib/format';
import { Tag, StockBadge } from '@/components/ui/badge';
import { Select } from '@/components/ui/form';
import { Box, EmptyState, PageHeading, StatCard, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';
import { metodoLabel } from '@/components/pos/payment-method-selector';
import { BarChart, LineChart, type Dato } from './charts';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Módulo 6 · Panel y reportes: ventas, faltantes y movimientos conectados al store compartido. */
export function Dashboard() {
  const state = useStore();
  const [sedeId, setSedeId] = useState('');
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

  const ingresos = ventas.reduce((t, v) => t + v.total, 0);
  const agotados = faltantes.filter((f) => f.estado === 'agotado').length;
  const ultimas = [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading
        eyebrow="Administración" title="Panel y reportes"
        description="Resumen de ventas, faltantes y movimientos de inventario de toda la cadena."
        actions={
          <div className="flex min-w-[210px] flex-col gap-1">
            <label htmlFor="dash-sede" className="text-xs font-bold tracking-wide text-muted uppercase">Sede</label>
            <Select id="dash-sede" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              <option value="">Todas las sedes</option>
              {state.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </div>
        }
      />
      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard icon={CircleDollarSign} label="Ingresos totales" value={money(ingresos)} tone="brand" note={`${num(ventas.length)} ventas registradas`} />
        <StatCard icon={Receipt} label="Ticket promedio" value={money(ventas.length ? ingresos / ventas.length : 0)} />
        <StatCard icon={PackageX} label="Faltantes" value={num(faltantes.length)} tone={faltantes.length ? 'warn' : 'default'} note={`${num(agotados)} agotados · ${num(faltantes.length - agotados)} con stock bajo`} />
        <StatCard icon={ArrowUpFromLine} label="Movimientos" value={num(nMovs)} note="entradas y salidas de inventario" />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <Box title="Ingresos de los últimos 7 días" icon={CircleDollarSign}>
          <BarChart data={porDia} format={(n) => `$${Math.round(n)}`} ariaLabel={`Ingresos por día. Total de la semana: ${money(porDia.reduce((t, d) => t + d.value, 0))}`} />
        </Box>
        <Box title="Unidades vendidas por día" icon={ShoppingBag}>
          <LineChart data={unidadesDia} format={num} ariaLabel={`Tendencia de unidades vendidas. Total: ${num(unidadesDia.reduce((t, d) => t + d.value, 0))} unidades`} />
        </Box>
        <Box title="Ingresos por sede" icon={CircleDollarSign} className="lg:col-span-2">
          <BarChart horizontal data={porSede} format={money} ariaLabel="Ingresos acumulados por sede" />
        </Box>
      </div>

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
                  <td className={cx(tdCls, numCls, 'text-[13px] font-bold text-strong')}>{money(v.total)}</td>
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
