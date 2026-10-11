# SuperPOS · Prototipo

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. Sin base de datos: el estado compartido vive en `lib/store.ts` y se guarda en `localStorage`.

## Acceso de demostración

| Usuario | Contraseña | Perfil |
| --- | --- | --- |
| rafael | admin | Administrador (todas las sedes) |
| gipsander | admin | Encargado de inventario (sede Centro) |
| luis | admin | Cajero (sede Centro) |

El usuario admite mayúsculas y espacios a los extremos. La contraseña inicial de estas tres cuentas es `admin`. El administrador puede crear más cuentas con su propia contraseña de demostración. Estas cuentas son ficticias y públicas: este login no es seguridad real. La sesión vive en memoria (recargar vuelve al acceso). Usuarios, contraseñas ficticias, sedes y datos de negocio persisten en `localStorage`; no uses contraseñas reales. Para restablecer la demostración ejecuta `localStorage.clear()` y recarga.

## Ejecutar (lo mínimo que necesitas)

> **No hace falta correr todos los comandos de npm.** Para usar y probar la app solo necesitas **uno o dos**. Los demás son opcionales y se explican abajo con claridad.

**Primera vez en un equipo** (o recién clonado el repositorio): dos comandos.

```bash
npm install     # descarga las dependencias. Se hace UNA sola vez
npm run dev     # enciende la app en http://127.0.0.1:3000
```

**Todos los días después de eso: solo uno.**

```bash
npm run dev
```

Para **apagar** el servidor pulsa `Ctrl+C` en la misma terminal. El servidor solo escucha en tu máquina (`127.0.0.1`): nadie más en tu red puede abrirlo.

Si en Windows aparece una ventana que pregunta con qué abrir un archivo `.ps1`, ciérrala y usa `npm.cmd run dev` en lugar de `npm run dev`.

### Qué hace cada comando y si lo necesitas

| Comando | ¿Lo necesito? | Para qué sirve |
| --- | --- | --- |
| `npm install` | **Solo la primera vez**, o si cambia `package.json` | Crea la carpeta `node_modules` con las librerías. Una vez instalada, **no hay que repetirlo** cada vez que abras el proyecto. |
| `npm run dev` | **Sí, es el de uso diario** | Enciende la app local para probarla. Recarga sola al guardar cambios. |
| `npm run build` | **No** para probar en local | Solo para **publicar en línea**: genera la carpeta `out/` con la versión final y de paso revisa errores. No hace falta correrlo para ver ni usar la app. |
| `npm run typecheck` | **No** (opcional) | Revisa errores de TypeScript sin encender nada. Útil antes de un commit, no para usar la app. |
| `npm test` | **No** (opcional) | Ejecuta seis pruebas de administración, permisos, persistencia e integración con inventario y caja. |
| `npm start` | **No** | Sirve la carpeta `out/` después de un `build`. Quedó de apoyo y **no está limitado a tu máquina**; no lo uses salvo que sepas por qué. |

### Comandos que NO debes ejecutar sin necesidad

- `npm install <paquete>`: no agregues librerías nuevas; el proyecto ya trae todo lo que usa.
- `npm update`, `npm audit fix` y `npm audit fix --force`: pueden cambiar versiones y romper el proyecto.
- `npm run build` mientras el servidor `dev` está encendido y no vas a publicar: no aporta nada.
- Más de una terminal con `npm run dev` a la vez: ocupan el mismo puerto y se estorban.

### Resumen de una línea

- **Probar la app:** `npm run dev`.
- **Instalar (solo la primera vez):** `npm install`.
- **Publicar en línea (más adelante):** `npm run build`.
- **Todo lo demás: opcional.**

## Estructura

| Ruta | Contenido |
| --- | --- |
| `lib/types.ts` | Tipos: `Producto`, `Existencia`, `MovimientoInventario`, `Sede`, `Venta`… |
| `lib/store.ts` | Store reactivo (`useStore`) + operaciones de negocio con persistencia |
| `lib/auth.ts` | Acceso con cuentas del store y sesión en memoria (`useUser`) |
| `lib/roles.ts` | Roles y cuentas iniciales de demostración |
| `components/app.tsx` | Navegación y layout por rol (sidebar del administrador, barra superior para los demás) |
| `components/ui/` | Componentes base: botón, insignias de stock, modal accesible, avisos, formularios, tablas |
| `components/inventory/` | Gipsander: catálogo (F04–F06), precios (F07), inventario (F11–F13) |
| `components/pos/` | Luis: punto de venta (carrito, cobro, recibo) |
| `components/admin/` | Inicio, usuarios y roles, sedes, panel y reportes con gráficos SVG |

### API del store (`lib/store.ts`)

`crearProducto`, `actualizarProducto`, `setActivo`, `habilitarEnSede`, `setPrecioGlobal`, `registrarEntrada`, `setStockMinimo`, `descontarStock` y `registrarVenta` (valida todo el carrito, descuenta cada ítem con la misma lógica de `descontarStock` y guarda la venta; todo o nada). Los selectores (`getStock`, `sedesDeUsuario`, `getMovimientos`…) reciben el estado que devuelve `useStore()`.

Regla de alerta: **agotado** si `cantidad = 0`; **stock bajo** si `cantidad < stockMínimo`.

## Permisos por rol

- **Encargado de inventario:** solo su sede asignada; consulta stock y faltantes, registra entradas y configura mínimos; ve catálogo y precios en solo lectura.
- **Administrador:** todas las sedes; además gestiona catálogo, sedes habilitadas y precio global, y accede a caja y reportes.
- **Cajero:** solo el punto de venta de su sede, mostrada como dato fijo sin desplegable. El catálogo coloca los productos agotados al final y mantiene el orden alfabético dentro de cada grupo.

## Estado de los módulos

Listos: usuarios y roles (F02), sedes (F03), catálogo, precios, inventario, punto de venta y panel/reportes.

### Recorrido de administración

1. Ingresa con `rafael` / `admin` y abre **Sedes → Crear sede**. Registra código único, nombre, estado geográfico, ciudad y dirección.
2. En el detalle de la sede abre **Gestionar usuarios → Crear usuario**. Introduce nombre, usuario de acceso, contraseña ficticia y rol. La sede queda preseleccionada y siempre es única. Un administrador también tiene sede de adscripción, pero supervisa todas.
3. Desde la sede abre **Habilitar productos**. El catálogo se abre en la disponibilidad de esa tienda; habilita un producto y vuelve a **Sedes → Ver sede → Ver inventario** para registrar mercancía.
4. Cierra sesión e ingresa con el usuario creado: el cajero verá únicamente la caja de su sede; el encargado verá su inventario. Una venta descuenta las existencias de esa tienda.
5. Desde **Usuarios y roles** puedes buscar, filtrar, editar nombre, rol, sede y contraseña, o activar/desactivar cuentas. Una contraseña vacía al editar conserva la actual. No se permite desactivar la cuenta propia ni quitarle su rol de administrador.
6. Desde **Sedes** puedes buscar, consultar y editar cada tienda. Desactivarla suspende las operaciones y el acceso de sus cajeros/encargados, conserva usuarios e historial y permite reactivación. Siempre debe quedar una sede activa.

Las sedes nuevas empiezan con stock cero y sin productos habilitados. Los datos v2 anteriores se amplían con usuarios y detalles de sedes sin borrar productos, existencias ni ventas. Las ubicaciones iniciales son ficticias para la demostración.

## Publicación

La exportación estática (`out/`) se puede publicar en GitHub Pages con una acción de GitHub. Para servirla bajo `/SuperPos` compile con `NEXT_PUBLIC_BASE_PATH=/SuperPos npm run build`. Cada navegador tiene su propia sesión y datos: GitHub comparte archivos, no operaciones.
