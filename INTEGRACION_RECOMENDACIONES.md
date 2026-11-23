# Integración de recomendaciones

Se conserva la actualización del equipo del 21/11/2026: bimoneda, tasas históricas, reportes, directorio de clientes, inventario y eliminación protegida de sedes.

Se integran las mejoras complementarias:
- Marcar todos los productos filtrados por sede, con estado parcial y confirmación al ocultar productos con stock. Operación atómica sin pérdida de existencias.
- Seleccionar producto, indicar cantidad o peso y confirmar Agregar; incluye búsqueda y catálogo auxiliar.
- Mantener visible lo último agregado al principio del carrito.
- Validar cliente tanto al agregar como al registrar la venta.
- Mantener el aviso de stock hasta cerrarlo o corregir la operación; el botón para agregar lo disponible usa las cifras actuales.

Validación local: TypeScript y 26 pruebas de lógica aprobadas. Compilación local bloqueada por archivos de dependencias no disponibles en OneDrive (error 362). El entorno local tiene Next.js 16.4.0; se conserva 16.4.6 en package.json y lockfile del equipo. El workflow verify ejecuta instalación limpia, TypeScript, pruebas y build con las dependencias del repositorio. La revisión visual sigue pendiente.
