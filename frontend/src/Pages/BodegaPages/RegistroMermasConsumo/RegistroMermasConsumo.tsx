import { useEffect, useState, type FormEvent } from "react";
import { Box } from "../../../Components/Box/Box";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import {
  CreateMerma,
  CreateUsoInterno,
  GetEgresoCatalogos,
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

const FORMULARIO_VACIO: Formulario = {
  articuloId: "",
  cantidad: "",
  obraId: "",
  motivo: "",
  destino: "",
  responsable: "",
};

function mensajeDeError(error: unknown): string {
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

  useEffect(() => {
    if (!isAllowed) return;
    let active = true;
    GetEgresoCatalogos()
      .then((response) => {
        if (!response || response.error || !response.data) {
          throw new Error(
            response?.mensaje || "No se pudieron cargar los artículos y obras.",
          );
        }
        if (active) setCatalogos(response.data);
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

  function cambiarTipoOperacion(tipo: TipoOperacion) {
    if (tipo === tipoOperacion) return;
    setTipoOperacion(tipo);
    setFormulario(FORMULARIO_VACIO);
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
    const articuloId = Number(formulario.articuloId);
    const cantidad = Number(formulario.cantidad);
    const articulo = catalogos?.articulos.find((item) => item.id === articuloId);

    if (!articulo) {
      setErrorMessage("Seleccione un artículo.");
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setErrorMessage("Ingrese una cantidad entera mayor que cero.");
      return;
    }
    if (cantidad > articulo.stock_actual) {
      setErrorMessage(
        `No hay suficientes existencias. Disponible: ${articulo.stock_actual}.`,
      );
      return;
    }
    if (
      tipoOperacion === "merma" &&
      (!formulario.obraId || !formulario.motivo.trim())
    ) {
      setErrorMessage("Seleccione la obra e indique el motivo de la merma.");
      return;
    }
    if (
      tipoOperacion === "usoInterno" &&
      (!formulario.destino.trim() || !formulario.responsable.trim())
    ) {
      setErrorMessage(
        "Indique para qué se usará el material y quién lo solicita.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response =
        tipoOperacion === "merma"
          ? await CreateMerma({
              articulo_id: articuloId,
              cantidad,
              obra_id: Number(formulario.obraId),
              motivo: formulario.motivo.trim(),
            } satisfies MermaCreate)
          : await CreateUsoInterno({
              articulo_id: articuloId,
              cantidad,
              destino_material: formulario.destino.trim(),
              responsable_solicitud: formulario.responsable.trim(),
            } satisfies UsoInternoCreate);

      if (!response || response.error || !response.data) {
        setErrorMessage(response?.mensaje || "No se pudo guardar el movimiento.");
        return;
      }

      setNotice(
        `${response.mensaje} Stock disponible ahora: ${response.data.stock_resultante}.`,
      );
      setFormulario(FORMULARIO_VACIO);

      const refreshedCatalogos = await GetEgresoCatalogos();
      if (!refreshedCatalogos || refreshedCatalogos.error || !refreshedCatalogos.data) {
        setErrorMessage(
          "El movimiento se guardó, pero no se pudo actualizar el stock mostrado. Recargue la página para ver las existencias actuales.",
        );
      } else {
        setCatalogos(refreshedCatalogos.data);
      }
    } catch (error: unknown) {
      setErrorMessage(mensajeDeError(error));
    } finally {
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
          {notice && (
            <p className={css.notice} role="status" aria-live="polite">
              {notice}
            </p>
          )}

          <form className={css.form} onSubmit={guardarMovimiento}>
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
                    disabled={isLoading || !catalogos}
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

                {tipoOperacion === "merma" ? (
                  <>
                    <label className={css.field} htmlFor="obra">
                      Obra relacionada
                      <select
                        id="obra"
                        className={css.input}
                        value={formulario.obraId}
                        onChange={(event) =>
                          actualizarCampo("obraId", event.target.value)
                        }
                        disabled={isLoading || !catalogos}
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

                    <label className={css.field} htmlFor="motivo">
                      ¿Qué ocurrió?
                      <textarea
                        id="motivo"
                        className={`${css.input} ${css.textarea}`}
                        value={formulario.motivo}
                        onChange={(event) =>
                          actualizarCampo("motivo", event.target.value)
                        }
                        maxLength={255}
                        placeholder="Ej.: material dañado durante el almacenamiento"
                        required
                      />
                      <small>{formulario.motivo.length}/255 caracteres</small>
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
                disabled={isLoading || isSaving || !catalogos}
              >
                {isSaving
                  ? "Guardando..."
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
