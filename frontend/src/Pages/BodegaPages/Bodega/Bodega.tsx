import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Card } from "../../../Components/Card/Card";
import { CardContainer } from "../../../Components/CardContainer/CardContainer";
import { Frame } from "../../../Components/Frame/Frame";
import { Selector } from "../../../Components/Selector/Selector";
import { Title } from "../../../Components/Title/Title";
import {
  GetCardex,
  GetCardexResumen,
} from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type CardexConsulta,
  type CardexMovimiento,
  type CardexResumen,
  type CardexTipoMovimiento,
} from "../../../types/general";
import css from "./Bodega.module.css";

const CANTIDAD_POR_PAGINA = 10;

const TIPOS_MOVIMIENTO: {
  value: CardexTipoMovimiento;
  label: string;
}[] = [
  { value: "ENTRADA_COMPRA", label: "Entrada por compra" },
  { value: "SALIDA_OBRA", label: "Salida a obra" },
  { value: "MERMA", label: "Merma" },
  { value: "DEVOLUCION", label: "Devolución" },
  { value: "USO_INTERNO", label: "Uso interno" },
  { value: "AJUSTE_INVENTARIO", label: "Ajuste por conteo" },
];

interface FiltrosCardex {
  buscar: string;
  desde: string;
  hasta: string;
  tipoMovimiento: CardexTipoMovimiento | "";
}

function formatoFecha(fecha: string): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

function crearConsulta(
  filtros: FiltrosCardex,
  pagina: number,
): CardexConsulta {
  return {
    pagina,
    cantidad: CANTIDAD_POR_PAGINA,
    ...(filtros.buscar.trim() ? { buscar: filtros.buscar.trim() } : {}),
    ...(filtros.desde ? { desde: filtros.desde } : {}),
    ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
    ...(filtros.tipoMovimiento
      ? { tipo_movimiento: filtros.tipoMovimiento }
      : {}),
  };
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

export function Bodega() {
  const nav = useNavigate();
  const isAllowed = useValidateRol([Rol.bodega]);
  const [filtros, setFiltros] = useState<FiltrosCardex>({
    buscar: "",
    desde: "",
    hasta: "",
    tipoMovimiento: "",
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosCardex>({
    buscar: "",
    desde: "",
    hasta: "",
    tipoMovimiento: "",
  });
  const [resumen, setResumen] = useState<CardexResumen | null>(null);
  const [movimientos, setMovimientos] = useState<CardexMovimiento[]>([]);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [errorResumen, setErrorResumen] = useState("");
  const [errorMovimientos, setErrorMovimientos] = useState("");

  useEffect(() => {
    if (!isAllowed) return;
    let activo = true;
    GetCardexResumen()
      .then((response) => {
        if (response.error) throw new Error(response.mensaje);
        if (activo) setResumen(response.data ?? null);
      })
      .catch((error: unknown) => {
        if (activo) setErrorResumen(mensajeDeError(error));
      })
      .finally(() => {
        if (activo) setCargandoResumen(false);
      });
    return () => {
      activo = false;
    };
  }, [isAllowed]);

  useEffect(() => {
    if (!isAllowed) return;
    let activo = true;
    const consulta = crearConsulta(filtrosAplicados, pagina);
    setCargandoMovimientos(true);
    GetCardex(consulta)
      .then((response) => {
        if (response.error) throw new Error(response.mensaje);
        if (activo) {
          setMovimientos(response.data);
          setTotalMovimientos(response.paginacion.total);
          setErrorMovimientos("");
        }
      })
      .catch((error: unknown) => {
        if (activo) {
          setMovimientos([]);
          setTotalMovimientos(0);
          setErrorMovimientos(mensajeDeError(error));
        }
      })
      .finally(() => {
        if (activo) setCargandoMovimientos(false);
      });
    return () => {
      activo = false;
    };
  }, [filtrosAplicados, isAllowed, pagina]);

  if (!isAllowed) return null;

  function aplicarFiltros() {
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setErrorMovimientos("La fecha Desde no puede ser posterior a Hasta.");
      return;
    }
    setErrorMovimientos("");
    setPagina(1);
    setFiltrosAplicados({ ...filtros });
  }

  function limpiarFiltros() {
    const sinFiltros: FiltrosCardex = {
      buscar: "",
      desde: "",
      hasta: "",
      tipoMovimiento: "",
    };
    setFiltros(sinFiltros);
    setFiltrosAplicados(sinFiltros);
    setPagina(1);
    setErrorMovimientos("");
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalMovimientos / CANTIDAD_POR_PAGINA),
  );
  const inicioResultados =
    totalMovimientos === 0 ? 0 : (pagina - 1) * CANTIDAD_POR_PAGINA + 1;
  const finResultados = Math.min(
    pagina * CANTIDAD_POR_PAGINA,
    totalMovimientos,
  );

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
          <Title>Operaciones de Bodega</Title>
          <p>Registra recepciones y salidas con trazabilidad de inventario.</p>
        </div>
        <div className={css.actions}>
          <Btn onClick={() => nav("/bodega/recepcion")}>
            Recepción de compras
          </Btn>
          <Btn onClick={() => nav("/bodega/conteo")}>Conteo físico</Btn>
          <Btn onClick={() => nav("/bodega/salida")}>Registrar salida</Btn>
        </div>
      </Box>

      <CardContainer>
        <Card
          title="Movimientos de hoy"
          content={
            cargandoResumen
              ? "…"
              : errorResumen
                ? "No disponible"
                : String(resumen?.movimientos ?? 0)
          }
          footer={resumen?.fecha ? `Fecha: ${resumen.fecha}` : "Desde Cardex"}
        />
        <Card
          title="Entradas de hoy"
          content={
            cargandoResumen
              ? "…"
              : errorResumen
                ? "No disponible"
                : String(resumen?.entradas ?? 0)
          }
          footer="Movimientos de entrada registrados"
        />
        <Card
          title="Salidas de hoy"
          content={
            cargandoResumen
              ? "…"
              : errorResumen
                ? "No disponible"
                : String(resumen?.salidas ?? 0)
          }
          footer="Movimientos de salida registrados"
        />
        <Card
          title="Ajustes por conteo"
          content={
            cargandoResumen
              ? "…"
              : errorResumen
                ? "No disponible"
                : String(resumen?.ajustes ?? 0)
          }
          footer="Conteos aprobados hoy"
        />
      </CardContainer>

      {errorResumen && (
        <p className={css.error} role="alert">
          No se pudo cargar el resumen: {errorResumen}
        </p>
      )}

      <Box>
        <div className={css.row}>
          <Title>Historial de movimientos</Title>
          <p className={css.resumen}>{totalMovimientos} registros</p>
        </div>
        <div className={css.filters}>
          <label className={css.filterField}>
            Buscar en Cardex
            <input
              type="search"
              value={filtros.buscar}
              placeholder="Producto, SKU, obra o referencia"
              onChange={(event) =>
                setFiltros((actual) => ({
                  ...actual,
                  buscar: event.target.value,
                }))
              }
            />
          </label>
          <label className={css.filterField}>
            Fecha desde
            <input
              type="date"
              value={filtros.desde}
              onChange={(event) =>
                setFiltros((actual) => ({
                  ...actual,
                  desde: event.target.value,
                }))
              }
            />
          </label>
          <label className={css.filterField}>
            Fecha hasta
            <input
              type="date"
              value={filtros.hasta}
              onChange={(event) =>
                setFiltros((actual) => ({
                  ...actual,
                  hasta: event.target.value,
                }))
              }
            />
          </label>
          <Selector
            data={filtros.tipoMovimiento || 0}
            options={TIPOS_MOVIMIENTO.map((item) => item.value)}
            title="Operación"
            setData={(tipoMovimiento) =>
              setFiltros((actual) => ({
                ...actual,
                tipoMovimiento:
                  TIPOS_MOVIMIENTO.find((item) => item.value === tipoMovimiento)
                    ?.value ?? "",
              }))
            }
            firstOption="Todas las operaciones"
          />
          <Btn onClick={aplicarFiltros}>Buscar</Btn>
          <Btn onClick={limpiarFiltros}>Limpiar</Btn>
        </div>

        {errorMovimientos && (
          <p className={css.error} role="alert">
            No se pudo cargar el historial: {errorMovimientos}
          </p>
        )}

        <div className={css.tableContainer}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Referencia</th>
                <th>Operación</th>
                <th>Artículo</th>
                <th>Cantidad</th>
                <th>Destino</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {cargandoMovimientos ? (
                <tr>
                  <td colSpan={7}>Cargando movimientos...</td>
                </tr>
              ) : movimientos.length > 0 ? (
                movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>{formatoFecha(movimiento.fecha_hora)}</td>
                    <td>{movimiento.motivo_justificacion || "—"}</td>
                    <td>
                      {TIPOS_MOVIMIENTO.find(
                        (item) => item.value === movimiento.tipo_movimiento,
                      )?.label ?? movimiento.tipo_movimiento}
                    </td>
                    <td>
                      {movimiento.producto.codigo_sku
                        ? `${movimiento.producto.codigo_sku} - `
                        : ""}
                      {movimiento.producto.nombre}
                    </td>
                    <td>
                      {movimiento.tipo_movimiento === "AJUSTE_INVENTARIO"
                        ? `${movimiento.cantidad > 0 ? "+" : ""}${movimiento.cantidad}`
                        : movimiento.cantidad}
                    </td>
                    <td>
                      {movimiento.obra
                        ? `${movimiento.obra.codigo_obra} - ${movimiento.obra.nombre_obra}`
                        : "Sin obra"}
                    </td>
                    <td>{movimiento.usuario.nombre}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No hay movimientos que coincidan.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className={css.row}>
            <p className={css.resumen}>
              Mostrando {inicioResultados}-{finResultados} de {totalMovimientos}{" "}
              movimientos
            </p>
            <div className={css.navegacion}>
              <button
                type="button"
                className={css.btn}
                disabled={cargandoMovimientos || pagina <= 1}
                onClick={() => setPagina((actual) => actual - 1)}
              >
                Anterior
              </button>
              <span className={css.resumen}>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                className={css.btn}
                disabled={cargandoMovimientos || pagina >= totalPaginas}
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
