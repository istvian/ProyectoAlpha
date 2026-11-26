import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Card } from "../../../Components/Card/Card";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";
import { Frame } from "../../../Components/Frame/Frame";
import { InputText } from "../../../Components/InputText/InputText";
import { Selector } from "../../../Components/Selector/Selector";
import { Title } from "../../../Components/Title/Title";
import {
  DescargarReporteInventario,
  GetInventario,
  GetInventarioFiltros,
} from "../../../Helpers/APIConnector";
import { useRolAutorizado } from "../../../Hooks/useValidateRol";
import {
  Rol,
  type ArticuloInventario,
  type EstadoInventario,
  type InventarioConsulta,
  type InventarioFormatoReporte,
  type InventarioRespuesta,
} from "../../../types/general";
import { StockMinimoAlertas } from "../../../Components/StockMinimoAlertas/StockMinimoAlertas";
import { AgregarArticulo } from "../AgregarArticulo/AgregarArticulo";
import css from "./Inventario.module.css";

interface FiltrosFormulario {
  codigoNombre: string;
  categoria: string;
  estado: EstadoInventario | "";
}

const CANTIDAD_POR_PAGINA = 20;

const ESTADOS: { value: EstadoInventario; label: string }[] = [
  { value: "SIN_STOCK", label: "Sin stock" },
  { value: "BAJO_STOCK", label: "Bajo stock" },
  { value: "DISPONIBLE", label: "Disponible" },
];

function filtrosIniciales(): FiltrosFormulario {
  return { codigoNombre: "", categoria: "", estado: "" };
}

function crearConsulta(
  filtros: FiltrosFormulario,
): Omit<InventarioConsulta, "pagina" | "cantidad"> {
  const codigoNombre = filtros.codigoNombre.trim();
  return {
    ...(codigoNombre ? { codigo_nombre: codigoNombre } : {}),
    ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
    ...(filtros.estado ? { estado: filtros.estado } : {}),
  };
}

async function mensajeError(error: unknown): Promise<string> {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (data instanceof Blob) {
      const texto = await data.text();
      try {
        const respuesta: unknown = JSON.parse(texto);
        if (
          typeof respuesta === "object" &&
          respuesta !== null &&
          "detail" in respuesta &&
          typeof respuesta.detail === "string"
        ) {
          return respuesta.detail;
        }
      } catch {
        return texto || error.message;
      }
      return texto || error.message;
    }
    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      return data.detail;
    }
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

function etiquetaEstado(estado: EstadoInventario): string {
  return ESTADOS.find((e) => e.value === estado)?.label ?? estado;
}

export function Inventario() {
  const rol = useRolAutorizado([Rol.supervisor, Rol.bodega]);
  const puedeSolicitar = rol === Rol.bodega || rol === Rol.admin;
  const columnasTabla = puedeSolicitar ? 8 : 7;
  const [agregarArticulo, setAgregarArticulo] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosFormulario>(filtrosIniciales);
  const [filtrosAplicados, setFiltrosAplicados] = useState<
    Omit<InventarioConsulta, "pagina" | "cantidad">
  >({});
  const [categorias, setCategorias] = useState<string[]>([]);
  const [articulos, setArticulos] = useState<ArticuloInventario[]>([]);
  const [paginacion, setPaginacion] = useState<
    InventarioRespuesta["paginacion"]
  >({
    pagina: 1,
    cantidad: CANTIDAD_POR_PAGINA,
    total: 0,
    total_paginas: 0,
  });
  const [pagina, setPagina] = useState(1);
  const [cargandoFiltros, setCargandoFiltros] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<InventarioFormatoReporte | null>(
    null,
  );
  const [error, setError] = useState("");
  const [errorFiltros, setErrorFiltros] = useState("");
  const [recarga, setRecarga] = useState(0);

  const nav = useNavigate();

  useEffect(() => {
    let activo = true;
    setCargandoFiltros(true);
    GetInventarioFiltros()
      .then((respuesta) => {
        if (respuesta.error) throw new Error(respuesta.mensaje);
        if (activo) {
          setCategorias(respuesta.data.categorias ?? []);
        }
      })
      .catch(async (e: unknown) => {
        if (activo) setErrorFiltros(await mensajeError(e));
      })
      .finally(() => {
        if (activo) setCargandoFiltros(false);
      });
    return () => {
      activo = false;
    };
  }, [recarga]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");
    const consulta: InventarioConsulta = {
      ...filtrosAplicados,
      pagina,
      cantidad: CANTIDAD_POR_PAGINA,
    };
    GetInventario(consulta)
      .then((respuesta) => {
        if (respuesta.error) throw new Error(respuesta.mensaje);
        if (activo) {
          setArticulos(respuesta.data ?? []);
          setPaginacion(respuesta.paginacion);
        }
      })
      .catch(async (e: unknown) => {
        if (activo) {
          setArticulos([]);
          setPaginacion({
            pagina,
            cantidad: CANTIDAD_POR_PAGINA,
            total: 0,
            total_paginas: 0,
          });
          setError(await mensajeError(e));
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [filtrosAplicados, pagina, recarga]);

  function aplicarFiltros() {
    setPagina(1);
    setFiltrosAplicados(crearConsulta(filtros));
  }

  function limpiarFiltros() {
    const iniciales = filtrosIniciales();
    setFiltros(iniciales);
    setPagina(1);
    setFiltrosAplicados({});
  }

  async function descargarReporte(formato: InventarioFormatoReporte) {
    setError("");
    setExportando(formato);
    try {
      const { blob, filename } = await DescargarReporteInventario(
        filtrosAplicados,
        formato,
      );
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = filename;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e: unknown) {
      setError(await mensajeError(e));
    } finally {
      setExportando(null);
    }
  }

  if (rol === null) return null;

  const paginasTotales = Math.max(paginacion.total_paginas, 1);
  const primerIndicePagina = Math.max(
    1,
    Math.min(pagina - 1, paginasTotales - 2),
  );
  const paginasVisibles = Array.from(
    { length: Math.min(paginasTotales, 3) },
    (_, indice) => primerIndicePagina + indice,
  );
  const inicioResultados =
    paginacion.total === 0 ? 0 : (pagina - 1) * CANTIDAD_POR_PAGINA + 1;
  const finResultados = Math.min(
    pagina * CANTIDAD_POR_PAGINA,
    paginacion.total,
  );
  const estadoSeleccionadoLabel =
    ESTADOS.find((e) => e.value === filtros.estado)?.label ?? "";

  return (
    <Frame>
      <Box
        style={{
          flexFlow: "row wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Title>Inventario y artículos</Title>
          <p>
            Administra el catálogo, consulta existencias y controla el stock de
            tu bodega.
          </p>
        </div>
        <div className={css.actions}>
          <Btn
            disabled={exportando !== null}
            onClick={() => void descargarReporte("pdf")}
          >
            {exportando === "pdf" ? "Generando PDF..." : "Exportar PDF"}
          </Btn>
          <Btn
            disabled={exportando !== null}
            onClick={() => void descargarReporte("excel")}
          >
            {exportando === "excel" ? "Generando Excel..." : "Exportar Excel"}
          </Btn>
        </div>
      </Box>
      {agregarArticulo ? (
        <AgregarArticulo
          onEnd={() => {
            setAgregarArticulo(false);
            setRecarga((r) => r + 1);
          }}
        />
      ) : null}
      <CardContainer>
        <Card
          title="Artículos"
          icon="fa-solid fa-boxes-stacked"
          content={String(paginacion.total)}
          footer="Según filtros aplicados"
        />
        <Card
          title="Categorías"
          icon="fa-solid fa-tags"
          content={String(categorias.length)}
          footer="Disponibles en inventario"
        />
      </CardContainer>
      <StockMinimoAlertas permitirSolicitud={puedeSolicitar} />
      <Box>
        <div className={css.row}>
          <Title>Listado de artículos</Title>
          <p className={css.resumen}>{paginacion.total} registros</p>
        </div>
        <div className={css.filters}>
          <InputText
            label="Buscar artículos"
            onChange={(text) =>
              setFiltros((actual) => ({ ...actual, codigoNombre: text }))
            }
            placeholder="Código o nombre del artículo..."
            value={filtros.codigoNombre}
          />
          <Selector
            data={filtros.categoria || 0}
            options={categorias}
            title="Categoría"
            setData={(selected) =>
              setFiltros((actual) => ({
                ...actual,
                categoria: selected === "0" ? "" : selected,
              }))
            }
            firstOption="Todas las categorías"
            isDisabled={cargandoFiltros}
          />
          <Selector
            data={estadoSeleccionadoLabel || 0}
            options={ESTADOS.map((e) => e.label)}
            title="Estado"
            setData={(selected) =>
              setFiltros((actual) => ({
                ...actual,
                estado:
                  selected === "0"
                    ? ""
                    : (ESTADOS.find((e) => e.label === selected)?.value ?? ""),
              }))
            }
            firstOption="Todos los estados"
          />
          <div className={css.btns}>
            <Btn onClick={aplicarFiltros}>Buscar</Btn>
            <Btn onClick={limpiarFiltros}>Limpiar</Btn>
          </div>
        </div>
        {errorFiltros ? (
          <p className={css.error} role="alert">
            No se pudieron cargar los filtros: {errorFiltros}
          </p>
        ) : null}
        {error ? (
          <p className={css.error} role="alert">
            No se pudo consultar el inventario: {error}
          </p>
        ) : null}
        <div className={css.tableContainer}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del artículo</th>
                <th>Categoría</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Estado</th>
                <th>Acción</th>
                {puedeSolicitar && <th>Compra</th>}
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={columnasTabla}>Cargando artículos...</td>
                </tr>
              ) : articulos.length > 0 ? (
                articulos.map((articulo) => (
                  <tr key={articulo.id}>
                    <td>{articulo.codigo_sku ?? "—"}</td>
                    <td>{articulo.nombre}</td>
                    <td>{articulo.categoria ?? "—"}</td>
                    <td>{articulo.stock_actual}</td>
                    <td>{articulo.stock_minimo}</td>
                    <td>{etiquetaEstado(articulo.estado)}</td>
                    <td>
                      {articulo.estado !== "DISPONIBLE" ? (
                        <Btn
                          onClick={() => {
                            nav("/finanzas?crearOC=1");
                          }}
                        >
                          Solicitar
                        </Btn>
                      ) : (
                        ""
                      )}
                    </td>
                    {puedeSolicitar && (
                      <td>
                        <Link to={`/bodega/solicitudes?articulo=${articulo.id}`}>
                          Solicitar compra
                        </Link>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columnasTabla}>
                    No hay artículos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className={css.row}>
            <p className={css.resumen}>
              Mostrando {inicioResultados}-{finResultados} de {paginacion.total}{" "}
              artículos
            </p>
            <div className={css.navegacion}>
              <p className={css.resumen}>{CANTIDAD_POR_PAGINA} por página</p>
              <button
                type="button"
                className={css.btn}
                disabled={cargando || pagina <= 1}
                onClick={() => setPagina((actual) => actual - 1)}
              >
                Anterior
              </button>
              {paginasVisibles.map((numeroPagina) => (
                <button
                  type="button"
                  key={numeroPagina}
                  className={pagina === numeroPagina ? css.btnActive : css.btn}
                  disabled={cargando || pagina === numeroPagina}
                  aria-current={pagina === numeroPagina ? "page" : undefined}
                  onClick={() => setPagina(numeroPagina)}
                >
                  {numeroPagina}
                </button>
              ))}
              <button
                type="button"
                className={css.btn}
                disabled={cargando || pagina >= paginasTotales}
                onClick={() => setPagina((actual) => actual + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </Box>
    </Frame>
  );
}
