import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Frame } from "../../../Components/Frame/Frame";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import css from "./SalidaMateriales.module.css";
import { Selector } from "../../../Components/Selector/Selector";
import { Popup } from "../../../Components/Popup/Popup";
import type { SalidaMateriales, SalidaProducto } from "../../../types/general";

export function SalidaMateriales() {
  const BASE_PRODUCT: SalidaProducto = {
    cantidad: 0,
    nombre: "",
    sku: "",
  };

  const nav = useNavigate();
  const [formData, setFormData] = useState<SalidaMateriales>({
    obra: "",
    tecnico: "",
    producto: [],
  });
  const [productos, setProductos] = useState();
  const [selectedProduct, setSelectedProduct] = useState<SalidaProducto>({
    ...BASE_PRODUCT,
  });
  const [isDisabled, setIsDisabled] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }

  // @TODO: CONECTAR CON BACKEND Y CONSULTAR CATALOGO DE PRODUCTOS, TECNICOS Y OBRA.

  useEffect(() => {
    if (
      formData.obra != "" &&
      formData.producto.length > 0 &&
      formData.tecnico != ""
    ) {
      setIsDisabled(false);
    } else {
      setIsDisabled(true);
    }
  }, [formData]);

  function handleAddProduct() {
    if (selectedProduct.cantidad > 0 && selectedProduct.sku != "") {
      setFormData((prev) => ({
        ...prev,
        producto: [...prev.producto, selectedProduct],
      }));
    }
  }

  return (
    <Frame>
      <Popup isVisible={showPopup}>
        <Title>Mensaje de confirmación</Title>
        <div className={css.popup}>
          <p>Se ha agregado correctamente la salida</p>
          <p>Resumen:</p>
          <p>Obra: {formData.obra}</p>
          <p>Técnico: {formData.tecnico}</p>
        </div>
        <Btn
          onClick={() => {
            setShowPopup(false);
            nav("/bodega");
          }}
          disabled={isDisabled}
        >
          Ok
        </Btn>
      </Popup>
      <Box
        style={{
          flexFlow: "column nowrap",
          alignItems: "stretch",
          justifyContent: "flex-start",
        }}
      >
        <div className={css.header}>
          <Title>Salida de Materiales</Title>
          <p>Completa los datos del despacho de bodega.</p>
        </div>

        <form
          className={css.form}
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <section className={css.section} aria-labelledby="dispatch-heading">
            <h2 id="dispatch-heading" className={css.sectionTitle}>
              Datos del despacho
            </h2>
            <div className={css.fields}>
              <Selector
                title="Obra"
                firstOption="Selecciona la obra"
                data={formData.obra}
                setData={(value) => {
                  updateField("obra", value);
                }}
                options={["Obra 1", "Obra 2"]}
              />
              <Selector
                title="Técnico receptor"
                firstOption="Selecciona el técnico"
                data={formData.tecnico}
                setData={(value) => {
                  updateField("tecnico", value);
                }}
                options={["Técnico 1", "Técnico 2"]}
              />
            </div>
          </section>

          <section className={css.section} aria-labelledby="item-heading">
            <h2 id="item-heading" className={css.sectionTitle}>
              Material solicitado
            </h2>
            <div className={css.fields}>
              <Selector
                title="Producto / SKU"
                firstOption="Selecciona el código SKU del producto"
                data={selectedProduct?.sku || ""}
                setData={(value) => {
                  setSelectedProduct((prev) => ({ ...prev, sku: value }));
                }}
                options={["Producto 1", "Producto 2"]}
              />
              <InputText
                label="Cantidad"
                placeholder="Ingresa la cantidad"
                type="number"
                value={String(selectedProduct.cantidad)}
                onChange={(value) => {
                  if (Number(value) <= 0) {
                    setSelectedProduct((prev) => ({ ...prev, cantidad: 0 }));
                  } else {
                    setSelectedProduct((prev) => ({
                      ...prev,
                      cantidad: Number(value),
                    }));
                  }
                }}
              />
            </div>
            <div className={css.row}>
              <Btn
                onClick={() => handleAddProduct()}
                disabled={
                  selectedProduct.cantidad == 0 || selectedProduct.sku == ""
                }
              >
                Agregar
              </Btn>
            </div>
          </section>
          <section className={css.section} aria-labelledby="dispatch-heading">
            <h2 id="dispatch-heading" className={css.sectionTitle}>
              Productos
            </h2>
            <table className={css.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {formData.producto.map((item, index) => {
                  return (
                    <tr key={index}>
                      <td>
                        <Btn
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              producto: [
                                ...prev.producto.filter((prod) => prod != item),
                              ],
                            }));
                          }}
                        >
                          Quitar
                        </Btn>
                      </td>
                      <td>{item.sku}</td>
                      <td>{item.cantidad}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className={css.actions}>
            <Btn onClick={() => nav("/bodega")}>Cancelar</Btn>
            <Btn
              onClick={() => {
                setShowPopup(true);
              }}
              disabled={isDisabled}
            >
              Guardar salida
            </Btn>
          </div>
        </form>
      </Box>
    </Frame>
  );
}
