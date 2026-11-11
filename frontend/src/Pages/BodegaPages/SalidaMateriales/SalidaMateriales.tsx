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

export function SalidaMateriales() {
  const nav = useNavigate();
  const [formData, setFormData] = useState({
    obra: "",
    tecnico: "",
    sku: "",
    cantidad: 0,
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
      formData.sku != "" &&
      formData.tecnico != "" &&
      formData.cantidad > 0
    ) {
      setIsDisabled(false);
    } else {
      setIsDisabled(true);
    }
  }, [formData]);
  return (
    <Frame>
      <Popup isVisible={showPopup}>
        <Title>Mensaje de confirmación</Title>
        <div className={css.popup}>
          <p>Se ha agregado correctamente la salida</p>
          <p>Resumen:</p>
          <p>Obra: {formData.obra}</p>
          <p>Técnico: {formData.tecnico}</p>
          <p>Producto SKU: {formData.sku}</p>
          <p>Cantidad: {formData.cantidad}</p>
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
              {/* <InputText
                label="Obra"
                placeholder="Selecciona o ingresa la obra"
                value={formData.obra}
                onChange={(value) => updateField("obra", value)}
              /> */}
              <Selector
                title="Técnico receptor"
                firstOption="Selecciona el técnico"
                data={formData.tecnico}
                setData={(value) => {
                  updateField("tecnico", value);
                }}
                options={["Técnico 1", "Técnico 2"]}
              />
              {/* <InputText
                label="Técnico receptor"
                placeholder="Selecciona o ingresa el técnico"
                value={formData.tecnico}
                onChange={(value) => updateField("tecnico", value)}
              /> */}
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
                data={formData.sku}
                setData={(value) => {
                  updateField("sku", value);
                }}
                options={["Producto 1", "Producto 2"]}
              />
              {/* <InputText
                label="Producto / SKU"
                placeholder="Ingresa el código SKU del producto"
                value={formData.sku}
                onChange={(value) => updateField("sku", value)}
              /> */}
              <InputText
                label="Cantidad"
                placeholder="Ingresa la cantidad"
                type="number"
                value={String(formData.cantidad)}
                onChange={(value) => {
                  if (Number(value) <= 0) {
                    setFormData((prev) => ({
                      ...prev,
                      cantidad: 0,
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      cantidad: Number(value),
                    }));
                  }
                }}
              />
            </div>
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
