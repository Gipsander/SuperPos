const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
// Usa el compilador del proyecto: TypeScript 7 ya no expone transpileModule.
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, '.local'), { recursive: true });
const compiled = fs.mkdtempSync(path.join(root, '.local', 'admin-tests-'));
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'),
  '--ignoreConfig', '--outDir', compiled, '--module', 'node16', '--moduleResolution', 'node16',
  '--target', 'es2022', '--skipLibCheck', '--esModuleInterop',
  'lib/store.ts', 'lib/auth.ts', 'lib/roles.ts', 'lib/types.ts'], { cwd: root, stdio: 'pipe' });
const storePath = path.join(compiled, 'store.js');
after(() => fs.rmSync(compiled, { recursive: true, force: true }));
let saved = new Map();
global.window = {};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
} });
const store = require(storePath);
const auth = require(path.join(compiled, 'auth.js'));
const { coincideCodigoBarras, esBusquedaPorTerminacion } = require(path.join(compiled, 'pos.js'));
const admin = () => store.getState().usuarios.find((u) => u.username === 'rafael');
const branch = { codigo: 'OESTE', nombre: 'Sede Oeste', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Calle de prueba', activa: true };
const account = (sedeId, role = 'cajero') => ({ username: 'ana.demo', name: 'Ana Demo', role, sedeId, activo: true, password: 'demo123' });
beforeEach(() => { saved = new Map(); store.resetDemo(); auth.logout(); });

test('búsqueda por terminación admite cualquier longitud y conserva ceros iniciales', () => {
  for (const query of ['*2', '*02', '*002', '*0002', '*00002', '*900002', '*75900002', '  *02  ']) {
    assert.equal(esBusquedaPorTerminacion(query), true, query);
    assert.equal(coincideCodigoBarras('75900002', query), true, query);
  }
  assert.equal(coincideCodigoBarras('12300852', '*00852'), true);
  assert.equal(coincideCodigoBarras('12345005872', '*005872'), true);
  assert.equal(coincideCodigoBarras('75900012', '*02'), false);
  assert.equal(coincideCodigoBarras('02000099', '*02'), false);
  assert.equal(coincideCodigoBarras('75900002', '*075900002'), false);
  assert.equal(coincideCodigoBarras(undefined, '*02'), false);
  for (const query of ['', '*', '**02', '*0x', '*-02', '* 02', '*0 2', '*02*']) {
    assert.equal(esBusquedaPorTerminacion(query), false, query);
    assert.equal(coincideCodigoBarras('75900002', query), false, query);
  }
  assert.equal(coincideCodigoBarras('75900002', '9000'), true);
  assert.equal(coincideCodigoBarras('75900002', '75900002'), true);
});

test('búsqueda por sufijo conserva todas las coincidencias de la sede, incluso agotados, y excluye inactivos', () => {
  const state = structuredClone(store.getState());
  state.productos = ['11110002', '22220002', '33330002', '44440002', '55550002', '02000099'].map((barras, i) => ({ codigo: `AUD-${i}`, codigoBarras: barras, nombre: `Ejemplo ${i}`, categoria: 'Despensa', unidadMedida: 'unidad', precioGlobal: 1, activo: i !== 3 }));
  state.existencias = state.productos.map((p, i) => ({ sedeId: i === 4 ? 's2' : 's1', productoCodigo: p.codigo, cantidad: i === 1 ? 0 : 10, stockMinimo: 1, habilitado: i !== 2 }));
  const matches = store.getStock(state, 's1').filter(r => coincideCodigoBarras(r.producto.codigoBarras, '*02'));
  assert.deepEqual(matches.map(r => r.producto.codigoBarras), ['11110002', '22220002']);
  assert.equal(matches[1].cantidad, 0);
});

test('sede nueva → usuario → mercancía → venta en su única sede', () => {
  const created = store.guardarSede(admin(), branch);
  assert.equal(created.ok, true);
  const id = created.id;
  const stocks = store.getState().existencias.filter((e) => e.sedeId === id);
  assert.equal(stocks.length, store.getState().productos.length);
  assert.ok(stocks.every((e) => !e.habilitado && e.cantidad === 0));
  assert.equal(store.guardarUsuario(admin(), account(id)).ok, true);
  const user = auth.login(' ANA.DEMO ', 'demo123');
  assert.equal(user.role, 'cajero');
  assert.deepEqual(store.sedesDeUsuario(store.getState(), user).map((s) => s.id), [id]);
  const otherStock = store.getExistencia(store.getState(), 's1', 'L-001').cantidad;
  assert.equal(store.habilitarEnSede(id, 'L-001', true).ok, true);
  assert.equal(store.registrarEntrada(id, 'L-001', 10, 'Carga de prueba').ok, true);
  assert.equal(store.registrarVenta(id, [{ codigo: 'L-001', cantidad: 2 }], 'efectivo', user.name, 10).ok, true);
  assert.equal(store.getExistencia(store.getState(), id, 'L-001').cantidad, 8);
  assert.equal(store.getExistencia(store.getState(), 's1', 'L-001').cantidad, otherStock);
  assert.equal(store.getState().ventas.at(-1).sedeId, id);
  const persisted = JSON.parse(saved.get('superpos.store.v2'));
  assert.equal(persisted.usuarios.at(-1).username, user.username);
  assert.equal(persisted.sedes.at(-1).id, id);
});

test('editar rol y sede, conservar contraseña, desactivar y reactivar acceso', () => {
  assert.equal(store.guardarUsuario(admin(), account('s1')).ok, true);
  assert.equal(store.guardarUsuario(admin(), { ...account('s2', 'inventario'), password: '' }, 'ana.demo').ok, true);
  const user = auth.login('ana.demo', 'demo123');
  assert.equal(user.role, 'inventario');
  assert.deepEqual(store.sedesDeUsuario(store.getState(), user).map((s) => s.id), ['s2']);
  assert.equal(store.guardarUsuario(admin(), { ...account('s2', 'inventario'), activo: false }, 'ana.demo').ok, true);
  assert.equal(auth.login('ana.demo', 'demo123'), null);
  assert.equal(store.guardarUsuario(admin(), { ...account('s2', 'inventario'), password: 'nueva123' }, 'ana.demo').ok, true);
  assert.equal(auth.login('ana.demo', 'demo123'), null);
  assert.equal(auth.login('ana.demo', 'nueva123').username, 'ana.demo');
});

test('validaciones y permisos rechazan cambios sin modificar datos', () => {
  const before = JSON.stringify(store.getState());
  assert.equal(store.guardarUsuario(admin(), { ...account('s1'), username: ' LUIS ' }).ok, false);
  assert.equal(store.guardarUsuario(admin(), account('inexistente')).ok, false);
  assert.equal(store.guardarUsuario(admin(), { ...account('s1'), password: 'x' }).ok, false);
  assert.equal(store.guardarUsuario(admin(), { ...admin(), password: '', activo: false }, 'rafael').ok, false);
  assert.equal(store.guardarUsuario(admin(), { ...admin(), password: '', role: 'cajero' }, 'rafael').ok, false);
  const cashier = auth.login('luis', 'admin');
  assert.equal(store.guardarUsuario(cashier, account('s1')).ok, false);
  assert.equal(store.guardarSede(cashier, branch).ok, false);
  assert.equal(store.guardarSede(admin(), { ...branch, codigo: ' centro ' }).ok, false);
  assert.equal(JSON.stringify(store.getState()), before);
  assert.deepEqual(store.sedesDeUsuario(store.getState(), null), []);
  assert.deepEqual(store.sedesDeUsuario(store.getState(), { ...cashier, sedeId: '' }), []);
});

test('sede inactiva bloquea operación y login, conserva historia y permite reactivación', () => {
  const sede = store.getState().sedes.find((s) => s.id === 's1');
  const before = store.getState();
  assert.equal(store.guardarSede(admin(), { ...sede, activa: false }, sede.id).ok, true);
  assert.equal(auth.login('luis', 'admin'), null);
  assert.equal(auth.login('gipsander', 'admin'), null);
  assert.equal(auth.login('rafael', 'admin').role, 'admin');
  assert.equal(store.registrarEntrada('s1', 'L-001', 5, 'prueba').ok, false);
  assert.equal(store.registrarVenta('s1', [{ codigo: 'L-001', cantidad: 1 }], 'tarjeta', 'Luis').ok, false);
  assert.equal(store.guardarUsuario(admin(), account('s1')).ok, false);
  assert.deepEqual(store.getState().ventas, before.ventas);
  assert.deepEqual(store.getState().existencias, before.existencias);
  assert.equal(store.guardarSede(admin(), { ...sede, nombre: 'Centro actualizado' }, sede.id).ok, true);
  assert.equal(auth.login('luis', 'admin').sedeId, sede.id);
  assert.equal(store.getSede(store.getState(), sede.id).nombre, 'Centro actualizado');
});

test('no permite desactivar la última sede activa', () => {
  for (const sede of store.getState().sedes.slice(1)) {
    assert.equal(store.guardarSede(admin(), { ...sede, activa: false }, sede.id).ok, true);
  }
  const sede = store.getState().sedes[0];
  assert.equal(store.guardarSede(admin(), { ...sede, activa: false }, sede.id).ok, false);
});

test('migra datos v2 y recupera cuentas persistidas sin perder operaciones', () => {
  const legacy = structuredClone(store.getState());
  delete legacy.usuarios;
  legacy.sedes = legacy.sedes.map(({ id, nombre }) => ({ id, nombre }));
  legacy.existencias[0].cantidad = 123;
  saved.set('superpos.store.v2', JSON.stringify(legacy));
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.getState().usuarios.length, 3);
  assert.equal(restored.getState().sedes[0].activa, true);
  assert.equal(restored.getState().existencias[0].cantidad, 123);
  assert.deepEqual(restored.getState().ventas, legacy.ventas);
  assert.equal(restored.guardarUsuario(restored.getState().usuarios[0], account('s2')).ok, true);
  delete require.cache[storePath];
  const reloaded = require(storePath);
  assert.equal(reloaded.getState().usuarios.at(-1).username, 'ana.demo');
  assert.equal(reloaded.getState().usuarios.at(-1).sedeId, 's2');
});

test('clientes: validación, cédula única, permisos y recuperación al recargar', () => {
  const cashier = auth.login('luis', 'admin');
  const input = { direccion: 'Calle de prueba, casa 1', telefonoConocido: '04140000000', cedula: ' v 12.345.678 ', nombres: 'Ana María', apellidos: 'Pérez López', telefono: '0412-1234567' };
  const result = store.registrarCliente(cashier, input);
  assert.equal(result.ok, true);
  assert.equal(result.cliente.cedula, 'V-12345678');
  assert.equal(store.buscarCliente(store.getState(), '12345678').nombres, 'Ana María');
  const before = JSON.stringify(store.getState());
  for (const changes of [{ cedula: 'V-12345678' }, { cedula: 'X-99999999' }, { cedula: '00000' }, { cedula: '87654321', nombres: '' }, { cedula: '87654321', telefono: 'hola1234567890' }]) {
    assert.equal(store.registrarCliente(cashier, { ...input, ...changes }).ok, false);
  }
  const inventory = store.getState().usuarios.find((u) => u.role === 'inventario');
  assert.equal(store.registrarCliente(inventory, { ...input, cedula: '87654321' }).ok, false);
  assert.equal(JSON.stringify(store.getState()), before);
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.buscarCliente(restored.getState(), 'V-12345678').telefono, '04121234567');
  assert.equal(store.registrarCliente(admin(), { ...input, cedula: 'E-12345678' }).ok, true);
});

test('migración incorpora clientes sin borrar ventas ni inventario anteriores', () => {
  const legacy = structuredClone(store.getState()); delete legacy.clientes;
  delete legacy.clientesDemoVersion;
  saved.set('superpos.store.v2', JSON.stringify(legacy));
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.getState().clientes.length, 5);
  assert.equal(restored.getState().clientesDemoVersion, 1);
  assert.deepEqual(restored.getState().existencias, legacy.existencias);
  assert.deepEqual(restored.getState().ventas, legacy.ventas);
});

test('administrador corrige todos los datos, cambia documento y conserva los recibos históricos', () => {
  const original = store.buscarCliente(store.getState(), 'V-91000001');
  const sale = store.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 1 }], 'tarjeta', 'Luis', undefined, original.cedula);
  assert.equal(sale.ok, true);
  const ventasAntes = structuredClone(store.getState().ventas);
  const count = store.getState().clientes.length;
  const input = { cedula: ' e 0091000011 ', nombres: '  María   Corregida ', apellidos: ' Pérez López ', telefono: '0414-1234567', direccion: ' Calle corregida 2 ', telefonoConocido: '0212-1234567' };
  const result = store.actualizarCliente(admin(), original.cedula, input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.cliente, { cedula: 'E-91000011', nombres: 'María Corregida', apellidos: 'Pérez López', telefono: '04141234567', direccion: 'Calle corregida 2', telefonoConocido: '02121234567' });
  assert.equal(store.buscarCliente(store.getState(), original.cedula), undefined);
  assert.equal(store.getState().clientes.length, count);
  assert.deepEqual(store.getState().ventas, ventasAntes);
  assert.equal(store.actualizarCliente(admin(), result.cliente.cedula, { ...result.cliente, telefonoConocido: '' }).ok, true);
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.buscarCliente(restored.getState(), 'E-91000011').nombres, 'María Corregida');
  assert.equal(restored.buscarCliente(restored.getState(), 'E-91000011').telefonoConocido, '');
  assert.equal(restored.buscarCliente(restored.getState(), original.cedula), undefined);
  assert.equal(restored.getState().clientes.length, count);
  const nextSale = restored.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 1 }], 'tarjeta', 'Luis', undefined, 'E-91000011');
  assert.equal(nextSale.ok, true);
  assert.equal(nextSale.venta.cliente.nombres, 'María Corregida');
});

test('edición de clientes rechaza otros roles, cuentas inactivas, duplicados y datos inválidos sin cambios parciales', () => {
  const original = store.getState().clientes[0];
  const cashier = store.getState().usuarios.find((u) => u.role === 'cajero');
  const inventory = store.getState().usuarios.find((u) => u.role === 'inventario');
  assert.equal(store.guardarUsuario(admin(), { ...account('s1', 'admin'), activo: false }).ok, true);
  const inactive = store.getState().usuarios.find((u) => u.username === 'ana.demo');
  const before = JSON.stringify(store.getState());
  for (const actor of [cashier, inventory, inactive, { ...cashier, role: 'admin' }, { ...admin(), username: 'inexistente' }]) {
    assert.equal(store.actualizarCliente(actor, original.cedula, { ...original, nombres: 'No autorizado' }).ok, false);
  }
  for (const changes of [{ cedula: 'v 091000002' }, { cedula: 'X-123' }, { nombres: '' }, { apellidos: '' }, { telefono: '123' }, { direccion: '' }, { telefonoConocido: 'abc' }]) {
    assert.equal(store.actualizarCliente(admin(), original.cedula, { ...original, ...changes }).ok, false);
  }
  assert.equal(store.actualizarCliente(admin(), 'V-999999999', original).ok, false);
  assert.equal(JSON.stringify(store.getState()), before);
});

test('edición de razón social conserva ceros del RIF y permite completar clientes antiguos', () => {
  const empresa = store.getState().clientes.find((c) => c.cedula.startsWith('J-'));
  const result = store.actualizarCliente(admin(), empresa.cedula, { ...empresa, cedula: 'J-001234500', nombres: 'Razón social corregida', apellidos: 'No aplica' });
  assert.equal(result.ok, true);
  assert.equal(result.cliente.cedula, 'J-001234500');
  assert.equal(result.cliente.apellidos, '');
  const legacy = structuredClone(store.getState());
  delete legacy.clientes[0].direccion;
  delete legacy.clientes[0].telefonoConocido;
  saved.set('superpos.store.v2', JSON.stringify(legacy));
  delete require.cache[storePath];
  const restored = require(storePath);
  const cliente = restored.getState().clientes[0];
  assert.equal(restored.actualizarCliente(admin(), cliente.cedula, { ...cliente, direccion: 'Dirección completada' }).ok, true);
});

test('los ejemplos se incorporan una vez sin reemplazar clientes existentes ni reponer documentos corregidos', () => {
  const legacy = structuredClone(store.getState());
  delete legacy.clientesDemoVersion;
  const existente = { ...legacy.clientes[0], nombres: 'Nombre guardado por usuario' };
  legacy.clientes = [existente];
  saved.set('superpos.store.v2', JSON.stringify(legacy));
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.getState().clientes.length, 5);
  assert.equal(restored.buscarCliente(restored.getState(), existente.cedula).nombres, existente.nombres);
  assert.deepEqual(restored.getState().ventas, legacy.ventas);
  assert.deepEqual(restored.getState().existencias, legacy.existencias);
  assert.equal(restored.actualizarCliente(admin(), existente.cedula, { ...existente, cedula: 'V-92000001' }).ok, true);
  delete require.cache[storePath];
  const reloaded = require(storePath);
  assert.equal(reloaded.getState().clientes.length, 5);
  assert.equal(reloaded.buscarCliente(reloaded.getState(), existente.cedula), undefined);
  assert.equal(reloaded.buscarCliente(reloaded.getState(), 'V-92000001').nombres, existente.nombres);
});

test('venta por peso: cliente en recibo, redondeo monetario y descuento exacto', () => {
  const input = { direccion: 'Calle de prueba, casa 1', telefonoConocido: '04140000000', cedula: '12345678', nombres: 'Ana', apellidos: 'Pérez', telefono: '04121234567' };
  assert.equal(store.registrarCliente(admin(), input).ok, true);
  const before = store.getExistencia(store.getState(), 's1', 'L-002').cantidad;
  const result = store.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 0.333 }], 'efectivo', 'Luis', 10, input.cedula);
  assert.equal(result.ok, true);
  assert.equal(result.venta.total, 2.26);
  assert.equal(result.venta.cliente.nombres, 'Ana');
  assert.equal(result.venta.cliente.cedula, 'V-12345678');
  assert.equal(store.getExistencia(store.getState(), 's1', 'L-002').cantidad, before - 0.333);
  assert.equal(store.registrarEntrada('s1', 'L-002', 0.333, 'Peso').ok, true);
  assert.equal(store.getExistencia(store.getState(), 's1', 'L-002').cantidad, before);
  const persisted = JSON.parse(saved.get('superpos.store.v2'));
  assert.equal(persisted.ventas.at(-1).cliente.cedula, 'V-12345678');
});

test('venta inválida no descuenta stock ni guarda datos parciales', () => {
  const before = JSON.stringify(store.getState());
  for (const quantity of [0, -1, NaN, Infinity, 0.1234, 999999]) {
    assert.equal(store.registrarVenta('s1', [{ codigo: 'L-002', cantidad: quantity }], 'tarjeta', 'Luis').ok, false);
  }
  assert.equal(store.registrarVenta('s1', [{ codigo: 'L-003', cantidad: 0.5 }], 'tarjeta', 'Luis').ok, false);
  assert.equal(store.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 1 }], 'efectivo', 'Luis', NaN).ok, false);
  assert.equal(store.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 1 }], 'tarjeta', 'Luis', undefined, 'V-87654321').ok, false);
  assert.equal(store.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 1 }, { codigo: 'L-001', cantidad: 1 }], 'tarjeta', 'Luis').ok, false);
  assert.equal(JSON.stringify(store.getState()), before);
});

test('códigos de barras: altas, edición, unicidad y colisiones con códigos internos', () => {
  const base = { codigo: 'P-025', codigoBarras: '01234567', nombre: 'Producto de prueba', categoria: 'Despensa', unidadMedida: 'unidad', precioGlobal: 2 };
  assert.equal(store.crearProducto(base).ok, true);
  assert.equal(store.getProducto(store.getState(), base.codigo).codigoBarras, base.codigoBarras);
  assert.equal(store.crearProducto({ ...base, codigo: 'P-026' }).ok, false);
  assert.equal(store.crearProducto({ ...base, codigo: base.codigoBarras, codigoBarras: '' }).ok, false);
  assert.equal(store.crearProducto({ ...base, codigo: 'P-027', codigoBarras: '123456789' }).ok, false);
  assert.equal(store.actualizarProducto('L-002', { ...base, codigoBarras: base.codigoBarras }).ok, false);
  assert.equal(store.actualizarProducto('L-002', { ...base, codigoBarras: 'abc' }).ok, false);
  assert.equal(store.actualizarProducto(base.codigo, { ...base, codigoBarras: '98765432' }).ok, true);
  assert.equal(store.actualizarProducto(base.codigo, { ...base, codigoBarras: '' }).ok, true);
});

test('documentos flexibles: extranjero corto, RIF largo y precisión sin pérdida', () => {
  const base = { nombres: 'Ana', apellidos: 'Pérez', telefono: '04121234567', direccion: 'Av. Prueba, casa 1', telefonoConocido: '02125551234' };
  for (const cedula of ['E-12', 'V-1234', 'J-00123456789012345678901234567890', 'G-1234567890']) {
    const result = store.registrarCliente(admin(), { ...base, cedula, apellidos: cedula.startsWith('J') || cedula.startsWith('G') ? '' : base.apellidos });
    assert.equal(result.ok, true);
    assert.equal(result.cliente.cedula, cedula);
    assert.equal(store.buscarCliente(store.getState(), cedula).direccion, base.direccion);
  }
  assert.equal(store.buscarCliente(store.getState(), ' e 0012 ').cedula, 'E-12');
  assert.equal(store.registrarCliente(admin(), { ...base, cedula: 'E-0012' }).ok, false);
  assert.equal(store.registrarCliente(admin(), { ...base, cedula: 'J-00123456789012345678901234567891' }).ok, true);
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.buscarCliente(restored.getState(), 'E-12').telefonoConocido, base.telefonoConocido);
});

test('dirección requerida, contacto alternativo opcional y registros antiguos compatibles', () => {
  const base = { cedula: 'E-123', nombres: 'Ana', apellidos: 'Pérez', telefono: '04121234567', direccion: 'Calle de prueba' };
  const before = JSON.stringify(store.getState());
  assert.equal(store.registrarCliente(admin(), { ...base, direccion: '' }).ok, false);
  assert.equal(store.registrarCliente(admin(), { ...base, telefonoConocido: 'incorrecto' }).ok, false);
  assert.equal(store.registrarCliente(admin(), { ...base, apellidos: '' }).ok, false);
  assert.equal(JSON.stringify(store.getState()), before);
  assert.equal(store.registrarCliente(admin(), base).ok, true);
  const legacy = structuredClone(store.getState());
  legacy.clientes = [{ cedula: 'V-12345678', nombres: 'Cliente', apellidos: 'Anterior', telefono: '04120000000' }];
  saved.set('superpos.store.v2', JSON.stringify(legacy));
  delete require.cache[storePath];
  const restored = require(storePath);
  assert.equal(restored.buscarCliente(restored.getState(), '12.345.678').apellidos, 'Anterior');
  assert.equal(restored.registrarVenta('s1', [{ codigo: 'L-002', cantidad: 1 }], 'tarjeta', 'Luis', undefined, 'V-12345678').ok, true);
});

test('tasa del día: valor por defecto, solo admin, validación y se guarda en la venta', () => {
  assert.equal(store.tasaHoy(store.getState()), 45);
  const cajero = store.getState().usuarios.find((u) => u.username === 'luis');
  assert.equal(store.setExchangeRate(cajero, 50).ok, false);
  assert.equal(store.setExchangeRate(admin(), 0).ok, false);
  assert.equal(store.setExchangeRate(admin(), -3).ok, false);
  assert.equal(store.setExchangeRate(admin(), 52.5).ok, true);
  assert.equal(store.tasaHoy(store.getState()), 52.5);
  const e = store.getState().existencias.find((x) => x.sedeId === 's1' && x.habilitado && x.cantidad > 3);
  const p = store.getState().productos.find((x) => x.codigo === e.productoCodigo);
  const r = store.registrarVenta('s1', [{ codigo: p.codigo, cantidad: 1 }], 'tarjeta', 'Luis');
  assert.equal(r.ok, true);
  assert.equal(r.venta.tasa, 52.5);
});

test('sedes: activar/desactivar y eliminar solo sedes sin historial', () => {
  const nueva = store.guardarSede(admin(), branch);
  assert.equal(nueva.ok, true);
  // Sede con ventas e historial: no se elimina, se sugiere desactivar.
  const rechazo = store.eliminarSede(admin(), 's1');
  assert.equal(rechazo.ok, false);
  assert.match(rechazo.error, /Desactívala/);
  assert.ok(store.getState().sedes.some((s) => s.id === 's1'));
  // Alternar activa.
  assert.equal(store.setSedeActiva(admin(), 's2', false).ok, true);
  assert.equal(store.getState().sedes.find((s) => s.id === 's2').activa, false);
  assert.equal(store.setSedeActiva(admin(), 's2', true).ok, true);
  // Con stock, la sede nueva ya no es eliminable.
  const cajero = store.getState().usuarios.find((u) => u.username === 'luis');
  assert.equal(store.eliminarSede(cajero, nueva.id).ok, false);
  const producto = store.getState().productos[0].codigo;
  store.habilitarEnSede(nueva.id, producto, true);
  assert.equal(store.registrarEntrada(nueva.id, producto, 5, 'prueba').ok, true);
  assert.equal(store.eliminarSede(admin(), nueva.id).ok, false);
});

test('sede creada por error sin actividad se elimina junto con sus existencias vacías', () => {
  const nueva = store.guardarSede(admin(), branch);
  assert.equal(store.eliminarSede(admin(), nueva.id).ok, true);
  assert.equal(store.getState().sedes.some((s) => s.id === nueva.id), false);
  assert.equal(store.getState().existencias.some((e) => e.sedeId === nueva.id), false);
});

test('tasa por día: hoy editable, días anteriores intactos y día nuevo hereda la última tasa', () => {
  const hoy = store.claveDia();
  const ayer = store.claveDia(new Date(Date.now() - 86400e3));
  assert.equal(store.tasaDelDia(store.getState(), ayer), 45);
  assert.equal(store.setExchangeRate(admin(), 60).ok, true);
  const s = store.getState();
  assert.equal(s.tasas[hoy], 60);
  assert.equal(store.tasaDelDia(s, ayer), 45, 'el día anterior no cambia');
  // Un día sin tasa propia usa la del último día anterior registrado.
  const manana = store.claveDia(new Date(Date.now() + 86400e3));
  assert.equal(store.tasaDelDia(s, manana), 60);
  // Ventas antiguas sin tasa guardada usan la de su día, no la de hoy.
  const vieja = s.ventas.find((v) => store.claveDia(new Date(v.fecha)) === ayer);
  if (vieja) assert.equal(store.tasaDeVenta(s, { fecha: vieja.fecha }), 45);
  // Una venta nueva conserva la tasa de hoy aunque luego cambie.
  const e = s.existencias.find((x) => x.sedeId === 's1' && x.habilitado && x.cantidad > 3);
  const r = store.registrarVenta('s1', [{ codigo: e.productoCodigo, cantidad: 1 }], 'tarjeta', 'Luis');
  assert.equal(r.venta.tasa, 60);
  store.setExchangeRate(admin(), 70);
  assert.equal(store.getState().ventas.find((v) => v.id === r.venta.id).tasa, 60);
});

test('migración: tasa global antigua se reparte por día sin alterar el histórico', () => {
  const crudo = structuredClone(store.getState());
  delete crudo.tasas; crudo.exchangeRate = 48;
  saved.set('superpos.store.v2', JSON.stringify(crudo));
  // Recarga el módulo con almacenamiento previo.
  const rutaStore = require.resolve(storePath);
  delete require.cache[rutaStore];
  const recargado = require(storePath);
  const s = recargado.getState();
  assert.equal(s.exchangeRate, undefined);
  assert.equal(recargado.tasaHoy(s), 48);
  s.ventas.forEach((v) => assert.equal(recargado.tasaDeVenta(s, v), 48));
  delete require.cache[rutaStore];
  require(storePath);
});
