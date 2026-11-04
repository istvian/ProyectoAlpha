import { useNavigate } from "react-router-dom";
import { Box } from "../../Components/Box/Box";
import { Btn } from "../../Components/Btn/Btn";
import { Card } from "../../Components/Card/Card";
import { Frame } from "../../Components/Frame/Frame";
import { Nav } from "../../Components/Nav/Nav";
import { Spinner } from "../../Components/Spinner/Spinner";
import { Title } from "../../Components/Title/Title";
import useIsLogin from "../../Hooks/useIsLogin";
import css from "./Inventario.module.css";

export function Inventario() {
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
          <Title>Inventario y artículos</Title>
          <p>
            Administra el catálogo, consulta existencias y controla el stock de
            tus bodega.
          </p>
        </div>
        <div className={css.actions}>
          <Btn onClick={() => {}}>Gestionar existencias</Btn>
          <Btn
            onClick={() => {
              nav("/inventario/agregar");
            }}
          >
            + Agregar artículo
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
