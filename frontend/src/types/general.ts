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
  emision: Date;
  vencimiento: Date;
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
  importeBase: number;
  total: number;
  cantidadProductos: number;
  descuentoTotal: number;
  subtotal: number;
  iva: number;
}

export interface Producto {
  nombre: string;
  descripcion: string;
  stock: number;
  stockMinimo: number;
  precioNeto: number;
  importeBase: number;
  costoNeto: number;
  netoFinal: number;
}
export const Rol = {
  cualquiera: 0,
  admin: 1,
  bodega: 2,
  finanzas: 3,
  supervisor: 4,
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
