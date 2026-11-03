import { useNavigate } from "react-router-dom";
import { GetUserData, LogOut } from "../../Helpers/APIConnector";
import useIsLogin from "../../Hooks/useIsLogin";
import { Btn } from "../Btn/Btn";
import { Ruta } from "../Ruta/Ruta";
import css from "./Nav.module.css";
import { useEffect, useState } from "react";
import type { UserData } from "../../types/general";

export function Nav() {
  const nav = useNavigate();
  const status = useIsLogin();
  const [user, setUser] = useState<UserData>();

  useEffect(() => {
    GetUserData().then((res) => {
      if (res) {
        setUser(res as UserData);
      }
    });
  }, []);

  function HandleLogOut() {
    if (!confirm("¿Desea cerrar sesión?")) return;
    LogOut().then((res) => {
      if (!res?.error) {
        alert("Se ha cerrado la sesión correctamente");
        nav("/login");
      }
    });
  }
  return (
    <nav className={css.nav}>
      <div className={css.empresa}>
        <img src="/logo.png" alt="Logo de empresa FYAG" className={css.logo} />
        <div className={css.userInfo}>
          <p>{user?.correo}</p>
          <p style={{ textTransform: "capitalize" }}>{user?.rol}</p>
        </div>
      </div>
      <div className={css.links}>
        <Ruta nombre="Dashboard" ruta="/dashboard" />
        <Ruta nombre="Inventario y artículos" ruta="/inventario" />
        <Ruta nombre="Operaciones de bodega" ruta="/bodega" />
        <Ruta nombre="Compras y facturación" ruta="/finanzas" />
        <Ruta nombre="Consultas y Cardex" ruta="/cardex" />
        <Ruta nombre="Panel Admin" ruta="/admin" />
      </div>
      <Btn onClick={HandleLogOut} warning>
        Cerrar sesión
        <i className="fa-solid fa-arrow-right-from-bracket"></i>
      </Btn>
    </nav>
  );
}
