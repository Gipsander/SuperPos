import type { Producto } from './types';

/** Documento flexible del prototipo; no valida identidad ni reglas fiscales. */
export function normalizarCedula(value: string): string | null {
  const match = /^([VEJG])?([0-9]+)$/.exec(value.toUpperCase().replace(/[.\s-]/g, ''));
  if (!match || !/[1-9]/.test(match[2])) return null;
  const prefijo = match[1] ?? 'V';
  // Conserva la normalización previa V/E sin convertir a Number ni perder precisión.
  const numero = ['V', 'E'].includes(prefijo) ? match[2].replace(/^0+(?=\d)/, '') : match[2];
  return `${prefijo}-${numero}`;
}

export const redondearCantidad = (n: number) => Math.round(n * 1000) / 1000;
export const importeLinea = (precio: number, cantidad: number) => Math.round(precio * cantidad * 100) / 100;
export function cantidadValida(producto: Pick<Producto, 'unidadMedida'>, n: number): boolean {
  return Number.isFinite(n) && n > 0 && n <= 100000 &&
    (producto.unidadMedida === 'kg' ? Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-7 : Number.isInteger(n));
}

export function coincideCodigoBarras(codigoBarras: string | undefined, query: string): boolean {
  if (!codigoBarras) return false;
  const q = query.trim();
  if (!q) return false;
  if (q.startsWith('*')) {
    const sufijo = q.slice(1).trim();
    return /^[0-9]{1,4}$/.test(sufijo) && codigoBarras.endsWith(sufijo);
  }
  return codigoBarras.includes(q);
}