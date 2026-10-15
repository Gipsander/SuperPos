export type Rol = 'admin' | 'inventario' | 'cajero';

export interface Sede {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  ciudad: string;
  direccion: string;
  activa: boolean;
}

/** El producto no se duplica por sede: un único precio global. */
export interface Producto {
  codigo: string;
  codigoBarras?: string;
  nombre: string;
  categoria: string;
  unidadMedida: string;
  precioGlobal: number;
  activo: boolean;
}

/** Vincula un producto con una sede. `habilitado` indica si la sede lo maneja. */
export interface Existencia {
  sedeId: string;
  productoCodigo: string;
  cantidad: number;
  stockMinimo: number;
  habilitado: boolean;
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

export interface MovimientoInventario {
  id: string;
  sedeId: string;
  productoCodigo: string;
  fecha: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
}

export interface CambioPrecio {
  id: string;
  codigo: string;
  nombre: string;
  anterior: number;
  nuevo: number;
  fecha: string;
  usuario: string;
}

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Cliente {
  direccion?: string;
  telefonoConocido?: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
}

export interface VentaItem {
  codigo: string;
  nombre: string;
  unidadMedida: string;
  cantidad: number;
  precio: number;
}

export interface Venta {
  cliente?: Cliente;
  id: string;
  sedeId: string;
  fecha: string;
  items: VentaItem[];
  total: number;
  metodo: MetodoPago;
  cajero: string;
  recibido?: number;
}

export interface StoreState {
  clientes: Cliente[];
  usuarios: CuentaDemo[];
  sedes: Sede[];
  productos: Producto[];
  existencias: Existencia[];
  movimientos: MovimientoInventario[];
  historialPrecios: CambioPrecio[];
  ventas: Venta[];
  seq: number;
}

export type EstadoStock = 'agotado' | 'bajo' | 'ok';

export interface FilaStock extends Existencia {
  producto: Producto;
  estado: EstadoStock;
  faltan: number;
}

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface User {
  username: string;
  name: string;
  role: Rol;
  label: string;
  sedeId: string;
  activo: boolean;
}

/** Credenciales ficticias para recorrer el prototipo. */
export interface CuentaDemo extends User { password: string }
