import { useEffect, useMemo, useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Frame } from "../../../Components/Frame/Frame";
import {
  AprobarRecepcion,
  CreateRecepcionCompra,
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
import css from "./RecepcionCompras.module.css";

interface CantidadesCapturadas {
  cantidadGuia: string;
  cantidadRecibida: string;
}

export function RecepcionCompras() {
  const isAllowed = useValidateRol([Rol.bodega]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrdenCompra[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [guideNumber, setGuideNumber] = useState("");
  const [packagesOnGuide, setPackagesOnGuide] = useState("");
  const [packagesReceived, setPackagesReceived] = useState("");
  const [observations, setObservations] = useState("");
  const [capturedQuantities, setCapturedQuantities] = useState<
    Record<number, CantidadesCapturadas>
  >({});
  const [receipt, setReceipt] = useState<RecepcionCompra | null>(null);
  const [pendingReceipts, setPendingReceipts] = useState<RecepcionCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [catalogos, setCatalogos] = useState<EgresoCatalogos | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const canReceive = roleId === Rol.admin || roleId === Rol.bodega;
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
    console.log(proveedores);
    console.log(catalogos);
    console.log(errorMessage);
    console.log(notice);
  }, []);

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
    if (!canApprove) return;
    GetRecepcionesPendientes().then((response) => {
      if (response && !response.error && response.data) {
        setPendingReceipts(response.data);
      } else {
        setErrorMessage("No se pudieron cargar las recepciones pendientes.");
      }
    });
  }, [canApprove]);

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

  function selectOrder(selected: OrdenCompra | undefined) {
    setSelectedOrderId(selected?.id ?? null);
    setCapturedQuantities(
      Object.fromEntries(
        (selected?.detalles ?? []).map((detail) => [
          detail.id,
          {
            cantidadGuia: String(detail.saldo_pendiente),
            cantidadRecibida: "",
          },
        ]),
      ),
    );
    setGuideNumber("");
    setPackagesOnGuide("");
    setPackagesReceived("");
    setObservations("");
    setReceipt(null);
    setErrorMessage("");
    setNotice("");
  }

  function handleScanSearch() {
    const scanned = scanValue.trim().toLocaleLowerCase();
    const found = availableOrders.find(
      (item) => item.numero_orden.trim().toLocaleLowerCase() === scanned,
    );
    if (!found) {
      setErrorMessage(
        "No se encontró una Orden de Compra abierta con ese número.",
      );
      return;
    }
    selectOrder(found);
  }

  function updateQuantity(
    detailId: number,
    field: keyof CantidadesCapturadas,
    value: string,
  ) {
    setCapturedQuantities((current) => ({
      ...current,
      [detailId]: {
        ...current[detailId],
        [field]: value,
      },
    }));
  }

  async function submitReceipt() {
    if (!order) {
      setErrorMessage("Seleccione o escanee una Orden de Compra.");
      return;
    }
    if (!guideNumber.trim()) {
      setErrorMessage("Ingrese el número de la guía de despacho.");
      return;
    }
    if (
      !packagesOnGuide.trim() ||
      !packagesReceived.trim() ||
      !Number.isInteger(Number(packagesOnGuide)) ||
      !Number.isInteger(Number(packagesReceived)) ||
      Number(packagesOnGuide) < 0 ||
      Number(packagesReceived) < 0
    ) {
      setErrorMessage(
        "Ingrese cantidades válidas de bultos indicados y recibidos.",
      );
      return;
    }

    const details = order.detalles.map((detail) => {
      const quantities = capturedQuantities[detail.id];
      return {
        detalle_orden_id: detail.id,
        cantidad_guia: Number(quantities?.cantidadGuia || 0),
        cantidad_recibida: Number(quantities?.cantidadRecibida || 0),
      };
    });
    if (
      details.some(
        (item) =>
          !Number.isInteger(item.cantidad_guia) ||
          !Number.isInteger(item.cantidad_recibida) ||
          item.cantidad_guia < 0 ||
          item.cantidad_recibida < 0,
      )
    ) {
      setErrorMessage("Las cantidades deben ser números enteros no negativos.");
      return;
    }
    if (!details.some((item) => item.cantidad_recibida > 0)) {
      setErrorMessage("Registre al menos una unidad recibida físicamente.");
      return;
    }

    const hasDiscrepancy =
      order.detalles.some((detail, index) => {
        const line = details[index];
        return (
          line.cantidad_guia !== line.cantidad_recibida ||
          line.cantidad_recibida !== detail.saldo_pendiente
        );
      }) || Number(packagesOnGuide) !== Number(packagesReceived);
    if (hasDiscrepancy && !observations.trim()) {
      setErrorMessage(
        "Describa la recepción parcial o diferencia antes de enviarla a aprobación.",
      );
      return;
    }

    setErrorMessage("");
    setNotice("");
    setIsSaving(true);
    try {
      const response = await CreateRecepcionCompra({
        orden_compra_id: order.id,
        numero_guia: guideNumber.trim(),
        bultos_guia: Number(packagesOnGuide),
        bultos_recibidos: Number(packagesReceived),
        observaciones: observations.trim() || undefined,
        detalles: details,
      });
      if (!response || response.error || !response.data) {
        setErrorMessage(
          response?.mensaje || "No se pudo guardar la recepción.",
        );
        return;
      }

      setReceipt(response.data);
      setNotice(response.mensaje);
      const refreshedOrders = await GetOrdenesCompra();
      if (refreshedOrders?.data) setOrders(refreshedOrders.data);
      if (response.data.estado === "PENDIENTE_APROBACION") {
        const pending = await GetRecepcionesPendientes();
        if (pending?.data) setPendingReceipts(pending.data);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Ocurrió un error inesperado al guardar la recepción.");
    } finally {
      setIsSaving(false);
    }
  }

  async function approveReceipt(recepcionId: number) {
    setErrorMessage("");
    setNotice("");
    try {
      const response = await AprobarRecepcion(recepcionId);
      if (!response || response.error) {
        setErrorMessage(
          response?.mensaje || "No se pudo aprobar la recepción.",
        );
        return;
      }
      setNotice(response.mensaje);
      setPendingReceipts((current) =>
        current.filter((item) => item.id !== recepcionId),
      );
      if (receipt?.id === recepcionId && response.data) {
        setReceipt(response.data);
      }
      const refreshedOrders = await GetOrdenesCompra();
      if (refreshedOrders?.data) setOrders(refreshedOrders.data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Ocurrió un error al aprobar la recepción.");
    }
  }

  if (!isAllowed) return null;

  return (
    <Frame>
      <main className={css.main}>
        <Box
          style={{
            flexFlow: "column nowrap",
            alignItems: "stretch",
            justifyContent: "flex-start",
          }}
        >
          {canReceive && (
            <section className={css.section} aria-labelledby="receive-title">
              <h2 id="receive-title" className={css.sectionTitle}>
                Registrar recepción física
              </h2>
              <div className={css.orderControls}>
                <label className={css.field}>
                  <span>Escanear número de Orden de Compra</span>
                  <div className={css.scanRow}>
                    <input
                      autoComplete="off"
                      autoFocus
                      className={css.input}
                      onChange={(event) => setScanValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleScanSearch();
                        }
                      }}
                      placeholder="Escanee aquí o escriba el número"
                      value={scanValue}
                    />
                    <Btn onClick={handleScanSearch}>Buscar</Btn>
                  </div>
                  <small>
                    Los lectores USB/Bluetooth que escriben como teclado pueden
                    enviar el código y Enter.
                  </small>
                </label>
                <label className={css.field}>
                  <span>O seleccione una Orden de Compra</span>
                  <select
                    className={css.input}
                    onChange={(event) => {
                      const selected = availableOrders.find(
                        (item) => item.id === Number(event.target.value),
                      );
                      selectOrder(selected);
                    }}
                    value={selectedOrderId ?? ""}
                  >
                    <option value="">Seleccionar orden abierta</option>
                    {availableOrders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numero_orden} · {item.proveedor}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {order && (
                <>
                  <div className={css.orderSummary}>
                    <div>
                      <span>Orden</span>
                      <strong>{order.numero_orden}</strong>
                    </div>
                    <div>
                      <span>Proveedor</span>
                      <strong>{order.proveedor}</strong>
                    </div>
                    <div>
                      <span>Estado</span>
                      <strong>{order.estado}</strong>
                    </div>
                  </div>
                  <label className={css.field}>
                    <span>Número de guía de despacho *</span>
                    <input
                      className={css.input}
                      onChange={(event) => setGuideNumber(event.target.value)}
                      placeholder="Ingrese o escanee el número de guía"
                      value={guideNumber}
                    />
                  </label>
                  <div className={css.packageControls}>
                    <label className={css.field}>
                      <span>Bultos indicados en la guía *</span>
                      <input
                        className={css.input}
                        min={0}
                        onChange={(event) =>
                          setPackagesOnGuide(event.target.value)
                        }
                        type="number"
                        value={packagesOnGuide}
                      />
                    </label>
                    <label className={css.field}>
                      <span>Bultos contados físicamente *</span>
                      <input
                        className={css.input}
                        min={0}
                        onChange={(event) =>
                          setPackagesReceived(event.target.value)
                        }
                        type="number"
                        value={packagesReceived}
                      />
                    </label>
                  </div>
                  <div className={css.tableWrap}>
                    <table className={css.table}>
                      <thead>
                        <tr>
                          <th>SKU / Artículo</th>
                          <th>Pedido</th>
                          <th>Recibido anteriormente</th>
                          <th>Pendiente OC</th>
                          <th>Unidades en guía</th>
                          <th>Conteo físico</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.detalles.map((detail) => (
                          <tr key={detail.id}>
                            <td>
                              <strong>{detail.sku || "Sin SKU"}</strong>
                              <span className={css.itemName}>
                                {detail.nombre}
                              </span>
                            </td>
                            <td>{detail.cantidad_solicitada}</td>
                            <td>{detail.cantidad_recibida}</td>
                            <td>{detail.saldo_pendiente}</td>
                            <td>
                              <input
                                aria-label={`Unidades en guía para ${detail.nombre}`}
                                className={css.quantityInput}
                                min={0}
                                onChange={(event) =>
                                  updateQuantity(
                                    detail.id,
                                    "cantidadGuia",
                                    event.target.value,
                                  )
                                }
                                type="number"
                                value={
                                  capturedQuantities[detail.id]?.cantidadGuia ??
                                  ""
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={`Conteo físico para ${detail.nombre}`}
                                className={css.quantityInput}
                                min={0}
                                onChange={(event) =>
                                  updateQuantity(
                                    detail.id,
                                    "cantidadRecibida",
                                    event.target.value,
                                  )
                                }
                                type="number"
                                value={
                                  capturedQuantities[detail.id]
                                    ?.cantidadRecibida ?? ""
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label className={css.field}>
                    <span>Observaciones / discrepancias</span>
                    <textarea
                      className={css.textarea}
                      onChange={(event) => setObservations(event.target.value)}
                      placeholder="Obligatorio si la recepción es parcial o hay diferencias con la OC o la guía"
                      rows={3}
                      value={observations}
                    />
                  </label>
                  <p className={css.helpText}>
                    Las recepciones parciales o con diferencias quedan
                    pendientes de aprobación. El stock solo se actualiza al
                    aprobarse.
                  </p>
                  <div className={`${css.actions} ${css.noPrint}`}>
                    <Btn
                      disabled={isSaving}
                      onClick={() => {
                        void submitReceipt();
                      }}
                    >
                      {isSaving ? "Guardando..." : "Registrar recepción"}
                    </Btn>
                  </div>
                </>
              )}
            </section>
          )}

          {canApprove && (
            <section className={css.section} aria-labelledby="pending-title">
              <div className={css.sectionHeader}>
                <h2 id="pending-title" className={css.sectionTitle}>
                  Pendientes de aprobación
                </h2>
                <span className={css.badge}>{pendingReceipts.length}</span>
              </div>
              {pendingReceipts.length === 0 ? (
                <p>No hay recepciones con discrepancias pendientes.</p>
              ) : (
                <div className={css.pendingList}>
                  {pendingReceipts.map((item) => (
                    <article className={css.pendingCard} key={item.id}>
                      <div className={css.orderSummary}>
                        <div>
                          <span>Comprobante</span>
                          <strong>{item.comprobante}</strong>
                        </div>
                        <div>
                          <span>Orden / guía</span>
                          <strong>
                            {item.numero_orden} / {item.numero_guia}
                          </strong>
                        </div>
                        <div>
                          <span>Proveedor</span>
                          <strong>{item.proveedor}</strong>
                        </div>
                        <div>
                          <span>Registró</span>
                          <strong>{item.usuario}</strong>
                        </div>
                      </div>
                      <p className={css.discrepancy}>
                        {item.detalle_discrepancia}
                      </p>
                      {item.observaciones && <p>{item.observaciones}</p>}
                      <div className={css.tableWrap}>
                        <table className={css.table}>
                          <thead>
                            <tr>
                              <th>Artículo</th>
                              <th>Pedido OC</th>
                              <th>Guía</th>
                              <th>Conteo físico</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.detalles.map((detail, index) => (
                              <tr key={`${item.id}-${index}`}>
                                <td>{detail.sku || detail.articulo}</td>
                                <td>{detail.cantidad_solicitada}</td>
                                <td>{detail.cantidad_guia}</td>
                                <td>{detail.cantidad_recibida}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className={css.actions}>
                        <Btn
                          onClick={() => {
                            void approveReceipt(item.id);
                          }}
                        >
                          Aprobar y actualizar existencias
                        </Btn>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {receipt && (
            <section
              className={css.printReceipt}
              aria-labelledby="receipt-title"
            >
              <div className={css.receiptHeading}>
                <div>
                  <h2 id="receipt-title">Comprobante de recepción</h2>
                  <p>{receipt.comprobante}</p>
                </div>
                <span
                  className={
                    receipt.estado === "APROBADA"
                      ? css.approvedBadge
                      : css.pendingBadge
                  }
                >
                  {receipt.estado === "APROBADA"
                    ? "APROBADA"
                    : "PENDIENTE DE APROBACIÓN"}
                </span>
              </div>
              <div className={css.orderSummary}>
                <div>
                  <span>Orden de Compra</span>
                  <strong>{receipt.numero_orden}</strong>
                </div>
                <div>
                  <span>Guía</span>
                  <strong>{receipt.numero_guia}</strong>
                </div>
                <div>
                  <span>Bultos guía / recibidos</span>
                  <strong>
                    {receipt.bultos_guia} / {receipt.bultos_recibidos}
                  </strong>
                </div>
                <div>
                  <span>Proveedor</span>
                  <strong>{receipt.proveedor}</strong>
                </div>
                <div>
                  <span>Fecha</span>
                  <strong>
                    {new Date(receipt.fecha).toLocaleString("es-CL")}
                  </strong>
                </div>
                <div>
                  <span>Recibió</span>
                  <strong>{receipt.usuario}</strong>
                </div>
              </div>
              {receipt.detalle_discrepancia && (
                <p className={css.discrepancy}>
                  {receipt.detalle_discrepancia}
                </p>
              )}
              {receipt.observaciones && <p>{receipt.observaciones}</p>}
              <div className={css.tableWrap}>
                <table className={css.table}>
                  <thead>
                    <tr>
                      <th>SKU / Artículo</th>
                      <th>Pedido OC</th>
                      <th>Guía</th>
                      <th>Recibido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.detalles.map((detail, index) => (
                      <tr key={`${receipt.id}-${index}`}>
                        <td>{detail.sku || detail.articulo}</td>
                        <td>{detail.cantidad_solicitada}</td>
                        <td>{detail.cantidad_guia}</td>
                        <td>{detail.cantidad_recibida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`${css.actions} ${css.noPrint}`}>
                <Btn
                  onClick={() => {
                    setIsPrinting(true);
                    window.setTimeout(() => {
                      window.print();
                      setIsPrinting(false);
                    }, 0);
                  }}
                  disabled={isPrinting}
                >
                  Imprimir / Guardar PDF
                </Btn>
              </div>
            </section>
          )}
        </Box>
      </main>
    </Frame>
  );
}
