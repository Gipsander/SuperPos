# 📘 SuperPOS: todo lo que se hizo hoy (21/11/2026)

## 1. Cómo traer los cambios

```bash
git pull
npm install
npm run dev
```

Abre `http://127.0.0.1:3000` e inicia sesión con `rafael`, `gipsander` o `luis` (contraseña `admin`). Si ya habían usado la app, sus datos del navegador se migran solos.

## 2. Qué cambió en la app

**💱 Bimoneda ($ y Bs.)**

- Los precios base siguen en dólares y se muestran junto a su equivalente en bolívares (`$10.00` / `Bs. 450,00`) en Catálogo, Precios, Inventario, Caja, recibo y Reportes.
- Cada día tiene su propia tasa (por defecto 45). **Rafael** solo puede cambiar la de **hoy**, en Reportes. Los días anteriores quedan cerrados y cada venta conserva la tasa con la que se cobró.

**🛒 Caja (Luis)**

- No se puede escanear ni agregar productos hasta identificar al cliente.
- Botón **Ver todos los clientes**, con buscador por cédula/RIF o nombre.
- El producto agregado sube al principio del carrito, y cada cantidad tiene botones `-` y `+`. Los productos en kg admiten hasta 3 decimales.
- **Stock insuficiente:** aparece un banner rojo con las cifras y un botón para agregar lo disponible.
- Los atajos (`Enter`, `F2`, `F3`, `F8`, `*1234`) tienen su etiqueta y su botón, así que se puede operar solo con mouse.

**📦 Inventario (Gipsander y Rafael)**

- El ingreso de mercancía se hace en la fila del producto con **Guardar Ingreso**. El historial está en la pestaña **Movimientos**.
- El buscador filtra por nombre, código interno o código de barras.
- **+ Nuevo producto** aparece solo para Rafael, porque el encargado no puede crear productos.
- Al crear o editar un producto hay una casilla para marcar todas las sedes.

**🏬 Sedes (Rafael)**

- Interruptor para activar o desactivar cada sede. Las inactivas no aparecen en Caja ni en Inventario.
- Una sede solo se puede eliminar si no tiene ventas, movimientos, stock ni usuarios. Si los tiene, el sistema sugiere desactivarla.

**📊 Reportes (Rafael)**

- Las gráficas se ven **Por Día** (con selector de fecha y ventas por hora) o **Semanal** (últimos 7 días).

**🔒 Seguridad:** Next.js pasó de la 16.4.3 a la 16.4.6.

## 3. Documentación nueva

| Documento | Para qué sirve |
|---|---|
| [`ANALISIS.md`](ANALISIS.md) (v0.7) | El análisis del sistema (SDD). Ahora incluye las decisiones **D15 a D21** y los casos **A20 a A24**. |
| [`CLASIFICACION_SUGERENCIAS.md`](CLASIFICACION_SUGERENCIAS.md) | Las 22 sugerencias de la evaluación: 10 de UX/UI, 6 de lógica de negocio y 6 descartadas o redundantes, cada una con su justificación. |
| [`MODELO_DATOS.md`](MODELO_DATOS.md) | Diagrama Entidad–Relación y diccionario de datos de las 12 entidades (tipos, claves, restricciones e índices). |
| [`modelo_datos.sql`](modelo_datos.sql) | Esquema relacional ejecutable en PostgreSQL y SQLite. |
| [`GUIA_DE_USUARIO.md`](GUIA_DE_USUARIO.md) | Paso a paso y matriz de pruebas **V1 a V16**. |

**Para ver el diagrama ER:** abre `MODELO_DATOS.md` en GitHub y se dibuja solo. Para llevarlo a un Word o PDF, pega el bloque Mermaid en [mermaid.live](https://mermaid.live) (sin las líneas ` ``` `) y exporta PNG o SVG.

## 4. Cumplimiento de lo propuesto

| Lo propuesto | Estado |
|---|---|
| Clasificar las sugerencias (UX/UI, lógica, descartadas con justificación del SDD) | ✅ `CLASIFICACION_SUGERENCIAS.md` |
| Aplicar las mejoras aprobadas | ✅ Las 16 aprobadas están en el prototipo |
| Completar el modelo ER (tipos, PK, FK, restricciones, índices) | ✅ `MODELO_DATOS.md` y `modelo_datos.sql` |
| Diagrama ER y diccionario de datos | ✅ `MODELO_DATOS.md` |
| Prototipo actualizado | ✅ En `main` |

## 5. Lo que hay que saber

- **No hay una base de datos funcionando.** El entregable es el **diseño** (modelo, diccionario y script). La app sigue guardando en el `localStorage` del navegador. Conectarla a una base real es la fase F5 y sigue pendiente.
- El SDD se enmendó donde la app ya no coincidía con él: kg con decimales (D15), agotados visibles en Caja (D16) y banner de stock (D17).
- No hay pruebas automáticas de la interfaz, solo de la lógica (24 pruebas, todas pasan). Lo visual conviene probarlo a mano con la matriz **V1 a V16**.
