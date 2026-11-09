import { useEffect, useState } from "react";
import { Box } from "../../Components/Box/Box";
import { Frame } from "../../Components/Frame/Frame";
import { Title } from "../../Components/Title/Title";
import css from "./Main.module.css";
import { GetUserData } from "../../Helpers/APIConnector";
import type { UserData } from "../../types/general";
import { Btn } from "../../Components/Btn/Btn";
import { Footer } from "../../Components/Footer/Footer";
import { Card } from "../../Components/Card/Card";
import { CardContainer } from "../../Components/CardContainer/CardContainer";

export function Main() {
  const [user, setUser] = useState<UserData>({
    correo: "",
    rol: "",
    nombre: "",
    rolID: 0,
  });

  useEffect(() => {
    GetUserData().then((res) => {
      setUser(res as UserData);
    });
  }, []);
  return (
    <Frame>
      <Box style={{ alignItems: "center" }}>
        <p>
          ¡Buenos días {user.nombre}! Aquí tienes el resumen del inventario de
          hoy
        </p>
      </Box>
      <Box
        style={{
          flexFlow: "row nowrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className={css.welcome}>
          <Title>Acciones rápidas</Title>
          <p>Gestione trámites cotidianos de administrador con un solo click</p>
        </div>
        <div className={css.actions}>
          <Btn onClick={() => {}}>Crear nuevo usuario</Btn>
          <Btn onClick={() => {}}>Revisar logs del sistema</Btn>
          <Btn onClick={() => {}}>Visor de Cardex</Btn>
          <Btn onClick={() => {}}>Generar informe (PDF)</Btn>
          <Btn onClick={() => {}}>Ajustar stock</Btn>
        </div>
      </Box>
      <CardContainer>
        <Card title="Total de productos" content="265" footer="+13 artículos" />
        <Card
          title="Valor total en almacén"
          content="$15.249.040"
          footer="+4.2% que el mes anterior"
        />
        <Card
          title="Stock crítico"
          content="4 artículos por agotarse"
          footer="Ver artículos"
        />
        <Card
          title="Movimientos de hoy"
          content="7 registros"
          footer="2 entradas - 5 salidas"
        />
        <Card
          title="Usuarios"
          content="7 usuarios"
          footer="+ 2 que el mes anterior"
        />
        <Card
          title="Roles"
          customContent={
            <div className={css.roles}>
              <p>2 administradores</p>
              <p>1 finanzas</p>
              <p>1 bodeguero</p>
              <p>3 supervisores</p>
            </div>
          }
        />
        <Card
          title="Merma"
          content="15 productos"
          footer="+ 2% que el mes anterior"
        />
        <Card
          title="Proveedores"
          content="30 proveedores"
          footer="+ 2% que el mes anterior"
        />
      </CardContainer>
    </Frame>
  );
}
