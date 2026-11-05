import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Frame } from "../../../Components/Frame/Frame";
import { InputText } from "../../../Components/InputText/InputText";
import { Spinner } from "../../../Components/Spinner/Spinner";
import { Title } from "../../../Components/Title/Title";
import useIsLogin from "../../../Hooks/useIsLogin";
import css from "./AgregarArticulo.module.css";

export function AgregarArticulo() {
  const status = useIsLogin();
  //   if (status === "checking") return <Spinner />;
  //   if (status !== "authorized") return;
  return (
    <Frame>
      {status === "checking" ? <Spinner /> : ""}
      <Box
        style={{
          flexFlow: "column nowrap",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <div>
          <Title>Agregar artículo</Title>
          <p>Completa el formulario para agregar un artículo al inventario</p>
        </div>
        <InputText
          label="Código"
          placeholder="Ej:EPP-001"
          onChange={() => {}}
          value=""
        />
        <InputText
          label="Nombre del artículo"
          placeholder="Ej: Guantes termicos de seguridad"
          onChange={() => {}}
          value=""
        />
        <InputText
          label="Descripción"
          placeholder="Ej: Este artículo es de uso obligatorio para el personal de mantenimiento"
          onChange={() => {}}
          value=""
        />
        <InputText
          label="Categoría"
          placeholder="Ej: EPP"
          onChange={() => {}}
          value=""
        />
        <InputText
          label="Stock"
          type="number"
          placeholder="Ej: 10"
          onChange={() => {}}
          value=""
        />
        <InputText
          label="Stock mínimo"
          type="number"
          placeholder="Ej: 5"
          onChange={() => {}}
          value=""
        />
        <InputText
          label="Ubicación"
          placeholder="Ej: Estante 1"
          onChange={() => {}}
          value=""
        />
        <Btn onClick={() => {}}>Crear nuevo artículo</Btn>
      </Box>
    </Frame>
  );
}
