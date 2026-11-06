import { useEffect, useState } from "react";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { InputDate } from "../../../Components/InputDate/InputDate";
import { InputText } from "../../../Components/InputText/InputText";
import { Selector } from "../../../Components/Selector/Selector";
import { Title } from "../../../Components/Title/Title";
import css from "./AgregarDocumento.module.css";
import type { DocumentoTributario, Producto } from "../../../types/general";

interface AgregarDocumentoProps {
  onEnd: () => void;
}

export function AgregarDocumento({ onEnd }: AgregarDocumentoProps) {
  const PRODUCTO_INICIAL: Producto = {
    stock: 0,
    stockMinimo: 0,
    costoNeto: 0,
    importeBase: 0,
    netoFinal: 0,
    nombre: "",
    precioNeto: 0,
    descripcion: "",
  };

  const FORMULARIO_INICIAL: DocumentoTributario = {
    descuento1: 0,
    descuento2: 0,
    descuento3: 0,
    emision: new Date(),
    vencimiento: new Date(),
    folio: "",
    observaciones: "",
    proveedor: "",
    productos: [],
    rut: "",
    tipo: "",
    descuentoTotal: 0,
    importeBase: 0,
    iva: 0,
    subtotal: 0,
    total: 0,
    cantidadProductos: 0,
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
    useState<DocumentoTributario>(FORMULARIO_INICIAL);
  const [producto, setProducto] = useState<Producto>(PRODUCTO_INICIAL);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    CalcularValoresProductos();
    CalcularDescuentos();
  }, [
    formulario.productos.length,
    formulario.descuento1,
    formulario.descuento2,
    formulario.descuento3,
  ]);

  function CalcularDescuentos() {
    if (formulario.descuento1 != 0) {
      setFormulario((prev) => ({
        ...prev,
        sobreDescuento1: prev.importeBase,
        montoDescuento1: (prev.descuento1 * prev.importeBase) / 100,
        saldoDescuento1:
          prev.importeBase - (prev.descuento1 * prev.importeBase) / 100,
      }));
    } else {
      setFormulario((prev) => ({
        ...prev,
        sobreDescuento1: 0,
        montoDescuento1: 0,
        saldoDescuento1: 0,
      }));
    }
    if (formulario.descuento2 != 0) {
      setFormulario((prev) => ({
        ...prev,
        sobreDescuento2: prev.saldoDescuento1,
        montoDescuento2: (prev.descuento2 * prev.saldoDescuento1) / 100,
        saldoDescuento2:
          prev.saldoDescuento1 - (prev.descuento2 * prev.importeBase) / 100,
      }));
    } else {
      setFormulario((prev) => ({
        ...prev,
        sobreDescuento2: 0,
        montoDescuento2: 0,
        saldoDescuento2: 0,
      }));
    }
    if (formulario.descuento3 != 0) {
      setFormulario((prev) => ({
        ...prev,
        sobreDescuento3: prev.saldoDescuento2,
        montoDescuento3: (prev.descuento3 * prev.saldoDescuento2) / 100,
        saldoDescuento3:
          prev.saldoDescuento2 - (prev.descuento3 * prev.importeBase) / 100,
      }));
    } else {
      setFormulario((prev) => ({
        ...prev,
        sobreDescuento3: 0,
        montoDescuento3: 0,
        saldoDescuento3: 0,
      }));
    }
    let productos = formulario.productos;
    let totalImporteBase = 0;
    let subtotalNeto = 0;
    productos.forEach((prod) => {
      prod.importeBase = prod.precioNeto * prod.stock;
      const d1 = 1 - (formulario.descuento1 || 0) / 100;
      const d2 = 1 - (formulario.descuento2 || 0) / 100;
      const d3 = 1 - (formulario.descuento3 || 0) / 100;
      const costoNeto = prod.precioNeto * d1 * d2 * d3;
      prod.costoNeto = costoNeto;
      prod.netoFinal = costoNeto * prod.stock;
      totalImporteBase += prod.importeBase;
      subtotalNeto += prod.netoFinal;
    });
    setFormulario((prev) => ({
      ...prev,
      descuentoTotal:
        prev.montoDescuento1 + prev.montoDescuento2 + prev.montoDescuento3,
      subtotal: prev.saldoDescuento3,
      iva: prev.saldoDescuento3 * 0.19,
      total: prev.saldoDescuento3 + prev.saldoDescuento3 * 0.19,
    }));
  }

  function CalcularValoresProductos() {
    if (formulario.productos.length === 0) return;
    let productos = formulario.productos;
    let imbase = 0;
    productos.forEach((prod) => {
      prod.importeBase = prod.precioNeto * prod.stock;
      imbase += prod.importeBase;
    });

    setFormulario((prev) => ({
      ...prev,
      importeBase: imbase,
      productos: productos,
      cantidadProductos: productos.length,
    }));
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
        <Title>Ingreso de documento</Title>
        <form
          className={css.form}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className={css.grid}>
            <Selector
              title="Documento tributario *"
              options={["Factura electrónica", "Boleta electrónica"]}
              data={formulario?.tipo || ""}
              firstOption="Selecciona un documento"
              setData={(selected) => {
                setFormulario((prev) => ({ ...prev, tipo: selected }));
              }}
            />
            <InputText
              value={formulario?.proveedor}
              onChange={(text) => {
                setFormulario((prev) => ({ ...prev, proveedor: text }));
              }}
              label="Proveedor *"
              placeholder="Razón social del proveedor"
            />
            <InputText
              value={formulario?.rut}
              onChange={(text) => {
                setFormulario((prev) => ({ ...prev, rut: text }));
              }}
              label="RUT del proveedor *"
              placeholder="Ej: 11.111.111-1"
            />
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
              value={formulario.emision}
            />
            <InputDate
              label="Fecha de vencimiento *"
              onChange={(date) => {
                setFormulario((prev) => ({ ...prev, vencimiento: date }));
              }}
              value={formulario.vencimiento}
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
                placeholder="ingrese el nombre"
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
                value={String(producto?.stock)}
                onChange={(text) => {
                  setProducto((prev) => ({ ...prev, stock: Number(text) }));
                }}
                type="number"
                label="Stock"
                placeholder="Ingrese la cantidad"
              />
              <InputText
                value={String(producto?.stockMinimo)}
                onChange={(text) => {
                  setProducto((prev) => ({
                    ...prev,
                    stockMinimo: Number(text),
                  }));
                }}
                type="number"
                label="Stock mínimo"
                placeholder="Ingrese la cantidad mínima"
              />
              <InputText
                value={String(producto?.precioNeto)}
                onChange={(text) => {
                  setProducto((prev) => ({
                    ...prev,
                    precioNeto: Number(text),
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
                    setShowPopup(false);
                    setFormulario((prev) => ({
                      ...prev,
                      productos: [...prev.productos, producto],
                    }));
                    setProducto(PRODUCTO_INICIAL);
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
                      <td>{item.stock}</td>
                      <td>
                        ${Number(item.precioNeto).toLocaleString("es-CL")}
                      </td>
                      <td>
                        ${Number(item.importeBase).toLocaleString("es-CL")}
                      </td>
                      <td>${Number(item.costoNeto).toLocaleString("es-CL")}</td>
                      <td>${Number(item.netoFinal).toLocaleString("es-CL")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={css.row}>
            <p className={css.infotext}>
              {formulario.productos.length} productos y{" "}
              {formulario.cantidadProductos} unidades
            </p>
            <p>
              <b>
                Importe base: $
                {Number(formulario.importeBase).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
          <p className={css.aviso}>
            Precios sin IVA en CLP. Los descuentos del documento se aplican
            sucesivamente a cada producto; el costo neto unitario ya incluye
            ambos descuentos.
          </p>
          <InputText
            value={formulario.observaciones}
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
        <Title>Descuentos y totales</Title>
        <p className={css.infotext}>
          Cálculo automático - Pesos chilenos (CLP)
        </p>
        <div className={css.row}>
          <p>Importe base neto</p>
          <p>${Number(formulario.importeBase).toLocaleString("es-CL")}</p>
        </div>
        <div className={css.descuento}>
          <div className={css.row}>
            <InputText
              label="Descuento 1"
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
            <p>Saldo despúes del descuento</p>
            <p>
              <b>
                ${Number(formulario.saldoDescuento1).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
        </div>
        <div className={css.descuento}>
          <div className={css.row}>
            <InputText
              label="Descuento 2"
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
            <p>Saldo despúes del descuento</p>
            <p>
              <b>
                $ {Number(formulario.saldoDescuento2).toLocaleString("es-CL")}
              </b>
            </p>
          </div>
        </div>
        <div className={css.descuento}>
          <div className={css.row}>
            <InputText
              label="Descuento 3"
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
            <p>Saldo despúes del descuento</p>
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
          <p>-${Number(formulario.descuentoTotal).toLocaleString("es-CL")}</p>
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
        <Btn
          onClick={() => {
            onEnd();
          }}
        >
          Registrar y actualizar existencias
        </Btn>
      </Box>
    </div>
  );
}
