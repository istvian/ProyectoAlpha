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
