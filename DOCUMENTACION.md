# 📘 SuperPOS · Documentación de la Transformación y Guía de Uso Local

**Preparado para:** Gipsander Urdaneta  
**Proyecto:** Sistema de Punto de Venta e Inventario (SuperPOS)  
**Tecnologías:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, LocalStorage (Sin base de datos externa).

---

## 🚀 Parte 1: Resumen de lo que se hizo (La Migración)

Transformamos el prototipo original (que consistía en archivos de Vanilla HTML, CSS y JS sueltos) en una **aplicación web moderna, interactiva y robusta** utilizando los estándares actuales de la industria, optimizando el rendimiento y el trabajo en equipo.

### 1. Reconstrucción y Nueva Arquitectura
* **Ecosistema Moderno:** Implementamos **Next.js 16** y **React 19** para lograr una aplicación que carga al instante y se organiza mediante componentes modulares.
* **Tipado Seguro (TypeScript):** Todo el sistema (productos, ventas, inventarios, movimientos) ahora está estructurado bajo reglas de TypeScript. Esto evita errores comunes de programación y asegura que el software sea predecible y escalable.
* **Estilos de Vanguardia:** Implementamos **Tailwind CSS v4** para asegurar un diseño visual impecable, moderno y adaptable a pantallas de computadoras y dispositivos móviles.

### 2. Capa de Datos 100% Local (Sin Bases de Datos en la Nube)
* Creamos un almacén de datos inteligente en `lib/store.ts` que se guarda automáticamente en el **`localStorage`** de la computadora de cada usuario (bajo la clave `superpos.store.v2`).
* Al no requerir conexiones a servidores externos ni bases de datos en la nube, **la información es totalmente privada**, no consume ancho de banda y no requiere configuraciones complejas para empezar.

### 3. Integración de Avances del Equipo
Reunimos en una sola aplicación el alcance de cada integrante:
* **Módulos de Gipsander (Inventario):** Catálogo de productos (F04-F06) con matriz de habilitación por sedes, control y registro histórico de Precios (F07), y Gestión de Inventario (F11-F13) con ingreso rápido y alertas inteligentes de stock faltante o agotado en tiempo real.
* **Módulos de Luis (Ventas y Administración):** Punto de venta (POS) interactivo con carrito inteligente que previene sobreventas, cobros en efectivo/tarjeta/transferencia y generación de recibo imprimible; junto a un Panel Gerencial (Dashboard) con métricas clave y tres gráficos visuales (SVG) que reaccionan de inmediato a las ventas. *Nota: el repositorio no contenía código previo de estos módulos (solo un espacio reservado), por lo que fueron desarrollados durante esta migración, conectados al mismo almacén de datos. Luis puede revisarlos y ajustarlos.*
* **Layout y Seguridad (Rafael):** Se migró el inicio de sesión y la navegación del prototipo original de Rafael: Navbar y Sidebar interactivos que adaptan la interfaz de usuario automáticamente según el rol del usuario que inicia sesión. Los módulos de **Usuarios y roles** y **Sedes** siguen **pendientes** y se muestran como "Próximamente".

---

## 📁 Parte 2: ¿Cómo quedó organizado el código?

```text
Superpos-prototipo/
├── app/                  # Rutas y páginas de la aplicación (Next.js)
│   ├── globals.css       # Estilos globales y paleta de colores de la marca
│   └── layout.tsx        # Estructura visual de la página
├── components/           # Los bloques de construcción visuales (React)
│   ├── app.tsx           # Menú, navegación y control de roles
│   ├── ui/               # Componentes base: botón, insignias de stock, modal accesible, avisos, formularios, tablas
│   ├── inventory/        # Catálogo, Precios e Inventario (Gipsander)
│   ├── pos/              # Punto de Venta / Caja (Luis)
│   └── admin/            # Panel de Control y reportes con gráficos (Luis)
├── lib/                  # El cerebro del sistema (Lógica y Datos)
│   ├── store.ts          # Gestión del inventario y ventas (LocalStorage)
│   ├── auth.ts           # Cuentas de demostración de Rafael, Gipsander y Luis
│   └── types.ts          # Reglas y formatos de datos (TypeScript)
├── public/               # Imágenes y recursos estáticos (logo.svg)
├── README.md             # Instrucciones de uso e instalación
├── ANALISIS.md           # Análisis del sistema: alcance, reglas, caminos alternativos y decisiones
└── DOCUMENTACION.md      # Este documento con la explicación del desarrollo
```

---

## 🧪 Parte 3: Guía de uso local (para probarlo de forma sencilla y segura)

### Encender y apagar
1. Abre una terminal en la carpeta del proyecto.
2. **Solo la primera vez:** `npm install`.
3. Enciende la app con `npm run dev` y abre **http://127.0.0.1:3000**.
4. Para apagarla, pulsa `Ctrl+C` en la terminal.

No hace falta ejecutar ningún otro comando de npm para probarla. El detalle de cuáles son opcionales está en el `README.md`.

### Seguridad y privacidad
* El servidor escucha únicamente en `127.0.0.1`: solo se puede abrir desde tu propio equipo.
* No hay base de datos ni servicios externos: los datos viven en el `localStorage` del navegador. Para volver a los datos de ejemplo, ejecuta `localStorage.clear()` en la consola y recarga.
* Las cuentas son ficticias y públicas (contraseña `admin`); el acceso solo simula roles y **no es seguridad real**.

### Cuentas de demostración

| Usuario | Contraseña | Perfil | Qué puede hacer |
| --- | --- | --- | --- |
| `rafael` | `admin` | Administrador | Todas las sedes: catálogo, precios, inventario, caja y reportes |
| `gipsander` | `admin` | Encargado de inventario | Sedes Centro y Norte: stock, ingresos y mínimos; catálogo y precios solo lectura |
| `luis` | `admin` | Cajero | Punto de venta de la sede Centro |

### Recorrido de prueba (unos 5 minutos)
1. **Cajero (`luis`):** agrega productos al carrito, pulsa *Cobrar*, elige *Efectivo* con *Monto exacto* y confirma. Se muestra el recibo y el stock del producto baja.
2. **Encargado (`gipsander`):** en *Stock y faltantes*, filtra por *Agotados*, usa *Ingresar* para sumar mercancía y observa cómo cambia el estado a *Disponible*. En *Stock mínimo*, sube un mínimo y la alerta se actualiza al instante.
3. **Administrador (`rafael`):** en *Precios* cambia el precio de un producto y revisa el historial; en *Productos* registra uno nuevo y habilítalo en una sede; en *Reportes* verifica que las ventas y movimientos aparecen en los indicadores y gráficos.

### Regla de alertas de stock
Un producto está **Agotado** si su cantidad es 0, y tiene **Stock bajo** si su cantidad es menor que el stock mínimo de la sede. La tabla indica cuántas unidades faltan para llegar al mínimo.
