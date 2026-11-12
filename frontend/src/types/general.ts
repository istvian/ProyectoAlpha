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
  tipo: string;
  proveedor: string;
  rut: string;
  folio: string;
  emision: Date | string;
  vencimiento: Date | string;
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
export interface SalidaMateriales {
  obra: string;
  tecnico: string;
  producto: SalidaProducto[] | [];
}
export interface SalidaProducto {
  sku: string;
  nombre: string;
  cantidad: number;
}

export interface Proveedor {
  razon_social: string;
  deleted: boolean;
  id: number | null;
  rut: string;
}

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
