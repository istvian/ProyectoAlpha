import css from "./Footer.module.css";

export function Footer() {
  if (window.location.pathname != "/login")
    return (
      <div className={css.footer}>
        <p>Frio y Agroindustria SPA - Región de Ñuble, Chile</p>
        <p>Sistema de Gestión de Inventario - Proyecto Alpha</p>
      </div>
    );
}
