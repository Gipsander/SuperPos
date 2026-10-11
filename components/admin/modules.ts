export type AdminPage = 'inicio' | 'usuarios' | 'sedes' | 'productos' | 'inventario' | 'precios' | 'ventas' | 'reportes';

export interface AdminModule {
  id: Exclude<AdminPage, 'inicio'>;
  title: string;
  icon: string;
  description: string;
  owner: 'Rafael' | 'Gipsander' | 'Luis';
  /** false: el módulo aún no está desarrollado y se muestra como pendiente. */
  ready: boolean;
}

export const ADMIN_MODULES: AdminModule[] = [
  { id: 'usuarios', title: 'Usuarios y roles', icon: 'users', description: 'Administra los accesos, los perfiles y las asignaciones de tu equipo.', owner: 'Rafael', ready: true },
  { id: 'sedes', title: 'Sedes', icon: 'store', description: 'Organiza las tiendas y consulta la información de cada sede.', owner: 'Rafael', ready: true },
  { id: 'productos', title: 'Productos', icon: 'box', description: 'Explora el catálogo y define qué productos maneja cada sede.', owner: 'Gipsander', ready: true },
  { id: 'inventario', title: 'Inventario', icon: 'inventory', description: 'Consulta existencias, ingresos de mercancía y alertas de stock.', owner: 'Gipsander', ready: true },
  { id: 'precios', title: 'Precios', icon: 'price', description: 'Actualiza el precio global de los productos para todas las sedes.', owner: 'Gipsander', ready: true },
  { id: 'ventas', title: 'Punto de venta', icon: 'cart', description: 'Accede a caja para preparar y registrar las compras.', owner: 'Luis', ready: true },
  { id: 'reportes', title: 'Reportes', icon: 'chart', description: 'Revisa las ventas, los faltantes y los movimientos por sede.', owner: 'Luis', ready: true },
];
