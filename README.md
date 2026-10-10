# SuperPOS · Prototipo

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. Sin base de datos: el estado compartido vive en `lib/store.ts` y se guarda en `localStorage`.

## Acceso de demostración

| Usuario | Contraseña | Perfil |
| --- | --- | --- |
| rafael | admin | Administrador (todas las sedes) |
| gipsander | admin | Encargado de inventario (sedes Centro y Norte) |
| luis | admin | Cajero (sede Centro) |

El usuario admite mayúsculas y espacios a los extremos. La contraseña es exactamente `admin`. Estas cuentas son ficticias y públicas: este login no es seguridad real. La sesión vive en memoria (recargar vuelve al acceso). Los datos de negocio (productos, precios, existencias, movimientos y ventas) persisten en `localStorage`; para restablecerlos ejecuta `localStorage.clear()` en la consola.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # exportación estática en out/
npm run typecheck
```

## Estructura

| Ruta | Contenido |
| --- | --- |
| `lib/types.ts` | Tipos: `Producto`, `Existencia`, `MovimientoInventario`, `Sede`, `Venta`… |
| `lib/store.ts` | Store reactivo (`useStore`) + operaciones de negocio con persistencia |
| `lib/auth.ts` | Usuarios ficticios, sesión en memoria (`useUser`) |
| `components/app.tsx` | Navegación y layout por rol (sidebar del administrador, barra superior para los demás) |
| `components/ui/` | Componentes base: botón, insignias de stock, modal accesible, avisos, formularios, tablas |
| `components/inventory/` | Gipsander: catálogo (F04–F06), precios (F07), inventario (F11–F13) |
| `components/pos/` | Luis: punto de venta (carrito, cobro, recibo) |
| `components/admin/` | Luis: panel y reportes con gráficos SVG; inicio y módulos pendientes de Rafael |

### API del store (`lib/store.ts`)

`crearProducto`, `actualizarProducto`, `setActivo`, `habilitarEnSede`, `setPrecioGlobal`, `registrarEntrada`, `setStockMinimo`, `descontarStock` y `registrarVenta` (valida todo el carrito, descuenta cada ítem con la misma lógica de `descontarStock` y guarda la venta; todo o nada). Los selectores (`getStock`, `sedesDeUsuario`, `getMovimientos`…) reciben el estado que devuelve `useStore()`.

Regla de alerta: **agotado** si `cantidad = 0`; **stock bajo** si `cantidad < stockMínimo`.

## Permisos por rol

- **Encargado de inventario:** solo sus sedes; consulta stock y faltantes, registra entradas y configura mínimos; ve catálogo y precios en solo lectura.
- **Administrador:** todas las sedes; además gestiona catálogo, sedes habilitadas y precio global, y accede a caja y reportes.
- **Cajero:** solo el punto de venta de su sede.

## Estado de los módulos

Listos: catálogo, precios, inventario, punto de venta y panel/reportes. Pendientes (Rafael): usuarios y roles, sedes (se muestran como "Próximamente").

## Publicación

La exportación estática (`out/`) se puede publicar en GitHub Pages con una acción de GitHub. Para servirla bajo `/Superpos-prototipo` compile con `NEXT_PUBLIC_BASE_PATH=/Superpos-prototipo npm run build`. Cada navegador tiene su propia sesión y datos: GitHub comparte archivos, no operaciones.
