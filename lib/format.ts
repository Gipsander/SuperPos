const nf = new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' });
const nn = new Intl.NumberFormat('es');

export const money = (n: number) => nf.format(n);
export const num = (n: number) => nn.format(n);
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es', { weekday: 'short', day: '2-digit' });
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
