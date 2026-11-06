import axios from "axios";
import type {
  LoginData,
  RegisterData,
  LoginResponse,
  Response,
  UserData,
} from "../types/general";
import { useSessionStore } from "../Stores/session";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const API_VERSION = "/api/v1";

console.log(BASE_URL);

const api = axios.create({
  baseURL: BASE_URL + API_VERSION, // Pon aquí la URL de tu backend
  withCredentials: true, // La clave: todas las peticiones de esta instancia llevarán credenciales
});

export async function Login(
  formData: LoginData,
  onEnd: (response: Response) => void,
) {
  try {
    const url = "/users/login";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: LoginResponse & Response = (await api.post(url, formData))
      .data;
    console.log(response);
    useSessionStore.getState().setExpiresAt(response.expires);
    onEnd(response);
  } catch (e) {
    console.error(e);
  }
}

export async function Register(
  formData: RegisterData,
  onEnd: (response: Response) => void,
) {
  try {
    const url = "/users/register";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response = await api.post(url, formData);
    console.log(response.data);
    onEnd(response.data);
  } catch (e) {
    console.error(e);
  }
}
export async function CheckAuth(): Promise<Response | null> {
  const url = "/users/check";
  console.log("Petición GET:" + BASE_URL + API_VERSION + url);
  const response = await api.get(url);
  return response.data;
}
export async function GetUserData(): Promise<(Response & UserData) | null> {
  const url = "/users/userdata";
  console.log("Petición GET:" + BASE_URL + API_VERSION + url);
  const response = await api.get(url);
  return response.data;
}
export async function RenewToken(): Promise<Response | null> {
  const url = "/users/renew";
  console.log("Petición GET:" + BASE_URL + API_VERSION + url);
  const response = await api.get(url);
  return response.data;
}
export async function LogOut(): Promise<Response | null> {
  try {
    const url = "/users/logout";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response = await api.get(url);
    console.log(response.data);
    return response.data;
  } catch (e) {
    console.error(e);
    return null;
  }
}
