import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Frame } from "../../../Components/Frame/Frame";
import { Title } from "../../../Components/Title/Title";
import {
  AprobarConteo,
  CreateConteo,
  GetConteoCatalogo,
  GetConteos,
  GetUserData,
  RechazarConteo,
} from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type ConteoInventario,
  type ConteoInventarioArticulo,
} from "../../../types/general";
import css from "./ConteoInventario.module.css";

interface LineaBorrador {
  articulo_id: number;
  nombre: string;
  sku: string | null;
  stock_sistema: number;
  cantidad_contada: number;
}

function formatoFecha(fecha: string): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

function formatoCosto(valor: string): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

function etiquetaEstado(estado: ConteoInventario["estado"]): string {
  switch (estado) {
    case "PENDIENTE_APROBACION":
      return "Pendiente de aprobación";
    case "APROBADO":
      return "Aprobado";
    case "RECHAZADO":
      return "Rechazado";
    case "SIN_DIFERENCIAS":
      return "Sin diferencias";
  }
}

export function ConteoInventarioPage() {
  const isAllowed = useValidateRol([Rol.bodega, Rol.supervisor]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [articulos, setArticulos] = useState<ConteoInventarioArticulo[]>([]);
  const [conteos, setConteos] = useState<ConteoInventario[]>([]);
  const [articuloId, setArticuloId] = useState("");
  const [cantidadContada, setCantidadContada] = useState("");
  const [lineas, setLineas] = useState<LineaBorrador[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [conteoProcesando, setConteoProcesando] = useState<number | null>(null);
  const [busquedaArticulo, setBusquedaArticulo] = useState("");
  const busquedaRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);

  const puedeContar = roleId === Rol.admin || roleId === Rol.bodega;
  const puedeRevisar = roleId === Rol.admin || roleId === Rol.supervisor;
  const terminoBusqueda = busquedaArticulo.trim().toLocaleLowerCase();
  const articulosFiltrados = articulos.filter((articulo) => {
    const coincideBusqueda = `${articulo.codigo_sku ?? ""} ${articulo.nombre}`
      .toLocaleLowerCase()
      .includes(terminoBusqueda);
    const yaContado = lineas.some((linea) => linea.articulo_id === articulo.id);
    return coincideBusqueda && !yaContado;
  });

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [catalogo, lista] = await Promise.all([
        GetConteoCatalogo(),
        GetConteos(),
      ]);
      if (!catalogo || catalogo.error || !catalogo.data) {
        setError(catalogo?.mensaje || "No se pudo cargar el inventario.");
        return;
      }
      if (!lista || lista.error || !lista.data) {
        setError(lista?.mensaje || "No se pudieron cargar los conteos.");
        return;
      }
      setArticulos(catalogo.data);
      setConteos(lista.data);
      setError("");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el conteo físico.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    let activo = true;
    GetUserData()
      .then(async (usuario) => {
        if (!activo) return;
        if (!usuario || usuario.error) {
          setError("No se pudo verificar el rol de la sesión.");
          setCargando(false);
          return;
        }
        setRoleId(usuario.rol_id);
        await cargarDatos();
      })
      .catch((cause: unknown) => {
        if (activo) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar el conteo físico.",
          );
        }
      });
    return () => {
      activo = false;
    };
  }, [cargarDatos, isAllowed]);

  function agregarLinea() {
    const articulo = articulos.find((item) => String(item.id) === articuloId);
    const cantidad = Number(cantidadContada);
    if (
      !articulo ||
      cantidadContada.trim() === "" ||
      !Number.isInteger(cantidad) ||
      cantidad < 0
    ) {
      setError("Seleccione un artículo e ingrese una cantidad entera igual o mayor a cero.");
      return;
    }
    if (lineas.some((linea) => linea.articulo_id === articulo.id)) {
      setError("No repita un artículo en el mismo conteo.");
      return;
    }
    setLineas((actuales) => [
      ...actuales,
      {
        articulo_id: articulo.id,
        nombre: articulo.nombre,
        sku: articulo.codigo_sku,
        stock_sistema: articulo.stock_actual,
        cantidad_contada: cantidad,
      },
    ]);
    setBusquedaArticulo("");
    setArticuloId("");
    setCantidadContada("");
    setError("");
    busquedaRef.current?.focus();
  }

  async function registrarConteo() {
    if (lineas.length === 0) {
      setError("Agregue al menos un artículo contado.");
      return;
    }
    setProcesando(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await CreateConteo({
        observaciones: observaciones.trim() || undefined,
        detalles: lineas.map((linea) => ({
          articulo_id: linea.articulo_id,
          stock_sistema: linea.stock_sistema,
          cantidad_contada: linea.cantidad_contada,
        })),
      });
      if (!respuesta || respuesta.error || !respuesta.data) {
        setError(respuesta?.mensaje || "No se pudo registrar el conteo.");
        return;
      }
      setAviso(respuesta.mensaje);
      setLineas([]);
      setObservaciones("");
      await cargarDatos();
    } finally {
      setProcesando(false);
    }
  }

  async function aprobar(conteo: ConteoInventario) {
    if (!window.confirm(`¿Aprobar el ajuste del conteo ${conteo.codigo}?`)) {
      return;
    }
    setConteoProcesando(conteo.id);
    setError("");
    setAviso("");
    try {
      const respuesta = await AprobarConteo(conteo.id);
      if (!respuesta || respuesta.error) {
        setError(respuesta?.mensaje || "No se pudo aprobar el conteo.");
        return;
      }
      setAviso(respuesta.mensaje);
      await cargarDatos();
    } finally {
      setConteoProcesando(null);
    }
  }

  async function rechazar(conteo: ConteoInventario) {
    const motivo = window.prompt(
      `Indique por qué se rechaza el conteo ${conteo.codigo}:`,
    );
    if (motivo === null) return;
    if (motivo.trim().length < 3) {
      setError("El motivo de rechazo debe tener al menos 3 caracteres.");
      return;
    }
    setConteoProcesando(conteo.id);
    setError("");
    setAviso("");
    try {
      const respuesta = await RechazarConteo(conteo.id, motivo.trim());
      if (!respuesta || respuesta.error) {
        setError(respuesta?.mensaje || "No se pudo rechazar el conteo.");
        return;
      }
      setAviso(respuesta.mensaje);
      await cargarDatos();
    } finally {
      setConteoProcesando(null);
    }
  }

  if (!isAllowed) return null;

  return (
    <Frame>
      <Box>
        <Title>Conteo físico de inventario</Title>
        <p>
          Registre manualmente las unidades contadas. Las diferencias requieren
          aprobación antes de modificar el stock.
        </p>
        <p className={css.helpText}>
          El conteo se compara con el stock al cargar el artículo. Si hubo otro
          movimiento antes de registrar o aprobar, el sistema pedirá volver a
          contar para evitar un ajuste incorrecto.
        </p>
      </Box>

      {error && (
        <p className={css.error} role="alert">
          {error}
        </p>
      )}
      {aviso && (
        <p className={css.notice} role="status">
          {aviso}
        </p>
      )}

      {puedeContar && (
        <Box>
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Registrar conteo</h2>
            <div className={css.controls}>
              <label className={css.field}>
                Buscar por nombre o SKU
                <input
                  ref={busquedaRef}
                  className={css.input}
                  type="search"
                  value={busquedaArticulo}
                  onChange={(event) => setBusquedaArticulo(event.target.value)}
                  placeholder="Nombre o código del artículo"
                  autoComplete="off"
                />
              </label>
              <label className={css.field}>
                Artículo
                <select
                  className={css.input}
                  value={articuloId}
                  onChange={(event) => {
                    setArticuloId(event.target.value);
                    if (event.target.value) cantidadRef.current?.focus();
                  }}
                >
                  <option value="">Seleccione un artículo</option>
                  {articulosFiltrados.map((articulo) => (
                    <option key={articulo.id} value={articulo.id}>
                      {articulo.codigo_sku
                        ? `${articulo.codigo_sku} - `
                        : ""}
                      {articulo.nombre} (sistema: {articulo.stock_actual})
                    </option>
                  ))}
                </select>
              </label>
              <label className={css.field}>
                Cantidad contada
                <input
                  ref={cantidadRef}
                  className={css.input}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={cantidadContada}
                  onChange={(event) => setCantidadContada(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      agregarLinea();
                    }
                  }}
                />
              </label>
              <div className={css.addButton}>
                <Btn onClick={agregarLinea} disabled={procesando}>
                  Agregar artículo
                </Btn>
              </div>
            </div>

            {lineas.length > 0 ? (
              <div className={css.tableWrap}>
                <table className={css.table}>
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Stock en sistema</th>
                      <th>Conteo físico</th>
                      <th>Diferencia</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea) => {
                      const diferencia =
                        linea.cantidad_contada - linea.stock_sistema;
                      return (
                        <tr key={linea.articulo_id}>
                          <td>
                            {linea.sku ? `${linea.sku} - ` : ""}
                            {linea.nombre}
                          </td>
                          <td>{linea.stock_sistema}</td>
                          <td>{linea.cantidad_contada}</td>
                          <td
                            className={
                              diferencia < 0
                                ? css.negative
                                : diferencia > 0
                                  ? css.positive
                                  : ""
                            }
                          >
                            {diferencia > 0 ? "+" : ""}
                            {diferencia}
                          </td>
                          <td>
                            <button
                              className={css.removeButton}
                              type="button"
                              onClick={() =>
                                setLineas((actuales) =>
                                  actuales.filter(
                                    (item) =>
                                      item.articulo_id !== linea.articulo_id,
                                  ),
                                )
                              }
                              aria-label={`Quitar ${linea.nombre}`}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={css.helpText}>
                Agregue uno o más artículos para iniciar el conteo.
              </p>
            )}

            <label className={css.field}>
              Observaciones (opcional)
              <textarea
                className={css.textarea}
                maxLength={1000}
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Ej.: conteo de estantería principal"
              />
            </label>
            <div className={css.actions}>
              <Btn onClick={registrarConteo} disabled={procesando}>
                {procesando ? "Registrando…" : "Registrar conteo"}
              </Btn>
            </div>
          </section>
        </Box>
      )}

      <Box>
        <section className={css.section}>
          <div className={css.sectionHeader}>
            <h2 className={css.sectionTitle}>Historial de conteos</h2>
            <button
              className={css.refreshButton}
              type="button"
              disabled={cargando}
              onClick={() => void cargarDatos()}
            >
              Actualizar
            </button>
          </div>

          {cargando ? (
            <p>Cargando conteos…</p>
          ) : conteos.length === 0 ? (
            <p>No hay conteos registrados.</p>
          ) : (
            <div className={css.countList}>
              {conteos.map((conteo) => (
                <article className={css.countCard} key={conteo.id}>
                  <div className={css.countHeader}>
                    <div>
                      <h3>{conteo.codigo}</h3>
                      <p>
                        Registrado por {conteo.creado_por} ·{" "}
                        {formatoFecha(conteo.fecha)}
                      </p>
                    </div>
                    <span
                      className={
                        conteo.estado === "PENDIENTE_APROBACION"
                          ? css.pending
                          : conteo.estado === "RECHAZADO"
                            ? css.rejected
                            : css.approved
                      }
                    >
                      {etiquetaEstado(conteo.estado)}
                    </span>
                  </div>
                  {conteo.observaciones && <p>{conteo.observaciones}</p>}
                  {conteo.motivo_rechazo && (
                    <p className={css.rejectionReason}>
                      Motivo del rechazo: {conteo.motivo_rechazo}
                    </p>
                  )}
                  <div className={css.tableWrap}>
                    <table className={css.table}>
                      <thead>
                        <tr>
                          <th>Artículo</th>
                          <th>Stock sistema</th>
                          <th>Conteo físico</th>
                          <th>Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conteo.detalles.map((detalle) => (
                          <tr key={detalle.articulo_id}>
                            <td>
                              <strong>
                                {detalle.sku ? `${detalle.sku} - ` : ""}
                                {detalle.articulo}
                              </strong>
                              <div className={css.costosRecientes}>
                                <span className={css.etiquetaCostos}>
                                  Últimos costos de compra
                                </span>
                                {detalle.ultimos_costos_compra.length > 0
                                  ? detalle.ultimos_costos_compra.map((costo) => (
                                      <span
                                        className={css.costoBadge}
                                        key={`${costo.folio}-${costo.fecha}`}
                                      >
                                        <strong>
                                          {formatoCosto(costo.costo_unitario)}
                                        </strong>
                                        <small>
                                          {costo.folio} · {costo.fecha}
                                        </small>
                                      </span>
                                    ))
                                  : (
                                      <span className={css.sinCostos}>
                                        Sin costos históricos
                                      </span>
                                    )}
                              </div>
                            </td>
                            <td>{detalle.stock_sistema}</td>
                            <td>{detalle.cantidad_contada}</td>
                            <td
                              className={
                                detalle.diferencia < 0
                                  ? css.negative
                                  : detalle.diferencia > 0
                                    ? css.positive
                                    : ""
                              }
                            >
                              {detalle.diferencia > 0 ? "+" : ""}
                              {detalle.diferencia}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {conteo.estado === "PENDIENTE_APROBACION" &&
                    puedeRevisar && (
                      <div className={css.actions}>
                        <Btn
                          onClick={() => void aprobar(conteo)}
                          disabled={conteoProcesando === conteo.id}
                        >
                          Aprobar ajuste
                        </Btn>
                        <Btn
                          onClick={() => void rechazar(conteo)}
                          disabled={conteoProcesando === conteo.id}
                          warning
                        >
                          Rechazar
                        </Btn>
                      </div>
                    )}
                  {conteo.resuelto_por && (
                    <p className={css.helpText}>
                      Revisado por {conteo.resuelto_por}
                      {conteo.fecha_revision
                        ? ` · ${formatoFecha(conteo.fecha_revision)}`
                        : ""}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </Box>
    </Frame>
  );
}
