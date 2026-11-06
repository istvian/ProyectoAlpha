import { useNavigate } from "react-router-dom";
import useIsLogin from "../../../Hooks/useIsLogin";
import css from "./FinanzasMain.module.css";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Spinner } from "../../../Components/Spinner/Spinner";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";
import { AgregarDocumento } from "../AgregarDocumento/AgregarDocumento";

export function FinanzasMain() {
  const status = useIsLogin();
  const nav = useNavigate();
  //   if (status === "checking") return <Spinner />;
  //   if (status !== "authorized") return;
  return (
    <Frame>
      {status === "checking" ? <Spinner /> : ""}
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
          <Btn onClick={() => {}}>Ver reporte</Btn>
          <Btn
            onClick={() => {
              nav("/inventario/agregar");
            }}
          >
            Nuevo documento
          </Btn>
        </div>
      </Box>
      <AgregarDocumento />
    </Frame>
  );
}
