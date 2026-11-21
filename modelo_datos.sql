-- SuperPOS · Modelo de datos relacional (v0.7)
-- Traducción del modelo que hoy vive en localStorage (lib/types.ts + lib/store.ts) a SQL estándar.
-- Compatible con PostgreSQL y SQLite (las columnas booleanas usan 0/1 con CHECK).
-- Convención: los campos marcados "★" no existen hoy en el prototipo; son la forma relacional
-- de un dato que el prototipo guarda de manera implícita (ver MODELO_DATOS.md §5).
-- Las reglas que SQL no puede expresar con CHECK (venta atómica, "al menos un administrador/sede
-- activa", sede eliminable solo sin historial) siguen en la capa de aplicación o en triggers.

PRAGMA foreign_keys = ON;  -- solo SQLite; en PostgreSQL las claves foráneas siempre se validan

-- ---------------------------------------------------------------- catálogos
CREATE TABLE sede (
  id         VARCHAR(16)  PRIMARY KEY,                     -- 's1', 'S-2001'
  codigo     VARCHAR(16)  NOT NULL UNIQUE,                 -- CENTRO; app: ^[A-Z0-9-]{2,16}$
  nombre     VARCHAR(80)  NOT NULL CHECK (length(trim(nombre)) >= 2),
  estado     VARCHAR(60)  NOT NULL CHECK (length(trim(estado)) > 0),
  ciudad     VARCHAR(60)  NOT NULL CHECK (length(trim(ciudad)) > 0),
  direccion  VARCHAR(200) NOT NULL CHECK (length(trim(direccion)) > 0),
  activa     BOOLEAN      NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
  CHECK (codigo = upper(codigo) AND length(codigo) BETWEEN 2 AND 16)
);

CREATE TABLE categoria (                                  -- ★ hoy: constante CATEGORIAS + PREFIJOS_CATEGORIA
  nombre   VARCHAR(40) PRIMARY KEY,
  prefijo  CHAR(1)     NOT NULL CHECK (prefijo = upper(prefijo))  -- L-001, B-002…; 'O' = otras
);

CREATE TABLE unidad_medida (                              -- ★ hoy: constante UNIDADES
  nombre            VARCHAR(20) PRIMARY KEY,              -- unidad, kg, litro, paquete, caja, botella
  admite_decimales  BOOLEAN     NOT NULL DEFAULT 0 CHECK (admite_decimales IN (0, 1))  -- solo kg = 1 (D15)
);

CREATE TABLE usuario (
  username  VARCHAR(30)  PRIMARY KEY CHECK (username = lower(username) AND length(username) BETWEEN 3 AND 30),
  name      VARCHAR(80)  NOT NULL CHECK (length(trim(name)) >= 2),
  role      VARCHAR(10)  NOT NULL CHECK (role IN ('admin', 'inventario', 'cajero')),
  sede_id   VARCHAR(16)  NOT NULL REFERENCES sede (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  activo    BOOLEAN      NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  password  VARCHAR(100) NOT NULL     -- prototipo: texto plano de demostración; en producción, hash (bcrypt/argon2)
);

CREATE TABLE producto (
  codigo         VARCHAR(16)   PRIMARY KEY CHECK (codigo = upper(codigo) AND length(codigo) BETWEEN 2 AND 16),
  codigo_barras  CHAR(8)       UNIQUE CHECK (codigo_barras IS NULL OR (length(codigo_barras) = 8 AND codigo_barras NOT GLOB '*[^0-9]*')),
  nombre         VARCHAR(120)  NOT NULL CHECK (length(trim(nombre)) >= 2),
  categoria      VARCHAR(40)   NOT NULL REFERENCES categoria (nombre) ON UPDATE CASCADE ON DELETE RESTRICT,
  unidad_medida  VARCHAR(20)   NOT NULL REFERENCES unidad_medida (nombre) ON UPDATE CASCADE ON DELETE RESTRICT,
  precio_global  NUMERIC(12,2) NOT NULL CHECK (precio_global >= 0),     -- USD (D3, D18)
  activo         BOOLEAN       NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))  -- los productos no se eliminan (D10)
);

CREATE TABLE cliente (
  cedula             VARCHAR(18)  PRIMARY KEY CHECK (substr(cedula, 1, 2) IN ('V-', 'E-', 'J-', 'G-')),  -- normalizada: V-12345678
  nombres            VARCHAR(120) NOT NULL CHECK (length(trim(nombres)) >= 2),       -- razón social si J-/G-
  apellidos          VARCHAR(80)  NOT NULL DEFAULT '',                               -- vacío para J-/G-
  telefono           VARCHAR(16)  NOT NULL CHECK (length(telefono) BETWEEN 10 AND 16),
  direccion          VARCHAR(300) NOT NULL CHECK (length(trim(direccion)) > 0),
  telefono_conocido  VARCHAR(16)  CHECK (telefono_conocido IS NULL OR length(telefono_conocido) BETWEEN 7 AND 16),
  CHECK (substr(cedula, 1, 1) IN ('J', 'G') OR length(trim(apellidos)) >= 2)
);

CREATE TABLE tasa_dia (                                   -- tasa Bs/$ por día; solo la de hoy es editable (D18)
  fecha  DATE         PRIMARY KEY,                        -- clave yyyy-mm-dd, hora local
  tasa   NUMERIC(12,2) NOT NULL CHECK (tasa > 0 AND tasa <= 10000000)
);

-- ------------------------------------------------------------- inventario
CREATE TABLE existencia (
  sede_id          VARCHAR(16)   NOT NULL REFERENCES sede (id)      ON UPDATE CASCADE ON DELETE RESTRICT,
  producto_codigo  VARCHAR(16)   NOT NULL REFERENCES producto (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  cantidad         NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad >= 0 AND cantidad <= 100000),
  stock_minimo     INTEGER       NOT NULL DEFAULT 5 CHECK (stock_minimo BETWEEN 0 AND 100000),
  habilitado       BOOLEAN       NOT NULL DEFAULT 0 CHECK (habilitado IN (0, 1)),   -- D4
  PRIMARY KEY (sede_id, producto_codigo)
);

-- ------------------------------------------------------------------ ventas
CREATE TABLE venta (
  id               VARCHAR(16)   PRIMARY KEY,             -- 'V-2001'
  sede_id          VARCHAR(16)   NOT NULL REFERENCES sede (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  cliente_cedula   VARCHAR(18)   REFERENCES cliente (cedula) ON UPDATE CASCADE ON DELETE RESTRICT,  -- NULL solo en ventas de ejemplo anteriores al control de cliente (D19)
  fecha            TIMESTAMP     NOT NULL,
  total            NUMERIC(14,2) NOT NULL CHECK (total >= 0),                         -- USD
  metodo           VARCHAR(13)   NOT NULL CHECK (metodo IN ('efectivo', 'tarjeta', 'transferencia')),
  cajero_nombre    VARCHAR(80)   NOT NULL,                -- copia del nombre al cobrar (sobrevive a la baja del usuario)
  cajero_username  VARCHAR(30)   REFERENCES usuario (username) ON UPDATE CASCADE ON DELETE SET NULL,  -- ★
  recibido         NUMERIC(14,2),                         -- solo efectivo
  tasa             NUMERIC(12,2) NOT NULL CHECK (tasa > 0),  -- tasa Bs/$ vigente al cobrar (D18)
  CHECK ((metodo = 'efectivo' AND recibido IS NOT NULL AND recibido >= total)
      OR (metodo <> 'efectivo' AND recibido IS NULL))                                -- A11
);

CREATE TABLE venta_item (                                 -- hoy: Venta.items[]
  venta_id         VARCHAR(16)   NOT NULL REFERENCES venta (id) ON UPDATE CASCADE ON DELETE CASCADE,
  linea            SMALLINT      NOT NULL CHECK (linea >= 1),                          -- ★ posición en el arreglo
  producto_codigo  VARCHAR(16)   NOT NULL REFERENCES producto (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  nombre           VARCHAR(120)  NOT NULL,                -- copia al cobrar
  unidad_medida    VARCHAR(20)   NOT NULL,                -- copia al cobrar
  cantidad         NUMERIC(12,3) NOT NULL CHECK (cantidad > 0 AND cantidad <= 100000),
  precio           NUMERIC(12,2) NOT NULL CHECK (precio >= 0),                         -- USD congelado al cobrar
  PRIMARY KEY (venta_id, linea),
  UNIQUE (venta_id, producto_codigo)                      -- el carrito fusiona líneas del mismo producto
);

CREATE TABLE movimiento_inventario (
  id               VARCHAR(16)   PRIMARY KEY,             -- 'M-2002'
  sede_id          VARCHAR(16)   NOT NULL,
  producto_codigo  VARCHAR(16)   NOT NULL,
  fecha            TIMESTAMP     NOT NULL,
  tipo             VARCHAR(7)    NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),       -- D6
  cantidad         NUMERIC(12,3) NOT NULL CHECK (cantidad > 0 AND cantidad <= 100000),
  motivo           VARCHAR(120)  NOT NULL,
  venta_id         VARCHAR(16)   REFERENCES venta (id) ON UPDATE CASCADE ON DELETE RESTRICT,  -- ★ NULL en entradas
  FOREIGN KEY (sede_id, producto_codigo) REFERENCES existencia (sede_id, producto_codigo)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE cambio_precio (
  id               VARCHAR(16)   PRIMARY KEY,             -- 'H-2003'
  producto_codigo  VARCHAR(16)   NOT NULL REFERENCES producto (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  nombre           VARCHAR(120)  NOT NULL,                -- copia del nombre al cambiar el precio
  anterior         NUMERIC(12,2) NOT NULL CHECK (anterior >= 0),
  nuevo            NUMERIC(12,2) NOT NULL CHECK (nuevo >= 0),
  fecha            TIMESTAMP     NOT NULL,
  usuario          VARCHAR(30)   REFERENCES usuario (username) ON UPDATE CASCADE ON DELETE SET NULL,  -- NULL = 'sistema' o usuario dado de baja
  CHECK (nuevo <> anterior)                               -- A4
);

-- ----------------------------------------------------------------- índices
-- Las claves primarias y las restricciones UNIQUE ya crean su índice; aquí solo los secundarios.
CREATE INDEX ix_usuario_sede            ON usuario (sede_id);
CREATE INDEX ix_producto_nombre         ON producto (nombre);                              -- búsqueda por nombre
CREATE INDEX ix_producto_categoria      ON producto (categoria);
CREATE INDEX ix_producto_activo         ON producto (codigo) WHERE activo = 1;             -- catálogo de caja
CREATE INDEX ix_cliente_nombre          ON cliente (nombres, apellidos);                   -- directorio de clientes
CREATE INDEX ix_existencia_producto     ON existencia (producto_codigo);                   -- sedes de un producto
CREATE INDEX ix_existencia_sede_hab     ON existencia (sede_id) WHERE habilitado = 1;      -- stock operativo de una sede
CREATE INDEX ix_venta_sede_fecha        ON venta (sede_id, fecha);                         -- reportes por sede y por día
CREATE INDEX ix_venta_fecha             ON venta (fecha);                                  -- reporte global Por Día / Semanal
CREATE INDEX ix_venta_cliente           ON venta (cliente_cedula);
CREATE INDEX ix_venta_cajero            ON venta (cajero_username);                        -- ranking de cajeros
CREATE INDEX ix_item_producto           ON venta_item (producto_codigo);                   -- ranking de productos
CREATE INDEX ix_mov_sede_fecha          ON movimiento_inventario (sede_id, fecha DESC);    -- pestaña Movimientos
CREATE INDEX ix_mov_producto            ON movimiento_inventario (producto_codigo, sede_id);
CREATE INDEX ix_mov_venta               ON movimiento_inventario (venta_id);
CREATE INDEX ix_cambio_precio_producto  ON cambio_precio (producto_codigo, fecha DESC);    -- historial de precios

-- -------------------------------------------------------- datos de catálogo
INSERT INTO unidad_medida (nombre, admite_decimales) VALUES
  ('unidad', 0), ('kg', 1), ('litro', 0), ('paquete', 0), ('caja', 0), ('botella', 0);

INSERT INTO categoria (nombre, prefijo) VALUES
  ('Lácteos', 'L'), ('Panadería', 'P'), ('Bebidas', 'B'), ('Despensa', 'A'),
  ('Frutas y verduras', 'F'), ('Carnes', 'R'), ('Limpieza', 'M'), ('Cuidado personal', 'C');
