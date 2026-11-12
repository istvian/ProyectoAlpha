import css from "./FinanzasMain.module.css";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";
import { AgregarDocumento } from "../AgregarDocumento/AgregarDocumento";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type DocumentoTributario,
  type Proveedor,
} from "../../../types/general";
import { useEffect, useState } from "react";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { Selector } from "../../../Components/Selector/Selector";
import { GetFacturas, GetProveedores } from "../../../Helpers/APIConnector";

export function FinanzasMain() {
  const [agregarDocumento, setAgregarDocumento] = useState(false);
  const [facturas, setFacturas] = useState<DocumentoTributario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  // Estados de filtros
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroEmision, setFiltroEmision] = useState<Date>(new Date(""));
  const [filtroVencimiento, setFiltroVencimiento] = useState<Date>(
    new Date(""),
  );

  // Estado de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 10;

  useEffect(() => {
    GetFacturas().then((res) => {
      if (!res?.error && res?.data) {
        setFacturas(res?.data);
      }
    });
    GetProveedores().then((res) => {
      if (!res?.error && res?.data) {
        setProveedores(res?.data);
      }
    });
  }, [agregarDocumento]);

  // Filtrar facturas
  const facturasFiltradas = facturas.filter((item) => {
    const cumpleTipo = !filtroTipo || item.tipo === filtroTipo;
    const cumpleProveedor =
      !filtroProveedor || item.proveedor === filtroProveedor;

    let cumpleEmision = true;
    if (!isNaN(filtroEmision.getTime()) && item.emision) {
      const itemEmision = new Date(item.emision);
      cumpleEmision =
        itemEmision.getFullYear() === filtroEmision.getFullYear() &&
        itemEmision.getMonth() === filtroEmision.getMonth() &&
        itemEmision.getDate() === filtroEmision.getDate();
    }

    let cumpleVencimiento = true;
    if (!isNaN(filtroVencimiento.getTime()) && item.vencimiento) {
      const itemVencimiento = new Date(item.vencimiento);
      cumpleVencimiento =
        itemVencimiento.getFullYear() === filtroVencimiento.getFullYear() &&
        itemVencimiento.getMonth() === filtroVencimiento.getMonth() &&
        itemVencimiento.getDate() === filtroVencimiento.getDate();
    }

    return cumpleTipo && cumpleProveedor && cumpleEmision && cumpleVencimiento;
  });

  // Paginación
  const totalPaginas =
    Math.ceil(facturasFiltradas.length / elementosPorPagina) || 1;
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const facturasPaginadas = facturasFiltradas.slice(indiceInicio, indiceFin);

  const handlePageChange = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  const limpiarFiltros = () => {
    setFiltroTipo("");
    setFiltroProveedor("");
    setFiltroEmision(new Date(""));
    setFiltroVencimiento(new Date(""));
    setPaginaActual(1);
  };

  if (useValidateRol([Rol.finanzas]))
    return (
      <Frame>
        <Box
          style={{
            flexFlow: "row nowrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Title>Compras y facturación</Title>
            <p>
              Ingresa documentos de proveedores, actualiza costos y consulta tus
              reportes financieros.
            </p>
          </div>
          <div className={css.actions}>
            <Btn
              onClick={() => {
                setAgregarDocumento(true);
              }}
            >
              Nuevo documento
            </Btn>
          </div>
        </Box>
        {agregarDocumento ? (
          <AgregarDocumento
            onEnd={() => {
              setAgregarDocumento(false);
            }}
          />
        ) : (
          ""
        )}
        <Box>
          <div className={css.row}>
            <Title>Listado de facturas</Title>
          </div>
          <div className={css.filters}>
            <Selector
              data={filtroTipo}
              options={["Factura electrónica", "Boleta"]}
              title="Tipo"
              setData={(selected) => {
                setFiltroTipo(selected);
                setPaginaActual(1);
              }}
              firstOption="Todos los tipos"
            />
            <Selector
              data={filtroProveedor}
              options={proveedores.map((item) => item.razon_social)}
              title="Proveedor"
              setData={(selected) => {
                setFiltroProveedor(selected);
                setPaginaActual(1);
              }}
              firstOption="Todos los proveedores"
            />
            <InputDate
              label="Fecha emisión"
              value={filtroEmision}
              onChange={(date) => {
                setFiltroEmision(date);
                setPaginaActual(1);
              }}
            />
            <InputDate
              label="Fecha vencimiento"
              value={filtroVencimiento}
              onChange={(date) => {
                setFiltroVencimiento(date);
                setPaginaActual(1);
              }}
            />
            <Btn onClick={limpiarFiltros}>Limpiar</Btn>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Proveedor</th>
                  <th>RUT</th>
                  <th>Fecha de emisión</th>
                  <th>Fecha de vencimiento</th>
                  <th>Cantidad de productos</th>
                  <th>Total</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasPaginadas.length > 0 ? (
                  facturasPaginadas.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.folio}</td>
                        <td>
                          {
                            proveedores?.find(
                              (prov) => prov.id === item.proveedor_id,
                            )?.razon_social
                          }
                        </td>
                        <td>
                          {
                            proveedores?.find(
                              (prov) => prov.id === item.proveedor_id,
                            )?.rut
                          }
                        </td>
                        <td>
                          {new Date(item.emision).toLocaleDateString("es-CL")}
                        </td>
                        <td>
                          {new Date(item.vencimiento).toLocaleDateString(
                            "es-CL",
                          )}
                        </td>
                        <td>{item.cantidad_productos}</td>
                        <td>${Number(item.total).toLocaleString("es-CL")}</td>
                        <td>
                          {item.observaciones != ""
                            ? item.observaciones
                            : "Sin observaciones"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: "1.5rem" }}
                    >
                      No se encontraron facturas con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>
                Mostrando {facturasFiltradas.length > 0 ? indiceInicio + 1 : 0}-
                {Math.min(indiceFin, facturasFiltradas.length)} de{" "}
                {facturasFiltradas.length} artículos
              </p>
              <div className={css.navegacion}>
                <p className={css.resumen}>10 por página</p>
                <p
                  className={css.btn}
                  onClick={() => handlePageChange(paginaActual - 1)}
                  style={{
                    opacity: paginaActual === 1 ? 0.5 : 1,
                    cursor: paginaActual === 1 ? "default" : "pointer",
                  }}
                >
                  Anterior
                </p>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                  (num) => (
                    <p
                      key={num}
                      className={paginaActual === num ? css.btnActive : css.btn}
                      onClick={() => handlePageChange(num)}
                    >
                      {num}
                    </p>
                  ),
                )}
                <p
                  className={css.btn}
                  onClick={() => handlePageChange(paginaActual + 1)}
                  style={{
                    opacity: paginaActual === totalPaginas ? 0.5 : 1,
                    cursor:
                      paginaActual === totalPaginas ? "default" : "pointer",
                  }}
                >
                  Siguiente
                </p>
              </div>
            </div>
          </div>
        </Box>
      </Frame>
    );
}
