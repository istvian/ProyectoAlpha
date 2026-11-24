import { useEffect, useState } from "react";
import { GetStockMinimoAlerts } from "../../Helpers/APIConnector";
import type { AlertaStockMinimo } from "../../types/general";
import css from "./StockMinimoAlertas.module.css";

export function StockMinimoAlertas() {
  const [alertas, setAlertas] = useState<AlertaStockMinimo[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const consultar = async () => {
      const response = await GetStockMinimoAlerts();
      if (!activo) return;

      if (!response || response.error || !response.data) {
        setError(response?.mensaje || "No se pudieron consultar las alertas.");
      } else {
        setAlertas(response.data);
        setError("");
      }

      setCargando(false);
      timeout = setTimeout(consultar, 30_000);
    };

    void consultar();
    return () => {
      activo = false;
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, []);

  if (alertas !== null && alertas.length === 0 && !error) return null;

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
          <p>La lista se actualiza automáticamente cada 30 segundos.</p>
          {error && (
            <p className={css.error} role="alert">
              No se pudieron actualizar las alertas: {error}
            </p>
          )}
          {cargando && alertas === null ? (
            <p>Consultando existencias…</p>
          ) : alertas !== null && alertas.length > 0 ? (
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
          ) : null}
        </details>
      </summary>
    </section>
  );
}
