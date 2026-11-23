import { useEffect, useState } from "react";
import { GetStockMinimoAlerts } from "../../Helpers/APIConnector";
import type { AlertaStockMinimo } from "../../types/general";
import css from "./StockMinimoAlertas.module.css";

export function StockMinimoAlertas() {
  const [alertas, setAlertas] = useState<AlertaStockMinimo[] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    GetStockMinimoAlerts().then((response) => {
      if (!response || response.error || !response.data) {
      } else {
        setAlertas(response.data);
      }
      setCargando(false);
    });
  }, []);

  if (alertas && alertas?.length > 0)
    return (
      <section className={css.alertas} aria-labelledby="stock-alertas-title">
        <summary>
          <div className={css.encabezado}>
            <h2 id="stock-alertas-title">Alertas de stock mínimo</h2>
            {alertas !== null && (
              <span className={css.total}>{alertas.length}</span>
            )}
          </div>
          <details>
            {cargando && alertas === null ? (
              <p>Consultando existencias…</p>
            ) : alertas && alertas.length > 0 ? (
              <ul className={css.lista}>
                {alertas.map((articulo) => (
                  <li key={articulo.id} className={css.articulo}>
                    <div className={css.info}>
                      <div className={css.nombre}>
                        <strong>{articulo.nombre}</strong>
                        <span
                          className={`${css.badge} ${
                            articulo.stock_actual <= 0 ? css.agotado : css.bajo
                          }`}
                        >
                          {articulo.stock_actual <= 0
                            ? "Sin stock"
                            : "Stock bajo"}
                        </span>
                      </div>
                      <span className={css.sku}>
                        {articulo.codigo_sku || "Sin SKU"}
                      </span>
                    </div>
                    <p>
                      Disponible: <strong>{articulo.stock_actual}</strong> ·
                      Mínimo: {articulo.stock_minimo}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={css.sinAlertas}>
                No hay artículos en o bajo su stock mínimo.
              </p>
            )}
          </details>
        </summary>
      </section>
    );
}
