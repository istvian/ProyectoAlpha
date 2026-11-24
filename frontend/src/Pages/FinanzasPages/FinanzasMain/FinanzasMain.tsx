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
  type Obra,
  type Proveedor,
} from "../../../types/general";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { Selector } from "../../../Components/Selector/Selector";
import {
  GetFacturas,
  GetObras,
  GetProveedores,
} from "../../../Helpers/APIConnector";
import { Popup } from "../../../Components/Popup/Popup";
import { AgregarProveedor } from "../AgregarProveedor/AgregarProveedor";
import { AgregarObras } from "../AgregarObras/AgregarObras";

export function FinanzasMain() {
  const nav = useNavigate();
  const [popupAgregarDocumento, setPopupAgregarDocumento] = useState(false);
  const [popupAgregarProveedor, setPopupAgregarProveedor] = useState(false);
  const [popupAgregarObra, setPopupAgregarObra] = useState(false);
  const [agregarProveedorEdit, setAgregarProveedorEdit] = useState(false);
  const [agregarObraEdit, setAgregarObraEdit] = useState(false);
  const [currentProveedor, setCurrentProveedor] = useState<Proveedor | null>();
  const [currentObra, setCurrentObra] = useState<Obra | null>();
  const [facturas, setFacturas] = useState<DocumentoTributario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);

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
    GetObras().then((res) => {
      if (!res?.error && res?.data) {
        setObras(res?.data);
      }
    });
  }, [popupAgregarDocumento, popupAgregarProveedor, popupAgregarObra]);

  // Filtrar facturas
  const toYMD = (date: Date | string) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const facturasFiltradas = facturas.filter((item) => {
    const cumpleTipo = !filtroTipo || item.tipo === filtroTipo;

    let cumpleProveedor = true;
    if (filtroProveedor) {
      const proveedorObj = proveedores.find(
        (prov) => prov.id === item.proveedor_id,
      );
      const nombreProveedor = proveedorObj
        ? proveedorObj.razon_social
        : item.proveedor;
      cumpleProveedor = nombreProveedor === filtroProveedor;
    }

    const cumpleEmision =
      isNaN(filtroEmision.getTime()) ||
      !item.emision ||
      toYMD(item.emision) === toYMD(filtroEmision);

    const cumpleVencimiento =
      isNaN(filtroVencimiento.getTime()) ||
      !item.vencimiento ||
      toYMD(item.vencimiento) === toYMD(filtroVencimiento);

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
          <Btn onClick={() => nav("/finanzas/solicitudes")}>Solicitudes de material</Btn>
        </Box>

        <Popup isVisible={popupAgregarProveedor}>
          <AgregarProveedor
            data={currentProveedor}
            isEdit={agregarProveedorEdit}
            onEnd={() => {
              setPopupAgregarProveedor(false);
            }}
          />
        </Popup>
        <Popup
          isVisible={popupAgregarDocumento}
          style={{ width: "min(92vw, 88rem)", maxWidth: "88rem" }}
        >
          <AgregarDocumento
            proveedores={proveedores}
            onEnd={() => {
              setPopupAgregarDocumento(false);
            }}
          />
        </Popup>
        <Popup isVisible={popupAgregarObra}>
          <AgregarObras
            obras={currentObra}
            isEdit={agregarObraEdit}
            onEnd={() => {
              setPopupAgregarObra(false);
            }}
          />
        </Popup>

        <Box>
          <div className={css.row}>
            <Title>Listado de proveedores</Title>
            <Btn
              onClick={() => {
                setCurrentProveedor(null);
                setPopupAgregarProveedor(true);
                setAgregarProveedorEdit(false);
              }}
            >
              Agregar proveedor
            </Btn>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Razón social</th>
                  <th>RUT</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.length > 0 ? (
                  proveedores.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.razon_social}</td>
                        <td>{item.rut}</td>
                        <td>{item.deleted ? "Deshabilitado" : "Habilitado"}</td>
                        <td className={css.tdEditar}>
                          <Btn
                            onClick={() => {
                              setAgregarProveedorEdit(true);
                              setPopupAgregarProveedor(true);
                              setCurrentProveedor(item);
                            }}
                          >
                            Modificar
                          </Btn>
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
                      No se encontraron proveedores
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>
                Mostrando {proveedores.length} proveedores
              </p>
            </div>
          </div>
        </Box>
        <Box>
          <div className={css.row}>
            <Title>Listado de obras</Title>
            <Btn
              onClick={() => {
                setCurrentObra(null);
                setPopupAgregarObra(true);
                setAgregarObraEdit(false);
              }}
            >
              Agregar obra
            </Btn>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo de servicio</th>
                  <th>Técnico responsable</th>
                  <th>Estado</th>
                  <th>Fecha de creación</th>
                </tr>
              </thead>
              <tbody>
                {obras.length > 0 ? (
                  obras.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.codigo_obra}</td>
                        <td>{item.nombre_obra}</td>
                        <td>{item.tipo_servicio}</td>
                        <td>{item.tecnico_responsable_mail}</td>
                        <td>{item.enabled ? "Habilitada" : "Deshabilitada"}</td>
                        <td className={css.tdEditar}>
                          <Btn
                            onClick={() => {
                              setAgregarObraEdit(true);
                              setPopupAgregarObra(true);
                              setCurrentObra(item);
                            }}
                          >
                            Modificar
                          </Btn>
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
                      No se encontraron obras
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className={css.row}>
              <p className={css.resumen}>Mostrando {obras.length} obras</p>
            </div>
          </div>
        </Box>
        <Box>
          <div className={css.row}>
            <Title>Listado de facturas</Title>
            <div className={css.actions}>
              <Btn
                onClick={() => {
                  setPopupAgregarDocumento(true);
                }}
              >
                Nueva factura
              </Btn>
            </div>
          </div>
          <div className={css.filters}>
            <Selector
              data={filtroTipo}
              options={["Factura", "Boleta", "Nota de Crédito"]}
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
