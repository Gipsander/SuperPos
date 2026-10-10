import { cx } from '@/lib/format';

export interface Dato { label: string; value: number }

const W = 440; // ancho lógico de los gráficos verticales (≈ ancho real de su caja: las fuentes no se encogen)
const WH = 880; // ancho lógico del gráfico horizontal (ocupa toda la fila)

/** Gráfico de barras SVG (vertical u horizontal) con los colores de la marca. */
export function BarChart({ data, format, ariaLabel, horizontal = false, className }: {
  data: Dato[]; format: (n: number) => string; ariaLabel: string; horizontal?: boolean; className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (horizontal) {
    const row = 40, H = data.length * row + 8, left = 80, right = 110;
    return (
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${WH} ${H}`} className={cx('h-auto w-full', className)}>
        {data.map((d, i) => {
          const w = Math.max(2, ((WH - left - right) * d.value) / max);
          const y = i * row + 6;
          return (
            <g key={d.label}>
              <text x={0} y={y + 17} className="fill-ink text-[14px]">{d.label}</text>
              <rect x={left} y={y} width={WH - left - right} height={24} rx={6} className="fill-soft" />
              <rect x={left} y={y} width={w} height={24} rx={6} className="fill-brand" />
              <text x={left + w + 8} y={y + 17} className="fill-strong text-[14px] font-bold">{format(d.value)}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  const H = 220, top = 24, bottom = 28, left = 8, gap = 14;
  const bw = (W - left * 2 - gap * (data.length - 1)) / data.length;
  const ch = H - top - bottom;
  return (
    <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${W} ${H}`} className={cx('h-auto w-full', className)}>
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={0} x2={W} y1={top + ch * (1 - g)} y2={top + ch * (1 - g)} className="stroke-line" strokeWidth={1} />)}
      <line x1={0} x2={W} y1={top + ch} y2={top + ch} className="stroke-edge" strokeWidth={1} />
      {data.map((d, i) => {
        const h = (ch * d.value) / max;
        const x = left + i * (bw + gap);
        const ultimo = i === data.length - 1;
        return (
          <g key={d.label}>
            <rect x={x} y={top + ch - h} width={bw} height={Math.max(h, 2)} rx={6} className={ultimo ? 'fill-brand-dark' : 'fill-brand'} />
            <text x={x + bw / 2} y={top + ch - h - 6} textAnchor="middle" className="fill-strong text-[12px] font-bold">{d.value ? format(d.value) : ''}</text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-muted text-[12px] capitalize">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Tendencia SVG: línea con área suave y puntos. */
export function LineChart({ data, format, ariaLabel, className }: { data: Dato[]; format: (n: number) => string; ariaLabel: string; className?: string }) {
  const H = 180, top = 22, bottom = 28, pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const ch = H - top - bottom;
  const step = (W - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => [pad + i * step, top + ch - (ch * d.value) / max] as const);
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${pad},${top + ch} ${line} ${pad + (data.length - 1) * step},${top + ch}`;
  return (
    <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${W} ${H}`} className={cx('h-auto w-full', className)}>
      {[0.5, 1].map((g) => <line key={g} x1={0} x2={W} y1={top + ch * (1 - g)} y2={top + ch * (1 - g)} className="stroke-line" strokeWidth={1} />)}
      <line x1={0} x2={W} y1={top + ch} y2={top + ch} className="stroke-edge" strokeWidth={1} />
      <polygon points={area} className="fill-brand-soft" />
      <polyline points={line} fill="none" className="stroke-brand" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <g key={data[i].label}>
          <circle cx={x} cy={y} r={4.5} className="fill-white stroke-brand-dark" strokeWidth={2.5} />
          <text x={x} y={y - 10} textAnchor="middle" className="fill-strong text-[12px] font-bold">{format(data[i].value)}</text>
          <text x={x} y={H - 8} textAnchor="middle" className="fill-muted text-[12px] capitalize">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}
