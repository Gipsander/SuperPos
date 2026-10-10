# SuperPOS · Prototipo

HTML, CSS y JavaScript puro, sin base de datos ni dependencias de producción.

## Acceso de demostración

| Usuario | Contraseña | Perfil |
| --- | --- | --- |
| rafael | admin | Administrador |
| gipsander | admin | Inventario |
| luis | admin | Cajero |

El usuario admite mayúsculas y espacios a los extremos. La contraseña es exactamente admin. Estas cuentas son ficticias y públicas: este login no es seguridad real. La sesión vive en memoria; recargar vuelve al acceso. No se usan cookies ni sessionStorage. Los datos de negocio (productos, precios, existencias y movimientos) sí se guardan en localStorage mediante `js/store.js`, así que persisten al recargar; para restablecerlos ejecuta `localStorage.clear()` en la consola.

## Ejecutar

En VS Code abre index.html con Live Server, o ejecuta `python -m http.server 4173` y visita http://localhost:4173. Abre la página mediante HTTP, no con doble clic: JavaScript utiliza módulos.

## Reparto

| Responsable | Archivos principales |
| --- | --- |
| Rafael | js/auth.js, js/app.js, js/modules/admin.js, css/login.css, css/admin.css |
| Gipsander | js/modules/inventario.js, css/inventario.css |
| Luis | js/modules/ventas.js, css/ventas.css |

Gipsander debe conservar `renderInventario(container, user)` y Luis `renderVentas(container, user)`. Cada función recibe el elemento donde construir la vista y el usuario ficticio. Sus estilos deben usar .inventory-module y .sales-module.

El administrador tiene siete entradas: usuarios y roles, sedes, productos, inventario, precios, punto de venta y reportes. Por ahora abren espacios pendientes de desarrollo. Cuando estén listos, Rafael conectará los mismos módulos de sus compañeros al panel administrador.

Coordinen cambios en index.html, css/base.css y js/icons.js. Usen una rama por tarea y revisen las pull requests antes de integrarlas a main.

## Publicación

GitHub → Settings → Pages → Deploy from a branch → main → /(root).
La página se publica sin instalar ni compilar nada. Las rutas son relativas para funcionar bajo el subdirectorio del repositorio.

Cada navegador tiene su propia sesión. GitHub comparte archivos, no operaciones.

## Esta entrega

- Login basado en la referencia, adaptable a móviles y con validación.
- Menú del administrador y espacios pendientes, sin operaciones de negocio.
- Pantallas independientes de inventario y vendedor.
- Cierre de sesión y navegación con teclado.
- Logo provisional propio en assets/logo.svg.
- Registro y lógica de negocio quedan para futuras entregas.
