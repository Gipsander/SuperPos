import type { CuentaDemo, Rol } from './types';

export const ROLES: Record<Rol, { label: string; descripcion: string }> = {
  admin: { label: 'Administrador', descripcion: 'Gestiona usuarios, sedes, catálogo y precios; supervisa el inventario y los reportes de todas las sedes.' },
  inventario: { label: 'Encargado de inventario', descripcion: 'Consulta existencias y precios, registra mercancía y configura mínimos en su única sede asignada.' },
  cajero: { label: 'Cajero', descripcion: 'Consulta productos, prepara ventas y emite recibos en su única sede asignada.' },
};

export const USUARIOS_DEMO: CuentaDemo[] = [
  { username: 'rafael', name: 'Rafael', role: 'admin', label: ROLES.admin.label, sedeId: 's1', activo: true, password: 'admin' },
  { username: 'gipsander', name: 'Gipsander', role: 'inventario', label: ROLES.inventario.label, sedeId: 's1', activo: true, password: 'admin' },
  { username: 'luis', name: 'Luis', role: 'cajero', label: ROLES.cajero.label, sedeId: 's1', activo: true, password: 'admin' },
];
