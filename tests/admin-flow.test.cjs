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
const admin = () => store.getState().usuarios.find((u) => u.username === 'rafael');
const branch = { codigo: 'OESTE', nombre: 'Sede Oeste', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Calle de prueba', activa: true };
const account = (sedeId, role = 'cajero') => ({ username: 'ana.demo', name: 'Ana Demo', role, sedeId, activo: true, password: 'demo123' });
beforeEach(() => { saved = new Map(); store.resetDemo(); auth.logout(); });

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
