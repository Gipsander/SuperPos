'use client';
import { useMemo } from 'react';
import { getMovimientos, getProducto, useStore } from '@/lib/store';
import { cx, fechaHora, num } from '@/lib/format';
import { Tag } from '@/components/ui/badge';
import { Box, EmptyState, Sub, TableWrap, numCls, tdCls, thCls } from '@/components/ui/layout';

/** Historial de entradas y salidas. El ingreso de mercancía se hace directo en «Stock e ingreso». */
export function TabMovimientos({ sedeId }: { sedeId: string }) {
  const state = useStore();
  const movs = useMemo(() => getMovimientos(state, { sedeId, limit: 30 }), [state, sedeId]);
  return (
    <div>
      <Box title="Movimientos de inventario">
        <TableWrap caption="Movimientos de inventario de la sede" minWidth={480} className="border-0">
          <thead>
            <tr>
              <th scope="col" className={thCls}>Fecha</th><th scope="col" className={thCls}>Producto</th><th scope="col" className={thCls}>Tipo</th>
              <th scope="col" className={cx(thCls, numCls)}>Cantidad</th><th scope="col" className={thCls}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={5}><EmptyState title="Sin movimientos">Aún no hay movimientos en esta sede.</EmptyState></td></tr>}
            {movs.map((m) => (
              <tr key={m.id} className="group">
                <td className={cx(tdCls, 'text-[13px]')}>{fechaHora(m.fecha)}</td>
                <td className={cx(tdCls, 'text-[13px]')}>{getProducto(state, m.productoCodigo)?.nombre ?? m.productoCodigo}<Sub>{m.productoCodigo}</Sub></td>
                <td className={tdCls}><Tag tone={m.tipo === 'ENTRADA' ? 'in' : 'out'}>{m.tipo}</Tag></td>
                <td className={cx(tdCls, numCls, 'text-[13px]')}>{m.tipo === 'ENTRADA' ? '+' : '−'}{num(m.cantidad)}</td>
                <td className={cx(tdCls, 'text-[13px]')}>{m.motivo}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Box>
    </div>
  );
}
