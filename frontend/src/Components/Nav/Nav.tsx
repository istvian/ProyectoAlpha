import { Link, useNavigate } from "react-router-dom";
import { GetUserData, LogOut } from "../../Helpers/APIConnector";
import useIsLogin from "../../Hooks/useIsLogin";
import { Btn } from "../Btn/Btn";
import { Ruta } from "../Ruta/Ruta";
import css from "./Nav.module.css";
import { useEffect, useState } from "react";
import { Rol, type UserData } from "../../types/general";

export function Nav() {
  const nav = useNavigate();
  useIsLogin();
  const [user, setUser] = useState<UserData>();

  type RutaItem = {
    nombre: string;
    ruta: string;
    roles: Rol[];
  };

  const RUTAS: RutaItem[] = [
    { nombre: "Dashboard", ruta: "/", roles: [Rol.admin] },
    {
      nombre: "Inventario y artículos",
      ruta: "/inventario",
      roles: [Rol.admin, Rol.bodega, Rol.supervisor],
    },
    {
      nombre: "Operaciones de bodega",
      ruta: "/bodega",
      roles: [Rol.admin, Rol.bodega],
    },
    {
      nombre: "Compras y facturación",
      ruta: "/finanzas",
      roles: [Rol.admin, Rol.finanzas],
    },
    {
      nombre: "Consultas y Cardex",
      ruta: "/cardex",
      roles: [Rol.admin, Rol.supervisor],
    },
    { nombre: "Admin TI", ruta: "/admin", roles: [Rol.admin] },
  ];

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
  if (window.location.pathname != "/login")
    return (
      <nav className={css.nav}>
        <Link to="/" className={css.empresa}>
          <img
            src="/logo.png"
            alt="Logo de empresa FYAG"
            className={css.logo}
          />
          <div className={css.userInfo}>
            <p>{user?.correo}</p>
            <p style={{ textTransform: "capitalize" }}>
              {user?.nombre} | {user?.rol}
            </p>
          </div>
        </Link>
        <div className={css.links}>
          {RUTAS.filter(
            (item) => user && item.roles.includes(user.rol_id as Rol),
          ).map((item) => (
            <Ruta key={item.ruta} nombre={item.nombre} ruta={item.ruta} />
          ))}

          <Btn onClick={HandleLogOut} warning>
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </Btn>
        </div>
      </nav>
    );
}
