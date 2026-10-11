# SuperPOS — Análisis

*10-10-2026 · Análisis del prototipo interactivo (v0.4 — migración a Next.js · módulos de inventario, caja y panel)*

| Campo | Valor |
|--------|--------|
| **Estado** | **Prototipo funcional** — catálogo, precios, inventario, caja y panel listos · Usuarios y Sedes **pendientes** |
| **Grupo** | Grupo 1 — Rafael Ramírez (Módulo 1) · Gipsander Urdaneta (Módulos 2, 3 y 5) · Luis Galíndez (Módulos 4 y 6) |
| **Tecnología** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · `localStorage` (sin base de datos) |
| **Ejecución** | `npm run dev` → `http://127.0.0.1:3000` (solo local) |
| **Datos** | `lib/store.ts` · clave `superpos.store.v2` · tipos en `lib/types.ts` |
| **Roles** | Administrador · Encargado de inventario · Cajero |
| **Guía de uso** | [`DOCUMENTACION.md`](DOCUMENTACION.md) · [`README.md`](README.md) |

Este documento es la **referencia de análisis** del prototipo: qué hace cada módulo, qué reglas aplica, qué decisiones se tomaron y qué queda abierto. Cualquier cambio posterior de comportamiento debe alinearse aquí o enmendarlo con una nueva decisión **Dn**.

**Es un prototipo de demostración:** el acceso por usuario y contraseña simula roles y **no es seguridad real**.

## Índice

1. [Objetivo y alcance](#1-objetivo-y-alcance)
2. [Reglas de negocio y permisos](#2-reglas-de-negocio-y-permisos)
3. [Camino feliz](#3-camino-feliz)
4. [Caminos alternativos](#4-caminos-alternativos)
5. [Contexto técnico](#5-contexto-técnico)
6. [Propuesta de implementación](#6-propuesta-de-implementación)
7. [Decisiones D1 a D14](#7-decisiones-d1-a-d14)
8. [Interrogantes que quedan](#8-interrogantes-que-quedan)
9. [Cierre](#9-cierre)

---

## 1. Objetivo y alcance

[↑ Volver al índice](#índice)

### En una frase

SuperPOS es una aplicación web de **punto de venta e inventario** para una cadena de supermercados con **varias sedes**: un **catálogo compartido** con **un único precio global** por producto y **existencias independientes por sede**.

### Planteamiento de producto

| # | Afirmación | Lectura de análisis |
|---|------------|---------------------|
| 1 | El producto **no se duplica** por sede | `Producto` único; la relación con la sede es `Existencia` |
| 2 | Cada producto tiene **un solo precio**, igual en todas las sedes | `Producto.precioGlobal`; el cambio aplica a **nuevas ventas** |
| 3 | Cada sede lleva **su propio stock** y **su propio mínimo** | `Existencia { sedeId, productoCodigo, cantidad, stockMinimo }` |
| 4 | Una sede maneja **solo los productos habilitados** | `Existencia.habilitado` |
| 5 | Todo cambio de stock deja **movimiento** | `MovimientoInventario` tipo `ENTRADA` o `SALIDA` |
| 6 | La venta descuenta el inventario de **su sede** | `registrarVenta` → `SALIDA` «Venta POS / Caja» |
| 7 | Tres roles con alcance distinto | [§2](#2-reglas-de-negocio-y-permisos) |
| 8 | Sin servidor ni base de datos | Persistencia en `localStorage` del navegador |

### Funcionalidades por módulo

| Módulo | Responsable | Funcionalidades | Estado |
|--------|-------------|-----------------|--------|
| 1 · Usuarios y sedes | Rafael | F01 Acceder · F02 Gestionar usuarios · F03 Gestionar sedes | F01 **demo** · F02 y F03 **pendientes** |
| 2 · Catálogo de productos | Gipsander | F04 Registrar · F05 Actualizar · F06 Habilitar por sede | **Listo** |
| 3 · Gestión de precios | Gipsander | F07 Modificar precio global | **Listo** |
| 4 · Punto de venta / Caja | Luis | F08 a F10 | **Listo** (ver [§8](#8-interrogantes-que-quedan)) |
| 5 · Inventario y reposición | Gipsander | F11 Consultar stock y faltantes · F12 Registrar mercancía · F13 Configurar mínimos | **Listo** |
| 6 · Panel y reportes | Luis | F14 a F16 | **Listo** (ver [§8](#8-interrogantes-que-quedan)) |

### Alcance de esta versión

- Navegación y diseño por rol (barra lateral del administrador; barra superior para los demás).
- Catálogo, precios e inventario con permisos, alertas y movimientos.
- Caja con catálogo de venta, carrito, cobro (efectivo, tarjeta, transferencia) y recibo imprimible.
- Panel con indicadores, tres gráficos SVG y listados (ventas, faltantes, movimientos).
- Datos de ejemplo: 4 sedes, 24 productos y 7 días de historial de ventas.

### Fuera de alcance

- Gestión de usuarios y de sedes (F02 y F03).
- Base de datos o servidor; autenticación real.
- Impuestos, facturación fiscal, devoluciones y anulación de ventas.
- Publicación en línea (se deja preparada la exportación estática).

### Supuestos

- Un solo navegador por persona: los datos no se comparten entre equipos.
- Cantidades de stock **enteras**.
- Moneda única (USD) con formato regional `es`.

[↑ Volver al índice](#índice)

---

## 2. Reglas de negocio y permisos

[↑ Volver al índice](#índice)

### 2.1 Estado del stock

| Estado | Regla | Cómo se muestra |
|--------|-------|-----------------|
| **Agotado** | `cantidad = 0` | Insignia roja con icono y texto |
| **Stock bajo** | `cantidad < stockMínimo` | Insignia ámbar con icono y texto |
| **Disponible** | `cantidad ≥ stockMínimo` | Insignia verde con icono y texto |

**Faltan** = `stockMínimo − cantidad` (nunca negativo). El estado **nunca** se comunica solo con color.

### 2.2 Permisos por rol

| Acción | Administrador | Encargado de inventario | Cajero |
|--------|:---:|:---:|:---:|
| Ver stock y faltantes (F11) | ✅ todas las sedes | ✅ sus sedes | — |
| Registrar mercancía (F12) | ✅ | ✅ | — |
| Configurar mínimos (F13) | ✅ | ✅ | — |
| Consultar catálogo y precio | ✅ | ✅ solo lectura | — |
| Crear / editar productos y habilitar por sede (F04–F06) | ✅ | ❌ | — |
| Modificar precio global (F07) | ✅ | ❌ | — |
| Vender en caja | ✅ cualquier sede | — | ✅ su sede |
| Ver panel y reportes | ✅ | — | — |

**Sedes por usuario (demostración):** `rafael` = todas · `gipsander` = Centro y Norte · `luis` = Centro.

### 2.3 Cuentas de demostración

| Usuario | Contraseña | Perfil |
|---------|------------|--------|
| `rafael` | `admin` | Administrador |
| `gipsander` | `admin` | Encargado de inventario |
| `luis` | `admin` | Cajero |

[↑ Volver al índice](#índice)

---

## 3. Camino feliz

[↑ Volver al índice](#índice)

### Historia — Cajero vende

1. Entra como cajero y ve el catálogo de su sede, con precio y estado de stock por producto.
2. Agrega productos al carrito; ajusta cantidades con **+** y **−**.
3. Pulsa **Cobrar**, elige el método y, en efectivo, ingresa lo recibido (hay botón *Monto exacto*).
4. Confirma: se muestra el **recibo**, el stock de la sede baja y queda un movimiento `SALIDA`.

### Historia — Encargado repone

1. Entra a **Stock y faltantes** de su sede y filtra por *Agotados* o *Stock bajo*.
2. Pulsa **Ingresar** en un producto, escribe la cantidad (se sugiere el faltante) y confirma.
3. La fila se resalta, las tarjetas de resumen y el estado se actualizan al instante y queda un movimiento `ENTRADA`.
4. En **Stock mínimo** cambia un mínimo: la alerta se recalcula en el acto.

### Historia — Administrador gestiona

1. En **Productos** registra un producto y lo habilita en las sedes que lo manejan.
2. En **Precios** cambia el precio global; queda en el historial de cambios.
3. En **Reportes** revisa ingresos, tendencia, faltantes y movimientos.

### Funcionalidades

| Id | Funcionalidad |
|----|---------------|
| F04 | Registrar producto (código, nombre, categoría, unidad, precio, activo) y habilitarlo en sedes |
| F05 | Editar nombre, categoría y unidad · activar / desactivar |
| F06 | Habilitar o quitar productos por sede (matriz producto × sede) |
| F07 | Modificar el precio global con historial |
| F11 | Consultar stock y faltantes por sede, con búsqueda, filtros y unidades que faltan |
| F12 | Registrar mercancía recibida (movimiento `ENTRADA`) |
| F13 | Configurar el stock mínimo por producto y sede |
| Caja | Catálogo de venta, carrito, cobro y recibo; descuento de inventario |
| Panel | Indicadores, gráficos y listados |

[↑ Volver al índice](#índice)

---

## 4. Caminos alternativos

[↑ Volver al índice](#índice)

| Id | Situación | Comportamiento |
|----|-----------|----------------|
| A1 | Código de producto repetido | **Rechazo** con mensaje |
| A2 | Código con formato inválido (2 a 16 caracteres: letras, números o guiones) | **Rechazo** |
| A3 | Precio vacío o negativo | **Rechazo** |
| A4 | Nuevo precio igual al actual | **Rechazo** (no genera historial) |
| A5 | Quitar un producto de una sede que tiene stock | **Confirmación**; el stock se conserva por si se vuelve a habilitar |
| A6 | Ingreso con cantidad no entera, ≤ 0 o > 100 000 | **Rechazo** |
| A7 | Ingreso sobre producto inactivo o no habilitado en la sede | **Rechazo** |
| A8 | Mínimo no entero o negativo | **Rechazo** y el valor vuelve al anterior |
| A9 | Producto agotado en caja | No se puede agregar (botón **Sin stock**) |
| A10 | Cantidad en carrito mayor al stock | Botón **+** deshabilitado y aviso; el cobro se bloquea |
| A11 | Efectivo recibido menor al total | **Rechazo** con mensaje |
| A12 | Carrito vacío | **Cobrar** deshabilitado |
| A13 | Cambio de sede con el carrito lleno | Se **vacía** el carrito con aviso |
| A14 | Producto inactivo | No aparece en stock ni en caja |
| A15 | Encargado o cajero ante opciones de administración | No se muestran los controles (solo lectura) |
| A16 | Usuario o contraseña incorrectos | Mensaje de error y foco en el campo |
| A17 | Usuario sin sedes asignadas | Estado vacío explicativo |
| A18 | `localStorage` no disponible | Funciona **solo en memoria** |
| A19 | Venta con un ítem sin stock suficiente | **Todo o nada**: no se descuenta ningún ítem |

[↑ Volver al índice](#índice)

---

## 5. Contexto técnico

[↑ Volver al índice](#índice)

| Ítem | Valor |
|------|--------|
| **Framework** | Next.js 16 (App Router), exportación estática (`output: 'export'`) |
| **UI** | React 19 · TypeScript estricto · Tailwind CSS 4 · iconos `lucide-react` |
| **Estado** | Store reactivo (`useSyncExternalStore`) en `lib/store.ts` |
| **Persistencia** | `localStorage` · clave `superpos.store.v2` |
| **Sesión** | Solo en memoria (`lib/auth.ts`); recargar vuelve al acceso |
| **Servidor local** | `npm run dev` enlazado a `127.0.0.1` |
| **Accesibilidad** | Etiquetas visibles, foco atrapado en modales, `aria-*`, estados con icono y texto, respeto de `prefers-reduced-motion` |

### Modelo de datos

```text
Producto        { codigo, nombre, categoria, unidadMedida, precioGlobal, activo }
Existencia      { sedeId, productoCodigo, cantidad, stockMinimo, habilitado }
MovimientoInventario { id, sedeId, productoCodigo, fecha, tipo, cantidad, motivo }
Venta           { id, sedeId, fecha, items[], total, metodo, cajero, recibido? }
CambioPrecio    { id, codigo, nombre, anterior, nuevo, fecha, usuario }
```

### Estructura del código

```text
app/          rutas y estilos globales
components/   app.tsx (navegación y roles) · ui/ · inventory/ · pos/ · admin/
lib/          store.ts (datos y reglas) · auth.ts · types.ts · format.ts
public/       logo.svg
```

### API del store

`crearProducto` · `actualizarProducto` · `setActivo` · `habilitarEnSede` · `setPrecioGlobal` · `registrarEntrada` · `setStockMinimo` · `descontarStock` · `registrarVenta`.

[↑ Volver al índice](#índice)

---

## 6. Propuesta de implementación

[↑ Volver al índice](#índice)

| Fase | Alcance | Estado |
|------|---------|--------|
| **F0** | Prototipo base en HTML, CSS y JS: acceso de demostración y espacios por rol (Rafael) | Hecho |
| **F1** | Catálogo, precios e inventario en el prototipo base (Gipsander) | Hecho |
| **F2** | Migración a Next.js, React, TypeScript y Tailwind; store tipado | Hecho |
| **F3** | Caja y panel con gráficos conectados al store | Hecho |
| **F4** | Usuarios y roles · Sedes (Rafael) | Pendiente |
| **F5** | Publicación en línea y, si se requiere, base de datos real | Pendiente |

```text
UI (React) ──useStore()──► lib/store.ts ──► localStorage
   ▲                            │
   └──── re-render ◄────────────┘  (cada operación notifica a todos los módulos)
```

[↑ Volver al índice](#índice)

---

## 7. Decisiones D1 a D14

[↑ Volver al índice](#índice)

| Id | Decisión | Pendiente |
|----|----------|-----------|
| D1 | Migrar el prototipo a **Next.js + React + TypeScript + Tailwind** | **No** |
| D2 | Persistencia en **`localStorage`** (`superpos.store.v2`), sin backend | **No** |
| D3 | **Un solo precio global** por producto, válido en todas las sedes | **No** |
| D4 | `Existencia` incluye el campo **`habilitado`** (extensión al modelo base) para conservar el stock al quitar un producto de una sede | **No** |
| D5 | **Stock bajo** si `cantidad < stockMínimo`; **agotado** si `cantidad = 0` | **No** |
| D6 | Cantidades de stock **enteras**; el ingreso crea un movimiento `ENTRADA` | **No** |
| D7 | La venta es **atómica** (`registrarVenta`): valida todo el carrito y descuenta con la misma lógica de `descontarStock` | **No** |
| D8 | El alcance por **sede** y por **rol** se define en la sesión (`gipsander` = Centro y Norte · `luis` = Centro) | **No** |
| D9 | La sesión vive **solo en memoria**; el acceso es de demostración | **No** |
| D10 | Los productos **no se eliminan**: se **desactivan** | **No** |
| D11 | Historial de ventas de **7 días** como datos de ejemplo, determinista, para que el panel no empiece vacío | **No** |
| D12 | El servidor de desarrollo escucha solo en **`127.0.0.1`** | **No** |
| D13 | Se mantiene la **exportación estática** para poder publicar en GitHub Pages | **No** |
| D14 | Usuarios y Sedes se muestran como **«Próximamente»** hasta que Rafael los desarrolle | **Sí** |

[↑ Volver al índice](#índice)

---

## 8. Interrogantes que quedan

[↑ Volver al índice](#índice)

| # | Tema | Detalle |
|---|------|---------|
| 1 | **Correspondencia F08–F10 y F14–F16** | Confirmar con Luis qué funcionalidad exacta es cada código. El repositorio no traía código previo de estos módulos: se desarrollaron en la migración a partir del alcance general de cada módulo |
| 2 | **Permisos en el almacén de datos** | Hoy el control por rol está en la **interfaz**: el store no valida quién llama. Para un sistema real, la validación debe ir en un servidor |
| 3 | **Acceso real** | El acceso por usuario y contraseña es solo de demostración |
| 4 | **Datos por navegador** | `localStorage` no se comparte entre equipos ni sedes reales; una base de datos lo resolvería |
| 5 | **Usuarios y Sedes** | F02 y F03 siguen pendientes (Rafael) |
| 6 | **Publicación** | Falta decidir si se publica en línea y con qué acción de GitHub |

[↑ Volver al índice](#índice)

---

## 9. Cierre

[↑ Volver al índice](#índice)

| # | Tema | Cierre |
|---|------|--------|
| 1 | Alcance | Catálogo, precios, inventario, caja y panel funcionales · Usuarios y Sedes pendientes |
| 2 | Datos | `localStorage`, sin base de datos |
| 3 | Reglas de stock | Agotado `= 0` · bajo `< mínimo` · faltan `= mínimo − cantidad` |
| 4 | Precio | Un único precio global; el cambio aplica a nuevas ventas |
| 5 | Venta | Atómica; descuenta inventario de la sede y registra `SALIDA` |
| 6 | Roles | Administrador · Encargado · Cajero, con sedes asignadas |
| 7 | Ejecución | `npm run dev` · `http://127.0.0.1:3000` · solo local |

---

## Historial

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 0.1 | 09-10-2026 | Prototipo base en HTML, CSS y JS: acceso de demostración y espacios por rol (Rafael) |
| 0.2 | 10-10-2026 | Catálogo, precios e inventario con permisos, alertas y movimientos (Gipsander) |
| 0.3 | 10-10-2026 | Migración a Next.js, React, TypeScript y Tailwind; caja y panel con gráficos |
| 0.4 | 10-10-2026 | Documentación: guía de uso y este análisis |
