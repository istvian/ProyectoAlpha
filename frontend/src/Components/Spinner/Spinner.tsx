import css from "./Spinner.module.css";

export function Spinner() {
  return (
    <div className={css.frame}>
      <div className={css.box}>
        <span className={css.loader}></span>
        <p>Cargando...</p>
      </div>
    </div>
  );
}
