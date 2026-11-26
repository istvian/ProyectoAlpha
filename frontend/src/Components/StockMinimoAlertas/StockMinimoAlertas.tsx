import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GetStockMinimoAlerts } from "../../Helpers/APIConnector";
import type { AlertaStockMinimo } from "../../types/general";
import css from "./StockMinimoAlertas.module.css";

const INTERVALO_ACTUALIZACION_MS = 30_000;

export function StockMinimoAlertas({
  permitirSolicitud = false,
}: {
  permitirSolicitud?: boolean;
}) {
  const [alertas, setAlertas] = useState<AlertaStockMinimo[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    let solicitudEnCurso = false;

    async function actualizarAlertas() {
      if (!activo || solicitudEnCurso) return;
      solicitudEnCurso = true;

      try {
        const response = await GetStockMinimoAlerts();
        if (response.error || !response.data) {
          throw new Error(
            response.mensaje || "No se pudieron consultar las alertas de stock.",
          );
        }
        if (activo) {
          setAlertas(response.data);
          setError("");
        }
      } catch (reason: unknown) {
        if (activo) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron consultar las alertas de stock.",
          );
        }
      } finally {
        solicitudEnCurso = false;
        if (activo) setCargando(false);
      }
    }

    void actualizarAlertas();
    const intervalo = window.setInterval(
      () => void actualizarAlertas(),
      INTERVALO_ACTUALIZACION_MS,
    );

    return () => {
      activo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  if (alertas !== null && alertas.length === 0 && !error && !cargando) {
    return null;
  }

  return (
    <section className={css.alertas} aria-labelledby="stock-alertas-title">
      <details open={Boolean(error) || (cargando && alertas === null)}>
        <summary>
          <div className={css.encabezado}>
            <h2 id="stock-alertas-title">Alertas de stock mínimo</h2>
            {alertas !== null && (
              <span className={css.total}>{alertas.length}</span>
            )}
          </div>
        </summary>
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
                      {articulo.stock_actual <= 0 ? "Sin stock" : "Stock bajo"}
                    </span>
                  </div>
                  <span className={css.sku}>
                    {articulo.codigo_sku || "Sin SKU"}
                  </span>
                </div>
                <p>
                  Disponible: <strong>{articulo.stock_actual}</strong> · Mínimo:{" "}
                  {articulo.stock_minimo}
                </p>
                {permitirSolicitud && (
                  <Link to={`/bodega/solicitudes?articulo=${articulo.id}`}>
                    Solicitar compra
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : !error ? (
          <p className={css.sinAlertas}>
            No hay artículos en o bajo su stock mínimo.
          </p>
        ) : null}
      </details>
    </section>
  );
}
