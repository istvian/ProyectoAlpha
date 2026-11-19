import { NavLink } from "react-router-dom";
import css from "./Ruta.module.css";

interface RutaProps {
  nombre: string;
  ruta: string;
}

export function Ruta({ nombre, ruta }: RutaProps) {
  return (
    <NavLink
      to={ruta}
      className={({ isActive }) => (isActive ? css.rutaActive : css.ruta)}
    >
      {nombre}
    </NavLink>
  );
}
