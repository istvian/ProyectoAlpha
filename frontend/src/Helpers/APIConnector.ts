import axios from "axios";
import type {
  CardexConsulta,
  CardexFiltrosConsulta,
  CardexFiltrosRespuesta,
  CardexFormatoReporte,
  CardexRespuesta,
  DocumentoTributario,
  FacturaCreate,
  LoginData,
  LoginResponse,
  Obra,
  Proveedor,
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

//#region  Finanzas
export async function CreateFactura(
  formData: FacturaCreate,
): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/finanzas/factura";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.post(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function GetFacturas(): Promise<ResponseBase<
  DocumentoTributario[] | []
> | null> {
  try {
    const url = "/finanzas/factura";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase<DocumentoTributario[]> = (await api.get(url))
      .data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function GetProveedores(): Promise<ResponseBase<
  Proveedor[] | []
> | null> {
  try {
    const url = "/proveedor";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase<Proveedor[]> = (await api.get(url)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function CreateProveedor(
  formData: Proveedor,
): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/proveedor";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.post(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export async function EditarProveedor(
  formData: Proveedor,
): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/proveedor";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.patch(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function GetTecnicos(): Promise<ResponseBase<
  UserData[] | []
> | null> {
  try {
    const url = "/finanzas/tecnicos";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase<UserData[]> = (await api.get(url)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export async function GetObras(): Promise<ResponseBase<Obra[] | []> | null> {
  try {
    const url = "/obras";
    console.log("Petición GET:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase<Obra[]> = (await api.get(url)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export async function CreateObra(formData: Obra): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/obras";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.post(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export async function EditarObra(formData: Obra): Promise<ResponseBase | null> {
  try {
    console.log(formData);
    const url = "/obras";
    console.log("Petición POST:" + BASE_URL + API_VERSION + url);
    const response: ResponseBase = (await api.patch(url, formData)).data;
    console.log(response);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

//#endregion

//#region Cardex
export async function GetCardex(
  consulta: CardexConsulta,
): Promise<CardexRespuesta> {
  const response = await api.get<CardexRespuesta>("/cardex", {
    params: consulta,
  });
  return response.data;
}

export async function GetCardexFiltros(): Promise<CardexFiltrosRespuesta> {
  const response = await api.get<CardexFiltrosRespuesta>("/cardex/filtros");
  return response.data;
}

export async function DescargarReporteCardex(
  filtros: CardexFiltrosConsulta,
  formato: CardexFormatoReporte,
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get<Blob>("/cardex/exportar", {
    params: { ...filtros, formato },
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as
    | string
    | undefined;
  const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  return {
    blob: response.data,
    filename:
      filename ??
      `reporte_auditoria_cardex.${formato === "excel" ? "xlsx" : "pdf"}`,
  };
}
//#endregion
