// Estado compartido de SuperPOS (catálogo, existencias por sede y movimientos).
// Persiste en localStorage con respaldo en memoria. Rafa y Luis solo deben usar la API exportada.
//
// Modelo (el producto NO se duplica por sede):
//   Producto:  { codigo, nombre, categoria, unidadMedida, precioGlobal, activo }
//   Existencia:{ sedeId, productoCodigo, cantidad, stockMinimo, habilitado }
//   MovimientoInventario: { id, sedeId, productoCodigo, fecha, tipo, cantidad, motivo }
// Regla de alerta: agotado si cantidad = 0; stock bajo si cantidad < stockMinimo.

const KEY = 'superpos.store.v1';
const listeners = new Set();

const SEDES = [
  {id:'s1', nombre:'Sede Centro'},
  {id:'s2', nombre:'Sede Norte'},
  {id:'s3', nombre:'Sede Sur'},
  {id:'s4', nombre:'Sede Este'}
];

export const CATEGORIAS = ['Lácteos','Panadería','Bebidas','Despensa','Frutas y verduras','Carnes','Limpieza','Cuidado personal'];
export const UNIDADES = ['unidad','kg','litro','paquete','caja','botella'];

const SEED_PRODUCTOS = [
  ['P-001','Leche entera 1 L','Lácteos','litro',1.35],
  ['P-002','Queso blanco','Lácteos','kg',6.8],
  ['P-003','Yogur natural 1 kg','Lácteos','unidad',2.9],
  ['P-004','Mantequilla 250 g','Lácteos','unidad',2.2],
  ['P-005','Pan campesino','Panadería','unidad',1.1],
  ['P-006','Pan de sandwich','Panadería','paquete',2.4],
  ['P-007','Agua mineral 5 L','Bebidas','botella',1.9],
  ['P-008','Refresco cola 2 L','Bebidas','botella',2.1],
  ['P-009','Jugo de naranja 1 L','Bebidas','litro',2.6],
  ['P-010','Arroz blanco 1 kg','Despensa','paquete',1.45],
  ['P-011','Harina de maíz 1 kg','Despensa','paquete',1.6],
  ['P-012','Pasta larga 500 g','Despensa','paquete',1.25],
  ['P-013','Aceite vegetal 1 L','Despensa','botella',3.3],
  ['P-014','Azúcar 1 kg','Despensa','paquete',1.55],
  ['P-015','Café molido 250 g','Despensa','paquete',3.9],
  ['P-016','Tomate','Frutas y verduras','kg',2.3],
  ['P-017','Cebolla','Frutas y verduras','kg',1.7],
  ['P-018','Plátano','Frutas y verduras','kg',1.4],
  ['P-019','Pechuga de pollo','Carnes','kg',5.2],
  ['P-020','Carne molida','Carnes','kg',7.4],
  ['P-021','Detergente líquido 2 L','Limpieza','botella',6.5],
  ['P-022','Papel higiénico x4','Limpieza','paquete',3.1],
  ['P-023','Jabón de baño','Cuidado personal','unidad',1.05],
  ['P-024','Shampoo 400 ml','Cuidado personal','botella',4.6]
];

function seed(){
  const productos = SEED_PRODUCTOS.map(([codigo,nombre,categoria,unidadMedida,precioGlobal]) =>
    ({codigo,nombre,categoria,unidadMedida,precioGlobal,activo:true}));
  productos[23].activo = false; // ejemplo de producto inactivo
  const existencias = [];
  SEDES.forEach((sede, s) => productos.forEach((p, i) => {
    const habilitado = (i * 3 + s * 2 + 1) % 7 !== 0;
    const stockMinimo = ((i * 3) % 4 + 1) * 5;
    let cantidad = (i * 7 + s * 13) % 42;
    if ((i + s) % 9 === 0) cantidad = 0;
    existencias.push({sedeId:sede.id, productoCodigo:p.codigo, cantidad: habilitado ? cantidad : 0, stockMinimo, habilitado});
  }));
  const movimientos = [];
  const base = Date.now();
  existencias.filter(e => e.habilitado && e.cantidad > 0).slice(0, 12).forEach((e, n) => {
    movimientos.push({id:'M-' + (1000 + n), sedeId:e.sedeId, productoCodigo:e.productoCodigo,
      fecha:new Date(base - (n + 1) * 3600e3 * 7).toISOString(), tipo:'ENTRADA', cantidad:e.cantidad, motivo:'Carga inicial'});
  });
  return {sedes:SEDES, productos, existencias, movimientos, historialPrecios:[], seq:2000};
}

function load(){
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.productos) && Array.isArray(data.existencias)) return data;
    }
  } catch { /* almacenamiento no disponible: se usa memoria */ }
  return seed();
}

let state = load();

function commit(){
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* solo memoria */ }
  listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}
const ok = (extra = {}) => ({ok:true, ...extra});
const fail = error => ({ok:false, error});
const find = (sedeId, codigo) => state.existencias.find(e => e.sedeId === sedeId && e.productoCodigo === codigo);

/* ---------- Consultas ---------- */
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export const getSedes = () => state.sedes.map(s => ({...s}));
export const getSede = id => state.sedes.find(s => s.id === id) || null;
// Administrador: todas las sedes. Otros roles: solo las de user.sedes (por defecto, las dos primeras).
export function sedesDeUsuario(user){
  if (user?.role === 'admin') return getSedes();
  const ids = user?.sedes?.length ? user.sedes : state.sedes.slice(0, 2).map(s => s.id);
  return getSedes().filter(s => ids.includes(s.id));
}
export const getProductos = () => state.productos.map(p => ({...p}));
export const getProducto = codigo => { const p = state.productos.find(p => p.codigo === codigo); return p ? {...p} : null; };
export const getExistencia = (sedeId, codigo) => { const e = find(sedeId, codigo); return e ? {...e} : null; };
export const getExistencias = sedeId => state.existencias.filter(e => e.sedeId === sedeId).map(e => ({...e}));
export function sedesHabilitadas(codigo){
  return state.existencias.filter(e => e.productoCodigo === codigo && e.habilitado).map(e => e.sedeId);
}
export function getMovimientos({sedeId, codigo, limit = 50} = {}){
  return state.movimientos
    .filter(m => (!sedeId || m.sedeId === sedeId) && (!codigo || m.productoCodigo === codigo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
    .slice(0, limit).map(m => ({...m}));
}
export const getHistorialPrecios = (limit = 20) =>
  [...state.historialPrecios].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, limit);

export function estadoStock(e){
  if (e.cantidad <= 0) return 'agotado';
  return e.cantidad < e.stockMinimo ? 'bajo' : 'ok';
}
export const faltan = e => Math.max(0, e.stockMinimo - e.cantidad);

// Existencias de una sede unidas a su producto (solo productos activos y habilitados), con estado y faltante.
export function getStock(sedeId){
  const out = [];
  for (const e of state.existencias) {
    if (e.sedeId !== sedeId || !e.habilitado) continue;
    const p = state.productos.find(p => p.codigo === e.productoCodigo);
    if (!p || !p.activo) continue;
    out.push({...e, producto:{...p}, estado:estadoStock(e), faltan:faltan(e)});
  }
  return out;
}

/* ---------- Catálogo (F04, F05, F06) ---------- */
export function crearProducto({codigo, nombre, categoria, unidadMedida, precioGlobal, activo = true}){
  codigo = String(codigo || '').trim().toUpperCase();
  nombre = String(nombre || '').trim();
  const precio = Number(precioGlobal);
  if (!/^[A-Z0-9-]{2,16}$/.test(codigo)) return fail('El código debe tener de 2 a 16 caracteres (letras, números o guiones).');
  if (state.productos.some(p => p.codigo === codigo)) return fail(`Ya existe un producto con el código ${codigo}.`);
  if (nombre.length < 2) return fail('Escribe el nombre del producto.');
  if (!categoria) return fail('Elige una categoría.');
  if (!unidadMedida) return fail('Elige la unidad de medida.');
  if (!Number.isFinite(precio) || precio < 0) return fail('El precio debe ser un número mayor o igual a 0.');
  state.productos.push({codigo, nombre, categoria, unidadMedida, precioGlobal:Math.round(precio * 100) / 100, activo:!!activo});
  state.sedes.forEach(s => state.existencias.push({sedeId:s.id, productoCodigo:codigo, cantidad:0, stockMinimo:5, habilitado:false}));
  commit();
  return ok({codigo});
}

export function actualizarProducto(codigo, {nombre, categoria, unidadMedida}){
  const p = state.productos.find(p => p.codigo === codigo);
  if (!p) return fail('El producto no existe.');
  nombre = String(nombre || '').trim();
  if (nombre.length < 2) return fail('Escribe el nombre del producto.');
  if (!categoria || !unidadMedida) return fail('Completa categoría y unidad de medida.');
  Object.assign(p, {nombre, categoria, unidadMedida});
  commit();
  return ok();
}

export function setActivo(codigo, activo){
  const p = state.productos.find(p => p.codigo === codigo);
  if (!p) return fail('El producto no existe.');
  p.activo = !!activo;
  commit();
  return ok();
}

export function habilitarEnSede(sedeId, codigo, habilitado){
  if (!getSede(sedeId) || !state.productos.some(p => p.codigo === codigo)) return fail('Sede o producto inexistente.');
  let e = find(sedeId, codigo);
  if (!e) { e = {sedeId, productoCodigo:codigo, cantidad:0, stockMinimo:5, habilitado:false}; state.existencias.push(e); }
  e.habilitado = !!habilitado;
  commit();
  return ok();
}

/* ---------- Precio global (F07) ---------- */
export function setPrecioGlobal(codigo, precio, usuario = 'sistema'){
  const p = state.productos.find(p => p.codigo === codigo);
  const nuevo = Math.round(Number(precio) * 100) / 100;
  if (!p) return fail('El producto no existe.');
  if (!Number.isFinite(nuevo) || nuevo < 0) return fail('El precio debe ser un número mayor o igual a 0.');
  if (nuevo === p.precioGlobal) return fail('El nuevo precio es igual al actual.');
  state.historialPrecios.push({id:'H-' + (state.seq++), codigo, nombre:p.nombre, anterior:p.precioGlobal, nuevo, fecha:new Date().toISOString(), usuario});
  p.precioGlobal = nuevo;
  commit();
  return ok({anterior:state.historialPrecios.at(-1).anterior, nuevo});
}

/* ---------- Inventario (F12, F13) ---------- */
export function registrarEntrada(sedeId, codigo, cantidad, motivo){
  const e = find(sedeId, codigo);
  const p = state.productos.find(p => p.codigo === codigo);
  const n = Number(cantidad);
  if (!e || !e.habilitado || !p) return fail('Ese producto no está habilitado en la sede.');
  if (!p.activo) return fail('El producto está inactivo.');
  if (!Number.isInteger(n) || n <= 0) return fail('La cantidad debe ser un número entero mayor a 0.');
  if (n > 100000) return fail('La cantidad es demasiado grande.');
  const anterior = e.cantidad;
  e.cantidad += n;
  state.movimientos.push({id:'M-' + (state.seq++), sedeId, productoCodigo:codigo, fecha:new Date().toISOString(),
    tipo:'ENTRADA', cantidad:n, motivo:String(motivo || '').trim() || 'Ingreso de mercancía'});
  commit();
  return ok({anterior, nueva:e.cantidad});
}

export function setStockMinimo(sedeId, codigo, minimo){
  const e = find(sedeId, codigo);
  const n = Number(minimo);
  if (!e || !e.habilitado) return fail('Ese producto no está habilitado en la sede.');
  if (!Number.isInteger(n) || n < 0 || n > 100000) return fail('El mínimo debe ser un entero entre 0 y 100000.');
  e.stockMinimo = n;
  commit();
  return ok();
}

// Para el módulo de caja (Luis): descuenta existencias al vender y deja el movimiento como SALIDA.
export function descontarStock(sedeId, codigo, cantidad, motivo = 'Venta'){
  const e = find(sedeId, codigo);
  const n = Number(cantidad);
  if (!e || !e.habilitado) return fail('Ese producto no está habilitado en la sede.');
  if (!Number.isInteger(n) || n <= 0) return fail('Cantidad inválida.');
  if (n > e.cantidad) return fail('Stock insuficiente.');
  e.cantidad -= n;
  state.movimientos.push({id:'M-' + (state.seq++), sedeId, productoCodigo:codigo, fecha:new Date().toISOString(), tipo:'SALIDA', cantidad:n, motivo});
  commit();
  return ok({nueva:e.cantidad});
}

export function resetDemo(){ state = seed(); commit(); }
