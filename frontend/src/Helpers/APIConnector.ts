import axios from "axios";
import type {
  CardexConsulta,
  CardexFiltrosConsulta,
  CardexFiltrosRespuesta,
  CardexFormatoReporte,
  CardexResumen,
  CardexRespuesta,
  ConteoInventario,
  ConteoInventarioArticulo,
  ConteoInventarioCreate,
  DocumentoTributario,
  EgresoCatalogos,
  EgresoCreate,
  FacturaCreate,
  LoginData,
  LoginResponse,
  Obra,
  OrdenCompra,
  OrdenCompraCreate,
  Proveedor,
  AdminDashboardData,
  RecepcionCompra,
  RecepcionCompraCreate,
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

function mensajeErrorApi(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = body.detail;
      if (typeof detail === "string") return detail;
      if (
        typeof detail === "object" &&
        detail !== null &&
        "mensaje" in detail &&
        typeof detail.mensaje === "string"
      ) {
        return detail.mensaje;
      }
    }
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

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

export async function GetAdminDashboard(): Promise<
  ResponseBase<AdminDashboardData> | null
> {
  try {
    const response = await api.get<ResponseBase<AdminDashboardData>>(
      "/admin/dashboard",
    );
    return response.data;
  } catch (error) {
    console.error(error);
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

export async function GetEgresoCatalogos(): Promise<
  ResponseBase<EgresoCatalogos> | null
> {
  try {
    const response = await api.get<ResponseBase<EgresoCatalogos>>(
      "/egresos/catalogos",
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function CreateEgreso(
  formData: EgresoCreate,
): Promise<ResponseBase<{ egreso_id: number }> | null> {
  try {
    const response = await api.post<ResponseBase<{ egreso_id: number }>>(
      "/egresos",
      formData,
    );
    return response.data;
  } catch (error) {
    console.error(error);
    if (axios.isAxiosError(error)) {
      const body: unknown = error.response?.data;
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
      ) {
        return { error: true, mensaje: body.detail };
      }
      return { error: true, mensaje: error.message };
    }
    return {
      error: true,
      mensaje:
        error instanceof Error ? error.message : "No se pudo registrar el egreso.",
    };
  }
}

export async function GetConteoCatalogo(): Promise<
  ResponseBase<ConteoInventarioArticulo[]> | null
> {
  try {
    const response = await api.get<ResponseBase<ConteoInventarioArticulo[]>>(
      "/inventario/conteos/catalogos",
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      mensaje: mensajeErrorApi(error, "No se pudo cargar el inventario."),
    };
  }
}

export async function GetConteos(): Promise<
  ResponseBase<ConteoInventario[]> | null
> {
  try {
    const response =
      await api.get<ResponseBase<ConteoInventario[]>>("/inventario/conteos");
    return response.data;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      mensaje: mensajeErrorApi(error, "No se pudieron cargar los conteos."),
    };
  }
}

export async function CreateConteo(
  formData: ConteoInventarioCreate,
): Promise<ResponseBase<ConteoInventario> | null> {
  try {
    const response = await api.post<ResponseBase<ConteoInventario>>(
      "/inventario/conteos",
      formData,
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      mensaje: mensajeErrorApi(error, "No se pudo registrar el conteo."),
    };
  }
}

export async function AprobarConteo(
  conteoId: number,
): Promise<ResponseBase<ConteoInventario> | null> {
  try {
    const response = await api.post<ResponseBase<ConteoInventario>>(
      `/inventario/conteos/${conteoId}/aprobar`,
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      mensaje: mensajeErrorApi(error, "No se pudo aprobar el conteo."),
    };
  }
}

export async function RechazarConteo(
  conteoId: number,
  motivo: string,
): Promise<ResponseBase<ConteoInventario> | null> {
  try {
    const response = await api.post<ResponseBase<ConteoInventario>>(
      `/inventario/conteos/${conteoId}/rechazar`,
      { motivo },
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      mensaje: mensajeErrorApi(error, "No se pudo rechazar el conteo."),
    };
  }
}

export async function GetOrdenesCompra(): Promise<
  ResponseBase<OrdenCompra[]> | null
> {
  try {
    const response: ResponseBase<OrdenCompra[]> = (
      await api.get("/facturas/ordenes-compra")
    ).data;
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function CreateOrdenCompra(
  formData: OrdenCompraCreate,
): Promise<ResponseBase<OrdenCompra> | null> {
  try {
    const response: ResponseBase<OrdenCompra> = (
      await api.post("/facturas/ordenes-compra", formData)
    ).data;
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function CreateRecepcionCompra(
  formData: RecepcionCompraCreate,
): Promise<ResponseBase<RecepcionCompra> | null> {
  try {
    const response: ResponseBase<RecepcionCompra> = (
      await api.post("/facturas/recepcion", formData)
    ).data;
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function GetRecepcionesPendientes(): Promise<
  ResponseBase<RecepcionCompra[]> | null
> {
  try {
    const response: ResponseBase<RecepcionCompra[]> = (
      await api.get("/facturas/recepciones/pendientes")
    ).data;
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function AprobarRecepcion(
  recepcionId: number,
): Promise<ResponseBase<RecepcionCompra> | null> {
  try {
    const response: ResponseBase<RecepcionCompra> = (
      await api.post(`/facturas/recepciones/${recepcionId}/aprobar`)
    ).data;
    return response;
  } catch (error) {
    console.error(error);
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

export async function GetCardexResumen(): Promise<
  ResponseBase<CardexResumen>
> {
  const response = await api.get<ResponseBase<CardexResumen>>(
    "/cardex/resumen",
  );
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
