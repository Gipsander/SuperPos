import { useSyncExternalStore } from 'react';
import type {
  Existencia, EstadoStock, FilaStock, MetodoPago, MovimientoInventario, Producto, Result, Sede,
  StoreState, User, Venta, VentaItem, Rol, CuentaDemo,
} from './types';
import { ROLES, USUARIOS_DEMO } from './roles';

// Estado compartido de SuperPOS (catálogo, existencias por sede, movimientos y ventas).
// Es un store reactivo (useSyncExternalStore) que persiste en localStorage de forma transparente.
// Uso: `const state = useStore()` para leer y `store.registrarEntrada(...)` para escribir.
// Regla de alerta: agotado si cantidad = 0; stock bajo si cantidad < stockMinimo.

const KEY = 'superpos.store.v2';

export const SEDES: Sede[] = [
  { id: 's1', codigo: 'CENTRO', nombre: 'Sede Centro', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Av. 20, sector Centro', activa: true },
  { id: 's2', codigo: 'NORTE', nombre: 'Sede Norte', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Av. Intercomunal, sector Norte', activa: true },
  { id: 's3', codigo: 'SUR', nombre: 'Sede Sur', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Av. Ribereña, sector Sur', activa: true },
  { id: 's4', codigo: 'ESTE', nombre: 'Sede Este', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Av. Lara, sector Este', activa: true },
];
export const CATEGORIAS = ['Lácteos', 'Panadería', 'Bebidas', 'Despensa', 'Frutas y verduras', 'Carnes', 'Limpieza', 'Cuidado personal'];
/** Prefijo del código de producto según la categoría; las categorías sin entrada usan «O» (Otros). */
export const PREFIJOS_CATEGORIA: Record<string, string> = {
  'Lácteos': 'L', 'Panadería': 'P', 'Bebidas': 'B', 'Despensa': 'A', 'Frutas y verduras': 'F',
  'Carnes': 'R', 'Limpieza': 'M', 'Cuidado personal': 'C',
};
export const prefijoCategoria = (categoria: string) => PREFIJOS_CATEGORIA[categoria] ?? 'O';

/** Siguiente código correlativo de la categoría: busca el número más alto con ese prefijo (L-001 → L-002). */
export function siguienteCodigo(productos: Pick<Producto, 'codigo'>[], categoria: string): string {
  const prefijo = prefijoCategoria(categoria);
  const re = new RegExp(`^${prefijo}-(\\d+)$`);
  const max = productos.reduce((m, p) => Math.max(m, Number(re.exec(p.codigo)?.[1] ?? 0)), 0);
  return `${prefijo}-${String(max + 1).padStart(3, '0')}`;
}

export const UNIDADES = ['unidad', 'kg', 'litro', 'paquete', 'caja', 'botella'];

const SEED_PRODUCTOS: [string, string, string, string, number][] = [
  ['L-001', 'Leche entera 1 L', 'Lácteos', 'litro', 1.35],
  ['L-002', 'Queso blanco', 'Lácteos', 'kg', 6.8],
  ['L-003', 'Yogur natural 1 kg', 'Lácteos', 'unidad', 2.9],
  ['L-004', 'Mantequilla 250 g', 'Lácteos', 'unidad', 2.2],
  ['P-001', 'Pan campesino', 'Panadería', 'unidad', 1.1],
  ['P-002', 'Pan de sandwich', 'Panadería', 'paquete', 2.4],
  ['B-001', 'Agua mineral 5 L', 'Bebidas', 'botella', 1.9],
  ['B-002', 'Refresco cola 2 L', 'Bebidas', 'botella', 2.1],
  ['B-003', 'Jugo de naranja 1 L', 'Bebidas', 'litro', 2.6],
  ['A-001', 'Arroz blanco 1 kg', 'Despensa', 'paquete', 1.45],
  ['A-002', 'Harina de maíz 1 kg', 'Despensa', 'paquete', 1.6],
  ['A-003', 'Pasta larga 500 g', 'Despensa', 'paquete', 1.25],
  ['A-004', 'Aceite vegetal 1 L', 'Despensa', 'botella', 3.3],
  ['A-005', 'Azúcar 1 kg', 'Despensa', 'paquete', 1.55],
  ['A-006', 'Café molido 250 g', 'Despensa', 'paquete', 3.9],
  ['F-001', 'Tomate', 'Frutas y verduras', 'kg', 2.3],
  ['F-002', 'Cebolla', 'Frutas y verduras', 'kg', 1.7],
  ['F-003', 'Plátano', 'Frutas y verduras', 'kg', 1.4],
  ['R-001', 'Pechuga de pollo', 'Carnes', 'kg', 5.2],
  ['R-002', 'Carne molida', 'Carnes', 'kg', 7.4],
  ['M-001', 'Detergente líquido 2 L', 'Limpieza', 'botella', 6.5],
  ['M-002', 'Papel higiénico x4', 'Limpieza', 'paquete', 3.1],
  ['C-001', 'Jabón de baño', 'Cuidado personal', 'unidad', 1.05],
  ['C-002', 'Shampoo 400 ml', 'Cuidado personal', 'botella', 4.6],
];

function seed(): StoreState {
  const productos: Producto[] = SEED_PRODUCTOS.map(([codigo, nombre, categoria, unidadMedida, precioGlobal]) =>
    ({ codigo, nombre, categoria, unidadMedida, precioGlobal, activo: true }));
  productos[23].activo = false; // ejemplo de producto inactivo

  const existencias: Existencia[] = [];
  SEDES.forEach((sede, s) => productos.forEach((p, i) => {
    const habilitado = (i * 3 + s * 2 + 1) % 7 !== 0;
    const stockMinimo = ((i * 3) % 4 + 1) * 5;
    let cantidad = (i * 7 + s * 13) % 42;
    if ((i + s) % 9 === 0) cantidad = 0;
    existencias.push({ sedeId: sede.id, productoCodigo: p.codigo, cantidad: habilitado ? cantidad : 0, stockMinimo, habilitado });
  }));

  const base = Date.now();
  const movimientos: MovimientoInventario[] = [];
  existencias.filter((e) => e.habilitado && e.cantidad > 0).slice(0, 12).forEach((e, n) => {
    movimientos.push({
      id: `M-${1000 + n}`, sedeId: e.sedeId, productoCodigo: e.productoCodigo,
      fecha: new Date(base - (n + 1) * 3600e3 * 7).toISOString(), tipo: 'ENTRADA', cantidad: e.cantidad, motivo: 'Carga inicial',
    });
  });

  // Historial de ventas de los últimos 7 días (determinista) para que el panel tenga datos desde el inicio.
  let r = 7;
  const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
  const ventas: Venta[] = [];
  const metodos: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];
  let n = 1000;
  for (let d = 6; d >= 0; d--) {
    for (const sede of SEDES) {
      const disponibles = existencias.filter((e) => e.sedeId === sede.id && e.habilitado && productos.find((p) => p.codigo === e.productoCodigo)?.activo);
      const cuantas = 1 + Math.floor(rnd() * (sede.id === 's1' ? 4 : 3));
      for (let v = 0; v < cuantas; v++) {
        const items: VentaItem[] = [];
        const lineas = 1 + Math.floor(rnd() * 3);
        for (let l = 0; l < lineas; l++) {
          const elegido = disponibles[Math.floor(rnd() * disponibles.length)];
          const p = productos.find((x) => x.codigo === elegido.productoCodigo)!;
          if (items.some((it) => it.codigo === p.codigo)) continue;
          items.push({ codigo: p.codigo, nombre: p.nombre, unidadMedida: p.unidadMedida, cantidad: 1 + Math.floor(rnd() * 4), precio: p.precioGlobal });
        }
        const fecha = new Date(base - d * 86400e3 - (1 + Math.floor(rnd() * 9)) * 3600e3).toISOString();
        const id = `V-${++n}`;
        ventas.push({
          id, sedeId: sede.id, fecha, items, metodo: metodos[Math.floor(rnd() * 3)], cajero: 'Luis',
          total: Math.round(items.reduce((t, it) => t + it.cantidad * it.precio, 0) * 100) / 100,
        });
        items.forEach((it, k) => movimientos.push({
          id: `M-${id}-${k}`, sedeId: sede.id, productoCodigo: it.codigo, fecha, tipo: 'SALIDA', cantidad: it.cantidad, motivo: 'Venta POS / Caja',
        }));
      }
    }
  }
  return { usuarios: structuredClone(USUARIOS_DEMO), sedes: structuredClone(SEDES), productos, existencias, movimientos, historialPrecios: [], ventas, seq: 2000 };
}

/** Datos guardados con la nomenclatura anterior (P-001…P-024 para todo): recodifica por categoría en todas las referencias. */
function migrarCodigosLegacy(d: StoreState) {
  const legacy = d.productos.find((p) => p.codigo === 'P-001');
  if (legacy?.nombre !== 'Leche entera 1 L') return;
  const esViejo = (c: string) => /^P-\d+$/.test(c);
  const viejos = d.productos.filter((p) => esViejo(p.codigo)).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const mapa = new Map<string, string>();
  const ocupados: Pick<Producto, 'codigo'>[] = d.productos.filter((p) => !esViejo(p.codigo));
  for (const p of viejos) {
    const nuevo = siguienteCodigo(ocupados, p.categoria);
    ocupados.push({ codigo: nuevo });
    mapa.set(p.codigo, nuevo);
  }
  const m = (c: string) => mapa.get(c) ?? c;
  d.productos.forEach((p) => { p.codigo = m(p.codigo); });
  d.existencias.forEach((e) => { e.productoCodigo = m(e.productoCodigo); });
  d.movimientos?.forEach((x) => { x.productoCodigo = m(x.productoCodigo); });
  d.historialPrecios?.forEach((h) => { h.codigo = m(h.codigo); });
  d.ventas.forEach((v) => v.items.forEach((i) => { i.codigo = m(i.codigo); }));
}

function load(): StoreState {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as StoreState;
      if (data && Array.isArray(data.sedes) && Array.isArray(data.productos) && Array.isArray(data.existencias) && Array.isArray(data.ventas)) {
        // Amplía el estado v2 sin borrar el inventario ni las ventas guardadas.
        data.sedes = data.sedes.map((s) => {
          const base = SEDES.find((item) => item.id === s.id);
          return { ...s, codigo: s.codigo ?? base?.codigo ?? s.id.toUpperCase(),
            estado: s.estado ?? base?.estado ?? '', ciudad: s.ciudad ?? base?.ciudad ?? '',
            direccion: s.direccion ?? base?.direccion ?? '', activa: s.activa ?? true };
        });
        data.usuarios ??= structuredClone(USUARIOS_DEMO);
        migrarCodigosLegacy(data);
        return data;
      }
    }
  } catch { /* almacenamiento no disponible: se usa memoria */ }
  return seed();
}

/* ---------- Infraestructura reactiva ---------- */
let state: StoreState | null = null;
let serverState: StoreState | null = null;
const listeners = new Set<() => void>();

export const getState = (): StoreState => (state ??= typeof window === 'undefined' ? seed() : load());
const getServerState = (): StoreState => (serverState ??= seed());
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Hook: devuelve el estado compartido y vuelve a renderizar cuando cambia. */
export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

function commit(next: StoreState) {
  state = next;
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(next)); } catch { /* solo memoria */ }
  listeners.forEach((l) => l());
}
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function mutate<T extends object = object>(fn: (d: StoreState) => Result<T>): Result<T> {
  const draft = structuredClone(getState());
  const result = fn(draft);
  if (result.ok) commit(draft);
  return result;
}
const findEx = (d: StoreState, sedeId: string, codigo: string) =>
  d.existencias.find((e) => e.sedeId === sedeId && e.productoCodigo === codigo);

/* ---------- Selectores (funciones puras sobre el estado) ---------- */
export const getSede = (s: StoreState, id: string) => s.sedes.find((x) => x.id === id);
export const getProducto = (s: StoreState, codigo: string) => s.productos.find((p) => p.codigo === codigo);
export const getExistencia = (s: StoreState, sedeId: string, codigo: string) => findEx(s, sedeId, codigo);

/** Sedes activas: el administrador supervisa todas; los demás operan en una. */
export function sedesDeUsuario(s: StoreState, user: User | null): Sede[] {
  if (!user?.activo) return [];
  return s.sedes.filter((x) => x.activa && (user.role === 'admin' || x.id === user.sedeId));
}
export const sedesHabilitadas = (s: StoreState, codigo: string) =>
  s.existencias.filter((e) => e.productoCodigo === codigo && e.habilitado).map((e) => e.sedeId);

/* ---------- Administración (F02, F03) ---------- */
function esAdministrador(d: StoreState, actor: User): boolean {
  return d.usuarios.some((u) => u.username === actor.username && u.activo && u.role === 'admin');
}

export interface DatosUsuario {
  username: string; name: string; role: Rol; sedeId: string; activo: boolean; password: string;
}

/** Al editar, una contraseña vacía conserva la actual; el acceso es único e inmutable. */
export function guardarUsuario(actor: User, input: DatosUsuario, usernameActual?: string): Result {
  return mutate((d) => {
    if (!esAdministrador(d, actor)) return fail('Solo el administrador puede gestionar usuarios.');
    const actual = usernameActual ? d.usuarios.find((u) => u.username === usernameActual) : undefined;
    if (usernameActual && !actual) return fail('El usuario no existe.');
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return fail('El usuario debe tener entre 3 y 30 letras, números, puntos, guiones o guiones bajos.');
    if (actual && username !== actual.username) return fail('El nombre de acceso no se puede cambiar.');
    if (d.usuarios.some((u) => u.username === username && u !== actual)) return fail('Ese nombre de usuario ya existe.');
    if (input.name.trim().length < 2) return fail('Escribe el nombre completo del usuario.');
    if (!Object.hasOwn(ROLES, input.role)) return fail('Selecciona un rol válido.');
    const sede = d.sedes.find((s) => s.id === input.sedeId);
    if (!sede || (!sede.activa && (!actual || actual.sedeId !== sede.id || (!actual.activo && input.activo)))) return fail('Selecciona una sede activa.');
    if ((!actual || input.password !== '') && input.password.trim().length < 4) return fail('La contraseña debe tener al menos 4 caracteres.');
    if (actual?.username === actor.username && (!input.activo || input.role !== 'admin')) return fail('No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.');
    if (actual?.role === 'admin' && actual.activo && (!input.activo || input.role !== 'admin') &&
      !d.usuarios.some((u) => u !== actual && u.activo && u.role === 'admin')) return fail('Debe quedar al menos un administrador activo.');
    const next: CuentaDemo = {
      username, name: input.name.trim(), role: input.role, label: ROLES[input.role].label,
      sedeId: sede.id, activo: input.activo, password: input.password || actual!.password,
    };
    if (actual) Object.assign(actual, next); else d.usuarios.push(next);
    return { ok: true };
  });
}

export type DatosSede = Omit<Sede, 'id'>;
/** Elimina la cuenta; las ventas ya registradas conservan el nombre del cajero. */
export function eliminarUsuario(actor: User, username: string): Result {
  return mutate((d) => {
    if (!esAdministrador(d, actor)) return fail('Solo el administrador puede gestionar usuarios.');
    const i = d.usuarios.findIndex((u) => u.username === username);
    if (i < 0) return fail('El usuario no existe.');
    const objetivo = d.usuarios[i];
    if (objetivo.username === actor.username) return fail('No puedes eliminar tu propia cuenta.');
    if (objetivo.role === 'admin' && objetivo.activo && !d.usuarios.some((u) => u !== objetivo && u.activo && u.role === 'admin')) return fail('Debe quedar al menos un administrador activo.');
    d.usuarios.splice(i, 1);
    return { ok: true };
  });
}

export function guardarSede(actor: User, input: DatosSede, sedeId?: string): Result<{ id: string }> {
  return mutate((d) => {
    if (!esAdministrador(d, actor)) return fail('Solo el administrador puede gestionar sedes.');
    const actual = sedeId ? d.sedes.find((s) => s.id === sedeId) : undefined;
    if (sedeId && !actual) return fail('La sede no existe.');
    const codigo = input.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,16}$/.test(codigo)) return fail('El código debe tener de 2 a 16 letras, números o guiones.');
    if (d.sedes.some((s) => s.codigo === codigo && s !== actual)) return fail('Ya existe una sede con ese código.');
    if (input.nombre.trim().length < 2) return fail('Escribe el nombre de la sede.');
    if (!input.estado.trim() || !input.ciudad.trim() || !input.direccion.trim()) return fail('Completa el estado geográfico, la ciudad y la dirección.');
    if (!input.activa && !d.sedes.some((s) => s !== actual && s.activa)) return fail('Debe quedar al menos una sede activa.');
    const id = actual?.id ?? `S-${d.seq++}`;
    const next: Sede = { id, codigo, nombre: input.nombre.trim(), estado: input.estado.trim(), ciudad: input.ciudad.trim(), direccion: input.direccion.trim(), activa: input.activa };
    if (actual) Object.assign(actual, next);
    else {
      d.sedes.push(next);
      d.productos.forEach((p) => d.existencias.push({ sedeId: id, productoCodigo: p.codigo, cantidad: 0, stockMinimo: 5, habilitado: false }));
    }
    return { ok: true, id };
  });
}

export function estadoStock(e: Pick<Existencia, 'cantidad' | 'stockMinimo'>): EstadoStock {
  if (e.cantidad <= 0) return 'agotado';
  return e.cantidad < e.stockMinimo ? 'bajo' : 'ok';
}
export const faltan = (e: Pick<Existencia, 'cantidad' | 'stockMinimo'>) => Math.max(0, e.stockMinimo - e.cantidad);

/** Existencias de una sede unidas a su producto (solo productos activos y habilitados). */
export function getStock(s: StoreState, sedeId: string): FilaStock[] {
  const out: FilaStock[] = [];
  for (const e of s.existencias) {
    if (e.sedeId !== sedeId || !e.habilitado) continue;
    const producto = s.productos.find((p) => p.codigo === e.productoCodigo);
    if (!producto?.activo) continue;
    out.push({ ...e, producto, estado: estadoStock(e), faltan: faltan(e) });
  }
  return out;
}
export function getMovimientos(s: StoreState, opts: { sedeId?: string; limit?: number } = {}): MovimientoInventario[] {
  return s.movimientos
    .filter((m) => !opts.sedeId || m.sedeId === opts.sedeId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
    .slice(0, opts.limit ?? 50);
}
export const getHistorialPrecios = (s: StoreState, limit = 20) =>
  [...s.historialPrecios].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, limit);

/* ---------- Catálogo (F04, F05, F06) ---------- */
export interface NuevoProducto {
  /** Opcional: si se omite, se genera automáticamente según la categoría (L-001, B-002…). */
  codigo?: string; nombre: string; categoria: string; unidadMedida: string; precioGlobal: number | string; activo?: boolean;
}
export function crearProducto(input: NuevoProducto): Result<{ codigo: string }> {
  const manual = input.codigo?.trim().toUpperCase();
  const nombre = input.nombre.trim();
  const precio = Number(input.precioGlobal);
  return mutate((d) => {
    const codigo = manual || siguienteCodigo(d.productos, input.categoria);
    if (!/^[A-Z0-9-]{2,16}$/.test(codigo)) return fail('El código debe tener de 2 a 16 caracteres (letras, números o guiones).');
    if (d.productos.some((p) => p.codigo === codigo)) return fail(`Ya existe un producto con el código ${codigo}.`);
    if (nombre.length < 2) return fail('Escribe el nombre del producto.');
    if (!input.categoria) return fail('Elige una categoría.');
    if (!input.unidadMedida) return fail('Elige la unidad de medida.');
    if (input.precioGlobal === '' || !Number.isFinite(precio) || precio < 0) return fail('El precio debe ser un número mayor o igual a 0.');
    d.productos.push({ codigo, nombre, categoria: input.categoria, unidadMedida: input.unidadMedida, precioGlobal: Math.round(precio * 100) / 100, activo: input.activo ?? true });
    d.sedes.forEach((sede) => d.existencias.push({ sedeId: sede.id, productoCodigo: codigo, cantidad: 0, stockMinimo: 5, habilitado: false }));
    return { ok: true, codigo };
  });
}

export function actualizarProducto(codigo: string, cambios: { nombre: string; categoria: string; unidadMedida: string; activo?: boolean }): Result {
  return mutate((d) => {
    const p = d.productos.find((x) => x.codigo === codigo);
    if (!p) return fail('El producto no existe.');
    const nombre = cambios.nombre.trim();
    if (nombre.length < 2) return fail('Escribe el nombre del producto.');
    if (!cambios.categoria || !cambios.unidadMedida) return fail('Completa categoría y unidad de medida.');
    Object.assign(p, { nombre, categoria: cambios.categoria, unidadMedida: cambios.unidadMedida });
    if (cambios.activo !== undefined) p.activo = cambios.activo;
    return { ok: true };
  });
}

export function setActivo(codigo: string, activo: boolean): Result {
  return mutate((d) => {
    const p = d.productos.find((x) => x.codigo === codigo);
    if (!p) return fail('El producto no existe.');
    p.activo = activo;
    return { ok: true };
  });
}

export function habilitarEnSede(sedeId: string, codigo: string, habilitado: boolean): Result {
  return mutate((d) => {
    if (!d.sedes.some((s) => s.id === sedeId && s.activa)) return fail('La sede está inactiva o no existe.');
    if (!d.sedes.some((x) => x.id === sedeId) || !d.productos.some((p) => p.codigo === codigo)) return fail('Sede o producto inexistente.');
    let e = findEx(d, sedeId, codigo);
    if (!e) { e = { sedeId, productoCodigo: codigo, cantidad: 0, stockMinimo: 5, habilitado: false }; d.existencias.push(e); }
    e.habilitado = habilitado;
    return { ok: true };
  });
}

/* ---------- Precio global (F07) ---------- */
export function setPrecioGlobal(codigo: string, precio: number | string, usuario = 'sistema'): Result<{ anterior: number; nuevo: number }> {
  const nuevo = Math.round(Number(precio) * 100) / 100;
  return mutate((d) => {
    const p = d.productos.find((x) => x.codigo === codigo);
    if (!p) return fail('El producto no existe.');
    if (precio === '' || !Number.isFinite(nuevo) || nuevo < 0) return fail('El precio debe ser un número mayor o igual a 0.');
    if (nuevo === p.precioGlobal) return fail('El nuevo precio es igual al actual.');
    const anterior = p.precioGlobal;
    d.historialPrecios.push({ id: `H-${d.seq++}`, codigo, nombre: p.nombre, anterior, nuevo, fecha: new Date().toISOString(), usuario });
    p.precioGlobal = nuevo;
    return { ok: true, anterior, nuevo };
  });
}

/* ---------- Inventario (F12, F13) ---------- */
export function registrarEntrada(sedeId: string, codigo: string, cantidad: number | string, motivo: string): Result<{ anterior: number; nueva: number }> {
  const n = Number(cantidad);
  return mutate((d) => {
    if (!d.sedes.some((s) => s.id === sedeId && s.activa)) return fail('La sede está inactiva o no existe.');
    const e = findEx(d, sedeId, codigo);
    const p = d.productos.find((x) => x.codigo === codigo);
    if (!e || !e.habilitado || !p) return fail('Ese producto no está habilitado en la sede.');
    if (!p.activo) return fail('El producto está inactivo.');
    if (cantidad === '' || !Number.isInteger(n) || n <= 0) return fail('La cantidad debe ser un número entero mayor a 0.');
    if (n > 100000) return fail('La cantidad es demasiado grande.');
    const anterior = e.cantidad;
    e.cantidad += n;
    d.movimientos.push({ id: `M-${d.seq++}`, sedeId, productoCodigo: codigo, fecha: new Date().toISOString(), tipo: 'ENTRADA', cantidad: n, motivo: motivo.trim() || 'Ingreso de mercancía' });
    return { ok: true, anterior, nueva: e.cantidad };
  });
}

export function setStockMinimo(sedeId: string, codigo: string, minimo: number | string): Result {
  const n = Number(minimo);
  return mutate((d) => {
    if (!d.sedes.some((s) => s.id === sedeId && s.activa)) return fail('La sede está inactiva o no existe.');
    const e = findEx(d, sedeId, codigo);
    if (!e || !e.habilitado) return fail('Ese producto no está habilitado en la sede.');
    if (minimo === '' || !Number.isInteger(n) || n < 0 || n > 100000) return fail('El mínimo debe ser un entero entre 0 y 100000.');
    e.stockMinimo = n;
    return { ok: true };
  });
}

/* ---------- Caja (descuento de inventario y ventas) ---------- */
function aplicarSalida(d: StoreState, sedeId: string, codigo: string, cantidad: number, motivo: string): string | null {
  if (!d.sedes.some((s) => s.id === sedeId && s.activa)) return 'La sede está inactiva o no existe.';
  const e = findEx(d, sedeId, codigo);
  if (!e || !e.habilitado) return 'Ese producto no está habilitado en la sede.';
  if (!Number.isInteger(cantidad) || cantidad <= 0) return 'Cantidad inválida.';
  if (cantidad > e.cantidad) return `Stock insuficiente de ${d.productos.find((p) => p.codigo === codigo)?.nombre ?? codigo}: quedan ${e.cantidad}.`;
  e.cantidad -= cantidad;
  d.movimientos.push({ id: `M-${d.seq++}`, sedeId, productoCodigo: codigo, fecha: new Date().toISOString(), tipo: 'SALIDA', cantidad, motivo });
  return null;
}

/** Descuenta existencias y registra el movimiento SALIDA. */
export function descontarStock(sedeId: string, codigo: string, cantidad: number, motivo = 'Venta POS / Caja'): Result<{ nueva: number }> {
  return mutate((d) => {
    const error = aplicarSalida(d, sedeId, codigo, cantidad, motivo);
    return error ? fail(error) : { ok: true, nueva: findEx(d, sedeId, codigo)!.cantidad };
  });
}

export interface LineaVenta { codigo: string; cantidad: number }
/** Confirma una venta: valida todo el carrito, descuenta cada ítem y guarda la venta (todo o nada). */
export function registrarVenta(
  sedeId: string, lineas: LineaVenta[], metodo: MetodoPago, cajero: string, recibido?: number,
): Result<{ venta: Venta }> {
  return mutate((d) => {
    if (!lineas.length) return fail('El carrito está vacío.');
    const items: VentaItem[] = [];
    for (const l of lineas) {
      const p = d.productos.find((x) => x.codigo === l.codigo);
      if (!p?.activo) return fail('Hay un producto inactivo en el carrito.');
      items.push({ codigo: p.codigo, nombre: p.nombre, unidadMedida: p.unidadMedida, cantidad: l.cantidad, precio: p.precioGlobal });
    }
    const total = Math.round(items.reduce((t, it) => t + it.cantidad * it.precio, 0) * 100) / 100;
    if (metodo === 'efectivo' && (recibido === undefined || recibido < total)) return fail('El efectivo recibido no cubre el total.');
    for (const it of items) {
      const error = aplicarSalida(d, sedeId, it.codigo, it.cantidad, 'Venta POS / Caja');
      if (error) return fail(error);
    }
    const venta: Venta = { id: `V-${d.seq++}`, sedeId, fecha: new Date().toISOString(), items, total, metodo, cajero, ...(metodo === 'efectivo' ? { recibido } : {}) };
    d.ventas.push(venta);
    return { ok: true, venta };
  });
}

export function resetDemo(): void { commit(seed()); }
