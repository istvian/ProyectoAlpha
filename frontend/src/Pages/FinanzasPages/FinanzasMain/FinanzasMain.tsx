import { useNavigate } from "react-router-dom";
import css from "./FinanzasMain.module.css";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";
import { AgregarDocumento } from "../AgregarDocumento/AgregarDocumento";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { useState } from "react";

export function FinanzasMain() {
  const nav = useNavigate();
  const [agregarDocumento, setAgregarDocumento] = useState(false);
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
          <div className={css.actions}>
            <Btn onClick={() => {}}>Ver reporte</Btn>
            <Btn
              onClick={() => {
                setAgregarDocumento(true);
              }}
            >
              Nuevo documento
            </Btn>
          </div>
        </Box>
        {agregarDocumento ? (
          <AgregarDocumento
            onEnd={() => {
              setAgregarDocumento(false);
            }}
          />
        ) : (
          ""
        )}
      </Frame>
    );
}
