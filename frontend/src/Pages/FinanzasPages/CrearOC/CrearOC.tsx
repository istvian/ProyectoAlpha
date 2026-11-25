import css from "./CrearOC.module.css";
import { useEffect, useMemo, useState } from "react";
import { Btn } from "../../../Components/Btn/Btn";
import { Title } from "../../../Components/Title/Title";
import {
  CreateOrdenCompra,
  GetEgresoCatalogos,
  GetOrdenesCompra,
  GetProveedores,
  GetRecepcionesPendientes,
  GetUserData,
} from "../../../Helpers/APIConnector";
import useValidateRol from "../../../Hooks/useValidateRol";
import {
  Rol,
  type EgresoCatalogos,
  type OrdenCompra,
  type Proveedor,
  type RecepcionCompra,
} from "../../../types/general";

interface CantidadesCapturadas {
  cantidadGuia: string;
  cantidadRecibida: string;
}

interface DetalleOrdenBorrador {
  articulo_id: number;
  sku: string;
  nombre: string;
  cantidad_solicitada: number;
  precio_unitario: number;
}
interface CrearOCProps {
  onEnd: () => void;
}

export function CrearOC({ onEnd }: CrearOCProps) {
  const isAllowed = useValidateRol([Rol.bodega]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrdenCompra[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [catalogos, setCatalogos] = useState<EgresoCatalogos | null>(null);
  const [numeroOrden, setNumeroOrden] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [articuloId, setArticuloId] = useState("");
  const [cantidadSolicitada, setCantidadSolicitada] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [detallesOrden, setDetallesOrden] = useState<DetalleOrdenBorrador[]>(
    [],
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const canCreateOrder = roleId === Rol.admin || roleId === Rol.finanzas;
  const canApprove =
    roleId === Rol.admin ||
    roleId === Rol.finanzas ||
    roleId === Rol.supervisor;
  const order = useMemo(
    () => orders.find((item) => item.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const availableOrders = orders.filter(
    (item) => item.estado !== "COMPLETA" && !item.recepcion_pendiente,
  );

  useEffect(() => {
    if (!isAllowed) return;

    GetUserData().then((response) => {
      if (response && !response.error) {
        setRoleId(response.rol_id);
      } else {
        setErrorMessage("No se pudo verificar el rol de la sesión.");
      }
    });
    GetOrdenesCompra().then((response) => {
      if (response && !response.error && response.data) {
        setOrders(response.data);
      } else {
        setErrorMessage("No se pudieron cargar las Órdenes de Compra.");
      }
    });
  }, [isAllowed]);

  useEffect(() => {
    if (!canCreateOrder) return;
    let active = true;
    Promise.all([GetProveedores(), GetEgresoCatalogos()])
      .then(([proveedorResponse, catalogoResponse]) => {
        if (!active) return;
        if (
          !proveedorResponse ||
          proveedorResponse.error ||
          !proveedorResponse.data
        ) {
          setErrorMessage(
            proveedorResponse?.mensaje || "No se pudieron cargar proveedores.",
          );
          return;
        }
        if (
          !catalogoResponse ||
          catalogoResponse.error ||
          !catalogoResponse.data
        ) {
          setErrorMessage(
            catalogoResponse?.mensaje || "No se pudieron cargar artículos.",
          );
          return;
        }
        setProveedores(
          proveedorResponse.data.filter((proveedor) => !proveedor.deleted),
        );
        setCatalogos(catalogoResponse.data);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los datos de la Orden de Compra.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [canCreateOrder]);

  function agregarDetalleOrden() {
    const articulo = catalogos?.articulos.find(
      (item) => String(item.id) === articuloId,
    );
    const cantidad = Number(cantidadSolicitada);
    const precio = Number(precioUnitario);
    if (
      !articulo ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0 ||
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      setErrorMessage(
        "Seleccione un artículo e indique cantidad y costo válidos.",
      );
      return;
    }
    if (detallesOrden.some((detalle) => detalle.articulo_id === articulo.id)) {
      setErrorMessage("No repita el mismo artículo en líneas separadas.");
      return;
    }
    setDetallesOrden((current) => [
      ...current,
      {
        articulo_id: articulo.id,
        sku: articulo.codigo_sku ?? "",
        nombre: articulo.nombre,
        cantidad_solicitada: cantidad,
        precio_unitario: precio,
      },
    ]);
    setArticuloId("");
    setCantidadSolicitada("");
    setPrecioUnitario("");
    setErrorMessage("");
  }

  async function crearOrden() {
    if (!numeroOrden.trim() || !proveedorId || detallesOrden.length === 0) {
      setErrorMessage("Indique número, proveedor y al menos un artículo.");
      return;
    }
    setIsCreatingOrder(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await CreateOrdenCompra({
        numero_orden: numeroOrden.trim(),
        proveedor_id: Number(proveedorId),
        detalles: detallesOrden.map((detalle) => ({
          articulo_id: detalle.articulo_id,
          cantidad_solicitada: detalle.cantidad_solicitada,
          precio_unitario: detalle.precio_unitario,
        })),
      });
      if (!response || response.error || !response.data) {
        setErrorMessage(response?.mensaje || "No se pudo crear la orden.");
        return;
      }
      setNotice(`Orden ${response.data.numero_orden} creada correctamente.`);
      setNumeroOrden("");
      setProveedorId("");
      setDetallesOrden([]);
      const refreshedOrders = await GetOrdenesCompra();
      if (refreshedOrders?.data) setOrders(refreshedOrders.data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Ocurrió un error inesperado al crear la orden.");
    } finally {
      setIsCreatingOrder(false);
    }
  }

  if (!isAllowed) return null;
  return (
    <div className={css.main}>

      {(errorMessage || notice) && (
        <div
          className={errorMessage ? css.error : css.notice}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage || notice}
        </div>
      )}

      {canCreateOrder && (
        <section className={css.section} aria-labelledby="create-order-title">
          <h2 id="create-order-title" className={css.sectionTitle}>
            Crear Orden de Compra
          </h2>
          <p className={css.helpText}>
            Registre la orden sin pagos ni datos bancarios. Los artículos
            disponibles provienen del catálogo compartido con Bodega.
          </p>
          <div className={css.orderControls} style={{ marginBottom: "1rem" }}>
            <Btn
              onClick={() => {
                if (!catalogos?.articulos) {
                  setErrorMessage("No hay artículos cargados en el catálogo.");
                  return;
                }
                const lowStockItems = catalogos.articulos.filter(
                  (item) => item.stock_actual < item.stock_minimo,
                );
                if (lowStockItems.length === 0) {
                  setNotice("No hay artículos con stock menor al mínimo.");
                  return;
                }

                const nuevosDetalles: DetalleOrdenBorrador[] = [];
                for (const art of lowStockItems) {
                  if (detallesOrden.some((d) => d.articulo_id === art.id)) {
                    continue;
                  }
                  const deficit = art.stock_minimo - art.stock_actual;
                  const cantidadSugerida = deficit > 0 ? deficit : 1;
                  const precio = Number(art.precio_lista ?? 0);

                  nuevosDetalles.push({
                    articulo_id: art.id,
                    sku: art.codigo_sku ?? "",
                    nombre: art.nombre,
                    cantidad_solicitada: cantidadSugerida,
                    precio_unitario: precio > 0 ? precio : 1,
                  });
                }

                if (nuevosDetalles.length === 0) {
                  setNotice(
                    "Todos los artículos con bajo stock ya están incluidos en la orden.",
                  );
                  return;
                }

                setDetallesOrden((current) => [...current, ...nuevosDetalles]);
                setNotice(
                  `Se auto-llenaron ${nuevosDetalles.length} artículos con bajo stock.`,
                );
                setErrorMessage("");
              }}
            >
              Auto-rellenar artículos con bajo stock
            </Btn>
          </div>
          <div className={css.orderControls}>
            <label className={css.field}>
              <span>Número de orden *</span>
              <input
                className={css.input}
                onChange={(event) => setNumeroOrden(event.target.value)}
                placeholder="Ej.: OC-2026-001"
                value={numeroOrden}
              />
            </label>
            <label className={css.field}>
              <span>Proveedor *</span>
              <select
                className={css.input}
                onChange={(event) => setProveedorId(event.target.value)}
                value={proveedorId}
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id ?? ""}>
                    {proveedor.razon_social} · {proveedor.rut}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={css.orderControls}>
            <label className={css.field}>
              <span>Artículo *</span>
              <select
                className={css.input}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  setArticuloId(selectedId);
                  const articulo = catalogos?.articulos.find(
                    (item) => String(item.id) === selectedId,
                  );
                  setPrecioUnitario(
                    articulo?.precio_lista == null
                      ? ""
                      : String(articulo.precio_lista),
                  );
                }}
                value={articuloId}
              >
                <option value="">Selecciona un artículo existente</option>
                {(catalogos?.articulos ?? []).map((articulo) => (
                  <option key={articulo.id} value={articulo.id}>
                    {articulo.codigo_sku || "Sin SKU"} · {articulo.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={css.field}>
              <span>Cantidad solicitada *</span>
              <input
                className={css.input}
                min={1}
                onChange={(event) => setCantidadSolicitada(event.target.value)}
                type="number"
                value={cantidadSolicitada}
              />
            </label>
            <label className={css.field}>
              <span>Costo unitario estimado *</span>
              <input
                className={css.input}
                min={0.01}
                onChange={(event) => setPrecioUnitario(event.target.value)}
                step="0.01"
                type="number"
                value={precioUnitario}
              />
            </label>
            <div className={css.actions}>
              <Btn disabled={isCreatingOrder} onClick={agregarDetalleOrden}>
                Agregar artículo
              </Btn>
            </div>
          </div>
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>SKU</th>
                  <th>Cantidad</th>
                  <th>Costo unitario estimado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {detallesOrden.length ? (
                  detallesOrden.map((detalle) => (
                    <tr key={detalle.articulo_id}>
                      <td>{detalle.nombre}</td>
                      <td>{detalle.sku || "—"}</td>
                      <td>
                        <input
                          className={css.input}
                          min={1}
                          onChange={(event) =>
                            setDetallesOrden((prev) =>
                              prev.map((item) =>
                                detalle.articulo_id === item.articulo_id
                                  ? {
                                      ...item,
                                      cantidad_solicitada: Number(
                                        event.target.value,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                          type="number"
                          value={detalle.cantidad_solicitada}
                        />
                      </td>
                      <td>
                        ${detalle.precio_unitario.toLocaleString("es-CL")}
                      </td>
                      <td>
                        <Btn
                          warning
                          disabled={isCreatingOrder}
                          onClick={() =>
                            setDetallesOrden((current) =>
                              current.filter(
                                (item) =>
                                  item.articulo_id !== detalle.articulo_id,
                              ),
                            )
                          }
                        >
                          Quitar
                        </Btn>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Agregue artículos para formar la orden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={`${css.actions} ${css.noPrint}`}>
            <Btn onClick={() => onEnd()}>Cancelar</Btn>
            <Btn
              disabled={
                isCreatingOrder ||
                !numeroOrden.trim() ||
                !proveedorId ||
                !detallesOrden.length
              }
              onClick={() => void crearOrden()}
            >
              {isCreatingOrder ? "Creando orden..." : "Crear orden"}
            </Btn>
          </div>
        </section>
      )}
    </div>
  );
}
