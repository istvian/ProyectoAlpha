import { useNavigate } from "react-router-dom";
import css from "./PanelAdmin.module.css";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Btn } from "../../../Components/Btn/Btn";
import { Title } from "../../../Components/Title/Title";

export function PanelAdmin() {
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
            <Title>Panel Admin</Title>
            <p>
              Administra usuarios, asigna roles y consulta la actividad del
              sistema.
            </p>
          </div>
          <div className={css.actions}>
            <Btn onClick={() => {}}>Crear nuevo usuario</Btn>
          </div>
        </Box>
        <div className={css.grid}></div>
      </Frame>
    );
}
