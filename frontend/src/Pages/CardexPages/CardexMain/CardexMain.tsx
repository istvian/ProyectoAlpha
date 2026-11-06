import { useNavigate } from "react-router-dom";
import css from "./CardexMain.module.css";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";

export function CardexMain() {
  const nav = useNavigate();
  if (useValidateRol(Rol.admin))
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
            <Title>Consultas y Cardex</Title>
            <p>
              Consulta el historial de inventario y la trazabilidad de cada
              movimiento.
            </p>
          </div>
          <div className={css.actions}>
            <Btn onClick={() => {}}>Exportar PDF</Btn>
            <Btn onClick={() => {}}>Exportar Excel</Btn>
          </div>
        </Box>
        <div className={css.grid}></div>
      </Frame>
    );
}
