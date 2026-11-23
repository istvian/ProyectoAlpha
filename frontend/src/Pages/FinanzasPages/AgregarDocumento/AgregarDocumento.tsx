import { useEffect, useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { InputText } from "../../../Components/InputText/InputText";
import { Selector } from "../../../Components/Selector/Selector";
import { Title } from "../../../Components/Title/Title";
import css from "./AgregarDocumento.module.css";
import type {
  FacturaCreate,
  Producto,
  Proveedor,
} from "../../../types/general";
import { CreateFactura, GetOrdenesCompra } from "../../../Helpers/APIConnector";
import type { OrdenCompra } from "../../../types/general";

interface AgregarDocumentoProps {
  onEnd: () => void;
  proveedores: Proveedor[];
}

export function AgregarDocumento({
  onEnd,
  proveedores,
}: AgregarDocumentoProps) {
  const PRODUCTO_INICIAL: Producto = {
    sku: "",
    stock: 0,
    stock_minimo: 0,
    costo_neto: 0,
    importe_base: 0,
    neto_final: 0,
    nombre: "",
    precio_neto: 0,
    descripcion: "",
  };

  const FORMULARIO_INICIAL: FacturaCreate = {
    descuento1: 0,
    descuento2: 0,
    descuento3: 0,
    emision: new Date(),
    vencimiento: new Date(),
    folio: "",
    observaciones: "",
    proveedor: proveedores[0]?.razon_social,
    productos: [],
    rut: proveedores[0]?.rut,
    tipo: "Factura",
    descuento_total: 0,
    importe_base: 0,
    iva: 0,
    subtotal: 0,
    total: 0,
    cantidad_productos: 0,
    montoDescuento1: 0,
    montoDescuento2: 0,
    montoDescuento3: 0,
    saldoDescuento1: 0,
    saldoDescuento2: 0,
    saldoDescuento3: 0,
    sobreDescuento1: 0,
    sobreDescuento2: 0,
    sobreDescuento3: 0,
  };
  const [formulario, setFormulario] =
    useState<FacturaCreate>(FORMULARIO_INICIAL);
  const [producto, setProducto] = useState<Producto>(PRODUCTO_INICIAL);
  const [showPopup, setShowPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const ordenVinculada = ordenesCompra.find(
    (orden) => orden.id === formulario.orden_compra_id,
  );
  const proveedorSeleccionadoId = proveedores.find(
    (proveedor) => proveedor.rut === formulario.rut,
  )?.id;
  const ordenesFacturables = ordenesCompra.filter(
    (orden) =>
      orden.proveedor_id === proveedorSeleccionadoId &&
      orden.detalles.some((detalle) => detalle.cantidad_por_facturar > 0),
  );

  useEffect(() => {
    GetOrdenesCompra().then((response) => {
      console.log(response?.data);
      if (response && !response.error && response.data) {
        setOrdenesCompra(response.data);
      } else {
        console.log("Error");
        setErrorMsg("No se pudieron cargar las Órdenes de Compra.");
      }
    });
  }, []);

  async function handleRegistrar() {
    if (!formulario?.proveedor?.trim()) {
      setErrorMsg("El campo Proveedor es obligatorio.");
      return;
    }
    if (!formulario?.rut?.trim()) {
      setErrorMsg("El RUT del proveedor es obligatorio.");
      return;
    }
    if (!formulario?.folio?.trim()) {
      setErrorMsg("El Folio es obligatorio.");
      return;
    }
    if (
      [
        formulario.descuento1,
        formulario.descuento2,
        formulario.descuento3,
      ].some(
        (descuento) =>
          !Number.isFinite(descuento) || descuento < 0 || descuento > 100,
      )
    ) {
      setErrorMsg("Cada descuento debe estar entre 0% y 100%.");
      return;
    }
    if (formulario.productos.length === 0) {
      setErrorMsg("Debe agregar al menos un producto a la factura.");
      return;
    }
    const payload = {
      ...formulario,
      emision: dateToString(formulario.emision as Date),
      vencimiento: dateToString(formulario.vencimiento as Date),
    };
    setErrorMsg("");
    console.log(formulario);
    try {
      const res = await CreateFactura(payload);
      if (res && !res.error) {
        alert("Se ha guardado correctamente la factura.");
        setFormulario({ ...FORMULARIO_INICIAL });
        setProducto({ ...PRODUCTO_INICIAL });
        setShowPopup(false);
        onEnd();
      } else {
        alert(res?.mensaje || "No se pudo guardar la factura.");
      }
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al registrar la factura.");
    }
  }
  const dateToString = (date: Date) => {
    if (!date || isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };
  function handleAgregarProducto() {
    if (!producto.nombre.trim()) {
      alert("El nombre del producto es obligatorio.");
      return;
    }
    if (producto.stock <= 0) {
      alert("El stock debe ser mayor a 0.");
      return;
    }
    if (producto.precio_neto <= 0) {
      alert("El precio neto debe ser mayor a 0.");
      return;
    }
    setShowPopup(false);
    setFormulario((prev) => ({
      ...prev,
      productos: [...prev.productos, producto],
    }));
    setProducto(PRODUCTO_INICIAL);
  }

  useEffect(() => {
    CalcularDescuentos();
  }, [
    formulario.productos.length,
    formulario.descuento1,
    formulario.descuento2,
    formulario.descuento3,
  ]);

  useEffect(() => {
    console.log(formulario);
  }, [formulario]);
  function CalcularDescuentos() {
    const redondear = (monto: number) =>
      Math.round((monto + Number.EPSILON) * 100) / 100;
    const descuentos = [
      formulario.descuento1,
      formulario.descuento2,
      formulario.descuento3,
    ];
    const montosDescuento = [0, 0, 0];
    let importeBase = 0;
    let subtotal = 0;
    let cantidadProductos = 0;
    const productos = formulario.productos.map((producto) => {
      const precioNeto = redondear(producto.precio_neto);
      let costoNeto = precioNeto;
      descuentos.forEach((porcentaje, index) => {
        const descuentoUnitario = redondear((costoNeto * porcentaje) / 100);
        montosDescuento[index] += descuentoUnitario * producto.stock;
        costoNeto = redondear(costoNeto - descuentoUnitario);
      });
      const importeBaseProducto = redondear(precioNeto * producto.stock);
      const netoFinal = redondear(costoNeto * producto.stock);
      importeBase += importeBaseProducto;
      subtotal += netoFinal;
      cantidadProductos += producto.stock;
      return {
        ...producto,
        importe_base: importeBaseProducto,
        costo_neto: costoNeto,
        neto_final: netoFinal,
      };
    });
    const saldoDescuento1 = importeBase - montosDescuento[0];
    const saldoDescuento2 = saldoDescuento1 - montosDescuento[1];
    const saldoDescuento3 = saldoDescuento2 - montosDescuento[2];
    const iva = redondear(subtotal * 0.19);
    setFormulario((prev) => ({
      ...prev,
      sobreDescuento1: importeBase,
      montoDescuento1: montosDescuento[0],
      saldoDescuento1,
      sobreDescuento2: saldoDescuento1,
      montoDescuento2: montosDescuento[1],
      saldoDescuento2,
      sobreDescuento3: saldoDescuento2,
      montoDescuento3: montosDescuento[2],
      saldoDescuento3,
      importe_base: importeBase,
      descuento_total: importeBase - subtotal,
      subtotal,
      iva,
      total: subtotal + iva,
      cantidad_productos: cantidadProductos,
      productos: productos,
    }));
  }
  function handleCancelar() {
    setProducto({ ...PRODUCTO_INICIAL });
    setFormulario({ ...FORMULARIO_INICIAL });
    onEnd();
  }

  return (
    <div className={css.main}>
      <Box
        style={{
          flexFlow: "column nowrap",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <Title>Ingreso de factura</Title>
        <form
          className={css.form}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className={css.grid}>
            <Selector
              data={formulario.proveedor}
              firstOption="Selecciona un proveedor"
              options={
                proveedores
                  .filter((item) => !item.deleted)
                  .map((item) => item.razon_social) || []
              }
              title="Proveedor"
              setData={(data) => {
                setFormulario((prev) => ({
                  ...prev,
                  proveedor: data,
                  rut:
                    proveedores.find((item) => item.razon_social === data)
                      ?.rut || "",
                  orden_compra_id: undefined,
                }));
              }}
            />
            <Selector
              data={
                ordenVinculada
                  ? `${ordenVinculada.numero_orden} · ${ordenVinculada.proveedor}`
                  : ""
              }
              firstOption="Factura sin Orden de Compra vinculada"
              options={[
                "Sin vincular Orden de Compra",
                ...ordenesFacturables.map(
                  (orden) => `${orden.numero_orden} · ${orden.proveedor}`,
                ),
              ]}
              title="Orden de Compra (opcional)"
              setData={(numeroOrden) => {
                const orden =
                  numeroOrden === "Sin vincular Orden de Compra"
                    ? undefined
                    : ordenesCompra.find(
                        (item) =>
                          `${item.numero_orden} · ${item.proveedor}` ===
                          numeroOrden,
                      );
                setFormulario((prev) => ({
                  ...prev,
                  orden_compra_id: orden?.id,
                }));
              }}
            />
            {formulario.orden_compra_id && (
              <p>
                La recepción ya actualizó el inventario; esta factura solo
                registrará los datos financieros.
              </p>
            )}
            <InputText
              value={formulario?.folio}
              onChange={(text) => {
                setFormulario((prev) => ({ ...prev, folio: text }));
              }}
              label="Folio *"
              placeholder="Ingrese folio"
            />
            <InputDate
              label="Fecha de emisión *"
              onChange={(date) => {
                setFormulario((prev) => ({ ...prev, emision: date }));
              }}
              value={formulario.emision as Date}
            />
            <InputDate
              label="Fecha de vencimiento *"
              onChange={(date) => {
                setFormulario((prev) => ({ ...prev, vencimiento: date }));
              }}
              value={formulario.vencimiento as Date}
            />
          </div>
          <div className={css.row}>
            <Title>Detalles de productos</Title>
            <Btn
              onClick={() => {
                setShowPopup(true);
              }}
            >
              Nuevo producto
            </Btn>
          </div>
          <div
            className={css.popup}
            style={{ display: showPopup ? "flex" : "none" }}
          >
            <div className={css.bg}></div>
            <div className={css.content}>
              <Title>Nuevo producto</Title>
              <InputText
                value={producto?.nombre}
                onChange={(text) => {
                  setProducto((prev) => ({ ...prev, nombre: text }));
                }}
                label="Producto"
                placeholder="Ingrese el nombre"
              />
              <InputText
                value={producto?.descripcion}
                onChange={(text) => {
                  setProducto((prev) => ({ ...prev, descripcion: text }));
                }}
                label="Descripción"
                placeholder="Ingrese la descripción"
              />
              <InputText
                value={producto.sku}
                onChange={(text) => {
                  setProducto((prev) => ({ ...prev, sku: text }));
                }}
                label="SKU (opcional)"
                placeholder="Existente: suma stock; nuevo: crea; vacío: genera uno"
              />
              <InputText
                value={String(producto?.stock)}
                onChange={(text) => {
                  setProducto((prev) => ({
                    ...prev,
                    stock: Number(text),
                  }));
                }}
                type="number"
                label="Stock"
                placeholder="Ingrese la cantidad"
              />
              <InputText
                value={String(producto?.stock_minimo)}
                onChange={(text) => {
                  setProducto((prev) => ({
                    ...prev,
                    stock_minimo: Number(text),
                  }));
                }}
                type="number"
                label="Stock mínimo"
                placeholder="Ingrese la cantidad mínima"
              />
              <InputText
                value={String(producto?.precio_neto)}
                onChange={(text) => {
                  setProducto((prev) => ({
                    ...prev,
                    precio_neto: Number(text),
                  }));
                }}
                type="number"
                label="Precio neto"
                placeholder="Ingrese precio neto"
              />
              <div className={css.row}>
                <Btn
                  onClick={() => {
                    setShowPopup(false);
                    setProducto(PRODUCTO_INICIAL);
                  }}
                  warning
                >
                  Cancelar
                </Btn>
                <Btn
                  onClick={() => {
                    handleAgregarProducto();
                  }}
                >
                  Agregar
                </Btn>
              </div>
            </div>
          </div>
          <div className={css.tableContainer}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>-</th>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Cantidad</th>
                  <th>Precio neto</th>
                  <th>Importe base</th>
                  <th>Costo neto/u</th>
                  <th>Neto final</th>
                </tr>
              </thead>
              <tbody>
                {formulario.productos.map((item, index) => {
                  return (
                    <tr key={index}>
                      <td
                        className={css.delete}
                        onClick={() => {
                          setFormulario((prev) => ({
                            ...prev,
                            productos: [
                              ...prev.productos.filter((prod) => prod != item),
                            ],
                          }));
                        }}
                      >
                        Quitar
                      </td>
                      <td>{item.nombre}</td>
                      <td>{item.sku.trim() || "Se generará"}</td>
                      <td>{item.stock}</td>
                      <td>
                        ${Number(item.precio_neto).toLocaleString("es-CL")}
                      </td>
                      <td>
                        ${Number(item.importe_base).toLocaleString("es-CL")}
                      </td>
                      <td>
                        ${Number(item.costo_neto).toLocaleString("es-CL")}
                      </td>
                      <td>
                        ${Number(item.neto_final).toLocaleString("es-CL")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={css.row}>
            <p className={css.infotext}>
              {formulario.productos.length} productos y{" "}
              {formulario.cantidad_productos} unidades
            </p>
            <p>
              <b>
                Importe base: $
                {Number(formulario.importe_base).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
          <p className={css.aviso}>
            Precios sin IVA en CLP. Los descuentos de la factura se aplican
            sucesivamente a cada producto; el costo neto unitario ya incluye los
            tres descuentos.
          </p>
          <InputText
            value={formulario.observaciones}
            isArea
            onChange={(text) => {
              setFormulario((prev) => ({ ...prev, observaciones: text }));
            }}
            label="Observaciones (opcional)"
            placeholder="Ingresa observaciones"
          />
        </form>
      </Box>
      <Box
        style={{
          flexFlow: "column nowrap",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <Title>Descuentos y totales de la factura</Title>
        <p className={css.infotext}>
          Cálculo automático - Pesos chilenos (CLP)
        </p>
        <div className={css.row}>
          <p>Importe base neto</p>
          <p>${Number(formulario.importe_base).toLocaleString("es-CL")}</p>
        </div>
        <div className={css.descuento}>
          <div className={`${css.row} ${css.discountInfo}`}>
            <InputText
              label="Descuento 1"
              type="number"
              onChange={(text) => {
                setFormulario((prev) => ({
                  ...prev,
                  descuento1: Number(text),
                }));
              }}
              value={String(formulario.descuento1)}
              placeholder="10%"
            />
            <p>
              Sobre $
              {Number(formulario.sobreDescuento1).toLocaleString("es-CL")}
            </p>
            <p>
              Descuento: -$
              {Number(formulario.montoDescuento1).toLocaleString("es-CL")}
            </p>
          </div>
          <div className={css.row}>
            <p>Saldo después del descuento</p>
            <p>
              <b>
                ${Number(formulario.saldoDescuento1).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
        </div>
        <div className={css.descuento}>
          <div className={`${css.row} ${css.discountInfo}`}>
            <InputText
              label="Descuento 2"
              type="number"
              onChange={(text) => {
                setFormulario((prev) => ({
                  ...prev,
                  descuento2: Number(text),
                }));
              }}
              value={String(formulario.descuento2)}
              placeholder="10%"
            />
            <p>
              Sobre ${" "}
              {Number(formulario.sobreDescuento2).toLocaleString("es-CL")}
            </p>
            <p>
              Descuento: -${" "}
              {Number(formulario.montoDescuento2).toLocaleString("es-CL")}
            </p>
          </div>
          <div className={css.row}>
            <p>Saldo después del descuento</p>
            <p>
              <b>
                $ {Number(formulario.saldoDescuento2).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
        </div>
        <div className={css.descuento}>
          <div className={`${css.row} ${css.discountInfo}`}>
            <InputText
              label="Descuento 3"
              type="number"
              onChange={(text) => {
                setFormulario((prev) => ({
                  ...prev,
                  descuento3: Number(text),
                }));
              }}
              value={String(formulario.descuento3)}
              placeholder="10%"
            />
            <p>
              Sobre $
              {Number(formulario.sobreDescuento3).toLocaleString("es-CL")}
            </p>
            <p>
              Descuento: - $
              {Number(formulario.montoDescuento3).toLocaleString("es-CL")}
            </p>
          </div>
          <div className={css.row}>
            <p>Saldo después del descuento</p>
            <p>
              <b>
                ${Number(formulario.saldoDescuento3).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
        </div>
        <hr></hr>
        <div className={css.row}>
          <p>Descuento total</p>
          <p>-${Number(formulario.descuento_total).toLocaleString("es-CL")}</p>
        </div>
        <div className={css.row}>
          <p>Subtotal neto</p>
          <p>${Number(formulario.subtotal).toLocaleString("es-CL")}</p>
        </div>
        <div className={css.row}>
          <p>IVA (19%)</p>
          <p>${Number(formulario.iva).toLocaleString("es-CL")}</p>
        </div>
        <div className={css.row}>
          <p>
            <b>Total a Pagar</b>
          </p>
          <p>
            <b>${Number(formulario.total).toLocaleString("es-CL")}</b>
          </p>
        </div>
        <div className={css.row}>
          <Btn
            onClick={() => {
              handleCancelar();
            }}
          >
            Cancelar
          </Btn>
          <Btn
            onClick={() => {
              handleRegistrar();
            }}
          >
            Registrar factura y actualizar existencias
          </Btn>
        </div>
        {errorMsg && (
          <p style={{ color: "red", marginTop: "8px" }}>{errorMsg}</p>
        )}
      </Box>
    </div>
  );
}
