export interface LoginData {
  correo: string;
  password: string;
}

export interface RegisterData {
  correo: string;
  password: string;
  nombre: string;
}

export interface Response {
  mensaje: string;
  error: boolean;
}

export interface UserData {
  correo: string;
  rol: string;
  nombre: string;
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
