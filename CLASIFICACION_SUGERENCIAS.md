# SuperPOS — Clasificación de sugerencias

*21-11-2026 · Sugerencias de la evaluación UX/funcional, clasificadas contra el SDD (v0.7)*

| Campo | Valor |
|--------|--------|
| **Informe analizado** | Observaciones de la evaluación UX/funcional del prototipo (tareas 1 a 4 del encargo de mejoras integrales del 21-11-2026) |
| **SDD de referencia** | [`ANALISIS.md`](ANALISIS.md): alcance (§1), reglas y permisos (§2), caminos alternativos A1–A24 (§4), decisiones D1–D21 (§7) |
| **Modelo de datos** | [`MODELO_DATOS.md`](MODELO_DATOS.md) · [`modelo_datos.sql`](modelo_datos.sql) |
| **Restricción de arquitectura** | Mantener el funcionamiento local con `localStorage` (D2), los permisos por rol (§2.2) y la búsqueda por código de barras y comodín `*` en Caja |

## Resumen

Se analizaron **22 sugerencias**.

| Clasificación | Cantidad | Qué significa |
|---------------|:-------:|---------------|
| **Mejora UX/UI** | 10 | Cambia cómo se ve o se opera la interfaz; las reglas y los datos siguen igual |
| **Cambio de lógica de negocio** | 6 | Cambia una regla, un cálculo o los datos; exigió **enmendar el SDD** |
| **Descartada o redundante** | 6 | No se aplica tal como se pidió, o ya estaba cubierta; cada una se justifica con el SDD |

De las 16 aprobadas, **todas están implementadas** (commit `6f08549`, con el ajuste de tasa por día en `cb32d36`). Las que contradecían el texto del SDD lo **enmendaron**: ver [§4](#4-enmiendas-al-sdd).

## Índice

1. [Mejoras de UX/UI](#1-mejoras-de-uxui)
2. [Cambios en la lógica de negocio](#2-cambios-en-la-lógica-de-negocio)
3. [Sugerencias descartadas o redundantes](#3-sugerencias-descartadas-o-redundantes)
4. [Enmiendas al SDD](#4-enmiendas-al-sdd)

---

## 1. Mejoras de UX/UI

Aprobadas porque **no alteran el modelo de datos ni los permisos**; solo reorganizan o hacen más visible lo que el SDD ya define.

| Id | Sugerencia | Módulo | Decisión | Dónde queda |
|----|-----------|--------|----------|-------------|
| S01 | Buscador rápido en Inventario por nombre, código interno o código de barras | Inventario (F11) | ✅ Aprobada | `components/inventory/inventory-panel.tsx` |
| S02 | Botón de guardado con estado de carga (`Guardando…`, ~400 ms, deshabilitado) y confirmación | Inventario (F12) | ✅ Aprobada | `components/ui/save-button.tsx` |
| S03 | Unificar el ingreso de mercancía con «Stock y faltantes»: ingresar desde la fila del producto, sin pestaña aparte | Inventario (F12) | ✅ Aprobada · D21 | El historial queda en la pestaña **Movimientos** |
| S04 | Casilla «Seleccionar todas las sedes» al crear o editar un producto | Catálogo (F06) | ✅ Aprobada | `components/inventory/catalog-panel.tsx` (solo sedes activas) |
| S05 | El producto agregado o escaneado sube al principio del carrito | Caja | ✅ Aprobada | `components/pos/pos-terminal.tsx` |
| S06 | Botones `-` y `+` junto a la cantidad de cada línea | Caja | ✅ Aprobada · D15 | `components/pos/cart-line.tsx` |
| S07 | Alerta de stock grande y visible en lugar del aviso pequeño | Caja | ✅ Aprobada · D17 | Banner rojo con las cifras y botón «agregar lo disponible» |
| S08 | Atajos de teclado rotulados (`Enter`, `F2`, `F3`, `F8`, `*1234`), cada uno con botón clicable | Caja | ✅ Aprobada | Operación 100 % con mouse; no altera la búsqueda por barras ni `*` |
| S09 | Botón «Ver todos los clientes» con buscador por cédula/RIF o nombre | Caja | ✅ Aprobada · D19 | `components/pos/customer-panel.tsx` |
| S10 | Gráficas con selector **Por Día** (con fecha, ventas por hora) o **Semanal** (7 días) | Reportes (F14–F16) | ✅ Aprobada · D21 | `components/admin/dashboard.tsx` |

---

## 2. Cambios en la lógica de negocio

Aprobadas, pero cada una **modifica una regla o los datos**, por eso se registró una decisión nueva (Dn) en el SDD.

| Id | Sugerencia | Regla afectada | Decisión | Cómo se resolvió |
|----|-----------|----------------|----------|------------------|
| S11 | Soporte bimoneda: precio base en $ con su equivalente en Bs. en Catálogo, Precios, Inventario, Caja, recibo y Reportes | D3 (un solo precio global) | ✅ Aprobada con ajuste · D18 | El precio base **sigue en USD** (D3 intacta). El equivalente en Bs. se calcula, no se guarda. Ver el ajuste de la tasa en S18 |
| S12 | Control de la tasa del día para el administrador | §2.2 (permisos) | ✅ Aprobada · D18 | Solo el administrador la edita, en Reportes. Se agregó una fila a la matriz de permisos |
| S13 | Bloquear el escaneo y el agregado hasta identificar o registrar al cliente | Alcance de Caja (§1) | ✅ Aprobada · D19 | Sin cliente, el área de producto queda deshabilitada con un aviso. Entra la entidad `Cliente` al modelo |
| S14 | Activar/desactivar sedes con un interruptor; las inactivas no operan en Caja ni Inventario | D14 | ✅ Aprobada · D20 | `setSedeActiva`; `aplicarSalida`, `registrarEntrada` y `setStockMinimo` rechazan sedes inactivas |
| S15 | Eliminar una sede solo si se creó por error (sin ventas, movimientos, stock ni usuarios) | D10 (los productos no se eliminan) | ✅ Aprobada con límite · D20 | Con historial se **rechaza** y se sugiere desactivar. Coherente con D10: no se borra lo que tiene historial |
| S16 | Mantener decimales para productos en `kg` (cantidad en carrito, ingreso y venta) | D6 y A6 (cantidades enteras) | ✅ Aprobada con enmienda · D15 | Solo `kg` admite hasta 3 decimales; el resto sigue entero. D6, A6 y el supuesto de §1 se reescribieron |

---

## 3. Sugerencias descartadas o redundantes

Ninguna de estas se aplicó **tal como estaba redactada**. Cada una cita la parte del SDD que lo justifica.

| Id | Sugerencia | Resultado | Justificación según el SDD |
|----|-----------|-----------|----------------------------|
| S17 | «Mostrar el botón `+ Nuevo producto` en Inventario **según permisos**» para el encargado | ❌ Descartada para el encargado | **§2.2:** crear y editar productos (F04–F06) es solo del administrador; el encargado ve el catálogo en solo lectura. El botón se muestra únicamente a `rafael` (**A15**: el rol sin permiso no ve los controles) |
| S18 | Variable **única** `exchangeRate` global (45,00) editable en tiempo real | ❌ Descartada en esa forma; **sustituida por tasa por día** | Una tasa global que cambia reescribiría el equivalente en Bs. de ventas ya cobradas y los reportes históricos, contra la regla de que **el precio base no se altera** y el cambio aplica solo a nuevas ventas (**§1, planteamiento 2**). Con `tasas[yyyy-mm-dd]` solo se edita la de hoy y cada venta guarda la suya (`Venta.tasa`) |
| S19 | Bloquear automáticamente la venta cuando el stock llega a 0, sin depender de que el administrador apague el producto | ⚪ Redundante: ya cubierta | **A9 y A10** ya impiden vender sin stock, y **D7/A19** hacen la venta atómica. El stock 0 ya bloquea; lo único que cambió fue **cómo se comunica** (S07). Se aclaró en D16 |
| S20 | Si una sede tiene historial, «**forzar** su desactivación» al intentar eliminarla | ❌ Descartada la parte «forzar» | Desactivar es una acción **deliberada** del administrador (**D14**, y el sistema exige al menos una sede activa). Forzarlo en silencio podría dejar sin sede operativa a sus usuarios. Se aplicó la otra mitad de la propuesta: rechazar y **sugerir** desactivar |
| S21 | Mantener **todo** en local y «**no hacer push**» | ⚪ No es una mejora | Es una instrucción de entrega, no una sugerencia sobre el producto. La parte de arquitectura (`localStorage`) coincide con **D2**, **D9** y **§1 Fuera de alcance** |
| S22 | Mantener la búsqueda por código de barras y el comodín `*` sin cambios | ⚪ No es una mejora | Es una restricción que el SDD ya fija (código de barras de 8 dígitos y búsqueda por terminación). Se verificó que S05–S08 no la alteran; hay pruebas automáticas de la lógica |

> **Criterio.** Se descarta una sugerencia cuando choca con un permiso, una decisión o un límite del SDD, o cuando el SDD ya la resuelve. Una sugerencia que choca con el SDD pero aporta valor **no se descarta**: se aprueba y el SDD se enmienda, con registro (S16 → D15). Eso evita que el documento y el prototipo se desalineen.

---

## 4. Enmiendas al SDD

El SDD (`ANALISIS.md`) se actualizó en la misma entrega. Estos puntos **cambiaron de texto**:

| Punto del SDD | Decía | Dice ahora | Origen |
|---------------|-------|------------|--------|
| D6 · §1 Supuestos · A6 | Cantidades de stock enteras | Enteras salvo `kg` (hasta 3 decimales) | S16 → **D15** |
| A9 | Producto agotado: no se muestra en el catálogo de caja | Se muestra **al final, deshabilitado** y con la alerta grande al intentar agregarlo | S07 → **D16** |
| A10 | Botón `+` deshabilitado y aviso pequeño | Banner grande con las cifras y botón para agregar el stock disponible | S07 → **D17** |
| §1 Supuestos (precio) | Precio base en USD | Precio base en USD con equivalente en Bs. según la tasa **de cada día** | S11, S18 → **D18** |
| §2.2 Permisos | Sin filas de tasa ni clientes | Filas para cambiar la tasa del día y registrar o editar clientes | S12, S13 → **D18, D19** |
| §4 Caminos alternativos | A1 a A19 | Se agregan **A20 a A24** | S13–S15, S18 |
| §5 Modelo de datos | 8 entidades | 12 entidades, con enlace a [`MODELO_DATOS.md`](MODELO_DATOS.md) | Esta entrega |
| §7 Decisiones | D1 a D14 | D1 a **D21** | S03–S21 |
