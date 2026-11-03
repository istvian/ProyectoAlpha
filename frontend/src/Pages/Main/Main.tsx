import { useEffect, useState } from "react";
import { Box } from "../../Components/Box/Box";
import { Frame } from "../../Components/Frame/Frame";
import { Nav } from "../../Components/Nav/Nav";
import { Spinner } from "../../Components/Spinner/Spinner";
import { Title } from "../../Components/Title/Title";
import useIsLogin from "../../Hooks/useIsLogin";
import css from "./Main.module.css";
import { GetUserData } from "../../Helpers/APIConnector";
import type { UserData } from "../../types/general";
import { Btn } from "../../Components/Btn/Btn";

export function Main() {
  const status = useIsLogin();
  const [user, setUser] = useState<UserData>({
    correo: "",
    rol: "",
    nombre: "",
  });

  useEffect(() => {
    GetUserData().then((res) => {
      setUser(res as UserData);
    });
  }, []);
  if (status === "checking") return <Spinner />;
  if (status !== "authorized") return;
  return (
    <Frame>
      <Nav />
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
        <div className={css.info}>
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
      <div className={css.grid}>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
        <Box>
          <p className={css.cardTitle}>Total de productos</p>
          <p className={css.cardNumber}>265</p>
          <p className={css.cardPorcent}>+13%</p>
        </Box>
      </div>
    </Frame>
  );
}
