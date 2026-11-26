import type { Dispatch, SetStateAction } from "react";
import css from "../../Pages/BodegaPages/RegistroMermasConsumo/RegistroMermasConsumo.module.css";
import { nuevaFila, type FilaSolicitud } from "./solicitudItems";
import styles from "./SolicitudItemsFormulario.module.css";

type ArticuloSeleccionable = {
  id: number;
  codigo_sku: string | null;
  nombre: string;
  stock_actual?: number;
  stock_minimo?: number;
};

export function SolicitudItemsFormulario({ filas, setFilas, articulos, tecnico, disabled }: {
  filas: FilaSolicitud[];
  setFilas: Dispatch<SetStateAction<FilaSolicitud[]>>;
  articulos: ArticuloSeleccionable[];
  tecnico: boolean;
  disabled: boolean;
}) {
  function actualizar(id: number, cambios: Partial<FilaSolicitud>) {
    setFilas((actuales) => actuales.map((fila) => fila.id === id ? { ...fila, ...cambios } : fila));
  }

  return (
    <section aria-label={tecnico ? "Materiales solicitados" : "Artículos solicitados"}>
      <h2>{tecnico ? "Materiales" : "Artículos"}</h2>
      {filas.map((fila, index) => {
        const articulo = articulos.find((item) => String(item.id) === fila.articuloId);
        const ocupados = new Set(filas.filter((otra) => otra.id !== fila.id && otra.tipo === "existente").map((otra) => otra.articuloId));
        return (
          <fieldset key={fila.id} className={css.section} disabled={disabled}>
            <legend>{tecnico ? "Material" : "Artículo"} {index + 1}</legend>
            <label className={css.field}>{tecnico ? "Tipo de material" : "Tipo de artículo"}
              <select className={css.input} value={fila.tipo} onChange={(e) => actualizar(fila.id, {
                tipo: e.target.value === "nuevo" ? "nuevo" : "existente",
                articuloId: "",
              })}>
                <option value="existente">{tecnico ? "Material existente" : "Artículo existente"}</option>
                <option value="nuevo">{tecnico ? "Material no catalogado" : "Artículo nuevo"}</option>
              </select>
            </label>
            {fila.tipo === "existente" ? (
              <>
                <label className={css.field}>{tecnico ? "Material" : "Artículo"}
                  <select className={css.input} required value={fila.articuloId} aria-describedby={articulo?.stock_actual !== undefined ? `stock-articulo-${fila.id}` : undefined} onChange={(e) => actualizar(fila.id, { articuloId: e.target.value })}>
                    <option value="">Seleccione {tecnico ? "un material" : "un artículo"}</option>
                    {articulos.map((item) => (
                      <option key={item.id} value={item.id} disabled={ocupados.has(String(item.id))}>
                        {item.codigo_sku || "Sin SKU"} · {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                {articulo && articulo.stock_actual !== undefined && articulo.stock_minimo !== undefined && (
                  <small id={`stock-articulo-${fila.id}`}>Stock actual: {articulo.stock_actual} · Mínimo: {articulo.stock_minimo}</small>
                )}
              </>
            ) : tecnico ? (
              <label className={css.field}>Descripción del material
                <textarea className={`${css.input} ${css.textarea}`} required maxLength={255} value={fila.descripcion} onChange={(e) => actualizar(fila.id, { descripcion: e.target.value })} />
              </label>
            ) : (
              <>
                <label className={css.field}>Nombre del artículo
                  <input className={css.input} required maxLength={150} value={fila.nombre} onChange={(e) => actualizar(fila.id, { nombre: e.target.value })} />
                </label>
                <label className={css.field}>Descripción
                  <textarea className={`${css.input} ${css.textarea}`} maxLength={255} value={fila.descripcion} onChange={(e) => actualizar(fila.id, { descripcion: e.target.value })} />
                </label>
              </>
            )}
            <label className={css.field}>Cantidad
              <input className={css.input} type="number" min="1" max="2147483647" step="1" required value={fila.cantidad} onChange={(e) => actualizar(fila.id, { cantidad: e.target.value })} />
            </label>
            <button type="button" className={styles.button} disabled={filas.length === 1} onClick={() => setFilas((actuales) => actuales.filter((actual) => actual.id !== fila.id))}>
              Quitar {tecnico ? "material" : "artículo"}
            </button>
          </fieldset>
        );
      })}
      <button type="button" className={styles.button} disabled={disabled} onClick={() => setFilas((actuales) => [...actuales, nuevaFila(Math.max(...actuales.map((fila) => fila.id)) + 1)])}>
        Agregar {tecnico ? "material" : "artículo"}
      </button>
    </section>
  );
}
