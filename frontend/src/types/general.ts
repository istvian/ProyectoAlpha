export interface LoginData {
  correo: string;
  password: string;
}

export interface LoginResponse {
  user_id: number;
  expires: number;
}
export interface ResponseBase<T = null> {
  mensaje: string;
  error: boolean;
  data?: T | null;
}

export interface UserData {
  correo: string;
  rol: string;
  rol_id: number;
  nombre: string;
  password?: string;
  enabled?: boolean;
  created?: string;
  id?: string;
}
export interface SystemLog {
  _id: string;
  fecha: Date;
  fecha_local: string;
  usuario: string;
  evento: string;
  resultado: string;
  ipOrigen: string;
  consulta: {
    method: string;
    path: string;
    query: string;
  };
}

export interface DocumentoTributario {
  tipo: TipoDocumentoTributario;
  proveedor: string;
  rut: string;
  folio: string;
  emision: Date | string;
  vencimiento: Date | string;
  fecha_ingreso?: Date | string | null;
  datos_dte?: Record<string, unknown> | null;
  productos: Producto[] | [];
  observaciones: string;
  descuento1: number;
  sobreDescuento1: number;
  montoDescuento1: number;
  saldoDescuento1: number;
  descuento2: number;
  sobreDescuento2: number;
  montoDescuento2: number;
  saldoDescuento2: number;
  descuento3: number;
  sobreDescuento3: number;
  montoDescuento3: number;
  saldoDescuento3: number;
  importe_base: number;
  total: number;
  cantidad_productos: number;
  descuento_total: number;
  subtotal: number;
  iva: number;
  proveedor_id?: number;
}
export type FacturaCreate = Omit<DocumentoTributario, "tipo"> & {
  tipo: "Factura";
  orden_compra_id?: number;
};
export interface OrdenCompraDetalle {
  id: number;
  articulo_id: number;
  sku: string | null;
  nombre: string;
  cantidad_solicitada: number;
  cantidad_recibida: number;
  saldo_pendiente: number;
  cantidad_facturada: number;
  cantidad_por_facturar: number;
  precio_unitario: string;
}
export interface OrdenCompra {
  id: number;
  numero_orden: string;
  proveedor_id: number;
  proveedor: string;
  estado: "ABIERTA" | "PARCIAL" | "COMPLETA";
  creado_por: string;
  fecha_creacion: string;
  recepcion_pendiente: boolean;
  detalles: OrdenCompraDetalle[];
}
export interface OrdenCompraCreate {
  numero_orden: string;
  proveedor_id: number;
  detalles: {
    articulo_id: number;
    cantidad_solicitada: number;
    precio_unitario: number;
  }[];
}
export interface RecepcionDetalleInput {
  detalle_orden_id: number;
  cantidad_guia: number;
  cantidad_recibida: number;
}
export interface RecepcionCompraCreate {
  orden_compra_id: number;
  numero_guia: string;
  bultos_guia: number;
  bultos_recibidos: number;
  observaciones?: string;
  detalles: RecepcionDetalleInput[];
}
export interface RecepcionCompra {
  id: number;
  comprobante: string;
  orden_compra_id: number;
  numero_orden: string;
  proveedor: string;
  numero_guia: string;
  bultos_guia: number;
  bultos_recibidos: number;
  estado: "PENDIENTE_APROBACION" | "APROBADA";
  observaciones?: string | null;
  detalle_discrepancia?: string | null;
  usuario: string;
  fecha: string;
  detalles: {
    sku: string | null;
    articulo: string;
    cantidad_solicitada: number;
    cantidad_guia: number;
    cantidad_recibida: number;
  }[];
}
export type EstadoConteoInventario =
  | "PENDIENTE_APROBACION"
  | "APROBADO"
  | "RECHAZADO"
  | "SIN_DIFERENCIAS";

export interface ConteoInventarioArticulo {
  id: number;
  codigo_sku: string | null;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
}

export interface DetalleConteoInventario {
  articulo_id: number;
  sku: string | null;
  articulo: string;
  stock_sistema: number;
  cantidad_contada: number;
  diferencia: number;
}

export interface ConteoInventario {
  id: number;
  codigo: string;
  estado: EstadoConteoInventario;
  creado_por: string;
  resuelto_por: string | null;
  fecha: string;
  fecha_revision: string | null;
  observaciones: string | null;
  motivo_rechazo: string | null;
  detalles: DetalleConteoInventario[];
}

export interface ConteoInventarioCreate {
  observaciones?: string;
  detalles: {
    articulo_id: number;
    stock_sistema: number;
    cantidad_contada: number;
  }[];
}

export interface SalidaMateriales {
  obra: string;
  tecnico: string;
  producto: SalidaProducto[] | [];
}
export interface SalidaProducto {
  sku: string;
  nombre: string;
  cantidad: number;
  articulo_id: number;
}
export interface EgresoCatalogos {
  articulos: {
    id: number;
    codigo_sku: string | null;
    nombre: string;
    stock_actual: number;
    stock_minimo: number;
    precio_lista: number | string | null;
  }[];
  obras: {
    id: number;
    codigo_obra: string;
    nombre_obra: string;
    tecnico_responsable_id: number;
    tecnico_responsable_nombre: string;
  }[];
  tecnicos: {
    id: number;
    nombre: string;
    correo: string;
  }[];
}
export interface EgresoCreate {
  obra_id: number;
  tecnico_id: number;
  detalles: {
    producto_id: number;
    cantidad: number;
  }[];
}
export interface MermaCreate {
  articulo_id: number;
  cantidad: number;
  obra_id: number;
  motivo: string;
}
export interface MermaRegistro {
  id: number;
  articulo_id: number;
  articulo: string;
  cantidad: number;
  motivo: string;
  obra_id: number;
  obra: string;
  usuario: string;
  stock_resultante: number;
  fecha: string;
}
export interface UsoInternoCreate {
  articulo_id: number;
  cantidad: number;
  destino_material: string;
  responsable_solicitud: string;
}
export interface UsoInternoRegistro {
  id: number;
  articulo_id: number;
  articulo: string;
  cantidad: number;
  destino_material: string;
  responsable_solicitud: string;
  stock_resultante: number;
  fecha: string;
}

export interface Proveedor {
  razon_social: string;
  deleted: boolean;
  id: number | null;
  rut: string;
  direccion?: string | null;
  region?: string | null;
  comuna?: string | null;
  ciudad?: string | null;
  contactos_jsonb?: Record<string, unknown> | null;
}

export type TipoDocumentoTributario =
  | "Factura"
  | "Boleta"
  | "Nota de Crédito";

export interface Producto {
  sku: string;
  nombre: string;
  descripcion: string;
  stock: number;
  stock_minimo: number;
  precio_neto: number;
  importe_base: number;
  costo_neto: number;
  neto_final: number;
}
export const Rol = {
  cualquiera: 0,
  admin: 1,
  bodega: 2,
  finanzas: 3,
  supervisor: 4,
  tecnico: 5,
} as const;
export type Rol = (typeof Rol)[keyof typeof Rol];

export interface Articulo {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  ubicacion: string;
}

export interface Obra {
  id: string | null;
  codigo_obra: string;
  nombre_obra: string;
  tipo_servicio: string;
  tecnico_responsable_mail: string;
  tecnico_responsable_id?: number;
  enabled: boolean;
  fecha_creacion: Date | string;
}

export type CardexTipoMovimiento =
  | "ENTRADA_COMPRA"
  | "SALIDA_OBRA"
  | "MERMA"
  | "DEVOLUCION"
  | "USO_INTERNO"
  | "AJUSTE_INVENTARIO";

export interface CardexMovimiento {
  id: number;
  fecha_hora: string;
  producto: {
    id: number;
    nombre: string;
    codigo_sku: string | null;
  };
  usuario: {
    id: number;
    nombre: string;
  };
  tipo_movimiento: CardexTipoMovimiento;
  cantidad: number;
  saldo_resultante: number;
  obra: {
    id: number;
    codigo_obra: string;
    nombre_obra: string;
  } | null;
  motivo_justificacion: string;
  costo_unitario: number | string;
  saldo_valorizado: number | string;
}

export interface CardexFiltrosConsulta {
  desde?: string;
  hasta?: string;
  producto_id?: number;
  obra_id?: number;
  tipo_movimiento?: CardexTipoMovimiento;
}

export interface CardexConsulta extends CardexFiltrosConsulta {
  pagina: number;
  cantidad: number;
  buscar?: string;
}

export interface CardexRespuesta {
  error: boolean;
  mensaje: string;
  data: CardexMovimiento[];
  paginacion: {
    pagina: number;
    cantidad: number;
    total: number;
    total_paginas: number;
  };
}

export interface CardexFiltrosRespuesta {
  error: boolean;
  mensaje: string;
  data: {
    productos: {
      id: number;
      nombre: string;
      codigo_sku: string | null;
    }[];
    obras: {
      id: number;
      codigo_obra: string;
      nombre_obra: string;
    }[];
    tipos_movimiento: CardexTipoMovimiento[];
  };
}

export interface CardexResumen {
  fecha: string;
  movimientos: number;
  entradas: number;
  salidas: number;
  ajustes: number;
  por_tipo: Record<CardexTipoMovimiento, number>;
}

export interface AdminDashboardData {
  productos: number;
  valor_inventario: string;
  stock_critico: number;
  movimientos_hoy: CardexResumen;
  usuarios_activos: number;
  usuarios_por_rol: Record<string, number>;
  mermas_registradas: number;
  proveedores_activos: number;
}

export type CardexFormatoReporte = "pdf" | "excel";
