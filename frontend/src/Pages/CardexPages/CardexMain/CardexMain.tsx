import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Card } from "../../../Components/Card/Card";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";
import { Frame } from "../../../Components/Frame/Frame";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { InputText } from "../../../Components/InputText/InputText";
import { Selector } from "../../../Components/Selector/Selector";
import { Title } from "../../../Components/Title/Title";
import {
  DescargarReporteCardex,
  GetCardex,
  GetCardexFiltros,
} from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type CardexConsulta,
  type CardexFiltrosConsulta,
  type CardexFiltrosRespuesta,
  type CardexFormatoReporte,
  type CardexMovimiento,
  type CardexRespuesta,
  type CardexTipoMovimiento,
} from "../../../types/general";
import css from "./CardexMain.module.css";

interface FiltrosFormulario {
  desde: Date;
  hasta: Date;
  producto: string;
  obra: string;
  tipoMovimiento: CardexTipoMovimiento | "";
}

const CANTIDAD_POR_PAGINA = 10;

function filtrosIniciales(): FiltrosFormulario {
  const hoy = new Date();
  return {
    desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    hasta: hoy,
    producto: "",
    obra: "",
    tipoMovimiento: "",
  };
}

function fechaAISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function idDeOpcion(opcion: string): number | undefined {
  const id = Number(opcion.split(" - ", 1)[0]);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function crearConsulta(filtros: FiltrosFormulario): CardexFiltrosConsulta {
  const productoId = idDeOpcion(filtros.producto);
  const obraId = idDeOpcion(filtros.obra);
  return {
    desde: fechaAISO(filtros.desde),
    hasta: fechaAISO(filtros.hasta),
    ...(productoId ? { producto_id: productoId } : {}),
    ...(obraId ? { obra_id: obraId } : {}),
    ...(filtros.tipoMovimiento
      ? { tipo_movimiento: filtros.tipoMovimiento }
      : {}),
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

function formatoFecha(fecha: string): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

function formatoDinero(valor: number | string): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

function esEntrada(tipo: CardexTipoMovimiento): boolean {
  return tipo === "ENTRADA_COMPRA" || tipo === "DEVOLUCION";
}

function esSalida(tipo: CardexTipoMovimiento): boolean {
  return tipo === "SALIDA_OBRA" || tipo === "MERMA" || tipo === "USO_INTERNO";
}

function esAjuste(tipo: CardexTipoMovimiento): boolean {
  return tipo === "AJUSTE_INVENTARIO";
}

function etiquetaMovimiento(tipo: CardexTipoMovimiento): string {
  return esAjuste(tipo) ? "Ajuste por conteo" : tipo;
}

function nombreProducto(
  producto: CardexFiltrosRespuesta["data"]["productos"][number],
): string {
  return `${producto.id} - ${producto.nombre}${
    producto.codigo_sku ? ` (${producto.codigo_sku})` : ""
  }`;
}

function nombreObra(
  obra: CardexFiltrosRespuesta["data"]["obras"][number],
): string {
  return `${obra.id} - ${obra.codigo_obra} - ${obra.nombre_obra}`;
}

function filaMovimiento(movimiento: CardexMovimiento) {
  const ajuste = esAjuste(movimiento.tipo_movimiento);
  const cantidadEntrada =
    esEntrada(movimiento.tipo_movimiento) ||
    (ajuste && movimiento.cantidad > 0);
  const cantidadSalida =
    esSalida(movimiento.tipo_movimiento) || (ajuste && movimiento.cantidad < 0);
  const cantidad = Math.abs(movimiento.cantidad);
  return (
    <tr key={movimiento.id}>
      <td>{formatoFecha(movimiento.fecha_hora)}</td>
      <td>{movimiento.producto.nombre}</td>
      <td>{movimiento.producto.codigo_sku ?? "—"}</td>
      <td>—</td>
      <td>{etiquetaMovimiento(movimiento.tipo_movimiento)}</td>
      <td>{cantidadEntrada ? cantidad : "—"}</td>
      <td>{cantidadSalida ? cantidad : "—"}</td>
      <td>{movimiento.saldo_resultante}</td>
      <td>{formatoDinero(movimiento.saldo_valorizado)}</td>
      <td>
        {movimiento.obra
          ? `${movimiento.obra.codigo_obra} - ${movimiento.obra.nombre_obra}`
          : "Sin obra"}
      </td>
      <td>{movimiento.usuario.nombre}</td>
      <td>{movimiento.motivo_justificacion || "-"}</td>
    </tr>
  );
}

export function CardexMain() {
  const puedeConsultar = useValidateRol([Rol.admin, Rol.finanzas]);
  const topScrollbarRef = useRef<HTMLDivElement>(null);
  const tableScrollerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [anchoTabla, setAnchoTabla] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosFormulario>(filtrosIniciales);
  const [filtrosAplicados, setFiltrosAplicados] =
    useState<CardexFiltrosConsulta>(() => crearConsulta(filtrosIniciales()));
  const [opciones, setOpciones] = useState<CardexFiltrosRespuesta["data"]>({
    productos: [],
    obras: [],
    tipos_movimiento: [],
  });
  const [movimientos, setMovimientos] = useState<CardexMovimiento[]>([]);
  const [paginacion, setPaginacion] = useState<CardexRespuesta["paginacion"]>({
    pagina: 1,
    cantidad: CANTIDAD_POR_PAGINA,
    total: 0,
    total_paginas: 0,
  });
  const [pagina, setPagina] = useState(1);
  const [cargandoFiltros, setCargandoFiltros] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<CardexFormatoReporte | null>(
    null,
  );
  const [errorFiltros, setErrorFiltros] = useState("");
  const [errorConsulta, setErrorConsulta] = useState("");
  const [errorDescarga, setErrorDescarga] = useState("");

  useEffect(() => {
    const tabla = tableRef.current;
    if (!tabla) return;

    const actualizarAncho = () => setAnchoTabla(tabla.scrollWidth);
    actualizarAncho();
    const observador = new ResizeObserver(actualizarAncho);
    observador.observe(tabla);
    return () => observador.disconnect();
  }, [movimientos, cargando]);

  useEffect(() => {
    let activo = true;
    GetCardexFiltros()
      .then((respuesta) => {
        if (respuesta.error) throw new Error(respuesta.mensaje);
        if (activo) setOpciones(respuesta.data);
      })
      .catch(async (error: unknown) => {
        if (activo) setErrorFiltros(await mensajeError(error));
      })
      .finally(() => {
        if (activo) setCargandoFiltros(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    const consulta: CardexConsulta = {
      ...filtrosAplicados,
      pagina,
      cantidad: CANTIDAD_POR_PAGINA,
    };
    GetCardex(consulta)
      .then((respuesta) => {
        if (respuesta.error) throw new Error(respuesta.mensaje);
        if (activo) {
          setMovimientos(respuesta.data);
          setPaginacion(respuesta.paginacion);
        }
      })
      .catch(async (error: unknown) => {
        if (activo) {
          setMovimientos([]);
          setPaginacion({
            pagina,
            cantidad: CANTIDAD_POR_PAGINA,
            total: 0,
            total_paginas: 0,
          });
          setErrorConsulta(await mensajeError(error));
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [filtrosAplicados, pagina]);

  function aplicarFiltros() {
    if (filtros.desde > filtros.hasta) {
      setErrorConsulta("La fecha Desde no puede ser posterior a Hasta.");
      return;
    }
    setErrorConsulta("");
    setCargando(true);
    setPagina(1);
    setFiltrosAplicados(crearConsulta(filtros));
  }

  function limpiarFiltros() {
    const iniciales = filtrosIniciales();
    setFiltros(iniciales);
    setCargando(true);
    setPagina(1);
    setErrorConsulta("");
    setFiltrosAplicados(crearConsulta(iniciales));
  }

  async function descargarReporte(formato: CardexFormatoReporte) {
    setErrorDescarga("");
    setExportando(formato);
    try {
      const { blob, filename } = await DescargarReporteCardex(
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
    } catch (error: unknown) {
      setErrorDescarga(await mensajeError(error));
    } finally {
      setExportando(null);
    }
  }

  if (!puedeConsultar) return null;

  const paginasTotales = Math.max(paginacion.total_paginas, 1);
  const primerIndicePagina = Math.max(
    1,
    Math.min(pagina - 1, paginasTotales - 2),
  );
  const paginasVisibles = Array.from(
    { length: Math.min(paginasTotales, 3) },
    (_, indice) => primerIndicePagina + indice,
  );
  const entradasPagina = movimientos.filter((movimiento) =>
    esEntrada(movimiento.tipo_movimiento),
  ).length;
  const salidasPagina = movimientos.filter((movimiento) =>
    esSalida(movimiento.tipo_movimiento),
  ).length;
  const ultimoSaldo = movimientos[0];
  const inicioResultados =
    paginacion.total === 0 ? 0 : (pagina - 1) * CANTIDAD_POR_PAGINA + 1;
  const finResultados = Math.min(
    pagina * CANTIDAD_POR_PAGINA,
    paginacion.total,
  );
  const productos = opciones.productos.map(nombreProducto);
  const obras = opciones.obras.map(nombreObra);

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
          <Title>Consultas y Cardex</Title>
          <p>
            Consulta la trazabilidad de inventario y descarga reportes de
            auditoría PDF o Excel.
          </p>
        </div>
        <div className={css.actions}>
          <Btn
            disabled={exportando !== null}
            onClick={() => void descargarReporte("pdf")}
          >
            {exportando === "pdf" ? "Generando PDF..." : "Descargar PDF"}
          </Btn>
          <Btn
            disabled={exportando !== null}
            onClick={() => void descargarReporte("excel")}
          >
            {exportando === "excel" ? "Generando Excel..." : "Descargar Excel"}
          </Btn>
        </div>
      </Box>

      <CardContainer>
        <Card
          title="Movimientos filtrados"
          content={String(paginacion.total)}
          footer="Coincidencias para los filtros aplicados"
        />
        <Card
          title="Entradas (página)"
          content={String(entradasPagina)}
          footer="Movimientos de entrada"
        />
        <Card
          title="Salidas (página)"
          content={String(salidasPagina)}
          footer="Movimientos de salida"
        />
        <Card
          title="Último saldo registrado"
          content={ultimoSaldo ? String(ultimoSaldo.saldo_resultante) : "—"}
          footer={ultimoSaldo?.producto.nombre ?? "Sin movimientos en página"}
        />
      </CardContainer>

      <Box>
        <div className={css.filters}>
          <Selector
            title="Producto"
            data={filtros.producto || 0}
            setData={(producto) =>
              setFiltros((actual) => ({ ...actual, producto }))
            }
            options={productos}
            firstOption="Selecciona un producto"
            isDisabled={cargandoFiltros}
          />
          <InputDate
            label="Desde"
            onChange={(desde) => setFiltros((actual) => ({ ...actual, desde }))}
            value={filtros.desde}
          />
          <InputDate
            label="Hasta"
            onChange={(hasta) => setFiltros((actual) => ({ ...actual, hasta }))}
            value={filtros.hasta}
          />
          <Selector
            title="Obra"
            data={filtros.obra || 0}
            setData={(obra) => setFiltros((actual) => ({ ...actual, obra }))}
            options={obras}
            firstOption="Selecciona la obra"
            isDisabled={cargandoFiltros}
          />
          <Selector
            title="Tipo de movimiento"
            data={filtros.tipoMovimiento || 0}
            setData={(tipoMovimiento) =>
              setFiltros((actual) => ({
                ...actual,
                tipoMovimiento:
                  opciones.tipos_movimiento.find(
                    (tipo) => tipo === tipoMovimiento,
                  ) ?? "",
              }))
            }
            options={opciones.tipos_movimiento}
            firstOption="Selecciona un tipo de movimiento"
            isDisabled={cargandoFiltros}
          />
          <InputText
            label="Documento"
            onChange={() => {}}
            placeholder="No disponible: el Cardex no registra folios"
            value=""
            disabled
          />
          <Btn onClick={aplicarFiltros}>Consultar</Btn>
          <Btn onClick={limpiarFiltros}>Limpiar</Btn>
        </div>
        {errorFiltros && (
          <p className={css.error} role="alert">
            No se pudieron cargar las opciones de filtro: {errorFiltros}
          </p>
        )}
        <p className={css.resumen}>
          El filtro por documento queda deshabilitado porque los movimientos
          actuales no guardan número ni folio.
        </p>
      </Box>

      <Box>
        <div className={css.row}>
          <Title>Cardex</Title>
          <p className={css.resumen}>Solo lectura</p>
        </div>
        {errorConsulta && (
          <p className={css.error} role="alert">
            No se pudo consultar el Cardex: {errorConsulta}
          </p>
        )}
        {errorDescarga && (
          <p className={css.error} role="alert">
            No se pudo generar el reporte: {errorDescarga}
          </p>
        )}
        <div className={css.tableContainer}>
          <div
            ref={topScrollbarRef}
            className={css.topScrollbar}
            role="region"
            aria-label="Desplazamiento horizontal del Cardex"
            tabIndex={0}
            onScroll={(event) => {
              if (tableScrollerRef.current) {
                tableScrollerRef.current.scrollLeft =
                  event.currentTarget.scrollLeft;
              }
            }}
          >
            <div style={{ width: `${anchoTabla}px` }} />
          </div>
          <div
            ref={tableScrollerRef}
            className={css.tableScroller}
            role="region"
            aria-label="Tabla de movimientos del Cardex"
            tabIndex={0}
            onScroll={(event) => {
              if (topScrollbarRef.current) {
                topScrollbarRef.current.scrollLeft =
                  event.currentTarget.scrollLeft;
              }
            }}
          >
            <table ref={tableRef} className={css.table}>
              <thead>
                <tr>
                  <th>Fecha/hora</th>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Documento</th>
                  <th>Movimiento</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Saldo</th>
                  <th>Saldo valorizado</th>
                  <th>Obra</th>
                  <th>Responsable</th>
                  <th>Motivo / consulta</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={12}>Cargando movimientos...</td>
                  </tr>
                ) : movimientos.length > 0 ? (
                  movimientos.map(filaMovimiento)
                ) : (
                  <tr>
                    <td colSpan={12}>
                      No hay movimientos que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={css.row}>
            <p className={css.resumen}>
              Mostrando {inicioResultados}-{finResultados} de {paginacion.total}{" "}
              movimientos
            </p>
            <div className={css.navegacion}>
              <p className={css.resumen}>{CANTIDAD_POR_PAGINA} por página</p>
              <button
                type="button"
                className={css.btn}
                disabled={cargando || pagina <= 1}
                onClick={() => {
                  setCargando(true);
                  setPagina((actual) => actual - 1);
                }}
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
                  onClick={() => {
                    setCargando(true);
                    setPagina(numeroPagina);
                  }}
                >
                  {numeroPagina}
                </button>
              ))}
              <button
                type="button"
                className={css.btn}
                disabled={cargando || pagina >= paginasTotales}
                onClick={() => {
                  setCargando(true);
                  setPagina((actual) => actual + 1);
                }}
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
