import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Frame } from "../../../Components/Frame/Frame";
import { InputText } from "../../../Components/InputText/InputText";
import { Title } from "../../../Components/Title/Title";
import css from "./SalidaMateriales.module.css";

export function SalidaMateriales() {
  const nav = useNavigate();
  const [formData, setFormData] = useState({
    obra: "",
    tecnico: "",
    sku: "",
    cantidad: "",
  });

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }

  return (
    <Frame>
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
              <InputText
                label="Obra"
                placeholder="Selecciona o ingresa la obra"
                value={formData.obra}
                onChange={(value) => updateField("obra", value)}
              />
              <InputText
                label="Técnico receptor"
                placeholder="Selecciona o ingresa el técnico"
                value={formData.tecnico}
                onChange={(value) => updateField("tecnico", value)}
              />
            </div>
          </section>

          <section className={css.section} aria-labelledby="item-heading">
            <h2 id="item-heading" className={css.sectionTitle}>
              Material solicitado
            </h2>
            <div className={css.fields}>
              <InputText
                label="Producto / SKU"
                placeholder="Ingresa el código SKU del producto"
                value={formData.sku}
                onChange={(value) => updateField("sku", value)}
              />
              <InputText
                label="Cantidad"
                placeholder="Ingresa la cantidad"
                type="number"
                value={formData.cantidad}
                onChange={(value) => updateField("cantidad", value)}
              />
            </div>
          </section>

          <div className={css.actions}>
            <Btn onClick={() => nav("/bodega")}>Cancelar</Btn>
            <Btn onClick={() => {}}>Guardar salida</Btn>
          </div>
        </form>
      </Box>
    </Frame>
  );
}
