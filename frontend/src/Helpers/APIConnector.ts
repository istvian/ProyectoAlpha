import axios from "axios";
import type {
  LoginData,
  LoginResponse,
  ResponseBase,
  SystemLog,
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

//#region AUTH

export async function Login(
  formData: LoginData,
  onEnd: (response: ResponseBase) => void,
) {
  try {
    const url = "/users/login";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: LoginResponse & ResponseBase = (
      await api.post(url, formData)
    ).data;
    console.log(response);
    useSessionStore.getState().setExpiresAt(response.expires);
    onEnd(response);
  } catch (e) {
    console.error(e);
  }
}

export async function CheckAuth(): Promise<ResponseBase | null> {
  const url = "/users/check";
  console.log("Petición GET:" + BASE_URL + API_VERSION + url);
  const response = await api.get(url);
  return response.data;
}
export async function GetUserData(): Promise<(ResponseBase & UserData) | null> {
  const url = "/users/userdata";
  console.log("Petición GET:" + BASE_URL + API_VERSION + url);
  const response = await api.get(url);
  return response.data;
}
export async function RenewToken(): Promise<ResponseBase | null> {
  const url = "/users/renew";
  console.log("Petición GET:" + BASE_URL + API_VERSION + url);
  const response = await api.get(url);
  return response.data;
}
export async function LogOut(): Promise<ResponseBase | null> {
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
//#endregion

//#region ADMIN
export async function CreateNewUser(
  formData: UserData,
): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/admin/user";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.post(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function UpdateUser(
  formData: UserData,
): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/admin/user";
    console.log("Petición PATCH:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.patch(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function GetUserList(): Promise<ResponseBase<
  UserData[] | []
> | null> {
  try {
    const url = "/admin/users";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase<UserData[]> = (await api.get(url)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export async function GetLogs(
  cantidad: number = 20,
  pagina: number = 1,
): Promise<ResponseBase<SystemLog[] | []> | null> {
  try {
    const url = "/admin/logs";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase<SystemLog[]> = (
      await api.get(url, {
        params: {
          cantidad: cantidad,
          pagina: pagina,
        },
      })
    ).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}
//#endregion
