import { useNavigate } from "react-router-dom";
import css from "./Bodega.module.css";
import { Frame } from "../../../Components/Frame/Frame";
import { Box } from "../../../Components/Box/Box";
import { Title } from "../../../Components/Title/Title";
import { Btn } from "../../../Components/Btn/Btn";
import useValidateRol from "../../../Hooks/useValidateRol";
import { Rol } from "../../../types/general";

export function Bodega() {
  const nav = useNavigate();
  if (useValidateRol(Rol.bodega))
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
            <Title>Operaciones de Bodega</Title>
            <p>
              Registra salidas y traslados. Controla cada movimiento de tus
              bodega.
            </p>
          </div>
          <div className={css.actions}>
            <Btn
              onClick={() => {
                nav("/inventario/agregar");
              }}
            >
              Registrar salida
            </Btn>
          </div>
        </Box>
        <div className={css.grid}>
          {/* <Card />
        <Card />
        <Card />
        <Card /> */}
        </div>
      </Frame>
    );
}
