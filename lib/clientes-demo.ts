import type { Cliente } from './types';

/** Datos completamente ficticios para probar consulta y edición de clientes. */
export const CLIENTES_DEMO: Cliente[] = [
  { cedula: 'V-91000001', nombres: 'Mariana', apellidos: 'Pérez Demo', telefono: '04120000001', direccion: 'Dirección ficticia: Calle Ejemplo 1, Barquisimeto', telefonoConocido: '04140000001' },
  { cedula: 'V-91000002', nombres: 'Carlos Andrés', apellidos: 'Mendoza Demo', telefono: '04120000002', direccion: 'Dirección ficticia: Avenida Ejemplo 2, Cabudare', telefonoConocido: '' },
  { cedula: 'V-91000003', nombres: 'Lucía', apellidos: 'Torres Demo', telefono: '04120000003', direccion: 'Dirección ficticia: Urbanización Ejemplo 3, Barquisimeto', telefonoConocido: '04140000003' },
  { cedula: 'E-91000004', nombres: 'Daniel', apellidos: 'Rojas Demo', telefono: '04120000004', direccion: 'Dirección ficticia: Calle Ejemplo 4, Cabudare', telefonoConocido: '' },
  { cedula: 'J-009100005', nombres: 'Abastos Ejemplo Demo', apellidos: '', telefono: '02510000005', direccion: 'Dirección ficticia: Local Ejemplo 5, Barquisimeto', telefonoConocido: '' },
];
