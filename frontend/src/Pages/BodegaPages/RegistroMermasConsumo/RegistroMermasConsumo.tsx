import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Box } from "../../../Components/Box/Box";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import {
  CreateMerma,
  CreateUsoInterno,
  GetEgresoCatalogos,
  GetUserData,
} from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type EgresoCatalogos,
  type MermaCreate,
  type UsoInternoCreate,
} from "../../../types/general";
import css from "./RegistroMermasConsumo.module.css";

type TipoOperacion = "merma" | "usoInterno";

interface Formulario {
  articuloId: string;
  cantidad: string;
  obraId: string;
  motivo: string;
  destino: string;
  responsable: string;
}

interface Pendiente {
  clave: string;
  usuario: string;
  tipo: TipoOperacion;
  formulario: Formulario;
}

const PENDIENTE_KEY = "mermas-consumo-pendiente";

function cargarPendiente(): Pendiente | null {
  const texto = sessionStorage.getItem(PENDIENTE_KEY);
  if (!texto) return null;
  const valor: unknown = JSON.parse(texto);
  if (typeof valor !== "object" || valor === null) throw new Error("Datos pendientes inválidos.");
  if (!("clave" in valor) || typeof valor.clave !== "string" ||
      !("usuario" in valor) || typeof valor.usuario !== "string" ||
      !("tipo" in valor) || (valor.tipo !== "merma" && valor.tipo !== "usoInterno") ||
      !("formulario" in valor) || typeof valor.formulario !== "object" ||
      valor.formulario === null) throw new Error("Datos pendientes inválidos.");
  const f = valor.formulario;
  if (!("articuloId" in f) || typeof f.articuloId !== "string" ||
      !("cantidad" in f) || typeof f.cantidad !== "string" ||
      !("obraId" in f) || typeof f.obraId !== "string" ||
      !("motivo" in f) || typeof f.motivo !== "string" ||
      !("destino" in f) || typeof f.destino !== "string" ||
      !("responsable" in f) || typeof f.responsable !== "string") {
    throw new Error("Datos pendientes inválidos.");
  }
  return {
    clave: valor.clave, usuario: valor.usuario, tipo: valor.tipo,
    formulario: {
      articuloId: f.articuloId, cantidad: f.cantidad, obraId: f.obraId,
      motivo: f.motivo, destino: f.destino, responsable: f.responsable,
    },
  };
}

function nuevaClave(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const FORMULARIO_VACIO: Formulario = {
  articuloId: "",
  cantidad: "",
  obraId: "",
  motivo: "",
  destino: "",
  responsable: "",
};

function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null &&
        "mensaje" in detail && typeof detail.mensaje === "string") return detail.mensaje;
    return error.response ? error.message : "No se recibió respuesta del servidor.";
  }
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

export function RegistroMermasConsumo() {
  const isAllowed = useValidateRol([Rol.bodega]);
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacion>("merma");
  const [catalogos, setCatalogos] = useState<EgresoCatalogos | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [motivoIntentado, setMotivoIntentado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [storageError, setStorageError] = useState("");
  const [aplicaObra, setAplicaObra] = useState(false);
  const guardando = useRef(false);

  useEffect(() => {
    if (!isAllowed) return;
    let active = true;
    Promise.all([GetEgresoCatalogos(), GetUserData()])
      .then(([response, user]) => {
        if (!response || response.error || !response.data) {
          throw new Error(
            response?.mensaje || "No se pudieron cargar los artículos y obras.",
          );
        }
        if (!user || user.error || !user.correo) {
          throw new Error("No se pudo identificar al usuario actual.");
        }
        if (active) {
          setCatalogos(response.data);
          setUsuario(user.correo);
          try {
            const guardado = cargarPendiente();
            if (guardado && guardado.usuario !== user.correo) {
              throw new Error("Hay una operación pendiente de otro usuario en esta pestaña.");
            }
            if (guardado) {
              setPendiente(guardado);
              setTipoOperacion(guardado.tipo);
              setFormulario(guardado.formulario);
              setAplicaObra(Boolean(guardado.formulario.obraId));
            }
          } catch (error: unknown) {
            setStorageError(
              `No se puede recuperar la operación pendiente: ${mensajeDeError(error)} Contacte a soporte antes de registrar otra operación.`,
            );
          }
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(mensajeDeError(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAllowed]);

  if (!isAllowed) return null;

  const articuloSeleccionado = catalogos?.articulos.find(
    (articulo) => String(articulo.id) === formulario.articuloId,
  );
  const motivoInvalido =
    tipoOperacion === "merma" &&
    motivoIntentado &&
    !formulario.motivo.trim();

  function cambiarTipoOperacion(tipo: TipoOperacion) {
    if (tipo === tipoOperacion) return;
    setTipoOperacion(tipo);
    setFormulario(FORMULARIO_VACIO);
    setAplicaObra(false);
    setMotivoIntentado(false);
    setErrorMessage("");
    setNotice("");
  }

  function actualizarCampo(campo: keyof Formulario, valor: string) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
    setErrorMessage("");
    setNotice("");
  }

  async function guardarMovimiento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guardando.current) return;
    if (tipoOperacion === "merma") setMotivoIntentado(true);

    const datos = pendiente?.formulario ?? formulario;
    const tipo = pendiente?.tipo ?? tipoOperacion;
    const articuloId = Number(datos.articuloId);
    const cantidad = Number(datos.cantidad);
    const articulo = catalogos?.articulos.find((item) => item.id === articuloId);

    if (!pendiente && !articulo) {
      setErrorMessage("Seleccione un artículo.");
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setErrorMessage("Ingrese una cantidad entera mayor que cero.");
      return;
    }
    if (!pendiente && articulo && cantidad > articulo.stock_actual) {
      setErrorMessage(
        `No hay suficientes existencias. Disponible: ${articulo.stock_actual}.`,
      );
      return;
    }
    if (!pendiente && aplicaObra && !datos.obraId) {
      setErrorMessage("Seleccione la obra relacionada.");
      return;
    }
    if (!pendiente && datos.obraId && !catalogos?.obras.some((obra) => String(obra.id) === datos.obraId)) {
      setErrorMessage("Seleccione una obra activa.");
      return;
    }
    if (tipo === "merma" && !datos.motivo.trim()) {
      setErrorMessage("El motivo o justificación es obligatorio.");
      return;
    }
    if (
      tipo === "usoInterno" &&
      (!datos.destino.trim() || !datos.responsable.trim())
    ) {
      setErrorMessage(
        "Indique para qué se usará el material y quién lo solicita.",
      );
      return;
    }

    guardando.current = true;
    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const operacion = pendiente ?? {
        clave: nuevaClave(), usuario, tipo, formulario: { ...datos },
      };
      if (!pendiente) {
        sessionStorage.setItem(PENDIENTE_KEY, JSON.stringify(operacion));
        setPendiente(operacion);
      }
      const response =
        tipo === "merma"
          ? await CreateMerma({
              articulo_id: articuloId,
              cantidad,
              ...(datos.obraId ? { obra_id: Number(datos.obraId) } : {}),
              motivo: datos.motivo.trim(),
            } satisfies MermaCreate, operacion.clave)
          : await CreateUsoInterno({
              articulo_id: articuloId,
              cantidad,
              ...(datos.obraId ? { obra_id: Number(datos.obraId) } : {}),
              destino_material: datos.destino.trim(),
              responsable_solicitud: datos.responsable.trim(),
            } satisfies UsoInternoCreate, operacion.clave);

      if (!response || response.error || !response.data) {
        throw new Error(response?.mensaje || "No se pudo confirmar el movimiento.");
      }

      setNotice(
        `${response.mensaje} Comprobante: registro #${response.data.id}, movimiento Cardex #${response.data.cardex_id}, stock resultante: ${response.data.stock_resultante}.`,
      );
      sessionStorage.removeItem(PENDIENTE_KEY);
      setPendiente(null);
      setFormulario(FORMULARIO_VACIO);
      setAplicaObra(false);
      setMotivoIntentado(false);

      const refreshedCatalogos = await GetEgresoCatalogos();
      if (!refreshedCatalogos || refreshedCatalogos.error || !refreshedCatalogos.data) {
        setErrorMessage(
          "El movimiento se guardó, pero no se pudo actualizar el stock mostrado. Recargue la página para ver las existencias actuales.",
        );
      } else {
        setCatalogos(refreshedCatalogos.data);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) {
        try {
          sessionStorage.removeItem(PENDIENTE_KEY);
          setPendiente(null);
        } catch {
          setStorageError("No se pudo limpiar la operación pendiente. Contacte a soporte.");
        }
      }
      setErrorMessage(
        `${mensajeDeError(error)}${axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404) ? "" : " Reintente la misma operación para confirmar su resultado."}`,
      );
    } finally {
      guardando.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Frame>
      <Title>Mermas y consumo interno</Title>
      <Box>
        <div className={css.page}>
          <header className={css.header}>
            <p>
              Registre materiales dañados o materiales usados dentro de la
              empresa. El stock se descuenta al guardar y el movimiento queda
              anotado en el Cardex.
            </p>
          </header>

          <div className={css.operationSwitch} role="group" aria-label="Tipo de movimiento">
            <button
              type="button"
              className={
                tipoOperacion === "merma"
                  ? `${css.operationButton} ${css.selectedOperation}`
                  : css.operationButton
              }
              aria-pressed={tipoOperacion === "merma"}
              disabled={isSaving || !!pendiente || !!storageError}
              onClick={() => cambiarTipoOperacion("merma")}
            >
              Registrar una merma
            </button>
            <button
              type="button"
              className={
                tipoOperacion === "usoInterno"
                  ? `${css.operationButton} ${css.selectedOperation}`
                  : css.operationButton
              }
              aria-pressed={tipoOperacion === "usoInterno"}
              disabled={isSaving || !!pendiente || !!storageError}
              onClick={() => cambiarTipoOperacion("usoInterno")}
            >
              Registrar uso interno
            </button>
          </div>

          {errorMessage && (
            <p className={css.error} role="alert">
              {errorMessage}
            </p>
          )}
          {storageError && <p className={css.error} role="alert">{storageError}</p>}
          {pendiente && (
            <p className={css.notice} role="status">
              Hay una operación pendiente. Reintente sin cambiar sus datos para evitar un descuento duplicado.
            </p>
          )}
          {notice && (
            <p className={css.notice} role="status" aria-live="polite">
              {notice}
            </p>
          )}

          <form className={css.form} onSubmit={guardarMovimiento} noValidate>
            <section className={css.section}>
              <h2 className={css.sectionTitle}>
                {tipoOperacion === "merma"
                  ? "Datos de la merma"
                  : "Datos del consumo interno"}
              </h2>
              <div className={css.fields}>
                <label className={css.field} htmlFor="articulo">
                  Artículo
                  <select
                    id="articulo"
                    className={css.input}
                    value={formulario.articuloId}
                    onChange={(event) =>
                      actualizarCampo("articuloId", event.target.value)
                    }
                    disabled={isLoading || !catalogos || isSaving || !!pendiente}
                    required
                  >
                    <option value="">
                      {isLoading ? "Cargando artículos..." : "Seleccione un artículo"}
                    </option>
                    {catalogos?.articulos.map((articulo) => (
                      <option
                        key={articulo.id}
                        value={articulo.id}
                        disabled={articulo.stock_actual <= 0}
                      >
                        {articulo.nombre}
                        {articulo.codigo_sku ? ` (${articulo.codigo_sku})` : ""}
                        {" — stock: "}
                        {articulo.stock_actual}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={css.field} htmlFor="cantidad">
                  Cantidad
                  <input
                    id="cantidad"
                    className={css.input}
                    type="number"
                    min={1}
                    max={articuloSeleccionado?.stock_actual}
                    step={1}
                    inputMode="numeric"
                    value={formulario.cantidad}
                    disabled={isSaving || !!pendiente}
                    onChange={(event) =>
                      actualizarCampo("cantidad", event.target.value)
                    }
                    placeholder="Ej.: 2"
                    required
                  />
                  <small>
                    Disponible: {articuloSeleccionado?.stock_actual ?? "—"}
                  </small>
                </label>

                <label className={css.field}>
                  <span>
                    <input
                      type="checkbox"
                      checked={aplicaObra}
                      disabled={isSaving || !!pendiente}
                      onChange={(event) => {
                        setAplicaObra(event.target.checked);
                        if (!event.target.checked) actualizarCampo("obraId", "");
                      }}
                    />{" "}
                    Asociar a una obra
                  </span>
                </label>
                {aplicaObra && (
                    <label className={css.field} htmlFor="obra">
                      Obra activa
                      <select
                        id="obra"
                        className={css.input}
                        value={formulario.obraId}
                        onChange={(event) =>
                          actualizarCampo("obraId", event.target.value)
                        }
                        disabled={isLoading || !catalogos || isSaving || !!pendiente}
                        required
                      >
                        <option value="">
                          {isLoading ? "Cargando obras..." : "Seleccione una obra"}
                        </option>
                        {catalogos?.obras.map((obra) => (
                          <option key={obra.id} value={obra.id}>
                            {obra.codigo_obra} — {obra.nombre_obra}
                          </option>
                        ))}
                      </select>
                    </label>
                )}
                {tipoOperacion === "merma" ? (
                  <>
                    <label className={css.field} htmlFor="motivo">
                      Motivo / Justificación (obligatorio)
                      <textarea
                        id="motivo"
                        className={`${css.input} ${css.textarea} ${
                          motivoInvalido ? css.invalidInput : ""
                        }`}
                        value={formulario.motivo}
                        disabled={isSaving || !!pendiente}
                        onChange={(event) =>
                          actualizarCampo("motivo", event.target.value)
                        }
                        maxLength={255}
                        placeholder="Ej.: material dañado durante el almacenamiento"
                        required
                        aria-invalid={motivoInvalido}
                        aria-describedby={
                          motivoInvalido
                            ? "motivo-error motivo-ayuda"
                            : "motivo-ayuda"
                        }
                      />
                      {motivoInvalido && (
                        <small id="motivo-error" className={css.fieldError}>
                          Escriba el motivo o justificación para continuar.
                        </small>
                      )}
                      <small id="motivo-ayuda">
                        Obligatorio · {formulario.motivo.length}/255 caracteres
                      </small>
                    </label>
                  </>
                ) : (
                  <>
                    <label className={css.field} htmlFor="destino">
                      ¿Para qué se usará?
                      <input
                        id="destino"
                        className={css.input}
                        type="text"
                        value={formulario.destino}
                        disabled={isSaving || !!pendiente}
                        onChange={(event) =>
                          actualizarCampo("destino", event.target.value)
                        }
                        maxLength={255}
                        placeholder="Ej.: reparación de herramientas"
                        required
                      />
                    </label>

                    <label className={css.field} htmlFor="responsable">
                      Persona que solicita
                      <input
                        id="responsable"
                        className={css.input}
                        type="text"
                        value={formulario.responsable}
                        disabled={isSaving || !!pendiente}
                        onChange={(event) =>
                          actualizarCampo("responsable", event.target.value)
                        }
                        maxLength={150}
                        placeholder="Nombre de quien solicita el material"
                        required
                      />
                    </label>
                  </>
                )}
              </div>
            </section>

            <div className={css.actions}>
              <button
                className={css.submit}
                type="submit"
                disabled={isLoading || isSaving || !catalogos || !!storageError}
              >
                {isSaving
                  ? "Guardando..."
                  : pendiente
                    ? "Reintentar operación"
                    : tipoOperacion === "merma"
                    ? "Guardar merma"
                    : "Guardar consumo interno"}
              </button>
            </div>
          </form>
        </div>
      </Box>
    </Frame>
  );
}
